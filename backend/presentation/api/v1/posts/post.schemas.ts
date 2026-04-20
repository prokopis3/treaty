import { t } from 'elysia';

export const postIdParamsSchema = t.Object({
  id: t.String(),
});

export const createPostBodySchema = t.Object({
  title: t.String({ minLength: 3 }),
  content: t.String({ minLength: 10 }),
  source: t.Optional(t.String()),
});

export const updatePostBodySchema = t.Object({
  title: t.Optional(t.String({ minLength: 3 })),
  content: t.Optional(t.String({ minLength: 10 })),
  source: t.Optional(t.String()),
});

export const listPostsQuerySchema = t.Object({
  page: t.Optional(t.Number({ minimum: 1 })),
  limit: t.Optional(t.Number({ minimum: 1 })),
});
