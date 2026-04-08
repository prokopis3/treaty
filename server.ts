import '@angular/compiler';
import './treaty-utilities/mock-create-histogram';
import './treaty-utilities/mock-zone';

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { opentelemetry } from '@elysiajs/opentelemetry';
import { serverTiming } from '@elysiajs/server-timing';
import { join } from 'path';
import { env } from './config/env';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import bootstrap from './src/main.server';
import { PostService } from './backend/application/post.service';
import { seedPosts } from './backend/application/post.seed';
import { createSurrealClient } from './backend/infrastructure/surreal/surreal.client';
import { SurrealPageCacheRepository } from './backend/infrastructure/surreal/surreal-page-cache.repository';
import { SurrealPostRepository } from './backend/infrastructure/surreal/surreal-post.repository';
import { ensureSurrealSchema } from './backend/infrastructure/surreal/surreal.schema';
import { createPostsApi } from './backend/presentation/api/v1/posts/posts.api';
import { scopedLogger } from './backend/infrastructure/logging/logger';
import { getCorsConfig } from './backend/infrastructure/http/cors.config';

type AnyElysia = Elysia<any, any, any, any, any, any, any>;

const db = await createSurrealClient();
await ensureSurrealSchema(db);
const postRepository = new SurrealPostRepository(db);
const postService = new PostService(postRepository);
const pageCacheRepository = new SurrealPageCacheRepository(db);

await seedPosts(postRepository);

const port = env.PORT;
const serverDistFolder = import.meta.dirname;

const allowedHosts = env.CORS_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin && origin !== '*')
  .map((origin) => {
    try {
      const parsed = new URL(origin.includes('://') ? origin : `http://${origin}`);
      return parsed.hostname;
    } catch {
      return '';
    }
  })
  .filter((host): host is string => Boolean(host));

const browserDistFolder = join(serverDistFolder, 'dist/treaty/browser');
const indexHtml = join(serverDistFolder, 'dist/treaty/browser/index.html');
const commonEngine = new CommonEngine({
  allowedHosts: allowedHosts.length > 0 ? allowedHosts : ['localhost', '127.0.0.1'],
  enablePerformanceProfiler: true,
});

const VITE_DEV_ENTRY = '<script type="module" src="/main.ts"></script>';
const logger = scopedLogger('server');
const corsConfig = getCorsConfig();
const postsApi = createPostsApi(postService);
const isDevelopment = env.NODE_ENV !== 'production';

const withDevelopmentTelemetry = <T extends AnyElysia>(instance: T): T => {
  if (!isDevelopment) {
    return instance;
  }

  return instance.use(
    opentelemetry({
      serviceName: 'treaty-server',
    })
  ) as T;
};

function toProductionHtml(html: string): string {
  return html
    .replaceAll(VITE_DEV_ENTRY, '')
    .replace(/href="(styles-[^"]+\.css)"/g, 'href="/$1"')
    .replace(/href="(favicon\.ico)"/g, 'href="/$1"')
    .replace(/href="(chunk-[^"]+\.js)"/g, 'href="/$1"')
    .replace(/src="(main-[^"]+\.js)"/g, 'src="/$1"')
    .replace(/href="(main-[^"]+\.js)"/g, 'href="/$1"')
    .replace(/href="(chunk-[^"]+\.css)"/g, 'href="/$1"');
}

const app = withDevelopmentTelemetry(
  new Elysia()
    .use(cors(corsConfig))
    .use(
      serverTiming({
        enabled: isDevelopment,
        allow: ({ request }) => {
          const pathname = new URL(request.url).pathname;
          return !pathname.includes('.');
        },
        trace: {
          handle: true,
          total: true,
        },
      })
    )
).derive(({ request: { url } }) => {
    const _url = new URL(url);

    return {
      protocol: _url.protocol.split(':')[0],
      originalUrl: _url.pathname + _url.search,
      baseUrl: '',
    };
  })
  .group('/api', (api) => {
    return api
      .get('/health', () => ({ status: 'ok' as const }))
      .use(postsApi);
  })
  .get('*.*', async ({ originalUrl }) => {
    const file = Bun.file(`${browserDistFolder}${originalUrl}`);

    if (!(await file.exists())) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(await file.arrayBuffer(), {
      headers: {
        'Content-Type': file.type,
      },
    });
  })
  .get('*', async ({ originalUrl, baseUrl, protocol, headers }) => {
    if (originalUrl.includes('.')) {
      const file = Bun.file(`${browserDistFolder}${originalUrl}`);

      if (!(await file.exists())) {
        return new Response('Not Found', { status: 404 });
      }

      return new Response(await file.arrayBuffer(), {
        headers: {
          'Content-Type': file.type,
        },
      });
    }

    const cacheHit = await pageCacheRepository.getByUrl(originalUrl);

    if (cacheHit) {
      return new Response(cacheHit.content, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    try {
      const forwardedProto = headers['x-forwarded-proto'] || protocol;
      const forwardedHost = headers['x-forwarded-host'] || headers['host'];

      logger.debug(`SSR render requested for ${forwardedProto}://${forwardedHost}${originalUrl}`);

      const _html = await commonEngine.render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${forwardedProto}://${forwardedHost}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: '' }],
      });

      const productionHtml = toProductionHtml(_html);

      logger.debug(`SSR render complete for ${originalUrl} (html length: ${productionHtml.length})`);

      await pageCacheRepository.upsertByUrl(originalUrl, productionHtml);

      return new Response(productionHtml, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    } catch (error) {
      logger.error(`SSR render failed for ${originalUrl}`, error);

      return 'Missing page';
    }
  });

if (isMainModule(import.meta.url)) {
  app.listen(port);
  logger.success(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}

export const reqHandler = app.handle;
export type App = typeof app;
