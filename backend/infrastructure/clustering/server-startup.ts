/**
 * Server Startup Orchestration Module
 * 
 * Orchestrates the startup of HTTP server with optional clustering
 */

import type { ConsolaInstance } from 'consola';
import { detectClusterConfig, getClusterConfigSummary } from './cluster-detection';
import { createWorkerPool } from './worker-pool';

export interface ServerStartupOptions {
  app: any; // Elysia type with complex plugin inference
  port: number;
  scriptUrl: string;
  logger: ConsolaInstance;
  nodeClusterEnv: string; // NODE_CLUSTER setting from config/env.ts
}

/**
 * Starts the server with optional multi-process clustering
 * 
 * If clustering is enabled and this is the main process:
 * - Spawns N child workers (N = CPU cores)
 * - Sets up health monitoring and auto-restart
 * - Handles graceful shutdown
 * 
 * If this is a worker process or clustering is disabled:
 * - Starts a single HTTP server
 * - Enables SO_REUSEPORT if clustering is active (for load balancing)
 */
export async function startServerWithClustering(options: ServerStartupOptions): Promise<void> {
  const { app, port, scriptUrl, logger, nodeClusterEnv } = options;

  const config = detectClusterConfig(nodeClusterEnv);
  const configSummary = getClusterConfigSummary(config);

  if (config.shouldCluster && !config.isClusterWorker) {
    // Main cluster manager process: spawn child workers
    const pool = createWorkerPool(scriptUrl, logger, () => process.exit(0));
    await pool.spawn(config.numCpus);
  } else {
    // Worker process or single-process mode: start HTTP server
    const listenerOptions = {
      port,
      reusePort: config.shouldCluster, // SO_REUSEPORT: only active with clustering (Linux only)
    };

    app.listen(listenerOptions);

    const workerId = config.isClusterWorker
      ? ` [worker ${process.pid}]`
      : '';
    const clusterInfo = config.shouldCluster ? ` (${configSummary})` : '';

    logger.success(
      `✔ Elysia is running at ${app.server?.hostname}:${app.server?.port}${workerId}${clusterInfo}`
    );
  }
}
