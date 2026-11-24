export const RATE = 16000;

/** Audio in which every sample is `amplitude`. */
export function speech(seconds: number, amplitude = 0.1, rate = RATE): Float32Array {
  return new Float32Array(Math.round(seconds * rate)).fill(amplitude);
}

/** Audio of zeros. */
export function quiet(seconds: number, rate = RATE): Float32Array {
  return new Float32Array(Math.round(seconds * rate));
}

/** The parts one after the other. */
export function audio(...parts: Float32Array[]): Float32Array {
  const joined = new Float32Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}
