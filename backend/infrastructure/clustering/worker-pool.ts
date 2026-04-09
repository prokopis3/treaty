/**
 * Worker Management Module
 * 
 * Handles spawning, monitoring, and lifecycle of cluster worker processes
 */

import type { ConsolaInstance } from 'consola';

export interface WorkerPool {
  workers: any[];
  isShuttingDown: boolean;
  spawn: (count: number) => Promise<void>;
  shutdown: () => void;
  onWorkerExit: (index: number) => void;
}

/**
 * Converts file URL to file path (handles Windows drive letters)
 */
function fileUrlToPath(url: string): string {
  const parsed = new URL(url);
  return parsed.pathname.startsWith('/')
    ? parsed.pathname.slice(process.platform === 'win32' ? 1 : 0)
    : parsed.pathname;
}

/**
 * Creates and manages a pool of worker processes
 */
export function createWorkerPool(
  scriptUrl: string,
  logger: ConsolaInstance,
  onShutdown?: () => void
): WorkerPool {
  const workers: any[] = [];
  let isShuttingDown = false;

  // Convert import.meta.url to file path
  const scriptPath = fileUrlToPath(scriptUrl);

  const spawn = async (count: number) => {
    logger.info(`🔄 Clustering enabled: spawning ${count} worker processes on ${process.platform}`);

    for (let i = 0; i < count; i++) {
      const worker = Bun.spawn({
        cmd: ['bun', scriptPath],
        env: {
          ...process.env,
          CLUSTER_WORKER: 'true',
        },
      });

      workers.push(worker);
      logger.debug(`Worker #${i + 1} spawned (PID: ${worker.pid})`);

      // Monitor worker exit
      worker.exited.then(() => onWorkerExit(i));
    }
  };

  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`⏸ Received signal, shutting down ${workers.length} workers...`);
    workers.forEach((w) => w.kill());

    if (onShutdown) {
      onShutdown();
    }
  };

  const onWorkerExit = (index: number) => {
    workers[index]?.exited.then((code: number) => {
      if (isShuttingDown) return;
      if (code !== 0 && code !== null) {
        logger.warn(`Worker #${index + 1} exited with code ${code}, restarting...`);

        const replacement = Bun.spawn({
          cmd: ['bun', scriptPath],
          env: {
            ...process.env,
            CLUSTER_WORKER: 'true',
          },
        });

        workers[index] = replacement;
        logger.debug(`Worker #${index + 1} restarted (PID: ${replacement.pid})`);

        // Monitor replacement worker
        replacement.exited.then(() => onWorkerExit(index));
      }
    });
  };

  // Setup graceful shutdown handlers
  const handleShutdown = () => shutdown();
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  return {
    workers,
    isShuttingDown,
    spawn,
    shutdown,
    onWorkerExit,
  };
}
