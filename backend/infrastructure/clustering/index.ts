/**
 * Clustering Module
 * 
 * Provides multi-process clustering for Bun/Elysia servers with SO_REUSEPORT load balancing
 */

export { detectClusterConfig, getClusterConfigSummary } from './cluster-detection';
export type { ClusterConfig } from './cluster-detection';

export { createWorkerPool } from './worker-pool';
export type { WorkerPool } from './worker-pool';

export { startServerWithClustering } from './server-startup';
export type { ServerStartupOptions } from './server-startup';
