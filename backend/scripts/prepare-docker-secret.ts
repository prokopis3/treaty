import { mkdirSync, readFileSync, writeFileSync, existsSync, lstatSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const OUTPUT_PATH = process.env['DOTENV_PRIVATE_KEY_FILE'] || '.docker/secrets/dotenv_private_key_production'
const keyFromEnv = (process.env['DOTENV_PRIVATE_KEY_PRODUCTION'] || '').trim()

const parseEnvKeysFile = (): string => {
  if (!existsSync('.env.keys')) {
    return ''
  }

  const content = readFileSync('.env.keys', 'utf8')
  const line = content
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.startsWith('DOTENV_PRIVATE_KEY_PRODUCTION='))

  if (!line) {
    return ''
  }

  const rawValue = line.slice('DOTENV_PRIVATE_KEY_PRODUCTION='.length).trim()
  const unquoted = rawValue.replace(/^"|"$/g, '').replace(/^'|'$/g, '')

  const candidates = unquoted
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  // Dotenvx rotate can append keys; use the newest key by default.
  return candidates.at(-1) || ''
}

const selectedKey = keyFromEnv || parseEnvKeysFile()

if (!selectedKey) {
  console.error(
    'Unable to prepare Docker secret. Set DOTENV_PRIVATE_KEY_PRODUCTION or add DOTENV_PRIVATE_KEY_PRODUCTION to .env.keys.',
  )
  process.exit(1)
}

const outputPath = resolve(OUTPUT_PATH)
mkdirSync(dirname(outputPath), { recursive: true })

if (existsSync(outputPath) && lstatSync(outputPath).isDirectory()) {
  rmSync(outputPath, { recursive: true, force: true })
}

writeFileSync(outputPath, selectedKey, { encoding: 'utf8', flag: 'w' })

console.log(`Prepared Docker secret file at ${OUTPUT_PATH}`)
