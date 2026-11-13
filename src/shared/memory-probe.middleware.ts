import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const SAMPLE_INTERVAL_MILLISECONDS = 10;
const BYTES_PER_MEGABYTE = 1024 * 1024;

function toMegabytes(bytes: number): string {
  const megabytes = bytes / BYTES_PER_MEGABYTE;
  return megabytes.toFixed(1);
}

// Logs how much extra memory each request needed at its peak.
// This is the measuring tape for all three exercises: run the buffered and
// streamed versions of an endpoint and compare the "peak RSS +X MB" lines.
//
// RSS (resident set size) is all the memory the Node process holds,
// including Buffers, which live outside the JS heap.
@Injectable()
export class MemoryProbeMiddleware implements NestMiddleware {
  private readonly logger = new Logger('MemoryProbe');

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const baselineRss = process.memoryUsage.rss();
    let peakRss = baselineRss;

    const sampler = setInterval(() => {
      const currentRss = process.memoryUsage.rss();
      peakRss = Math.max(peakRss, currentRss);
    }, SAMPLE_INTERVAL_MILLISECONDS);

    // 'close' fires when the response is done, whether it finished normally
    // or the client went away halfway through.
    response.on('close', () => {
      clearInterval(sampler);
      const durationMilliseconds = Date.now() - startedAt;
      const extraMegabytes = toMegabytes(peakRss - baselineRss);
      const peakMegabytes = toMegabytes(peakRss);
      const completion = response.writableFinished ? 'finished' : 'aborted';
      this.logger.log(
        `${request.method} ${request.originalUrl} ${completion} in ${durationMilliseconds}ms | peak RSS +${extraMegabytes} MB (total ${peakMegabytes} MB)`,
      );
    });

    next();
  }
}
