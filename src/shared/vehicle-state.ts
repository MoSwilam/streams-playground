// The row shape used by exercises 2 and 3. It is a small stand-in for the
// vehicle-state documents backend-core exports and ingests.
export interface VehicleState {
  vehicleId: string;
  recordedAt: string;
  speedKmh: number;
  batteryPercent: number;
}

const VEHICLE_COUNT = 20;
const SECONDS_BETWEEN_ROWS = 1;
const MILLISECONDS_PER_SECOND = 1000;

export function buildFakeVehicleState(index: number): VehicleState {
  const vehicleNumber = index % VEHICLE_COUNT;
  const vehicleId = `vehicle-${vehicleNumber}`;
  const recordedAtMilliseconds =
    Date.UTC(2026, 0, 1) +
    index * SECONDS_BETWEEN_ROWS * MILLISECONDS_PER_SECOND;
  const recordedAt = new Date(recordedAtMilliseconds).toISOString();
  const speedKmh = (index * 7) % 120;
  const batteryPercent = 100 - (index % 100);

  return { vehicleId, recordedAt, speedKmh, batteryPercent };
}

// Pretends to be a database cursor: it hands out one row at a time and only
// builds the next row when someone asks for it. Nothing is held in memory.
export async function* generateFakeVehicleStates(
  rowCount: number,
): AsyncGenerator<VehicleState> {
  for (let index = 0; index < rowCount; index++) {
    yield buildFakeVehicleState(index);
  }
}

export function isVehicleState(value: unknown): value is VehicleState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasVehicleId = typeof candidate.vehicleId === 'string';
  const hasRecordedAt = typeof candidate.recordedAt === 'string';
  const hasSpeed = typeof candidate.speedKmh === 'number';
  const hasBattery = typeof candidate.batteryPercent === 'number';

  return hasVehicleId && hasRecordedAt && hasSpeed && hasBattery;
}
