import type { Transform } from 'node:stream';
import type { IngestReport } from './ingest-report.js';

// YOUR TURN (exercise 3, step 2).
//
// Return an object-mode Transform: lines (strings) in, VehicleState objects
// out.
//
// For each line:
// - empty or whitespace-only line → skip it, count nothing
// - JSON.parse throws             → report.invalidRows.malformedJson++, skip it
// - parsed, but not a VehicleState → report.invalidRows.wrongShape++, skip it
//   (use `isVehicleState` from '../shared/vehicle-state.js')
// - valid                          → report.validRows++, push it on
//
// Hints:
// - `new Transform({ objectMode: true, transform(line, encoding, callback) {...} })`
// - One bad row must NOT fail the whole upload. Count it and call
//   `callback()` with no arguments to move on. Passing an error to the
//   callback (`callback(error)`) would tear down the entire pipeline.
export function createRowParser(report: IngestReport): Transform {
  throw new Error('Exercise 3, step 2: build the row parser.');
}
