import { BadRequestException, Controller, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { IngestReport } from './ingest-report.js';
import { IngestService } from './ingest.service.js';

const NDJSON_CONTENT_TYPE = 'application/x-ndjson';

// Swagger UI shows a file picker for this body. It sends the file's bytes
// as-is, so it can't be swapped for a text box: Swagger UI would wrap the
// text in JSON quotes, because the media type contains "json".
const UPLOAD_BODY = {
  description:
    'An NDJSON file: one vehicle-state object per line. Bad lines are counted, not rejected. ' +
    'Pick `data/sample-upload.ndjson` (4 lines: 2 valid, 1 broken, 1 wrong shape) for a quick try, ' +
    'or `data/vehicle-states.ndjson` (48 MB) to compare memory.',
  schema: { type: 'string', format: 'binary' },
};

const REPORT_RESPONSE = {
  description: 'What the upload produced. Invalid rows are counted by reason.',
  schema: {
    type: 'object',
    properties: {
      validRows: { type: 'number', example: 2 },
      invalidRows: {
        type: 'object',
        properties: {
          malformedJson: {
            type: 'number',
            example: 1,
            description: 'The line is not valid JSON.',
          },
          wrongShape: {
            type: 'number',
            example: 1,
            description: 'Valid JSON, but missing fields or wrong field types.',
          },
        },
      },
      batchesInserted: {
        type: 'number',
        example: 1,
        description:
          'One insert per 500 valid rows, plus one for the remainder.',
      },
    },
  },
};
const WRONG_CONTENT_TYPE_RESPONSE = {
  description: `Content-Type was not ${NDJSON_CONTENT_TYPE}.`,
};

// The Express request object IS a Readable stream of the request body.
// That only holds while nobody has read it yet. Nest's built-in body parsers
// consume JSON and form bodies before your handler runs, so these routes
// only accept application/x-ndjson, which no parser touches.
function assertUnparsedNdjsonBody(request: Request): void {
  const isNdjson = request.is(NDJSON_CONTENT_TYPE) === NDJSON_CONTENT_TYPE;
  if (!isNdjson) {
    throw new BadRequestException(
      `Send the upload with "Content-Type: ${NDJSON_CONTENT_TYPE}". Other content types get consumed by Nest's body parser before this handler can stream them.`,
    );
  }
}

@ApiTags('Exercise 3: upload ingest')
@ApiConsumes(NDJSON_CONTENT_TYPE)
@ApiCreatedResponse(REPORT_RESPONSE)
@ApiBadRequestResponse(WRONG_CONTENT_TYPE_RESPONSE)
@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @ApiOperation({
    summary: 'Before: wait for the whole upload, then parse and insert',
    description:
      'Works already. Holds the upload as one Buffer, one string, an array of lines and an array of rows at once. ' +
      'With the 48 MB file from curl, expect about **+250 MB** peak RSS.',
  })
  @ApiBody(UPLOAD_BODY)
  @Post('buffered')
  async ingestBuffered(@Req() request: Request): Promise<IngestReport> {
    assertUnparsedNdjsonBody(request);
    return this.ingestService.ingestBuffered(request);
  }

  @ApiOperation({
    summary: 'Your turn (steps 1–4): bytes → lines → rows → batched inserts',
    description:
      'Should return the same report as `/ingest/buffered`, while the rows stream through as the upload arrives. ' +
      'With the 48 MB file, expect about **+40 MB** peak RSS. Done when `pnpm test src/03-ingest` passes.',
  })
  @ApiResponse({
    status: 500,
    description: 'Not built yet (the server log shows which step is missing).',
  })
  @ApiBody(UPLOAD_BODY)
  @Post('streamed')
  async ingestStreamed(@Req() request: Request): Promise<IngestReport> {
    assertUnparsedNdjsonBody(request);
    return this.ingestService.ingest(request);
  }
}
