type CorsConfig = {
  origin?: string[];
  credentials?: boolean;
};

export function getCorsConfig(
  env: Record<string, string | undefined> = process.env
): CorsConfig {
  const rawOrigins = env['CORS_ORIGIN'] ?? '';
  const origins = rawOrigins
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const config: CorsConfig = {};

  if (origins.length > 0 && !origins.includes('*')) {
    config.origin = origins;
  }

  if ((env['CORS_CREDENTIALS'] ?? '').toLowerCase() === 'true') {
    config.credentials = true;
  }

  return config;
}
