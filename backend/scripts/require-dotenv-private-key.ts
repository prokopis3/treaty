const key = process.env['DOTENV_PRIVATE_KEY_PRODUCTION']?.trim();

if (!key) {
  throw new Error(
    'Missing DOTENV_PRIVATE_KEY_PRODUCTION. Set this secret in your shell/CI before running production Docker/Cloudflare deploy commands.'
  );
}

console.log('DOTENV_PRIVATE_KEY_PRODUCTION is set.');