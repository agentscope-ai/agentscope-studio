# syntax=docker/dockerfile:1.7

FROM dev-registry.f1soft.com/fonenext/node:22.18.0 AS build

WORKDIR /app

# Native build tools are a fallback for dependencies such as better-sqlite3
# when a prebuilt binary is unavailable for the target platform.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# The lockfile is maintained with npm 11. Keep CI and container resolution on
# the same npm major while retaining Node 22 as the production LTS runtime.
RUN npm install --global npm@11.13.0

# Copy manifests first to keep dependency installation cacheable.
COPY package.json package-lock.json ./
COPY packages/client/package.json packages/client/package.json
COPY packages/server/package.json packages/server/package.json

RUN npm ci

COPY bin ./bin
COPY packages ./packages

RUN npm run build \
    && npm prune --omit=dev \
    && npm cache clean --force


FROM dev-registry.f1soft.com/fonenext/node:22.18.0 AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    OTEL_GRPC_PORT=4317 \
    HOME=/app/data \
    OPEN_BROWSER=false

WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000 4317

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "dist/server/src/index.js"]
