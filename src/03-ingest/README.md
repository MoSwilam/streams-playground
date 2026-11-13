# Exercise 3: Ingest a large upload in batches

**Problem.** A client uploads a 48 MB NDJSON file (500k rows, 499 of them
broken on purpose). The naive version waits for the full upload, then holds a
Buffer, a string, an array of lines and an array of rows at once, which comes
to about +250 MB.

**Idea.** Three stages, each a small stream:

```
request body (bytes)
  → line splitter   bytes → lines     (step 1)
  → row parser      lines → rows      (step 2)  counts bad rows, keeps going
  → batch writer    rows  → database  (step 3)  500 rows per insert
```

Step 4 connects them. When the database is slow, the batch writer holds its
callback, the stages above fill up and pause, and Node stops reading from the
socket. The client's upload slows down to match the database.

## Files

- `create-line-splitter.ts`, `create-row-parser.ts`, `create-batch-writer.ts`: **your turn, steps 1–3**
- `ingest.service.ts`: `ingestBuffered()` (reference, read it first: it's the
  same logic in plain form) and `ingest()` (**your turn, step 4**)
- `fake-vehicle-states.repository.ts`: fake DB, 2 ms per insert, records batch
  sizes and how many inserts overlapped
- `ingest-report.ts`: the result: valid rows, invalid rows by reason, batches
- `ingest.spec.ts`: specs per step

## Steps

1. Try `/ingest/buffered` in Swagger UI first: pick `data/sample-upload.ndjson`
   in the file picker. You'll get `validRows: 2, malformedJson: 1, wrongShape: 1`.
   `/ingest/streamed` must return the same once you're done.
2. `pnpm test:watch src/03-ingest`, then work through steps 1 → 4.
3. Measure (restart between). The `Content-Type` header is required (see
   the comment in `ingest.controller.ts` for why):
   ```bash
   curl -s -X POST -H 'Content-Type: application/x-ndjson' --data-binary @data/vehicle-states.ndjson localhost:3000/ingest/buffered
   curl -s -X POST -H 'Content-Type: application/x-ndjson' --data-binary @data/vehicle-states.ndjson localhost:3000/ingest/streamed
   ```
   Both should return
   `{"validRows":499501,"invalidRows":{"malformedJson":499,"wrongShape":0},"batchesInserted":1000}`.
   Expect about +250 MB buffered and about +40 MB streamed.

## Experiments

- Raise `INSERT_DELAY_MILLISECONDS` in the fake repository to 50. The upload
  gets slower, but does memory grow? That's backpressure reaching the client.
- In the batch writer, call `callback()` right away instead of after the
  insert. Which spec fails? What would that do to a real database?

## Questions to answer for yourself

- Why is a bad row counted and skipped, but a failed insert fails the
  whole upload?
- The line splitter has a `flush`. The batch writer has a `final`. What's the
  difference, and what goes wrong if you forget either?
- Exercise 2 used `writableObjectMode`, this one uses `readableObjectMode` and
  `objectMode`. Which side is which, and why?
