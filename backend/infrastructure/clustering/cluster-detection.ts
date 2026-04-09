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
  numCpus: number;
  platform: string;
  isRootUser: boolean;
}

/**
 * Detects cluster configuration from environment and platform
 * 
 * @param nodeClusterEnv - NODE_CLUSTER setting from config/env.ts ('auto', 'true', 'false')
 */
export function detectClusterConfig(nodeClusterEnv: string = 'auto'): ClusterConfig {
  const forceCluster = nodeClusterEnv === 'true';
  const disableCluster = nodeClusterEnv === 'false';
  const isLinux = process.platform === 'linux';
  const isRootUser = process.getuid?.() === 0;
  // CLUSTER_WORKER is internal flag set during worker spawning - still uses process.env
  const isClusterWorker = process.env['CLUSTER_WORKER'] === 'true';
  const numCpus = navigator.hardwareConcurrency || 2;

  // Clustering decision logic:
  // - Force if NODE_CLUSTER='true' (testing)
  // - Disable if NODE_CLUSTER='false' (explicit override)
  // - Auto-enable on Linux (not as root) for full SO_REUSEPORT support
  // - Disable on Windows/macOS (no SO_REUSEPORT)
  const shouldCluster = forceCluster || (isLinux && !isRootUser && !disableCluster);

  return {
    shouldCluster,
    isClusterWorker,
    numCpus,
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
  return `${config.numCpus}-worker cluster (${mode}) on ${config.platform}`;
}
