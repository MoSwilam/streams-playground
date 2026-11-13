import { Module } from '@nestjs/common';
import { FakeVehicleStatesRepository } from './fake-vehicle-states.repository.js';
import { IngestController } from './ingest.controller.js';
import { IngestService } from './ingest.service.js';

@Module({
  controllers: [IngestController],
  providers: [IngestService, FakeVehicleStatesRepository],
})
export class IngestModule {}
