import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const wranglerTemplate = await Bun.file(resolve('wrangler.toml')).text();

const readTomlString = (key: string, fallback: string): string => {
  const match = wranglerTemplate.match(new RegExp(`^${key}\\s*=\\s*\"([^\"]+)\"`, 'm'));
  return match?.[1] ?? fallback;
};

const readTomlBoolean = (key: string, fallback: boolean): boolean => {
  const match = wranglerTemplate.match(new RegExp(`^${key}\\s*=\\s*(true|false)`, 'm'));
  return match ? match[1] === 'true' : fallback;
};

const quoteToml = (value: string): string => JSON.stringify(value);
const clean = (value?: string): string => value?.trim() ?? '';
const isEncryptedPlaceholder = (value?: string): boolean => clean(value).startsWith('encrypted:');

const originUrl = clean(process.env['CF_ORIGIN_URL']) || clean(process.env['ORIGIN_URL']);

if (!originUrl) {
  throw new Error('Missing CF_ORIGIN_URL for Cloudflare deploy generation.');
}

if (isEncryptedPlaceholder(originUrl)) {
  throw new Error(
    'CF_ORIGIN_URL is still encrypted at runtime. DOTENV_PRIVATE_KEY_PRODUCTION is missing or incorrect for this .env.production file.'
  );
}

const secretKeysRaw = clean(process.env['CF_SECRET_KEYS']);

if (isEncryptedPlaceholder(secretKeysRaw)) {
  throw new Error(
    'CF_SECRET_KEYS is still encrypted at runtime. DOTENV_PRIVATE_KEY_PRODUCTION is missing or incorrect for this .env.production file.'
  );
}

const isValidSecretName = (value: string): boolean => /^[A-Z_][A-Z0-9_]*$/.test(value);

const secretKeys = secretKeysRaw
  .split(',')
  .map((key) => key.trim())
  .filter((key) => key && isValidSecretName(key));

const deployDir = resolve('.wrangler/deploy');
const configPath = resolve(deployDir, 'wrangler.production.toml');
const entrypointFromTemplate = readTomlString('main', 'cloudflare/worker.ts');
const entrypointAbsolutePath = isAbsolute(entrypointFromTemplate)
  ? entrypointFromTemplate
  : resolve(entrypointFromTemplate);
const generatedMainPath = relative(deployDir, entrypointAbsolutePath).replaceAll('\\', '/');

const lines = [
  `name = ${quoteToml(readTomlString('name', 'treaty'))}`,
  `main = ${quoteToml(generatedMainPath)}`,
  `compatibility_date = ${quoteToml(readTomlString('compatibility_date', '2026-04-07'))}`,
  `workers_dev = ${readTomlBoolean('workers_dev', true) ? 'true' : 'false'}`,
  '',
  '[vars]',
  `ORIGIN_URL = ${quoteToml(originUrl)}`,
];

if (secretKeys.length > 0) {
  lines.push('', '[secrets]', `required = [${secretKeys.map(quoteToml).join(', ')}]`);
}

await mkdir(deployDir, { recursive: true });
await writeFile(configPath, `${lines.join('\n')}\n`, 'utf8');
await writeFile(
  resolve(deployDir, 'config.json'),
  `${JSON.stringify({ configPath: './wrangler.production.toml' }, null, 2)}\n`,
  'utf8'
);

console.log(`Generated Cloudflare deploy config at ${configPath}`);