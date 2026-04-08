import * as dotenvx from '@dotenvx/dotenvx';
import { seedPosts } from '../application/post.seed';
import { SurrealPostRepository } from '../infrastructure/surreal/surreal-post.repository';
import { createSurrealClient } from '../infrastructure/surreal/surreal.client';
import { getSurrealConnectionConfig } from '../infrastructure/surreal/surreal.config';
import { ensureSurrealSchema } from '../infrastructure/surreal/surreal.schema';
import { scopedLogger } from '../infrastructure/logging/logger';

dotenvx.config({ quiet: true, overload: true });

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
