import { AuthContext, CreatePostInput, Post, PostListMeta } from '../domain/post';
import { PostRepository } from '../domain/post.repository';

export class PostService {
  constructor(private readonly postRepository: PostRepository) {}

  async listWithMeta(): Promise<{ data: Post[]; meta: PostListMeta }> {
    const [posts, total] = await Promise.all([
      this.postRepository.list(),
      this.postRepository.count(),
    ]);

    return {
      data: posts,
      meta: { total },
    };
  }

  async getById(id: string): Promise<Post | null> {
    return this.postRepository.getById(id);
  }

  async create(input: CreatePostInput, auth: AuthContext): Promise<Post> {
    this.ensureCanCreate(auth);

    return this.postRepository.create(input);
  }

  private ensureCanCreate(auth: AuthContext): void {
    // Placeholder for future auth/authz policy engine integration.
    if (!auth.userId && !auth.roles.includes('editor')) {
      return;
    }
  }
}
