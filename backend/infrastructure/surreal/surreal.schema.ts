import { Surreal } from 'surrealdb';

const schemaStatements = [
  'DEFINE TABLE IF NOT EXISTS post SCHEMAFULL;',
  'DEFINE FIELD IF NOT EXISTS title ON TABLE post TYPE string;',
  'DEFINE FIELD IF NOT EXISTS content ON TABLE post TYPE string;',
  'DEFINE FIELD IF NOT EXISTS source ON TABLE post TYPE string DEFAULT "manual";',
  'DEFINE FIELD IF NOT EXISTS createdAt ON TABLE post TYPE datetime;',
  'DEFINE INDEX IF NOT EXISTS post_created_at_idx ON TABLE post COLUMNS createdAt;',
  'DEFINE TABLE IF NOT EXISTS url SCHEMAFULL;',
  'DEFINE FIELD IF NOT EXISTS content ON TABLE url TYPE string;',
  'DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE url TYPE datetime;',
];

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const withKind = error as { kind?: unknown; message?: unknown };
  if (withKind.kind === 'AlreadyExists') {
    return true;
  }

  return typeof withKind.message === 'string'
    && withKind.message.toLowerCase().includes('already exists');
}

export async function ensureSurrealSchema(db: Surreal): Promise<void> {
  for (const statement of schemaStatements) {
    try {
      await db.query(statement);
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
    }
  }
}
