import { Elysia } from 'elysia';
import { PostService } from '../../../../application/post.service';
import { createApiGroupPolicy } from '../../api-group-policy';
import {
  createPostBodySchema,
  listPostsQuerySchema,
  postIdParamsSchema,
  updatePostBodySchema,
} from './post.schemas';
import { createPost, getPost, listPosts, updatePost } from './post.operations';

const routePolicy = createApiGroupPolicy('posts');

export const createPostsApi = (postService: PostService) =>
  new Elysia({ name: 'api.posts' })
    .get(
      '/posts',
      routePolicy.read('list', async (context: any) => {
        const result = await listPosts(postService, context.query);

        return {
          data: result.data,
          meta: result.meta,
        };
      }),
      {
        query: listPostsQuerySchema,
      }
    )
    .get(
      '/posts/:id',
      routePolicy.read('getById', async (context: any) => {
        const id = context.params.id;
        const set = context.set;
        const post = await getPost(postService, id);

        if (!post) {
          set.status = 404;
          return { data: null };
        }

        return { data: post };
      }),
      {
        params: postIdParamsSchema,
      }
    )
    .post(
      '/posts',
      routePolicy.write('create', async (context: any) => {
        const body = context.body;
        const headers = context.headers;
        const created = await createPost(postService, body, headers);

        return { data: created };
      }),
      {
        body: createPostBodySchema,
      }
    )
    .put(
      '/posts/:id',
      routePolicy.write('update', async (context: any) => {
        const id = context.params.id;
        const body = context.body;
        const headers = context.headers;
        const updated = await updatePost(postService, id, body, headers);

        if (!updated) {
          context.set.status = 404;
          return { data: null };
        }

        return { data: updated };
      }),
      {
        params: postIdParamsSchema,
        body: updatePostBodySchema,
      }
    );
