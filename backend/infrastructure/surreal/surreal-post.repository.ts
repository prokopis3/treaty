import { RecordId, Surreal, Table } from 'surrealdb';
import {
  CreatePostInput,
  Post,
  PostListQuery,
  UpdatePostInput,
} from '../../domain/post';
import { PostRepository } from '../../domain/post.repository';
import { normalizePostRecord, pickSingleRecord } from './surreal-record.util';

type LegacyQueryStatement<T> = {
  result?: T[];
};

function extractQueryRows<T>(queryResult: unknown, statementIndex: number = 0): T[] {
  if (!Array.isArray(queryResult)) {
    return [];
  }

  const statement = queryResult[statementIndex];
  if (Array.isArray(statement)) {
    return statement as T[];
  }

  if (statement && typeof statement === 'object') {
    const maybeLegacy = statement as LegacyQueryStatement<T>;
    if (Array.isArray(maybeLegacy.result)) {
      return maybeLegacy.result;
    }
  }

  return [];
}

export class SurrealPostRepository implements PostRepository {
  constructor(private readonly db: Surreal) {}

  async list(query: PostListQuery): Promise<Post[]> {
    const queryResult = await this.db.query(
      'SELECT * FROM post ORDER BY createdAt DESC LIMIT $limit START $offset;',
      {
        limit: query.limit,
        offset: query.offset,
      }
    );

    const list = extractQueryRows<unknown>(queryResult);

    return list.map((record) => normalizePostRecord(record));
  }

  async getById(id: string): Promise<Post | null> {
    const post = await this.db.select(new RecordId('post', id));
    const normalized = pickSingleRecord(post);

    if (typeof normalized === 'string') {
      return null;
    }

    return normalized ? normalizePostRecord(normalized) : null;
  }

  async create(input: CreatePostInput): Promise<Post> {
    const data = {
      title: input.title,
      content: input.content,
      source: input.source ?? 'manual',
      createdAt: new Date(),
    };

    const created =
      'id' in input && typeof (input as { id?: unknown }).id === 'string'
        ? await this.db
          .create(new RecordId('post', (input as { id: string }).id))
          .content(data)
        : await this.db.create(new Table('post')).content(data);

    return normalizePostRecord(pickSingleRecord(created));
  }

  async update(id: string, input: UpdatePostInput): Promise<Post | null> {
    const recordId = new RecordId('post', id);
    const existing = await this.db.select(recordId);

    if (!pickSingleRecord(existing)) {
      return null;
    }

    const patch: Record<string, string> = {};

    if (typeof input.title === 'string') {
      patch['title'] = input.title;
    }

    if (typeof input.content === 'string') {
      patch['content'] = input.content;
    }

    if (typeof input.source === 'string') {
      patch['source'] = input.source;
    }

    const updated = await this.db.update(recordId).merge(patch);
    const normalized = pickSingleRecord(updated);

    return normalized ? normalizePostRecord(normalized) : null;
  }

  async count(): Promise<number> {
    const queryResult = await this.db.query(
      'SELECT count() AS total FROM post GROUP ALL;'
    );

    const firstRow = extractQueryRows<{ total?: number }>(queryResult)[0];
    const total = firstRow?.total;

    return typeof total === 'number' ? total : 0;
  }
}
