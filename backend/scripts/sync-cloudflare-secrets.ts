import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const secretKeys = (process.env['CF_SECRET_KEYS'] || '')
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean);

const secretKeysRaw = process.env['CF_SECRET_KEYS'] || '';

if (secretKeysRaw.trim().startsWith('encrypted:')) {
  throw new Error(
    'CF_SECRET_KEYS is still encrypted at runtime. DOTENV_PRIVATE_KEY_PRODUCTION is missing or incorrect for this .env.production file.'
  );
}

const isValidSecretName = (value: string): boolean => /^[A-Z_][A-Z0-9_]*$/.test(value);

const validSecretKeys = secretKeys.filter((key) => isValidSecretName(key));
const invalidSecretKeys = secretKeys.filter((key) => !isValidSecretName(key));

if (invalidSecretKeys.length > 0) {
  console.warn(
    `Skipping invalid CF_SECRET_KEYS entries: ${invalidSecretKeys.join(', ')}. ` +
    'Use comma-separated ENV variable names like API_TOKEN, DB_PASSWORD.'
  );
}

if (validSecretKeys.length === 0) {
  console.log('No Cloudflare Worker secrets configured; skipping secret sync.');
  process.exit(0);
}

const wranglerConfigPath = resolve('.wrangler/deploy/wrangler.production.toml');
const bunxCommand = process.platform === 'win32' ? 'bunx.cmd' : 'bunx';

const putSecret = (key: string, value: string): Promise<void> => {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      bunxCommand,
      ['wrangler', 'secret', 'put', key, '--config', wranglerConfigPath],
      {
        env: process.env,
        stdio: ['pipe', 'inherit', 'inherit'],
      }
    );

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`wrangler secret put ${key} failed with exit code ${code ?? 'unknown'}`));
    });

    child.stdin.write(`${value}\n`);
    child.stdin.end();
  });
};

for (const key of validSecretKeys) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing value for Cloudflare secret ${key}.`);
  }

  await putSecret(key, value);
}

console.log(`Synced ${validSecretKeys.length} Cloudflare Worker secret(s).`);