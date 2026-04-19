import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'path';

const BROWSER_DIST_MARKER = 'dist/treaty/browser/';

async function extractEmbeddedBrowserDist(serverDistFolder: string): Promise<string | null> {
  const distOnDisk = join(serverDistFolder, 'dist/treaty/browser');
  if (existsSync(distOnDisk)) return null;

  const embeddedFiles = (Bun as unknown as { embeddedFiles?: ReadonlyArray<Blob> }).embeddedFiles;
  if (!embeddedFiles?.length) return null;

  const extractedRoot = join(tmpdir(), 'treaty-embedded-dist');
  let wroteFile = false;

  for (const embedded of embeddedFiles) {
    const normalized = embedded.name.replaceAll('\\', '/');
    const markerIndex = normalized.indexOf(BROWSER_DIST_MARKER);
    if (markerIndex === -1) continue;

    const outputPath = join(extractedRoot, normalized.slice(markerIndex));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, new Uint8Array(await embedded.arrayBuffer()));
    wroteFile = true;
  }

  return wroteFile ? join(extractedRoot, BROWSER_DIST_MARKER) : null;
}

export async function resolveBrowserDistFolder(
  serverDistFolder: string,
  usesBuiltServerArtifacts: boolean
): Promise<string> {
  if (usesBuiltServerArtifacts) {
    const candidates = [
      join(serverDistFolder, '..', 'browser'),
      join(process.cwd(), 'dist', 'treaty', 'browser'),
      join(dirname(process.execPath), 'dist', 'treaty', 'browser'),
      join(dirname(process.execPath), '..', 'treaty', 'browser'),
    ];

    return candidates.find(existsSync) ?? candidates[0];
  }

  const embedded = await extractEmbeddedBrowserDist(serverDistFolder);
  if (embedded) return embedded;

  const candidates = [
    join(serverDistFolder, 'dist/treaty/browser'),
    join(dirname(process.execPath), 'dist', 'treaty', 'browser'),
    join(dirname(process.execPath), '..', 'treaty', 'browser'),
    join(process.cwd(), 'dist', 'treaty', 'browser'),
  ];

  return candidates.find(existsSync) ?? join(serverDistFolder, 'dist/treaty/browser');
}

export function resolveIndexHtml(
  browserDistFolder: string,
  serverDistFolder: string,
  usesBuiltServerArtifacts: boolean
): string {
  if (usesBuiltServerArtifacts) {
    const candidates = [
      join(serverDistFolder, 'index.server.html'),
      join(serverDistFolder, 'dist/treaty/server/index.server.html'),
      join(process.cwd(), 'dist', 'treaty', 'server', 'index.server.html'),
      join(dirname(process.execPath), 'dist', 'treaty', 'server', 'index.server.html'),
      join(dirname(process.execPath), '..', 'treaty', 'server', 'index.server.html'),
    ];

    return candidates.find(existsSync) ?? candidates[0];
  }

  return existsSync(join(browserDistFolder, 'index.csr.html'))
    ? join(browserDistFolder, 'index.csr.html')
    : join(browserDistFolder, 'index.html');
}

export function resolveBrowserIndexHtml(browserDistFolder: string): string {
  return existsSync(join(browserDistFolder, 'index.csr.html'))
    ? join(browserDistFolder, 'index.csr.html')
    : join(browserDistFolder, 'index.html');
}

export function resolveServerMainEntry(
  serverDistFolder: string,
  usesBuiltServerArtifacts: boolean
): string {
  if (usesBuiltServerArtifacts) {
    const candidates = [
      join(serverDistFolder, 'main.server.mjs'),
      join(serverDistFolder, 'dist/treaty/server/main.server.mjs'),
      join(process.cwd(), 'dist', 'treaty', 'server', 'main.server.mjs'),
      join(dirname(process.execPath), 'dist', 'treaty', 'server', 'main.server.mjs'),
      join(dirname(process.execPath), '..', 'treaty', 'server', 'main.server.mjs'),
    ];

    return candidates.find(existsSync) ?? candidates[0];
  }

  return './src/main.server';
}
