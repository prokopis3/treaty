import { CreatePostInput, Post } from './post';

export interface PostRepository {
  list(): Promise<Post[]>;
  getById(id: string): Promise<Post | null>;
  create(input: CreatePostInput): Promise<Post>;
  count(): Promise<number>;
}
