import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const candidates = [
  resolve('dist/runtime/treaty-server'),
  resolve('dist/runtime/treaty-server.exe'),
  resolve('dist/runtime/treaty-server-linux'),
  resolve('dist/runtime/treaty-server-local'),
  resolve('dist/runtime/treaty-server-local.exe'),
];

const runtimeBinary = candidates.find((candidate) => existsSync(candidate));

if (!runtimeBinary) {
  console.error(
    'No runtime binary found. Run build:runtime:bin (or build:runtime:bin:local) before server:prod:bin.'
  );
  process.exit(1);
}

const child = Bun.spawn({
  cmd: [runtimeBinary],
  stdio: ['inherit', 'inherit', 'inherit'],
  env: {
    ...process.env,
    RUN_AS_BIN: 'true',
  },
});

const shutdown = () => {
  child.kill();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const exitCode = await child.exited;
process.exit(exitCode ?? 0);
