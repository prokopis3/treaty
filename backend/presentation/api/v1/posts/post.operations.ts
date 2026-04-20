import { PostService } from '../../../../application/post.service';
import { env } from '../../../../../config/env';
import { createAuthContext } from '../../auth-context';

type ListPostsQueryInput = {
  page?: number;
  limit?: number;
};

export async function listPosts(
  postService: PostService,
  query: ListPostsQueryInput
) {
  const maxLimit = Math.max(1, env.API_POSTS_MAX_LIMIT);
  const defaultLimit = Math.max(1, Math.min(env.API_POSTS_DEFAULT_LIMIT, maxLimit));
  const limit = Math.max(1, Math.min(Math.floor(query.limit ?? defaultLimit), maxLimit));
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const offset = (page - 1) * limit;

  return postService.listWithMeta({
    page,
    limit,
    offset,
  });
}

export async function getPost(postService: PostService, id: string) {
  return postService.getById(id);
}

export async function createPost(
  postService: PostService,
  body: {
    title: string;
    content: string;
    source?: string;
  },
  headers: Record<string, string | undefined>
) {
  const auth = createAuthContext(headers);
  return postService.create(body, auth);
}

export async function updatePost(
  postService: PostService,
  id: string,
  body: {
    title?: string;
    content?: string;
    source?: string;
  },
  headers: Record<string, string | undefined>
) {
  const auth = createAuthContext(headers);
  return postService.update(id, body, auth);
}
