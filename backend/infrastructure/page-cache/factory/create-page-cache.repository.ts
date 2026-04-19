import type { ConsolaInstance } from 'consola';
import { InMemoryPageCacheRepository } from '../in-memory-page-cache.repository';
import type { PageCacheAdapter } from '../page-cache.adapter';
import { UpstashPageCacheRepository } from '../upstash/upstash-page-cache.repository';

export interface CreatePageCacheRepositoryOptions {
  provider: string;
  surrealRepository: PageCacheAdapter | null;
  upstashRestUrl: string;
  upstashRestToken: string;
  upstashKeyPrefix: string;
  upstashTtlSeconds: number;
  logger: ConsolaInstance;
}

export const DEFAULT_PAGE_CACHE_PROVIDER = 'surreal';

export function createPageCacheRepository(options: CreatePageCacheRepositoryOptions): PageCacheAdapter {
  const {
    provider,
    surrealRepository,
    upstashRestUrl,
    upstashRestToken,
    upstashKeyPrefix,
    upstashTtlSeconds,
    logger,
  } = options;

  const normalizedProvider = provider.trim().toLowerCase();

  if (normalizedProvider === 'memory') {
    logger.warn('APP_PAGE_CACHE_PROVIDER=memory: using in-process page cache only');
    return new InMemoryPageCacheRepository();
  }

  if (normalizedProvider === 'upstash') {
    if (!upstashRestUrl || !upstashRestToken) {
      logger.warn(
        'APP_PAGE_CACHE_PROVIDER=upstash but Upstash credentials are missing; falling back to in-memory page cache'
      );
      return new InMemoryPageCacheRepository();
    }

    logger.info('Using Upstash Redis page cache repository');
    return new UpstashPageCacheRepository({
      restUrl: upstashRestUrl,
      restToken: upstashRestToken,
      keyPrefix: upstashKeyPrefix,
      ttlSeconds: upstashTtlSeconds,
    });
  }

  if (surrealRepository) {
    logger.info('Using SurrealDB page cache repository');
    return surrealRepository;
  }

  if (normalizedProvider !== DEFAULT_PAGE_CACHE_PROVIDER) {
    logger.warn(
      `Unknown APP_PAGE_CACHE_PROVIDER=${provider}; falling back to in-memory page cache`
    );
  } else {
    logger.warn(
      'APP_PAGE_CACHE_PROVIDER=surreal but SurrealDB cache repository is unavailable; falling back to in-memory page cache'
    );
  }

  return new InMemoryPageCacheRepository();
}
