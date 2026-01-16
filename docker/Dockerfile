FROM python:3.10-slim

ARG DEBIAN_FRONTEND=noninteractive

# Install essential build tools and Node.js v23
RUN apt-get update && apt-get install -y --fix-missing \
    curl ca-certificates gnupg build-essential git sqlite3 \
    && curl -fsSL https://deb.nodesource.com/setup_23.x | bash - \
    && apt-get install -y nodejs \
    && pip install --no-cache-dir --upgrade pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace files
COPY packages/ ./packages/
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

COPY bin/ ./bin/

# Install Python dependencies and build//
RUN pip install --no-cache-dir -r packages/app/requirements.txt \
    && npm run build

# Reinstall production dependencies only
RUN npm ci --omit=dev

# Cleanup: keep only dist and node_modules (no runtime dependency on package.json)
RUN rm -rf packages \
    && rm -rf bin \
    && rm -rf node_modules/.cache \
    && npm cache clean --force \
    && rm -rf ~/.npm/_cacache \
    && pip cache purge

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
