import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { FileDownloadController } from './01-file-download/file-download.controller.js';
import { FileDownloadModule } from './01-file-download/file-download.module.js';
import { ExportController } from './02-export/export.controller.js';
import { ExportModule } from './02-export/export.module.js';
import { IngestController } from './03-ingest/ingest.controller.js';
import { IngestModule } from './03-ingest/ingest.module.js';
import { MemoryProbeMiddleware } from './shared/memory-probe.middleware.js';

@Module({
  imports: [FileDownloadModule, ExportModule, IngestModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(MemoryProbeMiddleware)
      .forRoutes(FileDownloadController, ExportController, IngestController);
  }
}
