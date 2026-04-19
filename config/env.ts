import * as dotenvx from '@dotenvx/dotenvx';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const defaultEnvFile = '.env';
const developmentEnvFile = '.env.dev';
const productionEnvFile = '.env.production';
const truthyEnvValues = ['1', 'true', 'yes', 'on'];
let loadedEnvFile: string | null | undefined;

const readProcessEnv = (key: string): string | undefined => {
  return process.env[key];
};

const isTruthyEnvValue = (value?: string): boolean => {
  return truthyEnvValues.includes((value || '').toLowerCase());
};

const resolveEnvFileToLoad = (nodeEnvForFileSelection: string): string | null => {
  if (nodeEnvForFileSelection === 'development') {
    const developmentEnvPath = resolve(process.cwd(), developmentEnvFile);

    if (existsSync(developmentEnvPath)) {
      return developmentEnvFile;
    }

    const defaultEnvPath = resolve(process.cwd(), defaultEnvFile);
    if (existsSync(defaultEnvPath)) {
      console.warn(`Environment file ${developmentEnvFile} was not found. Falling back to ${defaultEnvFile}.`);
      return defaultEnvFile;
    }

    return null;
  }

  if (nodeEnvForFileSelection === 'production') {
    const productionEnvPath = resolve(process.cwd(), productionEnvFile);

    if (existsSync(productionEnvPath)) {
      return productionEnvFile;
    }

    const defaultEnvPath = resolve(process.cwd(), defaultEnvFile);
    if (existsSync(defaultEnvPath)) {
      console.warn(`Environment file ${productionEnvFile} was not found. Falling back to ${defaultEnvFile}.`);
      return defaultEnvFile;
    }

    return null;
  }

  const defaultEnvPath = resolve(process.cwd(), defaultEnvFile);
  return existsSync(defaultEnvPath) ? defaultEnvFile : null;
};

const ensureEnvFileLoaded = (nodeEnvForFileSelection: string): void => {
  if (loadedEnvFile !== undefined) {
    return;
  }

  const envFileToLoad = resolveEnvFileToLoad(nodeEnvForFileSelection);

  if (envFileToLoad) {
    dotenvx.config({ path: envFileToLoad, quiet: true });
  }

  loadedEnvFile = envFileToLoad;
};

const getEnv = () => {
  const nodeEnv = readProcessEnv('NODE_ENV') || 'development';

  ensureEnvFileLoaded(nodeEnv);

  const env = {
    NODE_ENV: nodeEnv,
    HOST: readProcessEnv('HOST') || 'localhost',
    PORT: parseInt(readProcessEnv('PORT') || '4201', 10),
    APP_LOG_LEVEL: readProcessEnv('APP_LOG_LEVEL') || '',
    APP_DEBUG_LOGS: readProcessEnv('APP_DEBUG_LOGS') || 'false',
    NO_COLOR: isTruthyEnvValue(readProcessEnv('NO_COLOR')),
    OTEL_ENABLED_DEV: isTruthyEnvValue(readProcessEnv('OTEL_ENABLED_DEV')),
    OTEL_ENABLED_PROD: isTruthyEnvValue(readProcessEnv('OTEL_ENABLED_PROD')),
    OTEL_EXPORTER_OTLP_ENDPOINT: readProcessEnv('OTEL_EXPORTER_OTLP_ENDPOINT') || '',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: readProcessEnv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT') || '',
    SERVER_TIMING_ENABLED: isTruthyEnvValue(readProcessEnv('SERVER_TIMING_ENABLED')),
    CORS_ORIGIN: readProcessEnv('CORS_ORIGIN') || '',
    CORS_CREDENTIALS: readProcessEnv('CORS_CREDENTIALS') || 'false',
    SURREAL_ENDPOINT: readProcessEnv('SURREAL_ENDPOINT') || '',
    SURREAL_NAMESPACE: readProcessEnv('SURREAL_NAMESPACE') || '',
    SURREAL_DATABASE: readProcessEnv('SURREAL_DATABASE') || '',
    SURREAL_AUTH_MODE: readProcessEnv('SURREAL_AUTH_MODE') || '',
    SURREAL_USERNAME: readProcessEnv('SURREAL_USERNAME') || '',
    SURREAL_PASSWORD: readProcessEnv('SURREAL_PASSWORD') || '',
    SURREAL_ACCESS_TOKEN: readProcessEnv('SURREAL_ACCESS_TOKEN') || '',
    SURREAL_STRICT: readProcessEnv('SURREAL_STRICT') || 'false',
    CLOUDFLARED_TOKEN: readProcessEnv('CLOUDFLARED_TOKEN') || '',
    NODE_CLUSTER: readProcessEnv('NODE_CLUSTER') || 'auto',
    NODE_CLUSTER_MAX_WORKERS: parseInt(readProcessEnv('NODE_CLUSTER_MAX_WORKERS') || '0', 10),
    NODE_CLUSTER_DB_CONNECTION_BUDGET: parseInt(readProcessEnv('NODE_CLUSTER_DB_CONNECTION_BUDGET') || '0', 10),
    NODE_CLUSTER_DB_CONNECTIONS_PER_WORKER: parseInt(readProcessEnv('NODE_CLUSTER_DB_CONNECTIONS_PER_WORKER') || '2', 10),
    RUN_AS_BIN: readProcessEnv('RUN_AS_BIN') === 'true',
    APP_DISABLE_DB: readProcessEnv('APP_DISABLE_DB') || 'false',
    APP_PAGE_CACHE_PROVIDER: readProcessEnv('APP_PAGE_CACHE_PROVIDER') || 'surreal',
    APP_PAGE_CACHE_KEY_PREFIX: readProcessEnv('APP_PAGE_CACHE_KEY_PREFIX') || 'page-cache:',
    APP_PAGE_CACHE_TTL_SECONDS: parseInt(readProcessEnv('APP_PAGE_CACHE_TTL_SECONDS') || '0', 10),
    APP_HTML_CACHE_MODE: readProcessEnv('APP_HTML_CACHE_MODE') || 'shared-shell',
    APP_HTML_CACHE_ALLOWLIST: readProcessEnv('APP_HTML_CACHE_ALLOWLIST') || '/,/posts,/post/*',
    APP_HTML_CACHE_PREWARM_ROUTES: readProcessEnv('APP_HTML_CACHE_PREWARM_ROUTES') || '/,/posts',
    UPSTASH_REDIS_REST_URL: readProcessEnv('UPSTASH_REDIS_REST_URL') || '',
    UPSTASH_REDIS_REST_TOKEN: readProcessEnv('UPSTASH_REDIS_REST_TOKEN') || '',
  } as const;

  if (env.NODE_ENV === 'production') {
    const required = ['SURREAL_ENDPOINT', 'SURREAL_NAMESPACE', 'SURREAL_DATABASE'] as const;

    required.forEach((key) => {
      if (!env[key]) {
        console.warn(`Missing required environment variable in production: ${key}`);
      }
    });

    if (env.APP_PAGE_CACHE_PROVIDER.toLowerCase() === 'upstash') {
      const requiredUpstash = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const;

      requiredUpstash.forEach((key) => {
        if (!env[key]) {
          console.warn(`Missing required Upstash cache variable in production: ${key}`);
        }
      });
    }
  }

  return env;
};

export const env = getEnv();
export const isDevelopment = env.NODE_ENV !== 'production';
export const isProduction = env.NODE_ENV === 'production';
export type Env = typeof env;
