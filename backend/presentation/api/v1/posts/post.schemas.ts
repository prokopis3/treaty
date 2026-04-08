import { t } from 'elysia';

export const postIdParamsSchema = t.Object({
  id: t.String(),
});

export const createPostBodySchema = t.Object({
  title: t.String({ minLength: 3 }),
  content: t.String({ minLength: 10 }),
  source: t.Optional(t.String()),
});
