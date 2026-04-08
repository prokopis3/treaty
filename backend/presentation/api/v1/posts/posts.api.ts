import { Elysia } from 'elysia';
import { PostService } from '../../../../application/post.service';
import { createPostBodySchema, postIdParamsSchema } from './post.schemas';
import { createPost, getPost, listPosts } from './post.operations';

export const createPostsApi = (postService: PostService) =>
  new Elysia({ name: 'api.posts' })
    .get('/posts', async () => {
      const result = await listPosts(postService);

      return {
        data: result.data,
        meta: result.meta,
      };
    })
    .get(
      '/posts/:id',
      async ({ params: { id }, set }) => {
        const post = await getPost(postService, id);

        if (!post) {
          set.status = 404;
          return { data: null };
        }

        return { data: post };
      },
      {
        params: postIdParamsSchema,
      }
    )
    .post(
      '/posts',
      async ({ body, headers }) => {
        const created = await createPost(postService, body, headers);

        return { data: created };
      },
      {
        body: createPostBodySchema,
      }
    );
