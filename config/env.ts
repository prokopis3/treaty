import * as dotenvx from '@dotenvx/dotenvx';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const nodeEnvForFileSelection = process.env['NODE_ENV'] || 'development';
const defaultEnvFile = '.env';
const developmentEnvFile = '.env.dev';
const productionEnvFile = '.env.production';
const truthyEnvValues = ['1', 'true', 'yes', 'on'];

const isTruthyEnvValue = (value?: string): boolean => {
  return truthyEnvValues.includes((value || '').toLowerCase());
};

const envFileToLoad = (() => {
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
})();

if (envFileToLoad) {
  dotenvx.config({ path: envFileToLoad, quiet: true });
}

const getEnv = () => {
  const nodeEnv = process.env['NODE_ENV'] || 'development';

  const env = {
    NODE_ENV: nodeEnv,
    HOST: process.env['HOST'] || 'localhost',
    PORT: parseInt(process.env['PORT'] || '4201', 10),
    APP_LOG_LEVEL: process.env['APP_LOG_LEVEL'] || '',
    APP_DEBUG_LOGS: process.env['APP_DEBUG_LOGS'] || 'false',
    NO_COLOR: isTruthyEnvValue(process.env['NO_COLOR']),
    OTEL_ENABLED_DEV: isTruthyEnvValue(process.env['OTEL_ENABLED_DEV']),
    OTEL_ENABLED_PROD: isTruthyEnvValue(process.env['OTEL_ENABLED_PROD']),
    SERVER_TIMING_ENABLED: isTruthyEnvValue(process.env['SERVER_TIMING_ENABLED']),
    CORS_ORIGIN: process.env['CORS_ORIGIN'] || '',
    CORS_CREDENTIALS: process.env['CORS_CREDENTIALS'] || 'false',
    SURREAL_ENDPOINT: process.env['SURREAL_ENDPOINT'] || '',
    SURREAL_NAMESPACE: process.env['SURREAL_NAMESPACE'] || '',
    SURREAL_DATABASE: process.env['SURREAL_DATABASE'] || '',
    SURREAL_AUTH_MODE: process.env['SURREAL_AUTH_MODE'] || '',
    SURREAL_USERNAME: process.env['SURREAL_USERNAME'] || '',
    SURREAL_PASSWORD: process.env['SURREAL_PASSWORD'] || '',
    SURREAL_ACCESS_TOKEN: process.env['SURREAL_ACCESS_TOKEN'] || '',
    SURREAL_STRICT: process.env['SURREAL_STRICT'] || 'false',
    CLOUDFLARED_TOKEN: process.env['CLOUDFLARED_TOKEN'] || '',
  } as const;

  if (env.NODE_ENV === 'production') {
    const required = ['SURREAL_ENDPOINT', 'SURREAL_NAMESPACE', 'SURREAL_DATABASE'] as const;

    required.forEach((key) => {
      if (!env[key]) {
        console.warn(`Missing required environment variable in production: ${key}`);
      }
    });
  }

  return env;
};

export const env = getEnv();
export const isDevelopment = env.NODE_ENV !== 'production';
export const isProduction = env.NODE_ENV === 'production';
export type Env = typeof env;
