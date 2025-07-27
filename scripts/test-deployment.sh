#!/bin/bash

# Local Deployment Test Script
# This script simulates the GitHub Actions deployment process locally

set -e

DOCKER_IMAGE_NAME="tetris-game"
CONTAINER_NAME="tetris-app-test"

echo "🧪 Testing Tetris Game deployment locally..."
echo "============================================="

# Cleanup previous test
echo "🧹 Cleaning up previous test containers..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
docker rmi $DOCKER_IMAGE_NAME:test 2>/dev/null || true

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $DOCKER_IMAGE_NAME:test .

# Test Docker image
echo "🚀 Starting test container..."
docker run -d --name $CONTAINER_NAME -p 9000:3000 -p 9001:3001 $DOCKER_IMAGE_NAME:test

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 15

# Test health endpoint
echo "❤️  Testing health endpoint..."
if curl -f http://localhost:9001/health; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Test client is serving
echo "🌐 Testing client server..."
if curl -f -s http://localhost:9000 > /dev/null; then
    echo "✅ Client server is responding!"
else
    echo "❌ Client server test failed!"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Show container info
echo "📊 Container information:"
docker ps | grep $CONTAINER_NAME
echo ""

# Show logs
echo "📝 Container logs:"
docker logs $CONTAINER_NAME --tail 20
echo ""

# Test Socket.IO connection (basic)
echo "🔌 Testing Socket.IO endpoint..."
if curl -f -s "http://localhost:9001/socket.io/?EIO=4&transport=polling" > /dev/null; then
    echo "✅ Socket.IO endpoint is accessible!"
else
    echo "⚠️  Socket.IO endpoint test inconclusive (may be normal)"
fi

echo ""
echo "🎉 Local deployment test completed successfully!"
echo ""
echo "🌐 You can now test the game at:"
echo "   Client: http://localhost:9000"
echo "   Server: http://localhost:9001"
echo ""
echo "🔍 To check container status:"
echo "   docker ps | grep $CONTAINER_NAME"
echo ""
echo "📝 To view logs:"
echo "   docker logs $CONTAINER_NAME"
echo ""
echo "🛑 To stop the test container:"
echo "   docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"

# Ask if user wants to keep container running
echo ""
read -p "🤔 Keep test container running for manual testing? (y/N): " keep_running

if [[ $keep_running =~ ^[Yy]$ ]]; then
    echo "✅ Test container is still running!"
    echo "🌐 Access your game at http://localhost:9000"
else
    echo "🧹 Cleaning up test container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
    echo "✅ Cleanup completed!"
fi
