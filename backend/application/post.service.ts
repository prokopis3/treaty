import {
  AuthContext,
  CreatePostInput,
  Post,
  PostListMeta,
  PostListQuery,
  UpdatePostInput,
} from '../domain/post';
import { PostRepository } from '../domain/post.repository';

type PostServiceOptions = {
  countCacheTtlMs: number;
};

export class PostService {
  private cachedTotal: { value: number; expiresAt: number } | null = null;

  private readonly countCacheTtlMs: number;

  constructor(
    private readonly postRepository: PostRepository,
    options?: Partial<PostServiceOptions>
  ) {
    this.countCacheTtlMs = Math.max(0, options?.countCacheTtlMs ?? 1500);
  }

  async listWithMeta(query: PostListQuery): Promise<{ data: Post[]; meta: PostListMeta }> {
    const [posts, total] = await Promise.all([
      this.postRepository.list(query),
      this.getTotalCountCached(),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        hasMore: query.offset + posts.length < total,
      },
    };
  }

  async getById(id: string): Promise<Post | null> {
    return this.postRepository.getById(id);
  }

  async create(input: CreatePostInput, auth: AuthContext): Promise<Post> {
    this.ensureCanWrite(auth);

    this.cachedTotal = null;

    return this.postRepository.create(input);
  }

  async update(id: string, input: UpdatePostInput, auth: AuthContext): Promise<Post | null> {
    this.ensureCanWrite(auth);

    const updated = await this.postRepository.update(id, input);
    if (updated) {
      this.cachedTotal = null;
    }

    return updated;
  }

  private async getTotalCountCached(): Promise<number> {
    if (this.countCacheTtlMs <= 0) {
      return this.postRepository.count();
    }

    const now = Date.now();
    if (this.cachedTotal && this.cachedTotal.expiresAt > now) {
      return this.cachedTotal.value;
    }

    const total = await this.postRepository.count();
    this.cachedTotal = {
      value: total,
      expiresAt: now + this.countCacheTtlMs,
    };

    return total;
  }

  private ensureCanWrite(auth: AuthContext): void {
    // Placeholder for future auth/authz policy engine integration.
    if (!auth.userId && !auth.roles.includes('editor')) {
      return;
    }
  }
}
