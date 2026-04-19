/**
 * Cluster Detection Module
 * 
 * Determines whether multi-process clustering should be enabled based on:
 * - Platform (Linux = full support, others = disabled)
 * - User privileges (root = disabled for security)
 * - Environment variable overrides (NODE_CLUSTER)
 */

export interface ClusterConfig {
  shouldCluster: boolean;
  isClusterWorker: boolean;
  numWorkers: number;
  maxWorkers: number;
  platform: string;
  isRootUser: boolean;
}

/**
 * Detects cluster configuration from environment and platform
 * 
 * @param nodeClusterEnv - NODE_CLUSTER setting from config/env.ts ('auto', 'true', 'false')
 */
export function detectClusterConfig(
  nodeClusterEnv: string = 'auto',
  nodeClusterMaxWorkers: number = 0
): ClusterConfig {
  const normalizedNodeClusterEnv = nodeClusterEnv.trim().toLowerCase();
  const disableCluster = normalizedNodeClusterEnv === 'false';
  const isLinux = process.platform === 'linux';
  const forceCluster = normalizedNodeClusterEnv === 'true' && isLinux;
  const isRootUser = process.getuid?.() === 0;
  // CLUSTER_WORKER is internal flag set during worker spawning - still uses process.env
  const isClusterWorker = process.env['CLUSTER_WORKER'] === 'true';
  const numCpus = navigator.hardwareConcurrency || 2;
  const maxWorkers = nodeClusterMaxWorkers > 0
    ? Math.max(1, Math.min(nodeClusterMaxWorkers, numCpus))
    : numCpus;

  // Clustering decision logic:
  // - Force if NODE_CLUSTER='true' (testing)
  // - Disable if NODE_CLUSTER='false' (explicit override)
  // - Auto-enable on Linux (not as root) for full SO_REUSEPORT support
  // - Disable on Windows/macOS (no SO_REUSEPORT)
  const shouldCluster = forceCluster || (isLinux && !isRootUser && !disableCluster);

  return {
    shouldCluster,
    isClusterWorker,
    numWorkers: maxWorkers,
    maxWorkers,
    platform: process.platform,
    isRootUser: isRootUser || false,
  };
}

/**
 * Generates human-readable cluster config summary for logging
 */
export function getClusterConfigSummary(config: ClusterConfig): string {
  if (!config.shouldCluster) {
    return `single-process mode (${config.platform})`;
  }

  const mode = config.isClusterWorker ? 'worker' : 'cluster manager';
  return `${config.numWorkers}-worker cluster (${mode}) on ${config.platform}`;
}
