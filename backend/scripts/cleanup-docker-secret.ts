import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const OUTPUT_PATH = process.env.DOTENV_PRIVATE_KEY_FILE || '.docker/secrets/dotenv_private_key_production'
const outputPath = resolve(OUTPUT_PATH)

if (existsSync(outputPath)) {
  rmSync(outputPath, { recursive: true, force: true })
  console.log(`Removed Docker secret file at ${OUTPUT_PATH}`)
} else {
  console.log(`Docker secret file not found at ${OUTPUT_PATH}`)
}
