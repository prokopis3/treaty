import './treaty-utilities/mock-create-histogram';
import './treaty-utilities/mock-zone';

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { existsSync } from 'node:fs';
import { join } from 'path';
import { env } from './config/env';
import { PostService } from './backend/application/post.service';
import { seedPosts } from './backend/application/post.seed';
import { createSurrealClient } from './backend/infrastructure/surreal/surreal.client';
import { SurrealPageCacheRepository } from './backend/infrastructure/surreal/surreal-page-cache.repository';
import { SurrealPostRepository } from './backend/infrastructure/surreal/surreal-post.repository';
import { ensureSurrealSchema } from './backend/infrastructure/surreal/surreal.schema';
import { createPostsApi } from './backend/presentation/api/v1/posts/posts.api';
import { scopedLogger } from './backend/infrastructure/logging/logger';
import { getCorsConfig } from './backend/infrastructure/http/cors.config';
import { applyServerPlugins } from './backend/infrastructure/http/plugins';
import { resolveBrowserDistFolder, resolveIndexHtml, resolveServerMainEntry } from './backend/infrastructure/ssr/browser-dist.resolver';
import { toProductionHtml } from './backend/infrastructure/ssr/html-transform';
import { InMemoryPageCacheRepository } from './backend/infrastructure/page-cache/in-memory-page-cache.repository';
import type { PageCacheAdapter } from './backend/infrastructure/page-cache/page-cache.adapter';

const logger = scopedLogger('server');
const serverDistFolder = import.meta.dirname;
const isCompiledServerRuntime = existsSync(join(serverDistFolder, 'main.server.mjs'));
const isBinaryRuntime = process.env['RUN_AS_BIN'] === 'true';
const usesBuiltServerArtifacts = isCompiledServerRuntime;
const disableDatabase = process.env['APP_DISABLE_DB'] === 'true';

const dynamicImport = <T>(specifier: string): Promise<T> => {
  const importer = new Function('modulePath', 'return import(modulePath)') as (
    modulePath: string
  ) => Promise<T>;
  return importer(specifier);
};

let pageCacheRepository: PageCacheAdapter;
let postsApi: ReturnType<typeof createPostsApi> | null = null;

if (!disableDatabase) {
  const db = await createSurrealClient();
  await ensureSurrealSchema(db);
  const postRepository = new SurrealPostRepository(db);
  const postService = new PostService(postRepository);
  pageCacheRepository = new SurrealPageCacheRepository(db);
  await seedPosts(postRepository);
  postsApi = createPostsApi(postService);
} else {
  logger.warn('APP_DISABLE_DB=true: using in-memory cache, /api/posts routes disabled');
  pageCacheRepository = new InMemoryPageCacheRepository();
}

if (!isCompiledServerRuntime || isBinaryRuntime) {
  // Source runtime path may require JIT fallback for partially-compiled packages.
  await import('@angular/compiler');
}

const { APP_BASE_HREF } = await import('@angular/common');
const { CommonEngine, isMainModule } = await import('@angular/ssr/node');

const allowedHosts = [...new Set([
  'localhost',
  '127.0.0.1',
  ...env.CORS_ORIGIN
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o && o !== '*')
    .flatMap((o) => {
      try {
        return [new URL(o.includes('://') ? o : `http://${o}`).hostname];
      } catch {
        return [] as string[];
      }
    }),
])];

const browserDistFolder = await resolveBrowserDistFolder(serverDistFolder, usesBuiltServerArtifacts);
const indexHtml = resolveIndexHtml(browserDistFolder, serverDistFolder, usesBuiltServerArtifacts);
const bootstrap = usesBuiltServerArtifacts
  ? (await dynamicImport<{ default: unknown }>(resolveServerMainEntry(serverDistFolder, true))).default
  : (await import('./src/main.server')).default;
const ssrBootstrap = bootstrap as any;
const commonEngine = new CommonEngine({ allowedHosts, enablePerformanceProfiler: true });

const app = (await applyServerPlugins(new Elysia().use(cors(getCorsConfig()))))
  .derive(({ request: { url } }) => {
    const { protocol, pathname, search } = new URL(url);
    return {
      protocol: protocol.slice(0, -1),
      originalUrl: pathname + search,
      baseUrl: '',
    };
  })
  .group('/api', (api) => {
    const withHealth = api.get('/health', () => ({ status: 'ok' as const }));
    return postsApi ? withHealth.use(postsApi) : withHealth;
  })
  .get('*', async ({ originalUrl, protocol, headers }) => {
    const file = Bun.file(`${browserDistFolder}${originalUrl}`);

    if (await file.exists()) {
      return new Response(await file.arrayBuffer(), {
        headers: { 'Content-Type': file.type },
      });
    }

    if (originalUrl.includes('.')) {
      return new Response('Not Found', { status: 404 });
    }

    const cached = await pageCacheRepository.getByUrl(originalUrl);
    if (cached) {
      return new Response(cached.content, { headers: { 'Content-Type': 'text/html' } });
    }

    try {
      const forwardedProto = headers['x-forwarded-proto'] || protocol;
      const forwardedHost = headers['x-forwarded-host'] || headers['host'];

      logger.debug(`SSR render: ${forwardedProto}://${forwardedHost}${originalUrl}`);

      const html = toProductionHtml(
        await commonEngine.render({
          bootstrap: ssrBootstrap,
          documentFilePath: indexHtml,
          url: `${forwardedProto}://${forwardedHost}${originalUrl}`,
          publicPath: browserDistFolder,
          providers: [{ provide: APP_BASE_HREF, useValue: '' }],
        })
      );

      await pageCacheRepository.upsertByUrl(originalUrl, html);
      logger.debug(`SSR complete: ${originalUrl} (${html.length} chars)`);

      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    } catch (error) {
      logger.error(`SSR failed: ${originalUrl}`, error);
      return 'Missing page';
    }
  });

if (isMainModule(import.meta.url) || process.env['RUN_AS_BIN'] === 'true') {
  app.listen(env.PORT);
  logger.success(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}

export const reqHandler = app.handle;
export type App = typeof app;
