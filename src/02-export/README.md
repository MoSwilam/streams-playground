# Exercise 2: Stream a gzipped export from a "database cursor"

**Problem.** Export 1M rows as a `.ndjson.gz` file. The naive version holds
every row, then the full JSON string, then the gzipped Buffer, all in memory
at once. That's about +500 MB for 1M small rows, and it's how real exports
run out of memory.

**Idea.** Rows → JSON lines → gzip → response, as a pipeline. Each row is
built, serialised, compressed and sent before the next ones pile up.
`generateFakeVehicleStates()` in `src/shared` plays the DB cursor: it only
builds a row when someone asks for one.

## Files

- `export.service.ts`
  - `buildBufferedExport()`: reference, the "before"
  - `createJsonLinesTransform()`: **your turn, step 1**
  - `streamExport()`: **your turn, step 2**
- `export.controller.ts`: `GET /exports/buffered?rows=N` and `GET /exports/streamed?rows=N` (both already wired)
- `export.service.spec.ts`: the specs, including backpressure and error handling

## Steps

1. `pnpm test:watch src/02-export`
2. Build the Transform (step 1). Note `writableObjectMode`: objects in, bytes out.
3. Build the pipeline (step 2). All four specs should go green, including:
   - **backpressure**: with a stuck client, your code must stop pulling rows
     (it fails with "expected 1000000 to be less than 50000" if it doesn't)
   - **errors**: if the cursor throws halfway, every stream gets destroyed
4. Measure (restart between):
   ```bash
   curl -s -o export.gz 'localhost:3000/exports/buffered?rows=1000000'
   curl -s -o export.gz 'localhost:3000/exports/streamed?rows=1000000'
   gunzip -c export.gz | wc -l    # 1000000
   ```
   Expect about +500 MB buffered and about +15 MB streamed.

## Stretch: why is the streamed version ~8× slower?

You'll see it in the probe: ~0.9 s buffered vs ~7 s streamed. Memory is
fixed, but now each ~90-byte row is its own chunk, and gzip pays a fixed
cost per chunk. Make the Transform emit fewer, bigger chunks (for example,
collect lines and push every ~64 KB, with `flush()` for the remainder), and
see how close you get to the buffered speed while keeping memory flat. The
specs still have to pass.

## Questions to answer for yourself

- Try `.pipe()` instead of `pipeline` (`source.pipe(transform).pipe(gzip).pipe(destination)`).
  Which spec breaks, and why?
- In the controller, why can't a failure halfway become a 500 response?
- `aggregator.service.ts` in backend-core pauses every N docs
  (`throttled(cursor)`). What problem does that solve that backpressure doesn't?
