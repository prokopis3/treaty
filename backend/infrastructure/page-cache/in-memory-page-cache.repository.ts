import type { PageCacheAdapter } from './page-cache.adapter';

export class InMemoryPageCacheRepository implements PageCacheAdapter {
  private readonly cache = new Map<string, string>();

  async getByUrl(url: string): Promise<{ content: string } | null> {
    const content = this.cache.get(url);
    return content !== undefined ? { content } : null;
  }

  async upsertByUrl(url: string, content: string): Promise<void> {
    this.cache.set(url, content);
  }
}
