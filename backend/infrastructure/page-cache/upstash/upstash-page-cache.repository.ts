import type { PageCacheAdapter } from '../page-cache.adapter';

type UpstashPipelineResult = {
  result?: unknown;
  error?: string;
};

export interface UpstashPageCacheRepositoryOptions {
  restUrl: string;
  restToken: string;
  keyPrefix?: string;
  ttlSeconds?: number;
}

export class UpstashPageCacheRepository implements PageCacheAdapter {
  private readonly endpoint: string;
  private readonly token: string;
  private readonly keyPrefix: string;
  private readonly ttlSeconds: number;

  constructor(options: UpstashPageCacheRepositoryOptions) {
    this.endpoint = options.restUrl.replace(/\/+$/, '');
    this.token = options.restToken;
    this.keyPrefix = options.keyPrefix || 'page-cache:';
    this.ttlSeconds = Math.max(0, options.ttlSeconds || 0);
  }

  async getByUrl(url: string): Promise<{ content: string } | null> {
    const key = this.resolveKey(url);
    const [getResult] = await this.execPipeline([['GET', key]]);

    if (getResult?.error) {
      throw new Error(`Upstash GET failed: ${getResult.error}`);
    }

    return typeof getResult?.result === 'string'
      ? { content: getResult.result }
      : null;
  }

  async upsertByUrl(url: string, content: string): Promise<void> {
    const key = this.resolveKey(url);
    const commands: string[][] = [['SET', key, content]];

    if (this.ttlSeconds > 0) {
      commands.push(['EXPIRE', key, String(this.ttlSeconds)]);
    }

    const results = await this.execPipeline(commands);
    const firstError = results.find((result) => result?.error);

    if (firstError?.error) {
      throw new Error(`Upstash SET failed: ${firstError.error}`);
    }
  }

  private resolveKey(url: string): string {
    return `${this.keyPrefix}${url}`;
  }

  private async execPipeline(commands: string[][]): Promise<UpstashPipelineResult[]> {
    const response = await fetch(`${this.endpoint}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Upstash request failed (${response.status}): ${bodyText}`);
    }

    const json = await response.json();
    return Array.isArray(json) ? (json as UpstashPipelineResult[]) : [];
  }
}
