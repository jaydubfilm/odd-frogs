// Level generation script -- produces src/data/levelSet.json
// Run: npx tsx scripts/generate-levels.ts

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Types ────────────────────────────────────────────────────────────
type CellChar = 'E' | 'L' | 'W' | 'R';

interface LevelJSON {
  id: string;
  name: string;
  startingMoney: number;
  grid: CellChar[][];
  streams: number[][];
}

// ── Seeded PRNG (Mulberry32) ─────────────────────────────────────────
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Quota Pre-allocation ─────────────────────────────────────────────
const TOTAL = 100;
const ROWS = 5;
const COLS = 4;

// R1: Stream counts -- 25x1, 25x2, 50x3
function buildStreamQuota(): number[] {
  const q: number[] = [];
  for (let i = 0; i < 25; i++) q.push(1);
  for (let i = 0; i < 25; i++) q.push(2);
  for (let i = 0; i < 50; i++) q.push(3);
  return shuffle(q);
}

// R2: Lilypad counts -- bell curve 6-20, mean ~11
function buildLilypadQuota(): number[] {
  // Binomial-like weights for values 6..20
  const weights = [1, 3, 6, 10, 15, 18, 18, 15, 10, 6, 3, 2, 1, 1, 1];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const q: number[] = [];
  for (let i = 0; i < weights.length; i++) {
    const count = Math.round((weights[i] / totalWeight) * TOTAL);
    for (let j = 0; j < count; j++) q.push(6 + i);
  }
  // Pad or trim to exactly 100
  while (q.length < TOTAL) q.push(11);
  while (q.length > TOTAL) q.pop();
  return shuffle(q);
}

// R3: Rock counts -- 0-8 each ~11 times
function buildRockQuota(): number[] {
  const q: number[] = [];
  for (let v = 0; v <= 8; v++) {
    const count = v === 0 ? 12 : 11; // 12 + 8*11 = 100
    for (let i = 0; i < count; i++) q.push(v);
  }
  return shuffle(q);
}

// R7: Lily percentage -- evenly spaced 0-25%
function buildLilyPercentQuota(): number[] {
  const q: number[] = [];
  for (let i = 0; i < TOTAL; i++) {
    q.push((i / (TOTAL - 1)) * 0.25);
  }
  return shuffle(q);
}

// ── Stream Generation ────────────────────────────────────────────────
function generateStreams(numStreams: number): number[][] {
  const streamChannels: number[][] = Array.from({ length: numStreams }, () => []);

  for (let row = 0; row < ROWS; row++) {
    const selected: number[] = [];

    if (row === 0 || row === 4) {
      // Edge rows: pick distinct from {1,2,3}
      const available = [1, 2, 3];
      for (let i = 0; i < numStreams; i++) {
        const idx = Math.floor(rand() * available.length);
        selected.push(available[idx]);
        available.splice(idx, 1);
      }
    } else {
      // Interior rows: pick from {0..4}
      for (let i = 0; i < numStreams; i++) {
        selected.push(Math.floor(rand() * 5));
      }
    }

    selected.sort((a, b) => a - b);
    for (let i = 0; i < numStreams; i++) {
      streamChannels[i][row] = selected[i];
    }
  }

  return streamChannels;
}

// ── Adjacency Map ────────────────────────────────────────────────────
// Compute which grid cells are adjacent (distance 0 or 1) to any stream
function computeAdjacency(streams: number[][]): Map<string, number> {
  const dist = new Map<string, number>();
  const key = (r: number, c: number) => `${r},${c}`;

  // Distance 0: cell (r,c) if any stream channel at row r touches col c
  for (const channels of streams) {
    for (let row = 0; row < ROWS; row++) {
      const ch = channels[row];
      // Channel ch occupies space between columns ch-1 and ch (the channel passes beside columns)
      // A cell at col c is "adjacent at distance 0" if the stream runs through or beside it
      // Stream channel ch passes through pixel x = 60 + ch*120
      // Grid col c occupies pixels from 60 + c*120 to 60 + (c+1)*120
      // So channel ch is at the left edge of col ch, or right edge of col ch-1
      if (ch >= 0 && ch < COLS) dist.set(key(row, ch), 0);
      if (ch - 1 >= 0 && ch - 1 < COLS) dist.set(key(row, ch - 1), 0);
    }

    // Horizontal lanes between rows -- if stream crosses a column horizontally
    for (let lane = 0; lane < ROWS - 1; lane++) {
      const from = channels[lane];
      const to = channels[lane + 1];
      if (from !== to) {
        const minCh = Math.min(from, to);
        const maxCh = Math.max(from, to);
        for (let ch = minCh; ch <= maxCh; ch++) {
          if (ch >= 0 && ch < COLS) dist.set(key(lane, ch), 0);
          if (ch - 1 >= 0 && ch - 1 < COLS) dist.set(key(lane, ch - 1), 0);
          // Also mark the row below the lane
          if (ch >= 0 && ch < COLS) dist.set(key(lane + 1, ch), 0);
          if (ch - 1 >= 0 && ch - 1 < COLS) dist.set(key(lane + 1, ch - 1), 0);
        }
      }
    }
  }

  // Distance 1: orthogonal neighbors of distance-0 cells
  const dist0Cells = [...dist.entries()].filter(([, d]) => d === 0).map(([k]) => k);
  for (const k of dist0Cells) {
    const [r, c] = k.split(',').map(Number);
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        const nk = key(nr, nc);
        if (!dist.has(nk)) dist.set(nk, 1);
      }
    }
  }

  return dist;
}

// ── Symmetric Pair Indices ───────────────────────────────────────────
// Grid is 5 rows x 4 cols. Symmetric pairs: (r,0)-(r,3), (r,1)-(r,2)
interface SymPair {
  cells: [number, number][]; // [row, col] pairs
  count: number; // how many cells this pair adds
}

function getSymmetricPairs(): SymPair[] {
  const pairs: SymPair[] = [];
  for (let r = 0; r < ROWS; r++) {
    pairs.push({ cells: [[r, 0], [r, 3]], count: 2 });
    pairs.push({ cells: [[r, 1], [r, 2]], count: 2 });
  }
  return pairs;
}

// ── Level Generation ─────────────────────────────────────────────────
function generateLevel(
  levelIndex: number,
  numStreams: number,
  lilypadCount: number,
  rockCount: number,
  lilyPercent: number,
): LevelJSON {
  const streams = generateStreams(numStreams);
  const adjacency = computeAdjacency(streams);

  // Clamp rocks
  const maxCells = ROWS * COLS; // 20
  let actualRocks = Math.min(rockCount, maxCells - lilypadCount);
  if (actualRocks < 0) actualRocks = 0;

  // Initialize grid
  const grid: CellChar[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill('E') as CellChar[]
  );

  const placed = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  // Get symmetric pairs, shuffle within each adjacency-distance group
  const allPairs = getSymmetricPairs();
  const tagged = allPairs.map(pair => {
    const minDist = Math.min(
      ...pair.cells.map(([r, c]) => adjacency.get(key(r, c)) ?? 999)
    );
    return { ...pair, minDist };
  });

  // Group by distance, shuffle each group, then concatenate in distance order
  const groups = new Map<number, typeof tagged>();
  for (const p of tagged) {
    const g = groups.get(p.minDist) ?? [];
    g.push(p);
    groups.set(p.minDist, g);
  }
  const sortedKeys = [...groups.keys()].sort((a, b) => a - b);
  const sortedPairs = sortedKeys.flatMap(k => shuffle(groups.get(k)!));

  // Place lilypads (symmetric, adjacency-first)
  let lilypadsPlaced = 0;
  for (const pair of sortedPairs) {
    if (lilypadsPlaced >= lilypadCount) break;
    // Check if we can place the full pair
    const canPlace = pair.cells.every(([r, c]) => !placed.has(key(r, c)));
    if (!canPlace) continue;

    const remaining = lilypadCount - lilypadsPlaced;
    if (remaining >= pair.count) {
      for (const [r, c] of pair.cells) {
        grid[r][c] = 'L';
        placed.add(key(r, c));
      }
      lilypadsPlaced += pair.count;
    } else if (remaining === 1) {
      // Place just one cell from the pair (pick the one with better adjacency)
      const sorted = [...pair.cells].sort((a, b) =>
        (adjacency.get(key(a[0], a[1])) ?? 999) - (adjacency.get(key(b[0], b[1])) ?? 999)
      );
      const [r, c] = sorted[0];
      grid[r][c] = 'L';
      placed.add(key(r, c));
      lilypadsPlaced += 1;
    }
  }

  // Place rocks only on cells adjacent to a stream (distance 0 or 1).
  // A rock here blocks a frog from occupying a position that could reach the stream.
  let rocksPlaced = 0;
  const rockPairs = shuffle(
    allPairs.filter(pair =>
      pair.cells.every(([r, c]) => !placed.has(key(r, c))) &&
      pair.cells.some(([r, c]) => (adjacency.get(key(r, c)) ?? 999) <= 1)
    )
  );
  for (const pair of rockPairs) {
    if (rocksPlaced >= actualRocks) break;
    const remaining = actualRocks - rocksPlaced;
    if (remaining >= pair.count) {
      for (const [r, c] of pair.cells) {
        grid[r][c] = 'R';
        placed.add(key(r, c));
      }
      rocksPlaced += pair.count;
    } else if (remaining === 1) {
      const [r, c] = pair.cells[0];
      grid[r][c] = 'R';
      placed.add(key(r, c));
      rocksPlaced += 1;
    }
  }

  // Assign lilies -- convert lilyPercent of lilypads to LILYPAD_WITH_LILY
  const lilypadCells: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 'L') lilypadCells.push([r, c]);
    }
  }
  const numLilies = Math.round(lilypadCells.length * lilyPercent);
  const shuffledLilypads = shuffle(lilypadCells);
  for (let i = 0; i < numLilies && i < shuffledLilypads.length; i++) {
    const [r, c] = shuffledLilypads[i];
    grid[r][c] = 'W';
  }

  return {
    id: `level-${levelIndex + 1}`,
    name: `Level ${levelIndex + 1}`,
    startingMoney: 20 + levelIndex * 5,
    grid,
    streams,
  };
}

// ── Validation ───────────────────────────────────────────────────────
interface ValidationResult {
  level: number;
  passed: boolean;
  failures: string[];
}

function validateLevel(level: LevelJSON, index: number): ValidationResult {
  const failures: string[] = [];

  // R1: Stream count 1-3
  if (level.streams.length < 1 || level.streams.length > 3) {
    failures.push(`R1: stream count ${level.streams.length} not in [1,3]`);
  }

  // Count cell types
  let lilypads = 0, rocks = 0, lilies = 0, empties = 0;
  for (const row of level.grid) {
    for (const cell of row) {
      if (cell === 'L') lilypads++;
      else if (cell === 'W') { lilypads++; lilies++; }
      else if (cell === 'R') rocks++;
      else empties++;
    }
  }

  // R2: Lilypad count 6-20
  if (lilypads < 6 || lilypads > 20) {
    failures.push(`R2: lilypad count ${lilypads} not in [6,20]`);
  }

  // R3: Rock count 0-8
  if (rocks < 0 || rocks > 8) {
    failures.push(`R3: rock count ${rocks} not in [0,8]`);
  }

  // R4 & R5: Adjacency checks
  const adjacency = computeAdjacency(level.streams);
  const key = (r: number, c: number) => `${r},${c}`;

  let dist0Count = 0;
  let distLE1Count = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (level.grid[r][c] === 'L' || level.grid[r][c] === 'W') {
        const d = adjacency.get(key(r, c)) ?? 999;
        if (d === 0) dist0Count++;
        if (d <= 1) distLE1Count++;
      }
    }
  }

  // R4: 50%+ of lilypads at distance 0
  if (lilypads > 0 && dist0Count / lilypads < 0.5) {
    failures.push(`R4: only ${dist0Count}/${lilypads} (${(dist0Count/lilypads*100).toFixed(0)}%) at dist 0, need 50%`);
  }

  // R5: 75%+ of lilypads at distance <= 1
  if (lilypads > 0 && distLE1Count / lilypads < 0.75) {
    failures.push(`R5: only ${distLE1Count}/${lilypads} (${(distLE1Count/lilypads*100).toFixed(0)}%) at dist <=1, need 75%`);
  }

  // R6: Grid dimensions
  if (level.grid.length !== ROWS || level.grid.some(row => row.length !== COLS)) {
    failures.push(`R6: grid dimensions wrong`);
  }

  // R7: Lily percentage 0-25%
  if (lilypads > 0 && lilies / lilypads > 0.26) {
    failures.push(`R7: lily % ${(lilies/lilypads*100).toFixed(0)}% exceeds 25%`);
  }

  // R8: Streams don't cross (channels sorted at each row)
  for (let row = 0; row < ROWS; row++) {
    const channelsAtRow = level.streams.map(s => s[row]);
    for (let i = 1; i < channelsAtRow.length; i++) {
      if (channelsAtRow[i] < channelsAtRow[i - 1]) {
        failures.push(`R8: streams cross at row ${row}`);
        break;
      }
    }
  }

  return {
    level: index + 1,
    passed: failures.length === 0,
    failures,
  };
}

// ── Complexity Scoring ───────────────────────────────────────────────
function complexity(level: LevelJSON): number {
  let lilypads = 0, lilies = 0, rocks = 0;
  for (const row of level.grid) {
    for (const cell of row) {
      if (cell === 'L') lilypads++;
      else if (cell === 'W') { lilypads++; lilies++; }
      else if (cell === 'R') rocks++;
    }
  }
  return level.streams.length * 5 + lilypads * 1 + lilies * 2 + rocks * 3;
}

// ── Main ─────────────────────────────────────────────────────────────
function main() {
  console.log('Generating 100 levels...');

  const streamQuota = buildStreamQuota();
  const lilypadQuota = buildLilypadQuota();
  const rockQuota = buildRockQuota();
  const lilyPercentQuota = buildLilyPercentQuota();

  const levels: LevelJSON[] = [];

  for (let i = 0; i < TOTAL; i++) {
    const level = generateLevel(
      i,
      streamQuota[i],
      lilypadQuota[i],
      rockQuota[i],
      lilyPercentQuota[i],
    );
    levels.push(level);
  }

  // Sort by complexity ascending
  levels.sort((a, b) => complexity(a) - complexity(b));

  // Re-assign IDs, names, and starting money after sorting
  for (let i = 0; i < levels.length; i++) {
    levels[i].id = `level-${i + 1}`;
    levels[i].name = `Level ${i + 1}`;
    levels[i].startingMoney = 20 + i * 5;
  }

  // Validate all levels
  const validationResults: ValidationResult[] = levels.map((l, i) => validateLevel(l, i));
  const passed = validationResults.filter(r => r.passed).length;
  const failed = validationResults.filter(r => !r.passed);

  console.log(`\nValidation: ${passed}/${TOTAL} levels passed`);

  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const f of failed) {
      console.log(`  Level ${f.level}: ${f.failures.join(', ')}`);
    }
  }

  // Print complexity range
  console.log(`\nComplexity range: ${complexity(levels[0])} - ${complexity(levels[TOTAL - 1])}`);

  // Write output
  const output = JSON.stringify({ levels }, null, 2);
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outputPath = join(__dirname, '..', 'src', 'data', 'levelSet.json');
  writeFileSync(outputPath, output, 'utf-8');

  console.log(`Wrote ${outputPath} (${(output.length / 1024).toFixed(1)} KB)`);
}

main();
