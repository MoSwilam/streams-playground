import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from './../src/app.module.js';
import { BIG_FILE_PATH } from './../src/01-file-download/file-download.service.js';

// Exercise 1: all three download endpoints must send exactly the same bytes.
// A small temporary file stands in for data/big-file.bin.
describe('File download (exercise 1, e2e)', () => {
  let app: INestApplication<App>;
  const fileContent = randomBytes(256 * 1024);

  beforeAll(async () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'streams-'));
    const filePath = join(temporaryDirectory, 'big-file.bin');
    writeFileSync(filePath, fileContent);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BIG_FILE_PATH)
      .useValue(filePath)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['buffered', 'streamed', 'manual'])(
    'GET /downloads/%s sends the whole file',
    async (variant) => {
      const server = app.getHttpServer();
      const response = await request(server)
        .get(`/downloads/${variant}`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(Buffer.compare(response.body, fileContent)).toBe(0);
    },
  );
});
