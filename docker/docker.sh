#!/bin/bash
# AgentScope Studio Docker Management Script
# Usage: ./docker/docker.sh [command]

set -e

IMAGE_NAME="agentscope/studio"
IMAGE_TAG="latest"
COMPOSE_FILE="docker/docker-compose.yml"

show_help() {
    echo "AgentScope Studio Docker Management Script"
    echo ""
    echo "Usage: ./docker/docker.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build Docker image"
    echo "  start     Start container"
    echo "  stop      Stop container"
    echo "  restart   Restart container"
    echo "  logs      View logs"
    echo "  exec      Enter container shell"
    echo "  status    Show status"
    echo "  clean     Clean up resources"
    echo "  help      Show this help"
}

do_build() {
    echo "🔨 Building image ${IMAGE_NAME}:${IMAGE_TAG}..."
    docker build -f docker/Dockerfile -t ${IMAGE_NAME}:${IMAGE_TAG} . --no-cache
    echo "✅ Build complete"
}

do_start() {
    echo "🚀 Starting container..."
    docker-compose -f ${COMPOSE_FILE} up -d
    echo "✅ Started"
    echo ""
    echo "⏳ Waiting for service to start..."
    sleep 3
    echo ""
    echo "📋 Startup logs:"
    docker-compose -f ${COMPOSE_FILE} logs --tail=40
}

do_stop() {
    echo "⏹️  Stopping container..."
    docker-compose -f ${COMPOSE_FILE} down
    echo "✅ Stopped"
}

do_restart() {
    echo "🔄 Restarting container..."
    docker-compose -f ${COMPOSE_FILE} restart
    echo "✅ Restarted"
}

do_logs() {
    echo "📋 Viewing logs (Ctrl+C to exit)..."
    docker-compose -f ${COMPOSE_FILE} logs -f
}

do_exec() {
    echo "🐚 Entering container..."
    docker-compose -f ${COMPOSE_FILE} exec agentscope-studio sh
}

do_status() {
    echo "📊 Container status:"
    docker-compose -f ${COMPOSE_FILE} ps
    echo ""
    echo "📊 Image info:"
    docker images | grep ${IMAGE_NAME} || echo "Image not found"
}

do_clean() {
    echo "🧹 Cleaning up Docker resources..."

    # Stop containers
    docker-compose -f ${COMPOSE_FILE} down 2>/dev/null || true

    # Remove remaining containers
    docker ps -a --filter "name=agentscope" -q | xargs -r docker rm -f 2>/dev/null || true

    read -p "Delete images? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker images --filter "reference=*agentscope*" -q | xargs -r docker rmi -f 2>/dev/null || true
    fi

    read -p "Delete volumes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume ls --filter "name=agentscope" -q | xargs -r docker volume rm 2>/dev/null || true
    fi

    echo "✅ Cleanup complete"
}

# Main logic
case "${1:-help}" in
    build)   do_build ;;
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_restart ;;
    logs)    do_logs ;;
    exec)    do_exec ;;
    status)  do_status ;;
    clean)   do_clean ;;
    help|*)  show_help ;;
esac
