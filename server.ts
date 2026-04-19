import './treaty-utilities/mock-create-histogram';
import './treaty-utilities/mock-zone';

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { existsSync } from 'node:fs';
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
import { resolveBrowserDistFolder, resolveBrowserIndexHtml, resolveServerMainEntry } from './backend/infrastructure/ssr/browser-dist.resolver';
import { startServerWithClustering } from './backend/infrastructure/clustering';
import { createPageCacheRepository } from './backend/infrastructure/page-cache/factory/create-page-cache.repository';
import type { PageCacheAdapter } from './backend/infrastructure/page-cache/page-cache.adapter';

const logger = scopedLogger('server');
const serverDistFolder = import.meta.dirname;
const builtServerMainEntry = resolveServerMainEntry(serverDistFolder, true);
const usesBuiltServerArtifacts = existsSync(builtServerMainEntry);
const disableDatabase = env.APP_DISABLE_DB === 'true';

const parseCsv = (value: string): string[] => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const htmlCacheAllowlist = new Set(parseCsv(env.APP_HTML_CACHE_ALLOWLIST));
const htmlCachePrewarmRoutes = parseCsv(env.APP_HTML_CACHE_PREWARM_ROUTES);
const hotHtmlCache = new Map<string, string>();
const sharedShellCacheKey = '__html-shell__';
const cacheMode = env.APP_HTML_CACHE_MODE.trim().toLowerCase();
const useSharedShellCache = cacheMode !== 'route';

const resolveHtmlCacheKey = (urlPath: string): string => {
  return useSharedShellCache ? sharedShellCacheKey : urlPath;
};

const routeAllowedByPrefix = (urlPath: string): boolean => {
  for (const route of htmlCacheAllowlist) {
    if (route.endsWith('*')) {
      const prefix = route.slice(0, -1);
      if (urlPath.startsWith(prefix)) {
        return true;
      }
      continue;
    }

    if (route === urlPath) {
      return true;
    }
  }

  return false;
};

let pageCacheRepository: PageCacheAdapter;
let postsApi: ReturnType<typeof createPostsApi> | null = null;
let surrealPageCacheRepository: PageCacheAdapter | null = null;

const upsertCacheAsync = (urlPath: string, content: string): void => {
  const cacheKey = resolveHtmlCacheKey(urlPath);
  hotHtmlCache.set(cacheKey, content);

  void pageCacheRepository.upsertByUrl(cacheKey, content).catch((error) => {
    logger.warn(`Failed to persist HTML cache for ${urlPath}`, error);
  });
};

const resolveCachedHtml = async (urlPath: string): Promise<string | null> => {
  const cacheKey = resolveHtmlCacheKey(urlPath);
  const hotContent = hotHtmlCache.get(cacheKey);
  if (hotContent !== undefined) {
    return hotContent;
  }

  const persisted = await pageCacheRepository.getByUrl(cacheKey);
  if (!persisted?.content) {
    return null;
  }

  hotHtmlCache.set(cacheKey, persisted.content);
  return persisted.content;
};

if (!disableDatabase) {
  const db = await createSurrealClient();
  await ensureSurrealSchema(db);
  const postRepository = new SurrealPostRepository(db);
  const postService = new PostService(postRepository);
  surrealPageCacheRepository = new SurrealPageCacheRepository(db);
  await seedPosts(postRepository);
  postsApi = createPostsApi(postService);
} else {
  logger.warn('APP_DISABLE_DB=true: /api/posts routes disabled');
}

pageCacheRepository = createPageCacheRepository({
  provider: env.APP_PAGE_CACHE_PROVIDER,
  surrealRepository: surrealPageCacheRepository,
  upstashRestUrl: env.UPSTASH_REDIS_REST_URL,
  upstashRestToken: env.UPSTASH_REDIS_REST_TOKEN,
  upstashKeyPrefix: env.APP_PAGE_CACHE_KEY_PREFIX,
  upstashTtlSeconds: env.APP_PAGE_CACHE_TTL_SECONDS,
  logger,
});

const browserDistFolder = await resolveBrowserDistFolder(serverDistFolder, usesBuiltServerArtifacts);
const browserIndexHtmlPath = resolveBrowserIndexHtml(browserDistFolder);
const browserIndexHtml = await Bun.file(browserIndexHtmlPath).text();

// Prewarm route-level HTML cache for known hot paths to reduce first-hit latency.
if (htmlCacheAllowlist.size > 0 && htmlCachePrewarmRoutes.length > 0) {
  if (useSharedShellCache) {
    hotHtmlCache.set(sharedShellCacheKey, browserIndexHtml);
    await pageCacheRepository.upsertByUrl(sharedShellCacheKey, browserIndexHtml);
    logger.info('Prewarmed HTML cache with shared shell key');
  } else {
    for (const route of htmlCachePrewarmRoutes) {
      if (!routeAllowedByPrefix(route)) {
        continue;
      }

      hotHtmlCache.set(route, browserIndexHtml);
      await pageCacheRepository.upsertByUrl(route, browserIndexHtml);
    }

    logger.info(
      `Prewarmed HTML cache for ${htmlCachePrewarmRoutes.length} route(s): ${htmlCachePrewarmRoutes.join(', ')}`
    );
  }
}

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

    const pathname = originalUrl.split('?')[0] || '/';
    const cacheEligible = routeAllowedByPrefix(pathname);

    if (cacheEligible) {
      const cachedHtml = await resolveCachedHtml(pathname);
      if (cachedHtml) {
        return new Response(cachedHtml, { headers: { 'Content-Type': 'text/html' } });
      }
    }

    try {
      const forwardedProto = headers['x-forwarded-proto'] || protocol;
      const forwardedHost = headers['x-forwarded-host'] || headers['host'];

      if (cacheEligible) {
        upsertCacheAsync(pathname, browserIndexHtml);
      }

      logger.debug(`CSR shell: ${forwardedProto}://${forwardedHost}${pathname}`);

      return new Response(browserIndexHtml, { headers: { 'Content-Type': 'text/html' } });
    } catch (error) {
      logger.error(`CSR shell response failed: ${originalUrl}`, error);
      return 'Missing page';
    }
  });

if (import.meta.main || env.RUN_AS_BIN) {
  // Start server with optional multi-process clustering (refactored into /backend/infrastructure/clustering)
  await startServerWithClustering({
    app,
    port: env.PORT,
    scriptUrl: import.meta.url,
    logger,
    nodeClusterEnv: env.NODE_CLUSTER,
    nodeClusterMaxWorkers: env.NODE_CLUSTER_MAX_WORKERS,
    nodeClusterDbConnectionBudget: env.NODE_CLUSTER_DB_CONNECTION_BUDGET,
    nodeClusterDbConnectionsPerWorker: env.NODE_CLUSTER_DB_CONNECTIONS_PER_WORKER,
  });
}

export const reqHandler = app.handle;
export type App = typeof app;
