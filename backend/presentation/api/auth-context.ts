import { AuthContext } from '../../domain/post';

type HeadersLike = Record<string, string | undefined>;

export function createAuthContext(headers: HeadersLike): AuthContext {
  // Placeholder until real auth (JWT/session/API key) is added.
  const userId = headers['x-user-id'] ?? null;
  const rolesHeader = headers['x-user-roles'] ?? '';
  const roles = rolesHeader
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    userId,
    roles,
  };
}
