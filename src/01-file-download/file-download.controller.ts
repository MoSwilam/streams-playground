import {
  Controller,
  Get,
  Header,
  NotImplementedException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FileDownloadService } from './file-download.service.js';
import { pipeline } from 'node:stream/promises';

const CONTENT_TYPE = 'application/octet-stream';
const CONTENT_DISPOSITION = 'attachment; filename="big-file.bin"';

const FILE_RESPONSE = {
  description: 'The 200 MB file `data/big-file.bin`.',
  schema: { type: 'string', format: 'binary' },
} as const;
const MISSING_FILE_RESPONSE = {
  description: "The file hasn't been generated yet. Run `pnpm data:generate`.",
};

@ApiTags('Exercise 1: file download')
@ApiProduces(CONTENT_TYPE)
@ApiNotFoundResponse(MISSING_FILE_RESPONSE)
@Controller('downloads')
export class FileDownloadController {
  constructor(private readonly fileDownloadService: FileDownloadService) {}

  // Reference: load everything, then send it.
  @ApiOperation({
    summary: 'Before: read the whole file into memory, then send it',
    description:
      'Works already. `fs.readFile` loads all 200 MB into one Buffer before the first byte goes out. ' +
      'Expect the server log to show about **+200 MB** peak RSS.',
  })
  @ApiOkResponse(FILE_RESPONSE)
  @Get('buffered')
  @Header('Content-Type', CONTENT_TYPE)
  @Header('Content-Disposition', CONTENT_DISPOSITION)
  async downloadBuffered(): Promise<StreamableFile> {
    await this.fileDownloadService.getFileSize();
    const wholeFile = await this.fileDownloadService.readWholeFile();
    return new StreamableFile(wholeFile);
  }

  // Reference: hand Nest a stream. StreamableFile pipes it into the HTTP
  // response for you and cleans up if the client disconnects.
  @ApiOperation({
    summary: 'After: stream the file with StreamableFile',
    description:
      'Works already. A read stream sends the file in 64 KB chunks, only as fast as the client takes them, ' +
      "and Nest's `StreamableFile` does the piping. Expect only a **few MB** of peak RSS.",
  })
  @ApiOkResponse(FILE_RESPONSE)
  @Get('streamed')
  async downloadStreamed(): Promise<StreamableFile> {
    const fileSize = await this.fileDownloadService.getFileSize();
    const fileStream = this.fileDownloadService.openStream();
    return new StreamableFile(fileStream, {
      type: CONTENT_TYPE,
      disposition: CONTENT_DISPOSITION,
      length: fileSize,
    });
  }

  // YOUR TURN (exercise 1, step 3): do what StreamableFile does, by hand.
  //
  // `response` is an Express response, which is a Writable stream.
  // 1. Set the Content-Type, Content-Disposition and Content-Length headers.
  // 2. Open the file stream and connect it to `response` with
  //    `pipeline` from 'node:stream/promises'. Await it.
  // 3. Wrap the pipeline in try/catch: when the client disconnects halfway,
  //    pipeline rejects (ERR_STREAM_PREMATURE_CLOSE). Log it instead of
  //    letting it crash the request.
  //
  // Using @Res() tells Nest "I will write the response myself", so do not
  // return anything.
  @ApiOperation({
    summary: 'Your turn (step 3): stream the file by hand with pipeline()',
    description:
      'Should behave exactly like `/downloads/streamed`, but you connect the file stream to the Express response yourself. ' +
      'Done when `pnpm test:e2e` passes.',
  })
  @ApiOkResponse(FILE_RESPONSE)
  @ApiResponse({ status: 501, description: 'Not built yet.' })
  @Get('manual')
  async downloadManual(@Res() response: Response): Promise<void> {
    const fileSize = await this.fileDownloadService.getFileSize();
    response.setHeader('Content-Type', CONTENT_TYPE);
    response.setHeader('Content-Disposition', CONTENT_DISPOSITION);
    response.setHeader('Content-Length', fileSize.toString());
    const file = this.fileDownloadService.openStream();
    await pipeline(file, response);
  }
}
