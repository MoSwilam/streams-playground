import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  buildFakeVehicleState,
  type VehicleState,
} from '../shared/vehicle-state.js';
import { createBatchWriter } from './create-batch-writer.js';
import { createLineSplitter } from './create-line-splitter.js';
import { createRowParser } from './create-row-parser.js';
import { FakeVehicleStatesRepository } from './fake-vehicle-states.repository.js';
import { createEmptyIngestReport } from './ingest-report.js';
import { INSERT_BATCH_SIZE, IngestService } from './ingest.service.js';

// Runs `values` through `transform` and collects everything it pushes out.
async function runThrough<T>(
  transform: NodeJS.ReadWriteStream,
  values: unknown[],
) {
  const outputs: T[] = [];
  const collector = new Writable({
    objectMode: true,
    write(value: T, _encoding, callback) {
      outputs.push(value);
      callback();
    },
  });
  const source = Readable.from(values);
  await pipeline(source, transform, collector);
  return outputs;
}

function toNdjsonLine(row: VehicleState): string {
  const json = JSON.stringify(row);
  return `${json}\n`;
}

describe('Ingest (exercise 3)', () => {
  describe('step 1: createLineSplitter', () => {
    it('splits chunks into lines, even when a line spans two chunks', async () => {
      const chunks = [
        Buffer.from('{"a":1}\n{"b"'),
        Buffer.from(':2}\n{"c":3}'),
      ];

      const splitter = createLineSplitter();
      const lines = await runThrough<string>(splitter, chunks);

      expect(lines).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
    });

    it('keeps a multi-byte character intact when its bytes are split across chunks (advanced)', async () => {
      const bytes = Buffer.from('café\nnext\n');
      const splitIndex = bytes.indexOf(0xa9); // second byte of 'é'
      const chunks = [
        bytes.subarray(0, splitIndex),
        bytes.subarray(splitIndex),
      ];

      const splitter = createLineSplitter();
      const lines = await runThrough<string>(splitter, chunks);

      expect(lines).toEqual(['café', 'next']);
    });
  });

  describe('step 2: createRowParser', () => {
    it('passes valid rows on and counts each kind of invalid row', async () => {
      const validRow = buildFakeVehicleState(0);
      const validLine = JSON.stringify(validRow);
      const lines = [validLine, '{"broken": ', '{"vehicleId": 42}', '   '];
      const report = createEmptyIngestReport();

      const parser = createRowParser(report);
      const rows = await runThrough<VehicleState>(parser, lines);

      expect(rows).toEqual([validRow]);
      expect(report.validRows).toBe(1);
      expect(report.invalidRows).toEqual({ malformedJson: 1, wrongShape: 1 });
    });
  });

  describe('step 3: createBatchWriter', () => {
    it('inserts full batches, then the leftover, one insert at a time', async () => {
      const repository = new FakeVehicleStatesRepository();
      const report = createEmptyIngestReport();
      const indexes = Array.from({ length: 25 }, (_, index) => index);
      const rows = indexes.map((index) => buildFakeVehicleState(index));

      const source = Readable.from(rows);
      const writer = createBatchWriter(
        10,
        (batch) => repository.insertMany(batch),
        report,
      );
      await pipeline(source, writer);

      expect(repository.insertedBatchSizes).toEqual([10, 10, 5]);
      expect(repository.maxConcurrentInserts).toBe(1);
      expect(report.batchesInserted).toBe(3);
    });

    it('fails the pipeline when an insert fails', async () => {
      const report = createEmptyIngestReport();
      const row = buildFakeVehicleState(0);
      const failingInsert = async () => {
        throw new Error('database is down');
      };

      const source = Readable.from([row]);
      const writer = createBatchWriter(10, failingInsert, report);
      const ingestPromise = pipeline(source, writer);

      await expect(ingestPromise).rejects.toThrow('database is down');
    });
  });

  describe('step 4: IngestService.ingest', () => {
    it('ingests an upload arriving in awkward chunks and reports the outcome', async () => {
      const rowCount = 1_234;
      const indexes = Array.from({ length: rowCount }, (_, index) => index);
      const validLines = indexes.map((index) => {
        const row = buildFakeVehicleState(index);
        return toNdjsonLine(row);
      });
      const uploadText = [
        ...validLines,
        'not json\n',
        '{"speedKmh": 1}\n',
      ].join('');
      const uploadBytes = Buffer.from(uploadText);
      // Cut the upload into 1000-byte chunks, so lines get split at random
      // places, like a real network would.
      const chunkSize = 1_000;
      const chunks: Buffer[] = [];
      for (let start = 0; start < uploadBytes.length; start += chunkSize) {
        const chunk = uploadBytes.subarray(start, start + chunkSize);
        chunks.push(chunk);
      }
      const repository = new FakeVehicleStatesRepository();
      const ingestService = new IngestService(repository);

      const upload = Readable.from(chunks);
      const report = await ingestService.ingest(upload);

      const expectedBatches = Math.ceil(rowCount / INSERT_BATCH_SIZE);
      expect(report).toEqual({
        validRows: rowCount,
        invalidRows: { malformedJson: 1, wrongShape: 1 },
        batchesInserted: expectedBatches,
      });
      expect(repository.insertedRowCount).toBe(rowCount);
      expect(repository.maxConcurrentInserts).toBe(1);
    });
  });
});
