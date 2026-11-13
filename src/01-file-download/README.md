# Exercise 1: Serve a big file without loading it

**Problem.** A client downloads a 200 MB file. The naive way reads the whole
file into memory first, so 5 parallel downloads need about 1 GB of RAM.

**Idea.** Open a Readable on the file and connect it to the response. The file
moves through in 64 KB chunks, and only as fast as the client takes them.

## Files

- `file-download.service.ts`: `readWholeFile()` (before) vs `openStream()` (after)
- `file-download.controller.ts`: three endpoints
  - `GET /downloads/buffered`: reference, buffers the whole file
  - `GET /downloads/streamed`: reference, `StreamableFile` does the piping
  - `GET /downloads/manual`: **your turn**: do the piping yourself
- `test/file-download.e2e-spec.ts`: checks all three send the same bytes

## Steps

1. **Read the two reference endpoints** and compare them. The only difference
   is a Buffer vs a stream.
2. **Measure.** Restart the server before each one:
   ```bash
   curl -s -o /dev/null localhost:3000/downloads/buffered
   curl -s -o /dev/null localhost:3000/downloads/streamed
   ```
   Expect about +200 MB for buffered and a few MB for streamed.
3. **Build `/downloads/manual`** (instructions in the controller), then run
   `pnpm test:e2e`.

## Experiments

- **Slow client:** `curl -s -o /dev/null --limit-rate 2M localhost:3000/downloads/streamed`.
  Memory stays flat even though the download takes 100 s. Why doesn't the file
  get read faster than the client downloads it?
- **Client leaves early:** start the slow download, press Ctrl-C after a few
  seconds. The probe logs `aborted`. What happens to the file stream? (In your
  manual version, what does `pipeline` do?)
- **Parallel:** run 5 buffered downloads at once (`for i in 1 2 3 4 5; do curl ... & done`),
  then 5 streamed. Compare.

## Questions to answer for yourself

- Why does `/manual` need `@Res()`, and what do you give up by using it?
- `StreamableFile` vs your manual version: what does StreamableFile do that
  you had to do by hand?
