export type SurrealAuthMode = 'none' | 'database' | 'namespace' | 'root' | 'token';

export type SurrealConnectionConfig = {
  endpoint: string;
  namespace: string;
  database: string;
  username?: string;
  password?: string;
  accessToken?: string;
  authMode: SurrealAuthMode;
  strict: boolean;
};

const DEFAULT_ENDPOINT = 'ws://127.0.0.1:8000/rpc';

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEndpoint(endpoint: string): string {
  if (endpoint === 'memory') {
    return DEFAULT_ENDPOINT;
  }

  if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
    return endpoint
      .replace(/\/+$/, '')
      // .replace(/\/rpc$/i, '');
  }

  return endpoint;
}

export function getSurrealConnectionConfig(
  env: Record<string, string | undefined> = process.env
): SurrealConnectionConfig {
  const endpoint = normalizeEndpoint(
    clean(env['SURREAL_ENDPOINT']) ?? DEFAULT_ENDPOINT
  );
  const accessToken = clean(env['SURREAL_ACCESS_TOKEN']);
  const username = clean(env['SURREAL_USERNAME']);
  const password = clean(env['SURREAL_PASSWORD']);
  const authMode = (clean(env['SURREAL_AUTH_MODE']) as SurrealAuthMode | undefined)
    ?? (accessToken ? 'token' : username && password ? 'database' : 'none');

  return {
    endpoint,
    namespace: clean(env['SURREAL_NAMESPACE']) ?? 'test',
    database: clean(env['SURREAL_DATABASE']) ?? 'test',
    username,
    password,
    accessToken,
    authMode,
    strict: clean(env['SURREAL_STRICT']) === 'true',
  };
}

export function isRemoteSurreal(config: SurrealConnectionConfig): boolean {
  return config.endpoint.startsWith('wss://') || config.endpoint.startsWith('https://');
}
