// Generates the input files for the exercises into ./data:
//   data/big-file.bin            ~200 MB of bytes, for exercise 1
//   data/vehicle-states.ndjson   500k JSON lines (a few broken on purpose), for exercise 3
//   data/sample-upload.ndjson    4 lines (2 valid, 1 broken, 1 wrong shape), to try exercise 3 from Swagger UI
//
// Run it with: pnpm data:generate
//
// The script itself is a small stream example: it writes with a WriteStream
// and respects backpressure by hand (write() + 'drain'). Exercises 2 and 3
// show the higher-level way to do the same thing with pipeline().

import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';

const DATA_DIRECTORY = new URL('../data/', import.meta.url);
const BYTES_PER_MEGABYTE = 1024 * 1024;
const BIG_FILE_MEGABYTES = 200;
const NDJSON_ROW_COUNT = 500_000;
const BROKEN_LINE_EVERY = 1_000;
const VEHICLE_COUNT = 20;

// write() returns false once the stream's internal buffer is full
// (its highWaterMark). That is the stream saying "slow down".
// Waiting for 'drain' before writing more is what backpressure means.
async function writeRespectingBackpressure(stream, chunk) {
  const canContinue = stream.write(chunk);
  if (!canContinue) {
    await once(stream, 'drain');
  }
}

async function finish(stream) {
  stream.end();
  await once(stream, 'finish');
}

async function generateBigFile() {
  const fileUrl = new URL('big-file.bin', DATA_DIRECTORY);
  const stream = createWriteStream(fileUrl);
  const oneMegabyte = randomBytes(BYTES_PER_MEGABYTE);

  for (let megabyte = 0; megabyte < BIG_FILE_MEGABYTES; megabyte++) {
    await writeRespectingBackpressure(stream, oneMegabyte);
  }

  await finish(stream);
  console.log(`wrote ${fileUrl.pathname} (${BIG_FILE_MEGABYTES} MB)`);
}

function buildLine(index) {
  const isBroken = index > 0 && index % BROKEN_LINE_EVERY === 0;
  if (isBroken) {
    return `{"vehicleId": "vehicle-broken", "speedKmh": \n`;
  }

  const recordedAtMilliseconds = Date.UTC(2026, 0, 1) + index * 1000;
  const row = {
    vehicleId: `vehicle-${index % VEHICLE_COUNT}`,
    recordedAt: new Date(recordedAtMilliseconds).toISOString(),
    speedKmh: (index * 7) % 120,
    batteryPercent: 100 - (index % 100),
  };
  const json = JSON.stringify(row);
  return `${json}\n`;
}

async function generateNdjson() {
  const fileUrl = new URL('vehicle-states.ndjson', DATA_DIRECTORY);
  const stream = createWriteStream(fileUrl);

  for (let index = 0; index < NDJSON_ROW_COUNT; index++) {
    const line = buildLine(index);
    await writeRespectingBackpressure(stream, line);
  }

  await finish(stream);
  const brokenLineCount = Math.floor((NDJSON_ROW_COUNT - 1) / BROKEN_LINE_EVERY);
  console.log(
    `wrote ${fileUrl.pathname} (${NDJSON_ROW_COUNT} lines, ${brokenLineCount} broken on purpose)`,
  );
}

// Small enough that plain writeFileSync is fine. No stream needed.
function generateSampleUpload() {
  const fileUrl = new URL('sample-upload.ndjson', DATA_DIRECTORY);
  const lines = [
    '{"vehicleId":"vehicle-1","recordedAt":"2026-01-01T00:00:01.000Z","speedKmh":7,"batteryPercent":99}',
    '{"vehicleId":"vehicle-2","recordedAt":"2026-01-01T00:00:02.000Z","speedKmh":14,"batteryPercent":98}',
    '{"vehicleId": "vehicle-broken", "speedKmh":',
    '{"vehicleId":"vehicle-3","speedKmh":"fast"}',
  ];
  const content = `${lines.join('\n')}\n`;
  writeFileSync(fileUrl, content);
  console.log(`wrote ${fileUrl.pathname} (${lines.length} lines)`);
}

mkdirSync(DATA_DIRECTORY, { recursive: true });
await generateBigFile();
await generateNdjson();
generateSampleUpload();
