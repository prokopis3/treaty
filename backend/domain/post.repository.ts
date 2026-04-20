import { CreatePostInput, Post, PostListQuery, UpdatePostInput } from './post';

export interface PostRepository {
  list(query: PostListQuery): Promise<Post[]>;
  getById(id: string): Promise<Post | null>;
  create(input: CreatePostInput): Promise<Post>;
  update(id: string, input: UpdatePostInput): Promise<Post | null>;
  count(): Promise<number>;
}
