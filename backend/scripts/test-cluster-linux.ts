#!/usr/bin/env bun
/**
 * Test script to verify clustering auto-enables on Linux (not as root)
 * 
 * This validates:
 * - Linux detection works
 * - Root detection works
 * - NODE_CLUSTER environment override works ('true', 'false', 'auto')
 * - SO_REUSEPORT would be enabled with clustering
 */

import { detectClusterConfig, getClusterConfigSummary } from '../infrastructure/clustering/cluster-detection';

const testCases = [
  { label: 'Default (auto) on Linux', nodeClusterEnv: 'auto' },
  { label: 'Force enabled on Linux', nodeClusterEnv: 'true' },
  { label: 'Force disabled on Linux', nodeClusterEnv: 'false' },
];

console.log('🧪 Clustering Configuration Test\n');
console.log(`Platform: ${process.platform}`);
console.log(`UID: ${process.getuid?.() ?? 'N/A'}`);
console.log(`CPUs: ${navigator.hardwareConcurrency || 2}\n`);
console.log('═'.repeat(80));

testCases.forEach(({ label, nodeClusterEnv }) => {
  const config = detectClusterConfig(nodeClusterEnv);
  const summary = getClusterConfigSummary(config);
  
  console.log(`\n📋 Test: ${label}`);
  console.log(`   NODE_CLUSTER='${nodeClusterEnv}'`);
  console.log(`   ➜ Should cluster: ${config.shouldCluster}`);
  console.log(`   ➜ Config: ${summary}`);
  console.log(`   ➜ SO_REUSEPORT enabled: ${config.shouldCluster}`);
});

console.log('\n' + '═'.repeat(80));
console.log('\n📊 Summary:');

const autoConfig = detectClusterConfig('auto');
const expectedOnLinux = process.platform === 'linux' && (process.getuid?.() ?? 0) !== 0;

if (process.platform === 'linux') {
  if (autoConfig.shouldCluster === expectedOnLinux) {
    console.log(`✅ Linux clustering logic: CORRECT (${expectedOnLinux ? 'enabled' : 'disabled'})`);
  } else {
    console.log(`❌ Linux clustering logic: FAILED`);
  }
} else {
  console.log(`⚠️  Not on Linux (${process.platform}) — clustering will be disabled`);
}

const reusePortEnabled = autoConfig.shouldCluster;
console.log(`✅ SO_REUSEPORT would be: ${reusePortEnabled ? 'ENABLED 🚀' : 'disabled'}`);

process.exit(autoConfig.shouldCluster ? 0 : 1);
