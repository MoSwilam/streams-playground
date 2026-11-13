# Streams learning project

Three exercises on Node.js streams, inside a NestJS app. Each one has a
**before** version (load everything into memory) that already works, and an
**after** version (stream it) that you build. Specs tell you when you're done,
and a memory probe shows you why it matters.

| # | Exercise | Direction | New ideas | backend-core equivalent |
|---|---|---|---|---|
| 1 | [File download](src/01-file-download/README.md) | disk → client | Readable, piping, `StreamableFile` | `software-distribution/releases/releases-download.service.ts` |
| 2 | [Gzipped export](src/02-export/README.md) | "DB cursor" → client | Transform, object mode, `pipeline`, backpressure, errors | `recordings/export/aggregator/aggregator.service.ts`, `export-job/exports-processor.service.ts` |
| 3 | [Upload ingest](src/03-ingest/README.md) | client → "DB" | Writable, chunk boundaries, batching, bad rows | `recordings/uploads/vehicle-uploads-ingester.service.ts` |

Do them in order. Each builds on the one before.

## Setup

```bash
pnpm install
pnpm data:generate   # writes ./data (≈250 MB, git-ignored)
pnpm start:dev       # http://localhost:3000
```

**Swagger UI: http://localhost:3000/docs** lists every endpoint grouped by
exercise, with what it does, what memory to expect, and which step it needs.
You can call them from there too (use small `rows` values; for big
measurements use curl, as browsers are slow with 200 MB responses).

Every request logs a line like this:

```
[MemoryProbe] GET /downloads/streamed finished in 92ms | peak RSS +32.2 MB (total 140.2 MB)
```

`peak RSS +X MB` is how much extra memory the process needed for that
request. That's the number to compare between buffered and streamed.
**Restart the server between measurements**, because Node rarely gives
memory back to the OS, so one request's leftovers skew the next one.

## Working loop

```bash
pnpm test:watch src/02-export   # unit specs for one exercise, re-run on save
pnpm test:e2e                   # exercise 1's HTTP test
```

Every `YOUR TURN` comment marks something to build. The stubs throw
`Exercise N, step M: ...`, so a failing spec tells you which step it's waiting on.

## The five words you need

- **Readable**: a source you pull data from (file, HTTP request body, DB cursor).
- **Writable**: a destination you push data into (file, HTTP response, DB).
- **Transform**: both at once: data goes in, changed data comes out (gzip, parse, map).
- **Chunk / object mode**: by default streams carry bytes (Buffers/strings).
  In object mode, each chunk is one JS value, such as one row.
- **Backpressure**: when the destination is slower than the source, the source
  has to pause. Each stream has a small buffer (`highWaterMark`). When it fills,
  `write()` returns `false` and the upstream waits for `'drain'`. `pipeline()`
  does all of this for you, plus cleanup when something fails.

`scripts/generate-data.mjs` shows backpressure done by hand
(`write()` + `once(stream, 'drain')`). It's worth a 2-minute read before exercise 2.
