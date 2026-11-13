import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { FileDownloadController } from './file-download.controller.js';
import { BIG_FILE_PATH, FileDownloadService } from './file-download.service.js';

const bigFilePath = join(process.cwd(), 'data', 'big-file.bin');

@Module({
  controllers: [FileDownloadController],
  providers: [
    FileDownloadService,
    { provide: BIG_FILE_PATH, useValue: bigFilePath },
  ],
})
export class FileDownloadModule {}
