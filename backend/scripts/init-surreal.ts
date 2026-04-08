import * as dotenvx from '@dotenvx/dotenvx';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedPosts } from '../application/post.seed';
import { SurrealPostRepository } from '../infrastructure/surreal/surreal-post.repository';
import { createSurrealClient } from '../infrastructure/surreal/surreal.client';
import { getSurrealConnectionConfig } from '../infrastructure/surreal/surreal.config';
import { ensureSurrealSchema } from '../infrastructure/surreal/surreal.schema';
import { scopedLogger } from '../infrastructure/logging/logger';

dotenvx.config({ quiet: true, overload: true });

function hydrateEnvFromDotEnv(): void {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    const current = process.env[key]?.trim();
    if (!current) {
      process.env[key] = value;
    }
  }
}

hydrateEnvFromDotEnv();

const config = getSurrealConnectionConfig();
const db = await createSurrealClient(config);
const logger = scopedLogger('surreal:init');

try {
  await ensureSurrealSchema(db);
  await seedPosts(new SurrealPostRepository(db));

  logger.success(
    `Initialized Surreal schema on ${config.endpoint} (${config.namespace}/${config.database})`
  );
} finally {
  if ('invalidate' in db && typeof db.invalidate === 'function') {
    await db.invalidate();
  } else if ('close' in db && typeof db.close === 'function') {
    await db.close();
  }
}
