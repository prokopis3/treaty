export type PostModel = {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: string;
};

export type CreatePostPayload = {
  title: string;
  content: string;
  source?: string;
};
