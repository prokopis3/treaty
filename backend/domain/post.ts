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

export type PostListMeta = {
  total: number;
};

export type AuthContext = {
  userId: string | null;
  roles: string[];
};
