const smokeHost = '127.0.0.1';
const timeoutMs = 25000;

export {};

type RuntimeMode = {
  name: string;
  cmd: string[];
  skip?: boolean;
};

const runtimeModes: RuntimeMode[] = [
  {
    name: 'bundle',
    cmd: ['bun', '--no-env-file', 'dist/treaty/server/server.bundle.mjs'],
  },
  {
    name: 'bin',
    cmd: [
      process.platform === 'win32'
        ? 'dist/runtime/treaty-server.exe'
        : 'dist/runtime/treaty-server',
    ],
    skip: process.platform === 'win32',
  },
];

const sleep = (ms: number) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function waitForHealth(url: string, timeout: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore connection errors while process is still booting.
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for healthy endpoint: ${url}`);
}

async function assertSsrHtml(url: string): Promise<void> {
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`SSR request failed with status ${response.status}`);
  }

  if (!body.toLowerCase().includes('<html')) {
    throw new Error('SSR response did not contain HTML markup');
  }
}

async function runMode(mode: RuntimeMode, index: number): Promise<void> {
  if (mode.skip) {
    console.log(`[ssr-smoke] skipping ${mode.name} on this platform`);
    return;
  }

  const port = 4310 + index;
  const healthUrl = `http://${smokeHost}:${port}/api/health`;
  const homeUrl = `http://${smokeHost}:${port}/`;

  const child = Bun.spawn({
    cmd: mode.cmd,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      HOST: smokeHost,
      APP_DISABLE_DB: 'true',
      RUN_AS_BIN: mode.name === 'bin' ? 'true' : 'false',
      APP_LOG_LEVEL: 'error',
      APP_DEBUG_LOGS: 'false',
      OTEL_ENABLED_DEV: 'false',
      OTEL_ENABLED_PROD: 'false',
      SERVER_TIMING_ENABLED: 'false',
      NO_COLOR: '1',
    },
  });

  let finished = false;

  try {
    await waitForHealth(healthUrl, timeoutMs);
    await assertSsrHtml(homeUrl);
    console.log(`[ssr-smoke] ${mode.name} passed`);
  } catch (error) {
    finished = true;
    child.kill();
    await child.exited;
    throw error;
  }

  if (!finished) {
    child.kill();
    await child.exited;
  }
}

for (const [index, mode] of runtimeModes.entries()) {
  await runMode(mode, index);
}

console.log('[ssr-smoke] all runtime modes passed');
