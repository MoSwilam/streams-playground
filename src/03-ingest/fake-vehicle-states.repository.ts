import { Injectable } from '@nestjs/common';
import type { VehicleState } from '../shared/vehicle-state.js';

const INSERT_DELAY_MILLISECONDS = 2;

// Stands in for a Mongo collection. Each insertMany takes a little while,
// like a real database round trip, so a slow database actually slows the
// upload down (that's backpressure doing its job).
//
// It also records how many inserts ran at the same time. A correct batch
// writer only ever has one insert in flight.
@Injectable()
export class FakeVehicleStatesRepository {
  insertedRowCount = 0;
  insertedBatchSizes: number[] = [];
  maxConcurrentInserts = 0;
  private inFlightInserts = 0;

  async insertMany(rows: VehicleState[]): Promise<void> {
    this.inFlightInserts++;
    this.maxConcurrentInserts = Math.max(
      this.maxConcurrentInserts,
      this.inFlightInserts,
    );

    await new Promise((resolve) =>
      setTimeout(resolve, INSERT_DELAY_MILLISECONDS),
    );

    this.insertedRowCount += rows.length;
    this.insertedBatchSizes.push(rows.length);
    this.inFlightInserts--;
  }
}
