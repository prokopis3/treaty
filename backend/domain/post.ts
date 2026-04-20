export type Post = {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: string;
};

export type CreatePostInput = {
  id?: string;
  title: string;
  content: string;
  source?: string;
};

export type UpdatePostInput = {
  title?: string;
  content?: string;
  source?: string;
};

export type PostListMeta = {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type PostListQuery = {
  limit: number;
  offset: number;
  page: number;
};

export type AuthContext = {
  userId: string | null;
  roles: string[];
};
