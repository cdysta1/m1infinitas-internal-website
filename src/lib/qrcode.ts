// Minimal zero-dependency ISO/IEC 18004 QR Code encoder (Byte mode, ECC Level M, Versions 1–10).
// Produces a square boolean matrix (true = dark module) suitable for Canvas/SVG rendering.

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i += 1) {
    const factor = data[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j += 1) {
        rem[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return rem;
}

interface VersionSpec {
  version: number;
  totalCodewords: number;
  ecPerBlock: number;
  // [numBlocks, dataCodewordsPerBlock]
  blocks: readonly (readonly [number, number])[];
  alignCenters: readonly number[];
}

// Level M specifications for QR Versions 1 through 10 (up to 213 UTF-8 bytes).
const LEVEL_M_SPECS: readonly VersionSpec[] = [
  { version: 1, totalCodewords: 26, ecPerBlock: 10, blocks: [[1, 16]], alignCenters: [] },
  { version: 2, totalCodewords: 44, ecPerBlock: 16, blocks: [[1, 28]], alignCenters: [6, 18] },
  { version: 3, totalCodewords: 70, ecPerBlock: 26, blocks: [[1, 44]], alignCenters: [6, 22] },
  { version: 4, totalCodewords: 100, ecPerBlock: 18, blocks: [[2, 32]], alignCenters: [6, 26] },
  { version: 5, totalCodewords: 134, ecPerBlock: 24, blocks: [[2, 43]], alignCenters: [6, 30] },
  { version: 6, totalCodewords: 172, ecPerBlock: 16, blocks: [[4, 27]], alignCenters: [6, 34] },
  { version: 7, totalCodewords: 196, ecPerBlock: 18, blocks: [[4, 31]], alignCenters: [6, 22, 38] },
  { version: 8, totalCodewords: 242, ecPerBlock: 22, blocks: [[2, 38], [2, 39]], alignCenters: [6, 24, 42] },
  { version: 9, totalCodewords: 292, ecPerBlock: 22, blocks: [[3, 36], [2, 37]], alignCenters: [6, 26, 46] },
  { version: 10, totalCodewords: 346, ecPerBlock: 26, blocks: [[4, 43], [1, 44]], alignCenters: [6, 28, 50] },
];

// Precomputed BCH(15,5) format bits for Level M (00) + mask 0..7, XORed with 0x5412.
const FORMAT_BITS_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b,
  0x45f9, 0x40ce, 0x4f97, 0x4aa0,
] as const;

// Precomputed BCH(18,6) version info bits for Versions 7..10.
const VERSION_BITS: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
};

function selectSpec(byteLength: number): VersionSpec {
  for (const spec of LEVEL_M_SPECS) {
    const dataCapacity = spec.blocks.reduce((sum, [n, k]) => sum + n * k, 0);
    const charCountBits = spec.version <= 9 ? 8 : 16;
    const totalBitsNeeded = 4 + charCountBits + byteLength * 8;
    if (totalBitsNeeded <= dataCapacity * 8) return spec;
  }
  throw new Error('QR payload exceeds version 10 capacity');
}

function buildCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const dataCapacity = spec.blocks.reduce((sum, [n, k]) => sum + n * k, 0);
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((val >>> i) & 1);
  };

  // Byte mode indicator: 0100
  pushBits(0b0100, 4);
  pushBits(bytes.length, spec.version <= 9 ? 8 : 16);
  for (let i = 0; i < bytes.length; i += 1) pushBits(bytes[i], 8);

  // Terminator (up to 4 zero bits)
  const capBits = dataCapacity * 8;
  const term = Math.min(4, capBits - bits.length);
  for (let i = 0; i < term; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const data = new Uint8Array(dataCapacity);
  for (let i = 0; i < bits.length / 8; i += 1) {
    let b = 0;
    for (let bit = 0; bit < 8; bit += 1) b = (b << 1) | bits[i * 8 + bit];
    data[i] = b;
  }
  const padBytes = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < dataCapacity; i += 1, p = (p + 1) & 1) {
    data[i] = padBytes[p];
  }

  // Split into RS blocks & interleave
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (const [count, size] of spec.blocks) {
    for (let b = 0; b < count; b += 1) {
      const slice = data.subarray(offset, offset + size);
      offset += size;
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, spec.ecPerBlock));
    }
  }

  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  const out = new Uint8Array(spec.totalCodewords);
  let pos = 0;
  for (let i = 0; i < maxDataLen; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) out[pos++] = block[i];
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (const block of ecBlocks) out[pos++] = block[i];
  }
  return out;
}

function maskCondition(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function penaltyScore(grid: boolean[][]): number {
  const n = grid.length;
  let score = 0;
  // Rule 1: adjacent modules in row/col
  for (let r = 0; r < n; r += 1) {
    let runLen = 1;
    for (let c = 1; c < n; c += 1) {
      if (grid[r][c] === grid[r][c - 1]) {
        runLen += 1;
        if (runLen === 5) score += 3;
        else if (runLen > 5) score += 1;
      } else {
        runLen = 1;
      }
    }
  }
  for (let c = 0; c < n; c += 1) {
    let runLen = 1;
    for (let r = 1; r < n; r += 1) {
      if (grid[r][c] === grid[r - 1][c]) {
        runLen += 1;
        if (runLen === 5) score += 3;
        else if (runLen > 5) score += 1;
      } else {
        runLen = 1;
      }
    }
  }
  // Rule 2: 2x2 blocks
  for (let r = 0; r < n - 1; r += 1) {
    for (let c = 0; c < n - 1; c += 1) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) {
        score += 3;
      }
    }
  }
  // Rule 4: dark ratio balance
  let dark = 0;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) if (grid[r][c]) dark += 1;
  }
  const pct = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}

export function encodeQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const spec = selectSpec(bytes.length);
  const size = spec.version * 4 + 17;
  const codewords = buildCodewords(bytes, spec);

  const isFunc = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const base = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const setFunc = (r: number, c: number, val: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    isFunc[r][c] = true;
    base[r][c] = val;
  };

  // Finder patterns + separators
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const dark =
          inside &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunc(top + dr, left + dc, dark);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  for (const r of spec.alignCenters) {
    for (const c of spec.alignCenters) {
      const overlapsFinder =
        (r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8);
      if (overlapsFinder) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(r + dr, c + dc, dist !== 1);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    if (!isFunc[6][i]) setFunc(6, i, i % 2 === 0);
    if (!isFunc[i][6]) setFunc(i, 6, i % 2 === 0);
  }

  // Reserve format info areas & dark module
  for (let i = 0; i <= 8; i += 1) {
    if (!isFunc[8][i]) setFunc(8, i, false);
    if (!isFunc[i][8]) setFunc(i, 8, false);
  }
  for (let i = size - 8; i < size; i += 1) {
    setFunc(8, i, false);
    setFunc(i, 8, false);
  }
  setFunc(size - 8, 8, true);

  // Version info (Versions 7+)
  const versionBits = VERSION_BITS[spec.version];
  if (versionBits !== undefined) {
    for (let i = 0; i < 18; i += 1) {
      const bit = ((versionBits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFunc(a, b, bit);
      setFunc(b, a, bit);
    }
  }

  // Place data bits in upward/downward 2-column zig-zag
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let step = 0; step < size; step += 1) {
      const r = upward ? size - 1 - step : step;
      for (let j = 0; j < 2; j += 1) {
        const c = right - j;
        if (isFunc[r][c]) continue;
        let dark = false;
        if (bitIdx < totalBits) {
          dark = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) === 1;
          bitIdx += 1;
        }
        base[r][c] = dark;
      }
    }
  }

  const writeFormat = (grid: boolean[][], mask: number) => {
    const bits = FORMAT_BITS_M[mask];
    const bit = (i: number) => ((bits >>> i) & 1) === 1;
    // Around top-left finder
    for (let i = 0; i <= 5; i += 1) grid[8][i] = bit(14 - i);
    grid[8][7] = bit(8);
    grid[8][8] = bit(7);
    grid[7][8] = bit(6);
    for (let i = 9; i <= 14; i += 1) grid[14 - i][8] = bit(14 - i);
    // Split between bottom-left (bits 14..8 bottom-to-top) and top-right (bits 7..0 left-to-right)
    for (let i = 0; i <= 6; i += 1) grid[size - 1 - i][8] = bit(14 - i);
    for (let i = 7; i <= 14; i += 1) grid[8][size - 15 + i] = bit(14 - i);
  };

  let bestGrid: boolean[][] | null = null;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = base.map((row, r) =>
      row.map((val, c) => (isFunc[r][c] ? val : val !== maskCondition(mask, r, c))),
    );
    writeFormat(candidate, mask);
    const score = penaltyScore(candidate);
    if (score < bestPenalty) {
      bestPenalty = score;
      bestGrid = candidate;
    }
  }

  return bestGrid!;
}
