# Production delivery-relay changes

Branch: `production-delivery-relay`

This fork adapts AgentScope Studio to act as a **message-delivery relay** between
Python AgentScope processes and many concurrent mobile clients, with auth/security
handled by an upstream gateway. It does **not** touch the Friday copilot path.

All changes are backwards compatible: with no env vars set, the server behaves
exactly as upstream (single instance, local SQLite, in-memory Socket.IO).

## What changed and why

### 1. Per-run routing of user input (correctness / tenant isolation)
**File:** `packages/server/src/trpc/socket.ts`

Previously, inbound user input was emitted to the **entire** `/python` namespace:
`io.of('/python').emit('forwardUserInput', ...)`. Every user's input physically
reached every connected Python process (cross-tenant data transit + O(N) fan-out),
and only worked because the Python client filtered on a unique `request_id`.

Now the `/python` socket joins a `run-${runId}` room on connect (using the
`run_id` it already sends in the handshake auth), and input is emitted with
`.to(\`run-\${runId}\`)`. Input now reaches only the owning run's process.

### 2. Configurable MySQL datasource + connection pool (Issue 1)
**Files:** `packages/shared/src/config/server.ts`, `packages/server/src/database.ts`

`DB_TYPE=mysql` switches the TypeORM datasource to MySQL with host/port/user/
password/database from env and a tunable pool (`DB_POOL_SIZE`, default 50).
Default remains local `better-sqlite3`.

The dashboard ViewEntities (`RunView`, `ModelInvocationView`, `FridayAppReplyView`)
use SQLite-only SQL (`strftime`, recursive `date()`, `json_group_array`). They are
**registered for sqlite only** so MySQL can boot. They are analytics-only and not
on the delivery path. The overview broadcast was made non-fatal so a missing view
on MySQL never breaks run registration or message delivery.

`synchronize`/migrations are now driven by `RuntimeConfig`:
- sqlite: `synchronize=true`, bundled (SQLite-oriented) migrations run — as before.
- mysql: `synchronize` defaults **off** (bootstrap with `DB_SYNCHRONIZE=true` once
  on an empty DB, then manage schema with your own migrations); bundled migrations
  do **not** run.

### 3. Redis adapter for horizontal scaling (Issue 2)
**Files:** `packages/server/src/trpc/socket.ts`, `packages/server/src/index.ts`

When `REDIS_URL` is set, a `@socket.io/redis-adapter` is attached so room
broadcasts (`run-${runId}`) fan out across every instance. Combined with the
per-run routing above, the inbound-input path also works cross-instance.
`SocketManager.init` is now async and awaited.

### 4. Buffer cap, transports, CORS (hardening / multi-instance)
**Files:** `packages/shared/src/config/server.ts`, `packages/server/src/trpc/socket.ts`

- `maxHttpBufferSize` changed from `Infinity` to `SOCKET_MAX_BUFFER_BYTES` (25 MB default).
- Transports default to `websocket` only, so multiple instances behind a load
  balancer need **no sticky sessions**. Set `SOCKET_TRANSPORTS=websocket,polling`
  to keep the fallback (then sticky sessions are required).
- Socket.IO CORS origin is configurable via `CORS_ORIGIN` (default `*`).

### 5. Removed per-message full-payload log
**File:** `packages/server/src/trpc/router.ts`

`console.log('Received pushMessage:', input)` ran on every message (PII in logs +
synchronous I/O per message). Removed.

## New dependencies
`@socket.io/redis-adapter`, `redis`, `mysql2` (added to root and server package.json).
Run `npm install` before building.

## NOT done (deliberate — see notes)
- **Async/batched persistence.** Each `pushMessage` still does ~4-5 awaited DB
  writes before broadcasting. For token-level streaming at high concurrency this
  is the real throughput limiter. Consider broadcasting first and persisting
  asynchronously (or skipping durable history). This is an architectural change
  left for you to decide based on whether you need durable message history.
- **Full MySQL migrations.** Schema is created via `synchronize` bootstrap. Author
  proper MySQL migrations before relying on this in production.
- **Rewriting the dashboard views for MySQL.** Skipped because delivery does not
  need them. Rewrite in MySQL dialect if you want the dashboard on MySQL.

## Quick start (MySQL + Redis, multi-instance)
```bash
cp .env.example .env            # set DB_TYPE=mysql, DB_* , REDIS_URL
npm install
# first boot only, against an empty DB:
DB_SYNCHRONIZE=true npm run build && npm start
# subsequent boots: leave DB_SYNCHRONIZE unset/false
```
Place N instances behind your gateway/load balancer (websocket transport => no
sticky sessions needed); point all instances at the same MySQL and the same Redis.
