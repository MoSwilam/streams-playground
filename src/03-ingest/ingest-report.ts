// What an upload produced. Invalid rows are counted by reason, so the caller
// can tell "the JSON was broken" apart from "the JSON was fine but the row
// was missing fields".
export interface IngestReport {
  validRows: number;
  invalidRows: {
    malformedJson: number;
    wrongShape: number;
  };
  batchesInserted: number;
}

export function createEmptyIngestReport(): IngestReport {
  return {
    validRows: 0,
    invalidRows: { malformedJson: 0, wrongShape: 0 },
    batchesInserted: 0,
  };
}
