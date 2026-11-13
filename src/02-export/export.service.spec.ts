import { Readable, Writable } from 'node:stream';
import { gunzipSync } from 'node:zlib';
import {
  buildFakeVehicleState,
  generateFakeVehicleStates,
} from '../shared/vehicle-state.js';
import { ExportService } from './export.service.js';

async function collectText(readable: Readable): Promise<string> {
  const parts: string[] = [];
  for await (const chunk of readable) {
    const part = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    parts.push(part);
  }
  return parts.join('');
}

function createCollectingDestination() {
  const chunks: Buffer[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  const getBytes = () => Buffer.concat(chunks);
  return { destination, getBytes };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe('ExportService (exercise 2)', () => {
  const exportService = new ExportService();

  describe('step 1: createJsonLinesTransform', () => {
    it('turns each row into one JSON line', async () => {
      const rows = [buildFakeVehicleState(0), buildFakeVehicleState(1)];
      const source = Readable.from(rows);
      const transform = exportService.createJsonLinesTransform();
      const output = source.pipe(transform);

      const text = await collectText(output);

      const expectedLines = rows.map((row) => `${JSON.stringify(row)}\n`);
      const expectedText = expectedLines.join('');
      expect(text).toBe(expectedText);
    });
  });

  describe('step 2: streamExport', () => {
    it('writes every row as gzipped JSON lines', async () => {
      const rowCount = 1_000;
      const source = generateFakeVehicleStates(rowCount);
      const { destination, getBytes } = createCollectingDestination();

      await exportService.streamExport(source, destination);

      const gzipped = getBytes();
      const text = gunzipSync(gzipped).toString('utf8');
      const lines = text.trimEnd().split('\n');
      const lastRow = JSON.parse(lines[rowCount - 1]);
      const expectedLastRow = buildFakeVehicleState(rowCount - 1);
      expect(lines).toHaveLength(rowCount);
      expect(lastRow).toEqual(expectedLastRow);
    });

    // Backpressure: if the client stops reading, we must stop reading from
    // the database too. Otherwise rows pile up in memory, which is exactly
    // the problem streaming was supposed to solve.
    it('stops pulling rows while the destination is stuck (backpressure)', async () => {
      const totalRows = 1_000_000;
      let producedRows = 0;
      async function* countingSource() {
        for (let index = 0; index < totalRows; index++) {
          producedRows++;
          yield buildFakeVehicleState(index);
        }
      }
      // A destination that accepts one chunk and then never says "done".
      // Think of a client on a very bad connection.
      const stuckDestination = new Writable({
        highWaterMark: 1024,
        write() {},
      });

      const source = countingSource();
      const exportPromise = exportService.streamExport(
        source,
        stuckDestination,
      );
      const exportSettled = exportPromise.catch(() => undefined);
      await wait(300);
      const producedWhileStuck = producedRows;
      stuckDestination.destroy();
      // Don't hang forever if the implementation never settles.
      const giveUp = wait(1_000);
      await Promise.race([exportSettled, giveUp]);

      expect(producedWhileStuck).toBeGreaterThan(0);
      expect(producedWhileStuck).toBeLessThan(50_000);
    });

    it('rejects and destroys the destination when the source fails', async () => {
      async function* failingSource() {
        yield buildFakeVehicleState(0);
        throw new Error('database connection lost');
      }
      const { destination } = createCollectingDestination();

      const source = failingSource();
      const exportPromise = exportService.streamExport(source, destination);

      await expect(exportPromise).rejects.toThrow('database connection lost');
      expect(destination.destroyed).toBe(true);
    });
  });
});
