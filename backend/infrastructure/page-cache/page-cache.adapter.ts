export type PageCacheAdapter = {
  getByUrl: (url: string) => Promise<{ content: string } | null>;
  upsertByUrl: (url: string, content: string) => Promise<void>;
};
