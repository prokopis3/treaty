import { createConsola, type ConsolaInstance } from 'consola';

type AppLogLevel = 'silent' | 'error' | 'warn' | 'log' | 'info' | 'debug' | 'trace';

function resolveLogLevel(): AppLogLevel {
  const explicitLevel = (process.env['APP_LOG_LEVEL'] ?? '').toLowerCase();
  const debugEnabled = ['1', 'true', 'yes', 'on'].includes(
    (process.env['APP_DEBUG_LOGS'] ?? '').toLowerCase()
  );

  if (debugEnabled) {
    return 'debug';
  }

  switch (explicitLevel) {
    case 'silent':
    case 'error':
    case 'warn':
    case 'log':
    case 'info':
    case 'debug':
    case 'trace':
      return explicitLevel;
    default:
      return process.env['NODE_ENV'] === 'production' ? 'info' : 'debug';
  }
}

function toConsolaLevel(level: AppLogLevel): number {
  switch (level) {
    case 'silent':
      return -999;
    case 'error':
      return 0;
    case 'warn':
      return 1;
    case 'log':
      return 2;
    case 'info':
      return 3;
    case 'debug':
      return 4;
    case 'trace':
      return 5;
    default:
      return 3;
  }
}

const appLogLevel = toConsolaLevel(resolveLogLevel());

export const appLogger = createConsola({
  level: appLogLevel,
  formatOptions: {
    date: true,
    colors: !process.env['NO_COLOR'],
  },
});

export function scopedLogger(tag: string): ConsolaInstance {
  return appLogger.withTag(tag);
}
