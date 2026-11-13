import type { Writable } from 'node:stream';
import type { VehicleState } from '../shared/vehicle-state.js';
import type { IngestReport } from './ingest-report.js';

export type InsertBatch = (rows: VehicleState[]) => Promise<void>;

// YOUR TURN (exercise 3, step 3).
//
// Return an object-mode Writable, the end of the pipeline. It collects rows
// into a batch, and every time the batch reaches `batchSize` it calls
// `insertBatch(batch)` and increments `report.batchesInserted`.
//
// Hints:
// - `new Writable({ objectMode: true, write(row, encoding, callback) {...}, final(callback) {...} })`
// - Backpressure lives here: when the batch is full, call `callback()` only
//   AFTER `insertBatch` resolves. Until you call it, the stream won't hand
//   you the next row, so the upstream stages (and the upload itself) pause
//   while the database works. That's what keeps memory flat.
// - `final` runs once after the last row: insert the leftover partial batch
//   (if it's not empty) before calling `callback()`.
// - If insertBatch rejects, pass the error to the callback: `callback(error)`.
//   A failing database SHOULD fail the upload.
export function createBatchWriter(
  batchSize: number,
  insertBatch: InsertBatch,
  report: IngestReport,
): Writable {
  throw new Error('Exercise 3, step 3: build the batch writer.');
}
