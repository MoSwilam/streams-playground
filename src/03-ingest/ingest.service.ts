import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { isVehicleState, type VehicleState } from '../shared/vehicle-state.js';
import { FakeVehicleStatesRepository } from './fake-vehicle-states.repository.js';
import { createEmptyIngestReport, type IngestReport } from './ingest-report.js';

export const INSERT_BATCH_SIZE = 500;

@Injectable()
export class IngestService {
  constructor(private readonly repository: FakeVehicleStatesRepository) {}

  // Reference, the "before" version. It waits for the entire upload, holds
  // it as one Buffer, then one string, then an array of lines, then an array
  // of rows, all at the same time. Read it to see the logic in plain form:
  // steps 1 to 3 split exactly this logic into stream stages.
  async ingestBuffered(source: Readable): Promise<IngestReport> {
    const report = createEmptyIngestReport();

    const chunks: Buffer[] = [];
    for await (const chunk of source) {
      chunks.push(chunk);
    }
    const wholeUpload = Buffer.concat(chunks).toString('utf8');
    const lines = wholeUpload.split('\n');

    const validRows: VehicleState[] = [];
    for (const line of lines) {
      const isBlank = line.trim() === '';
      if (isBlank) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        report.invalidRows.malformedJson++;
        continue;
      }

      if (!isVehicleState(parsed)) {
        report.invalidRows.wrongShape++;
        continue;
      }

      report.validRows++;
      validRows.push(parsed);
    }

    for (let start = 0; start < validRows.length; start += INSERT_BATCH_SIZE) {
      const batch = validRows.slice(start, start + INSERT_BATCH_SIZE);
      await this.repository.insertMany(batch);
      report.batchesInserted++;
    }

    return report;
  }

  // YOUR TURN (exercise 3, step 4).
  //
  // Wire the three stages together with `pipeline` from 'node:stream/promises':
  //
  //   source (the HTTP request body, raw bytes)
  //     → createLineSplitter()                    bytes   → lines
  //     → createRowParser(report)                 lines   → rows
  //     → createBatchWriter(INSERT_BATCH_SIZE,    rows    → database
  //         (rows) => this.repository.insertMany(rows), report)
  //
  // Create the report with createEmptyIngestReport(), await the pipeline,
  // then return the report. The stages fill it in as rows go past.
  async ingest(source: Readable): Promise<IngestReport> {
    throw new Error('Exercise 3, step 4: connect the ingest pipeline.');
  }
}
