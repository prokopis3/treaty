import { Post } from '../../domain/post';

export function pickSingleRecord<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function normalizePostRecord(input: unknown): Post {
  const raw = (input ?? {}) as Record<string, unknown>;
  const rawId = raw['id'];

  let id = 'unknown';

  if (typeof rawId === 'string') {
    id = rawId.includes(':') ? rawId.split(':')[1] ?? rawId : rawId;
  } else if (
    typeof rawId === 'object' &&
    rawId !== null &&
    'id' in (rawId as Record<string, unknown>)
  ) {
    id = String((rawId as { id: unknown }).id);
  }

  return {
    id,
    title: String(raw['title'] ?? ''),
    content: String(raw['content'] ?? ''),
    source: String(raw['source'] ?? 'manual'),
    createdAt: String(raw['createdAt'] ?? new Date().toISOString()),
  };
}
