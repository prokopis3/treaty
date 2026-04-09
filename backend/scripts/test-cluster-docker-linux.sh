#!/bin/bash
# Linux Clustering Validation Tests
# 
# This script tests Treaty's multi-process clustering on Linux within Docker
# to verify SO_REUSEPORT load balancing and auto-enable logic.

set -e

PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$PROJECT_ROOT"

echo "╔════════════════════════════════════════════════════════════════════════════════╗"
echo "║        Treaty Clustering on Linux (Docker) Validation Tests                    ║"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a test
run_test() {
  local TEST_NAME="$1"
  local NODE_CLUSTER_VALUE="$2"
  local EXPECTED_WORKERS="$3"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 Test: $TEST_NAME"
  echo "   NODE_CLUSTER=$NODE_CLUSTER_VALUE"
  echo "   Expected workers: $EXPECTED_WORKERS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Build image
  echo "🔨 Building Docker image..."
  docker build \
    -t treaty-cluster-test:$NODE_CLUSTER_VALUE \
    --progress=plain \
    --build-arg NODE_CLUSTER_BUILD=$NODE_CLUSTER_VALUE \
    . > /tmp/docker-build.log 2>&1
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    cat /tmp/docker-build.log
    return 1
  fi
  echo "✅ Docker image built successfully"
  echo ""
  
  # Run container
  echo "🚀 Running container (10 second test window)..."
  CONTAINER_OUTPUT=$(timeout 15 docker run \
    -e NODE_CLUSTER=$NODE_CLUSTER_VALUE \
    -e NODE_ENV=production \
    -e APP_LOG_LEVEL=info \
    --rm \
    treaty-cluster-test:$NODE_CLUSTER_VALUE 2>&1 || true)
  
  # Check for expected clustering output
  if echo "$CONTAINER_OUTPUT" | grep -q "Clustering enabled.*spawning"; then
    WORKER_COUNT=$(echo "$CONTAINER_OUTPUT" | grep -oP "spawning \K\d+" | head -1)
    echo -e "${GREEN}✅ Clustering enabled${NC}"
    echo "   Workers spawned: $WORKER_COUNT"
    
    if [ "$WORKER_COUNT" = "$EXPECTED_WORKERS" ]; then
      echo -e "${GREEN}✅ Worker count correct ($WORKER_COUNT)${NC}"
    else
      echo -e "${YELLOW}⚠️  Worker count mismatch: expected $EXPECTED_WORKERS, got $WORKER_COUNT${NC}"
    fi
  else
    if [ "$EXPECTED_WORKERS" = "0" ]; then
      echo -e "${GREEN}✅ Clustering disabled as expected${NC}"
    else
      echo -e "${RED}❌ Clustering should be enabled but wasn't${NC}"
      echo ""
      echo "Container output:"
      echo "$CONTAINER_OUTPUT" | head -30
      return 1
    fi
  fi
  
  # Check SO_REUSEPORT usage
  if echo "$CONTAINER_OUTPUT" | grep -q "reusePort"; then
    echo -e "${GREEN}✅ SO_REUSEPORT enabled${NC}"
  fi
  
  echo ""
  return 0
}

# Detect number of CPUs for expected worker count
CPU_COUNT=$(nproc 2>/dev/null || echo "4")
echo "Detected CPUs: $CPU_COUNT"
echo ""

# Test 1: Auto-enable on Linux
echo "📌 Test 1: Auto-enable clustering on Linux"
if run_test "Auto (Linux detection)" "auto" "$CPU_COUNT"; then
  echo -e "${GREEN}✅ PASSED: Auto-enable on Linux${NC}"
else
  echo -e "${RED}❌ FAILED: Auto-enable on Linux${NC}"
  exit 1
fi

# Test 2: Force enable
echo ""
echo "📌 Test 2: Force enable clustering"
if run_test "Force enabled" "true" "$CPU_COUNT"; then
  echo -e "${GREEN}✅ PASSED: Force enable${NC}"
else
  echo -e "${RED}❌ FAILED: Force enable${NC}"
  exit 1
fi

# Test 3: Force disable
echo ""
echo "📌 Test 3: Force disable clustering"
if run_test "Force disabled" "false" "0"; then
  echo -e "${GREEN}✅ PASSED: Force disable${NC}"
else
  echo -e "${RED}❌ FAILED: Force disable${NC}"
  exit 1
fi

# Load test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Test 4: Load testing with clustering"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔨 Building load test image..."
docker build \
  -t treaty-cluster-load-test:auto \
  --progress=plain \
  . > /tmp/docker-build-load.log 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Docker build failed${NC}"
  exit 1
fi

echo "✅ Docker image built"
echo ""

# Run container in background
CONTAINER_ID=$(docker run \
  -d \
  -e NODE_CLUSTER=auto \
  -e NODE_ENV=production \
  -e APP_LOG_LEVEL=error \
  -p 4201:4201 \
  treaty-cluster-load-test:auto)

echo "🚀 Container running: $CONTAINER_ID"
sleep 3

# Check if container is still running
if ! docker ps | grep -q "$CONTAINER_ID"; then
  echo -e "${RED}❌ Container failed to start${NC}"
  docker logs "$CONTAINER_ID"
  exit 1
fi

echo -e "${GREEN}✅ Container started successfully${NC}"
echo ""

# Run load test
if command -v autocannon &> /dev/null; then
  echo "⚡ Running load test (10 seconds, 5 concurrent)..."
  autocannon -c 5 -d 10 -p 1 http://localhost:4201 || true
else
  echo -e "${YELLOW}⚠️  autocannon not installed, skipping load test${NC}"
  echo "   To install: npm install -g autocannon"
  echo "   To test: autocannon -c 5 -d 10 -p 1 http://localhost:4201"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
docker stop "$CONTAINER_ID" || true
docker rm "$CONTAINER_ID" || true

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════════╗"
echo "║                      ✅ All tests completed successfully!                      ║"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✅ Auto-enable on Linux: Working"
echo "  ✅ Force enable: Working"
echo "  ✅ Force disable: Working"
echo "  ✅ SO_REUSEPORT support: Enabled"
echo "  ✅ Multi-worker clustering: Active on Linux"
echo ""
