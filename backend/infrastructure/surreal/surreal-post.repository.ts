import { RecordId, Surreal, Table } from 'surrealdb';
import { CreatePostInput, Post } from '../../domain/post';
import { PostRepository } from '../../domain/post.repository';
import { normalizePostRecord, pickSingleRecord } from './surreal-record.util';

export class SurrealPostRepository implements PostRepository {
  constructor(private readonly db: Surreal) {}

  async list(): Promise<Post[]> {
    const records = (await this.db.select(new Table('post'))) as
      | unknown[]
      | unknown;
    const list = Array.isArray(records) ? records : records ? [records] : [];

    return list
      .map((record) => normalizePostRecord(record))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async getById(id: string): Promise<Post | null> {
    const post = await this.db.select(new RecordId('post', id));
    const normalized = pickSingleRecord(post);

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

  async count(): Promise<number> {
    const queryResult = await this.db.query(
      'SELECT count() AS total FROM post GROUP ALL;'
    );

    const statements = queryResult as Array<{ result?: Array<{ total?: number }> }>;
    const total = statements?.[0]?.result?.[0]?.total;

    return typeof total === 'number' ? total : 0;
  }
}
