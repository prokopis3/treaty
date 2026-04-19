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
  nodeClusterMaxWorkers: number;
  nodeClusterDbConnectionBudget: number;
  nodeClusterDbConnectionsPerWorker: number;
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
  const {
    app,
    port,
    scriptUrl,
    logger,
    nodeClusterEnv,
    nodeClusterMaxWorkers,
    nodeClusterDbConnectionBudget,
    nodeClusterDbConnectionsPerWorker,
  } = options;

  const safeConnectionsPerWorker = Math.max(1, nodeClusterDbConnectionsPerWorker || 1);
  const dbBoundWorkerCap = nodeClusterDbConnectionBudget > 0
    ? Math.max(1, Math.floor(nodeClusterDbConnectionBudget / safeConnectionsPerWorker))
    : 0;
  const effectiveMaxWorkers = nodeClusterMaxWorkers > 0 && dbBoundWorkerCap > 0
    ? Math.min(nodeClusterMaxWorkers, dbBoundWorkerCap)
    : (nodeClusterMaxWorkers > 0 ? nodeClusterMaxWorkers : dbBoundWorkerCap);

  if (dbBoundWorkerCap > 0) {
    logger.info(
      `DB-aware cluster cap: budget=${nodeClusterDbConnectionBudget}, per-worker=${safeConnectionsPerWorker}, max workers=${dbBoundWorkerCap}`
    );
  }

  const config = detectClusterConfig(nodeClusterEnv, effectiveMaxWorkers);
  const configSummary = getClusterConfigSummary(config);

  if (config.shouldCluster && !config.isClusterWorker) {
    // Main cluster manager process: spawn child workers
    const pool = createWorkerPool(scriptUrl, logger, () => process.exit(0));
    await pool.spawn(config.numWorkers);
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
