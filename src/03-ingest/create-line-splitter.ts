import type { Transform } from 'node:stream';

// YOUR TURN (exercise 3, step 1).
//
// Return a Transform that takes raw bytes in (whatever chunk sizes the network
// delivers) and pushes complete lines out, one string per line, without the
// '\n'.
//
// The catch: chunks don't respect line boundaries. One chunk can end in the
// middle of a line, and the rest of that line arrives in the next chunk.
//
//   chunk 1: '{"a":1}\n{"b"'
//   chunk 2: ':2}\n{"c":3}'
//   lines:   '{"a":1}', '{"b":2}', '{"c":3}'
//
// Hints:
// - `new Transform({ readableObjectMode: true, transform(chunk, encoding, callback) {...}, flush(callback) {...} })`
//   Input is bytes; output is objects (strings), one per line.
// - Keep the unfinished tail of the last chunk in a variable, and glue it to
//   the front of the next chunk.
// - `this.push(line)` can be called many times inside one transform call.
// - `flush` runs once after the last chunk: push whatever is left over (the
//   last line may not end with '\n').
// - Advanced (one spec covers it): a multi-byte character such as 'é' is two
//   bytes, and those two bytes can land in different chunks. Calling
//   `chunk.toString()` on half a character gives garbage. `StringDecoder` from
//   'node:string_decoder' holds the incomplete bytes back for you.
export function createLineSplitter(): Transform {
  throw new Error('Exercise 3, step 1: build the line splitter.');
}
