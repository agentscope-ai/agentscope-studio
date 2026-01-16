# AgentScope Studio Docker Deployment Guide

## Directory Structure

```
docker/
├── Dockerfile          # Docker image definition
├── docker-compose.yml  # Docker Compose configuration
├── docker.sh           # Management script
├── .dockerignore       # Build ignore file
└── README.md           # This document
```

## Prerequisites: Install Docker

Before deploying AgentScope Studio, you need to install Docker and Docker Compose on your system.

Please install [Docker](https://docs.docker.com/install/#supported-platforms) first.

## Quick Start

> **Note**: All commands should be executed from the **project root directory**

### Using Management Script (Recommended)

```bash
# Add execute permission
chmod +x docker/docker.sh

# Build image
./docker/docker.sh build

# Start container
./docker/docker.sh start

# View logs
./docker/docker.sh logs

# Stop container
./docker/docker.sh stop

# Show help
./docker/docker.sh help
```

### Manual Commands

```bash
# Build image
docker build -f docker/Dockerfile -t agentscope/studio:latest .

# Start
docker-compose -f docker/docker-compose.yml up -d

# Stop
docker-compose -f docker/docker-compose.yml down
```

## Management Script Commands

| Command   | Description           |
| --------- | --------------------- |
| `build`   | Build Docker image    |
| `start`   | Start container       |
| `stop`    | Stop container        |
| `restart` | Restart container     |
| `logs`    | View logs             |
| `exec`    | Enter container shell |
| `status`  | Show status           |
| `clean`   | Clean up resources    |
| `help`    | Show help             |

## Directory Mapping

| Container Path | Description                             |
| -------------- | --------------------------------------- |
| `/app`         | Working directory                       |
| `/app/data`    | User data directory (mount recommended) |
| `/app/dist`    | Compiled code                           |

## Port Mapping

| Port | Description             |
| ---- | ----------------------- |
| 3000 | HTTP server port        |
| 4317 | gRPC/OpenTelemetry port |

## Environment Variables

| Variable    | Default      | Description                             |
| ----------- | ------------ | --------------------------------------- |
| `NODE_ENV`  | `production` | Runtime environment                     |
| `LOG_LEVEL` | `warn`       | Log level (debug/log/warn/error/silent) |
| `PORT`      | `3000`       | HTTP port                               |
| `HOME`      | `/app/data`  | Data directory                          |

## Data Persistence

User data is stored in `/app/data` directory, mounted to host `./data` directory via docker-compose.yml.

```yaml
volumes:
    - ./data:/app/data
```

## Troubleshooting

```bash
# Check status
./docker/docker.sh status

# View logs
./docker/docker.sh logs

# Clean and rebuild
./docker/docker.sh clean
./docker/docker.sh build
./docker/docker.sh start
```
