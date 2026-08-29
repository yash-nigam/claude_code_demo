---
name: sync-stdio-in-global-request-logger
description: logger.js writes via process.stdout.write/stderr.write, called from requestLogger middleware on every single request app-wide — synchronous I/O in the hot path, worse on Windows.
metadata:
  type: feedback
---

`src/utils/logger.js`'s `log()` calls `process.stdout.write`/`process.stderr.write` directly
(no async wrapper). `src/api/middleware.js`'s `requestLogger` is mounted globally in
`src/index.js` (`app.use(requestLogger)`, before the route mount), so it fires on `res.on('finish')`
for literally every request the server handles, including `/health`.

**Why this matters:** on POSIX, `process.stdout.write` is only synchronous when stdout is a file
or TTY (async when piped to another process); but on Windows, `process.stdout`/`stderr` writes are
*always* synchronous regardless of redirection target. This repo's dev environment is Windows
(see root context), so every request pays a blocking write syscall on the event loop before the
response cycle can be considered fully done — throughput-limiting under concurrent load, and easy
to miss because it looks like ordinary structured logging, not I/O.

**How to apply:** when reviewing logging middleware that runs on every request (not just this
repo), check (a) whether the log call is unconditional at `info` level for *all* requests
(success and failure), and (b) whether the underlying write is sync. If both are true, flag as
High and suggest gating verbose per-request logs to `debug` (skipped by default `LOG_LEVEL=info`)
while still logging errors/slow requests at `info`, rather than proposing a full logger rewrite —
`utils/CLAUDE.md` in this repo explicitly says not to grow `logger.js` into a real observability
stack; a Pino/Winston swap is the real long-term fix but is a bigger change than a review comment
should push for.
