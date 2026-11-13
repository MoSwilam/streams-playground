import { Injectable } from '@nestjs/common';
import type { Transform, Writable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import type { VehicleState } from '../shared/vehicle-state.js';

@Injectable()
export class ExportService {
  // Reference, the "before" version. This is the shape that runs out of memory
  // in real exports: every row, then one giant string, then one giant gzip
  // Buffer all exist in memory at the same time before anything is sent.
  async buildBufferedExport(
    source: AsyncIterable<VehicleState>,
  ): Promise<Buffer> {
    const rows: VehicleState[] = [];
    for await (const row of source) {
      rows.push(row);
    }

    const lines = rows.map((row) => JSON.stringify(row));
    const jsonLines = `${lines.join('\n')}\n`;
    const gzipped = gzipSync(jsonLines);
    return gzipped;
  }

  // YOUR TURN (exercise 2, step 1).
  //
  // Return a Transform stream that takes VehicleState objects in and pushes
  // one JSON line out per object: `${JSON.stringify(row)}\n`.
  //
  // Hints:
  // - `new Transform({ writableObjectMode: true, transform(row, encoding, callback) { ... } })`
  //   The writable side (input) takes objects. The readable side (output) is
  //   plain text/bytes, because gzip after it only accepts bytes.
  // - Call `callback(null, line)` to push the line and ask for the next row.
  //   Calling callback is what keeps the data flowing: forget it and the
  //   whole pipeline silently stops.
  createJsonLinesTransform(): Transform {
    throw new Error('Exercise 2, step 1: build the JSON-lines Transform.');
  }

  // YOUR TURN (exercise 2, step 2).
  //
  // Connect: source rows → JSON-lines transform → gzip → destination.
  //
  // Hints:
  // - `pipeline` from 'node:stream/promises' accepts an async iterable (like
  //   the fake cursor) as its first step, so you don't even need Readable.from.
  // - `createGzip()` from 'node:zlib' is a ready-made Transform.
  // - `pipeline` handles the two things `.pipe()` doesn't:
  //     backpressure all the way back to the source, and
  //     destroying every stream if any one of them fails.
  //   The spec file checks both.
  async streamExport(
    source: AsyncIterable<VehicleState>,
    destination: Writable,
  ): Promise<void> {
    throw new Error('Exercise 2, step 2: connect the export pipeline.');
  }
}
