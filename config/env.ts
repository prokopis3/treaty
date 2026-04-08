import * as dotenvx from '@dotenvx/dotenvx';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const nodeEnvForFileSelection = process.env['NODE_ENV'] || 'development';
const defaultEnvFile = '.env';
const developmentEnvFile = '.env.dev';

const envFileToLoad = (() => {
  if (nodeEnvForFileSelection !== 'development') {
    return defaultEnvFile;
  }

  const developmentEnvPath = resolve(process.cwd(), developmentEnvFile);

  if (existsSync(developmentEnvPath)) {
    return developmentEnvFile;
  }

  console.warn(`Environment file ${developmentEnvFile} was not found. Falling back to ${defaultEnvFile}.`);
  return defaultEnvFile;
})();

dotenvx.config({ path: envFileToLoad, quiet: true });

const getEnv = () => {
  const nodeEnv = process.env['NODE_ENV'] || 'development';

  const env = {
    NODE_ENV: nodeEnv,
    HOST: process.env['HOST'] || 'localhost',
    PORT: parseInt(process.env['PORT'] || '4201', 10),
    APP_LOG_LEVEL: process.env['APP_LOG_LEVEL'] || '',
    APP_DEBUG_LOGS: process.env['APP_DEBUG_LOGS'] || 'false',
    NO_COLOR: process.env['NO_COLOR'] || '',
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
export type Env = typeof env;
