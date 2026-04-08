import { PostService } from '../../../../application/post.service';
import { createAuthContext } from '../../auth-context';

export async function listPosts(postService: PostService) {
  return postService.listWithMeta();
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
