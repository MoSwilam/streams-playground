import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, type ReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';

export const BIG_FILE_PATH = Symbol('BIG_FILE_PATH');

@Injectable()
export class FileDownloadService {
  constructor(@Inject(BIG_FILE_PATH) private readonly filePath: string) {}

  async getFileSize(): Promise<number> {
    try {
      const fileStats = await stat(this.filePath);
      return fileStats.size;
    } catch {
      throw new NotFoundException(
        `No file at ${this.filePath}. Run "pnpm data:generate" first.`,
      );
    }
  }

  // The "before" version: the whole file is loaded into one Buffer in memory
  // before a single byte goes to the client. 200 MB file = 200 MB of RAM,
  // per request. Five parallel downloads = ~1 GB.
  async readWholeFile(): Promise<Buffer> {
    return readFile(this.filePath);
  }

  // The "after" version: nothing is read yet. The stream reads the file in
  // small chunks (64 KB by default) only as fast as the consumer takes them.
  openStream(): ReadStream {
    return createReadStream(this.filePath);
  }
}
