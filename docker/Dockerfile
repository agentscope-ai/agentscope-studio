# Stage 1: Build with official Node.js image
FROM node:22-slim AS builder

WORKDIR /app

# Copy workspace files
COPY packages/ ./packages/
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

COPY bin/ ./bin/

# Build the application
RUN npm run build

# Reinstall production dependencies only
RUN npm ci --omit=dev

# Stage 2: Runtime with Python + Node.js
FROM python:3.10-slim

ARG DEBIAN_FRONTEND=noninteractive

# Install essential tools (without Node.js - will copy from builder)
RUN apt-get update && apt-get install -y --fix-missing \
    curl ca-certificates build-essential git sqlite3 \
    && pip install --no-cache-dir --upgrade pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy Node.js from builder stage (no need to download again)
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy Python requirements and install
COPY packages/app/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && pip cache purge \
    && rm /tmp/requirements.txt

# Cleanup
RUN npm cache clean --force 2>/dev/null || true \
    && rm -rf ~/.npm/_cacache

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Runtime environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    OTEL_GRPC_PORT=4317 \
    HOME=/app/data \
    LOG_LEVEL=warn \
    PYTHONUNBUFFERED=1

EXPOSE 3000 4317

ENTRYPOINT ["/entrypoint.sh"]
