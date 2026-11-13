import {
  Controller,
  DefaultValuePipe,
  Get,
  Logger,
  ParseIntPipe,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { generateFakeVehicleStates } from '../shared/vehicle-state.js';
import { ExportService } from './export.service.js';

const DEFAULT_ROW_COUNT = 1_000_000;
const CONTENT_TYPE = 'application/gzip';
const CONTENT_DISPOSITION = 'attachment; filename="vehicle-states.ndjson.gz"';

const ROWS_QUERY = {
  name: 'rows',
  required: false,
  type: Number,
  example: 1000,
  description: `How many fake vehicle-state rows to export (default ${DEFAULT_ROW_COUNT.toLocaleString('en')}). Use about 1,000 to try it here, and 1,000,000 from curl to see the memory difference.`,
};
const EXPORT_FILE_RESPONSE = {
  description:
    'A gzipped NDJSON file: one JSON object per line, e.g. `{"vehicleId":"vehicle-3","recordedAt":"2026-01-01T00:00:03.000Z","speedKmh":21,"batteryPercent":97}`. ' +
    'Check it with `gunzip -c file.gz | head`.',
  schema: { type: 'string', format: 'binary' },
} as const;

@ApiTags('Exercise 2: gzipped export')
@ApiProduces(CONTENT_TYPE)
@Controller('exports')
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(private readonly exportService: ExportService) {}

  @ApiOperation({
    summary: 'Before: build every row, then gzip, then send',
    description:
      'Works already. All rows, the full JSON text and the gzipped Buffer are in memory at once. ' +
      'At 1M rows expect about **+500 MB** peak RSS and about 1 s.',
  })
  @ApiQuery(ROWS_QUERY)
  @ApiOkResponse(EXPORT_FILE_RESPONSE)
  @Get('buffered')
  async exportBuffered(
    @Query('rows', new DefaultValuePipe(DEFAULT_ROW_COUNT), ParseIntPipe)
    rowCount: number,
  ): Promise<StreamableFile> {
    const source = generateFakeVehicleStates(rowCount);
    const gzipped = await this.exportService.buildBufferedExport(source);
    return new StreamableFile(gzipped, {
      type: CONTENT_TYPE,
      disposition: CONTENT_DISPOSITION,
    });
  }

  // The size of a streamed export isn't known up front, so there is no
  // Content-Length. Express falls back to chunked transfer encoding.
  @ApiOperation({
    summary: 'Your turn (steps 1–2): rows → JSON lines → gzip → response',
    description:
      'Same file as `/exports/buffered`, but each row is serialised, compressed and sent before the next ones pile up. ' +
      'At 1M rows expect about **+15 MB** peak RSS. Done when `pnpm test src/02-export` passes.\n\n' +
      'If it fails **before** the first byte goes out, you get a normal 500 (the server log shows which step is missing). ' +
      'If it fails **halfway**, the status is already 200, so the server cuts the connection and the client sees a broken download.',
  })
  @ApiQuery(ROWS_QUERY)
  @ApiOkResponse(EXPORT_FILE_RESPONSE)
  @ApiResponse({
    status: 500,
    description:
      'Failed before streaming started, e.g. steps 1–2 not built yet.',
  })
  @Get('streamed')
  async exportStreamed(
    @Query('rows', new DefaultValuePipe(DEFAULT_ROW_COUNT), ParseIntPipe)
    rowCount: number,
    @Res() response: Response,
  ): Promise<void> {
    response.setHeader('Content-Type', CONTENT_TYPE);
    response.setHeader('Content-Disposition', CONTENT_DISPOSITION);

    const source = generateFakeVehicleStates(rowCount);
    try {
      await this.exportService.streamExport(source, response);
    } catch (error) {
      // Before the first byte goes out, a normal error response still works.
      if (!response.headersSent) {
        throw error;
      }
      // Once bytes have been sent, the status code can't change any more.
      // All we can do is log and make sure the connection is closed, so the
      // client sees a broken download instead of a "complete" but cut-off file.
      this.logger.warn(`Export stopped early: ${String(error)}`);
      response.destroy();
    }
  }
}
