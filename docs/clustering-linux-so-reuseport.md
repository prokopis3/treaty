# Treaty Clustering on Linux — Full Implementation

## Overview

Treaty implements **automatic multi-process clustering on Linux** with full SO_REUSEPORT support for load balancing. The clustering is designed to:

- ✅ **Auto-enable on Linux** (not as root)
- ✅ **Disable safely** on Windows/macOS (no SO_REUSEPORT)
- ✅ **Load balance** across all CPU cores using SO_REUSEPORT
- ✅ **Allow explicit overrides** via `NODE_CLUSTER` environment variable
- ✅ **Graceful shutdown** with worker restart on crash

## Architecture

### Files Involved

```
backend/infrastructure/clustering/
├── cluster-detection.ts        ← Platform/permission detection
├── worker-pool.ts              ← Worker spawning & lifecycle
├── server-startup.ts           ← Orchestration
└── index.ts                    ← Public exports

config/env.ts                   ← NODE_CLUSTER environment variable
server.ts                       ← Entry point integration
```

### Clustering Decision Logic

```typescript
const shouldCluster = NODE_CLUSTER === 'true'             // Force enabled
  || (isLinux && !isRootUser && NODE_CLUSTER !== 'false') // Auto-enable on Linux
```

## How It Works

### 1. Detection Phase

When the server starts, `detectClusterConfig(env.NODE_CLUSTER)` determines:

```typescript
{
  shouldCluster: boolean      // Should workers be spawned?
  isClusterWorker: boolean    // Am I a child worker?
  numCpus: number            // How many workers to spawn?
  platform: string           // 'linux' | 'darwin' | 'win32'
  isRootUser: boolean        // Are we running as root?
}
```

### 2. Main Process vs Worker

**Main Process** (Manager):
- Runs on master (`PID 1`)
- Spawns N child workers (N = CPU cores)
- Monitors worker health
- Auto-restarts crashed workers
- Handles graceful shutdown

**Worker Process**:
- `CLUSTER_WORKER=true` environment flag
- Starts Elysia HTTP server with `reusePort: true`
- SO_REUSEPORT allows multiple processes to listen on :4201
- Kernel load-balances incoming connections

### 3. Load Balancing with SO_REUSEPORT

SO_REUSEPORT (Socket Option: SO_REUSEPORT) allows multiple processes to bind to the same port:

```
Incoming Connection → Kernel Load Balancer
                       ↙  ↓  ↘  ↖
                    Worker 1, 2, 3, 4...
```

Each connection is distributed fairly across workers by the Linux kernel.

## Configuration

### Environment Variable

Set `NODE_CLUSTER` to control clustering:

| Value  | Behavior | Use Case |
|--------|----------|----------|
| `auto` | Auto-enable on Linux, disable on others | Default (production) |
| `true` | Force clustering everywhere | Testing |
| `false` | Disable clustering | Single-process mode |

### Examples

```bash
# Auto-enable on Linux (default)
NODE_CLUSTER=auto bun run server.ts

# Force clustering enabled (even on Windows for development)
NODE_CLUSTER=true bun run server.ts

# Disable clustering (single process)
NODE_CLUSTER=false bun run server.ts

# Docker: auto-enable in production Linux container
docker run -e NODE_CLUSTER=auto treaty-app:prod
```

## Docker Integration

The `docker-compose.prod.yml` configures clustering:

```yaml
environment:
  NODE_CLUSTER: ${NODE_CLUSTER:-auto}  # Default to auto-enable
```

Running in Docker:
```bash
# Default: auto-enable (Linux kernel = clustering enabled)
docker-compose -f docker-compose.prod.yml up

# Explicit toggle
docker-compose -f docker-compose.prod.yml up
  -e NODE_CLUSTER=true  # Force clustering

docker-compose -f docker-compose.prod.yml up
  -e NODE_CLUSTER=false # Single process
```

## Verification

### Check Auto-Enable Logic

Run the cluster detection test:

```bash
bun backend/scripts/test-cluster-linux.ts
```

Output on Linux:
```
Platform: linux
UID: 1000 (non-root)
CPUs: 8

Test: Default (auto) on Linux
   NODE_CLUSTER='auto'
   ➜ Should cluster: true ✅
   ➜ Config: 8-worker cluster (manager) on linux
   ➜ SO_REUSEPORT enabled: true
```

### Run Docker Integration Tests

Test clustering in a Docker Linux container:

```bash
bash backend/scripts/test-cluster-docker-linux.sh
```

This test:
1. ✅ Builds Docker image
2. ✅ Runs with `NODE_CLUSTER=auto` (auto-enable)
3. ✅ Runs with `NODE_CLUSTER=true` (force enable)
4. ✅ Runs with `NODE_CLUSTER=false` (disable)
5. ✅ Verifies worker spawning
6. ✅ Validates SO_REUSEPORT usage
7. ✅ Loads tests the clustered server

### Manual Testing

Start the server and observe logs:

```bash
# Build production bundle
bun run build

# Run with clustering enabled
NODE_CLUSTER=auto bun server.ts
```

You should see:
```
🔄 Clustering enabled: spawning 8 worker processes on linux
Worker #1 spawned (PID: 12345)
Worker #2 spawned (PID: 12346)
...
✔ Elysia is running at localhost:4201 (8-worker cluster on linux)
```

Each worker also logs:
```
✔ Elysia is running at localhost:4201 [worker 12345] (8-worker cluster (worker) on linux)
```

### Performance Testing

Use `autocannon` for load testing:

```bash
# Install globally
npm install -g autocannon

# Single process (baseline)
NODE_CLUSTER=false bun server.ts &
sleep 2
autocannon -c 20 -d 30 http://localhost:4201
kill %1

# Clustered (compare throughput)
NODE_CLUSTER=auto bun server.ts &
sleep 2
autocannon -c 20 -d 30 http://localhost:4201
kill %1
```

**Expected Results:**
- Clustered version should handle 2-4x more concurrent requests
- Throughput should increase with worker count
- Load balanced fairly across workers

## Security Notes

### Root User Detection

Clustering **automatically disables** when running as root:

```bash
sudo NODE_CLUSTER=auto bun server.ts
# Output: single-process mode (linux)
```

This is intentional:
- SO_REUSEPORT works differently for root
- Simplifies resource isolation
- Prevents privilege escalation issues

Override with explicit flag:
```bash
sudo NODE_CLUSTER=true bun server.ts
# Forces clustering even as root (not recommended)
```

### Worker Isolation

Each worker process:
- Has independent event loop
- Does NOT share memory with other workers
- Can be killed/restarted independently
- Runs with same UID as parent

## Troubleshooting

### Clustering Not Enabled on Linux

**Symptoms:** Server shows "single-process mode" instead of clustering

**Check:**
```bash
# Verify you're not root
id  # Should NOT show uid=0

# Verify NODE_CLUSTER not explicitly disabled
echo $NODE_CLUSTER

# Verify platform
node -e "console.log(process.platform)"
```

**Solutions:**
1. Don't run as root
2. Don't set `NODE_CLUSTER=false`
3. Explicitly set `NODE_CLUSTER=auto` or `NODE_CLUSTER=true`

### SO_REUSEPORT Errors

**Error:** "Address already in use" when starting workers

**Cause:** Port in use, SO_REUSEPORT not available

**Solutions:**
1. Kill existing process on port 4201
2. Use different port: `PORT=4202 NODE_CLUSTER=auto bun server.ts`
3. On macOS/Windows, clustering disables automatically (check logs)

### Workers Keep Restarting

**Symptom:** "Worker #X exited with code 1, restarting..."

**Cause:** Worker process crashing

**Debug:**
```bash
# Run single worker to see error
NODE_CLUSTER=false bun server.ts
```

Check logs for:
- Database connection errors
- Out of memory
- Syntax errors in dependencies

## Performance Characteristics

### Before Clustering (Single Process)
- All requests handled by one V8 instance
- Limited to one CPU core
- Node.js works hard under concurrency
- Maximum ~2-3K req/sec on 4-core machine

### After Clustering (Multiple Workers)
- Requests distributed across N workers
- Full utilization of all CPU cores
- Each worker lighter load
- Typical improvement: **N × throughput** (N = worker count)
- Example: 4 cores → ~8-12K req/sec

## Key Implementation Details

### Why SO_REUSEPORT?

Traditional Node.js clustering (Node.js `cluster` module):
- Master process listens on port
- Master distributes connections to workers
- Master is bottleneck

SO_REUSEPORT approach (Treaty):
- Each worker listens on same port
- Kernel distributes connections directly
- No bottleneck
- Better performance

### CLUSTER_WORKER Environment Flag

Internal flag `CLUSTER_WORKER=true` marks a process as a worker:
- Set by main process when spawning
- Prevents infinite worker recursion
- Checked by `detectClusterConfig()`
- Not exposed to user configuration

### Graceful Shutdown

On SIGTERM/SIGINT:
1. Main process logs shutdown
2. Sends SIGTERM to all workers
3. Workers finish in-flight requests quickly
4. Process exits cleanly

## File References

- [cluster-detection.ts](../../backend/infrastructure/clustering/cluster-detection.ts) — Detection logic
- [server-startup.ts](../../backend/infrastructure/clustering/server-startup.ts) — Orchestration
- [worker-pool.ts](../../backend/infrastructure/clustering/worker-pool.ts) — Worker management
- [config/env.ts](../../config/env.ts) — NODE_CLUSTER variable
- [server.ts](../../server.ts) — Integration entry point
- [docker-compose.prod.yml](../../docker-compose.prod.yml) — Docker configuration
- [Dockerfile](../../Dockerfile) — Linux runtime setup
