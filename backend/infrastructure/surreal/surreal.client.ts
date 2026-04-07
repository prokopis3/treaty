import { Surreal } from 'surrealdb';
import {
  getSurrealConnectionConfig,
  type SurrealConnectionConfig,
} from './surreal.config';

async function authenticate(
  db: Surreal,
  config: SurrealConnectionConfig
): Promise<void> {
  if (
    config.accessToken
    && (config.authMode === 'token' || !config.username || !config.password)
  ) {
    await db.authenticate(config.accessToken);
    return;
  }

  if (!config.username || !config.password) {
    return;
  }

  switch (config.authMode) {
    case 'root':
      await db.signin({
        username: config.username,
        password: config.password,
      });
      return;
    case 'namespace':
      await db.signin({
        namespace: config.namespace,
        username: config.username,
        password: config.password,
      });
      return;
    case 'database':
      await db.signin({
        namespace: config.namespace,
        database: config.database,
        username: config.username,
        password: config.password,
      });
      return;
    case 'none':
    default:
      return;
  }
}

export async function createSurrealClient(
  config: SurrealConnectionConfig = getSurrealConnectionConfig()
): Promise<Surreal> {
  const db = new Surreal();

  const opts = config.strict ? { reconnect: true } : undefined;
  await db.connect(config.endpoint, opts);
  await authenticate(db, config);
  await db.use({ namespace: config.namespace, database: config.database });

  return db;
}
