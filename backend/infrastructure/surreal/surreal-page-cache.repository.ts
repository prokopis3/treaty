
import { RecordId, Surreal } from 'surrealdb';

type PageCacheRecord = {
  content: string;
  updatedAt?: string;
};

function isPageCacheRecord(value: unknown): value is PageCacheRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybe = value as { content?: unknown; updatedAt?: unknown };
  return (
    typeof maybe.content === 'string'
    && (maybe.updatedAt === undefined || typeof maybe.updatedAt === 'string')
  );
}

export class SurrealPageCacheRepository {
  constructor(private readonly db: Surreal) {}

  async getByUrl(url: string): Promise<PageCacheRecord | null> {
    const cacheHit = await this.db.select(new RecordId('url', url));

    if (!isPageCacheRecord(cacheHit) || Array.isArray(cacheHit)) {
      return null;
    }

    return cacheHit;
  }

  async upsertByUrl(url: string, content: string): Promise<void> {
    await this.db.upsert(new RecordId('url', url)).merge({
      content,
      updatedAt: new Date(),
    });
  }
}
