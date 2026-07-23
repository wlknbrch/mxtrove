export interface ByteRange {
  start: number;
  end: number;
}

export function parseByteRange(rangeHeader: string | undefined, size: number): ByteRange | null {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || size <= 0) {
    throw new Error("Invalid range.");
  }

  const [, startText, endText] = match;
  if (!startText && !endText) {
    throw new Error("Invalid range.");
  }

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      throw new Error("Invalid range.");
    }
    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1,
    };
  }

  const start = Number(startText);
  const requestedEnd = endText ? Number(endText) : size - 1;
  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(requestedEnd)
    || start < 0
    || start >= size
    || requestedEnd < start
  ) {
    throw new Error("Invalid range.");
  }

  return {
    start,
    end: Math.min(requestedEnd, size - 1),
  };
}
