import { GridCell, FrogData, FoodData, GameState, StreamPath, CellType } from '../../types/game';
import { COLORS, GAME_CONFIG } from '@data/constants';
import { channelsToSegments } from '../utils/LevelGenerator';

// --- Configuration ---
const SPINE_RESOLUTION = 5;     // Lower = smoother curves, higher = faster
const LANE_WIDTH = 12;          // Distance between streams
const SMOOTHING_ITERATIONS = 20;// How much to "iron out" the path
const SMOOTHING_STRENGTH = 0.4; // 0.0 to 1.0

interface Point { x: number; y: number; }
interface SpineNode extends Point {
  tx: number; // Tangent X (Direction)
  ty: number; // Tangent Y
  nx: number; // Normal X (Perpendicular)
  ny: number; // Normal Y
}

export class Renderer {
  private hasLoggedStreams = false;

  constructor(private ctx: CanvasRenderingContext2D) { }

  renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.canvasHeight);
    gradient.addColorStop(0, COLORS.WATER_LIGHT);
    gradient.addColorStop(1, COLORS.WATER_DARK);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);
  }

  // =========================================================
  //    THE "MASTER SPINE" STREAM RENDERER
  // =========================================================

  renderStreams(streams: StreamPath[]): void {
    if (!streams || streams.length === 0) return;

    if (!this.hasLoggedStreams) {
      console.log('Rendering streams via Master Spine Topology');
      this.hasLoggedStreams = true;
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = COLORS.STREAM;
    this.ctx.lineWidth = 8;

    // 1. GROUP STREAMS: Identify which streams share the same path
    // We simulate one spine per unique path, then draw multiple offsets.
    const groups = this.groupStreamsByPath(streams);

    groups.forEach(group => {
      // 2. CREATE SPINE: Generate one high-res chain for this path
      const spine = this.createSpine(group.segments);

      // 3. RELAX SPINE: Smooth out the corners so lanes don't overlap
      this.relaxSpine(spine);

      // 4. COMPUTE NORMALS: Calculate the "Left/Right" direction for every point
      this.computeSpineGeometry(spine);

      // 5. RENDER: Draw each stream as a parallel offset of the spine
      this.drawGroupRibbons(spine, group.streamIndices, streams.length);
    });
  }

  /**
   * Groups streams that follow the exact same grid cells.
   */
  private groupStreamsByPath(streams: StreamPath[]) {
    const groups: { key: string, segments: any[], streamIndices: number[] }[] = [];

    streams.forEach((stream, originalIndex) => {
      // Create a unique signature for the path (e.g., "0,0|0,1|1,1")
      // We assume 'channels' has grid info. If not, use segments length/start/end as key.
      const segments = channelsToSegments(stream.channels);
      const key = segments.map(s =>
        'start' in s ? `${Math.round(s.start.x)},${Math.round(s.start.y)}` : 'C'
      ).join('|');

      let group = groups.find(g => g.key === key);
      if (!group) {
        group = { key, segments, streamIndices: [] };
        groups.push(group);
      }
      group.streamIndices.push(originalIndex);
    });

    return groups;
  }

  /**
   * Converts the rigid segments into a flexible chain of points (The Spine).
   */
  private createSpine(segments: any[]): Point[] {
    const points: Point[] = [];

    segments.forEach((seg, i) => {
      if (!('start' in seg)) return;

      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(dist / SPINE_RESOLUTION);

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        points.push({
          x: seg.start.x + dx * t,
          y: seg.start.y + dy * t
        });
      }

      // Add the very last point of the path
      if (i === segments.length - 1) {
        points.push({ x: seg.end.x, y: seg.end.y });
      }
    });

    return points;
  }

  /**
   * Smooths the spine to remove sharp grid corners.
   * This prevents "swallowtail" artifacts when drawing offset lines.
   */
  private relaxSpine(spine: Point[]) {
    // Simple Laplacian smoothing
    // We skip the first and last points to keep the path anchored.
    for (let itr = 0; itr < SMOOTHING_ITERATIONS; itr++) {
      for (let i = 1; i < spine.length - 1; i++) {
        const prev = spine[i - 1];
        const next = spine[i + 1];

        // Move towards the average of neighbors
        const avgX = (prev.x + next.x) / 2;
        const avgY = (prev.y + next.y) / 2;

        spine[i].x += (avgX - spine[i].x) * SMOOTHING_STRENGTH;
        spine[i].y += (avgY - spine[i].y) * SMOOTHING_STRENGTH;
      }
    }
  }

  /**
   * Calculates the Tangent (Direction) and Normal (Perpendicular) 
   * for every point on the spine.
   */
  private computeSpineGeometry(spine: Point[]): SpineNode[] {
    const nodes = spine as SpineNode[];

    for (let i = 0; i < nodes.length; i++) {
      // Calculate tangent using finite difference
      // Handle start/end boundary conditions
      const prev = nodes[Math.max(0, i - 1)];
      const next = nodes[Math.min(nodes.length - 1, i + 1)];

      let tx = next.x - prev.x;
      let ty = next.y - prev.y;

      // Normalize
      const len = Math.sqrt(tx * tx + ty * ty);
      if (len > 0) { tx /= len; ty /= len; }
      else { tx = 1; ty = 0; } // Fallback

      nodes[i].tx = tx;
      nodes[i].ty = ty;

      // Normal is perpendicular to tangent (-y, x)
      nodes[i].nx = -ty;
      nodes[i].ny = tx;
    }
    return nodes;
  }

  /**
   * Draws the actual lines by walking the spine and adding 
   * a perpendicular offset for each stream.
   */
  private drawGroupRibbons(spine: SpineNode[], streamIndices: number[], totalGameStreams: number) {
    // Calculate where this group sits relative to the center
    // If there are 3 total streams in the game, indices are 0, 1, 2.
    // Center is 1. 
    const centerIndex = (totalGameStreams - 1) / 2;

    streamIndices.forEach(streamIdx => {
      // Calculate the "Lane Offset"
      // Stream 0 = -12px, Stream 1 = 0px, Stream 2 = +12px
      const offset = (streamIdx - centerIndex) * LANE_WIDTH;

      this.ctx.beginPath();

      for (let i = 0; i < spine.length; i++) {
        const node = spine[i];

        // THE MAGIC: Position = SpinePoint + (Normal * Offset)
        const px = node.x + (node.nx * offset);
        const py = node.y + (node.ny * offset);

        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }

      this.ctx.stroke();
    });
  }

  // =========================================================
  //    EXISTING RENDER METHODS
  // =========================================================

  renderGrid(grid: GridCell[][]): void {
    grid.forEach(row => {
      row.forEach(cell => {
        this.renderCell(cell);
      });
    });
  }

  private renderCell(cell: GridCell): void {
    const { position, type } = cell;
    const x = position.x;
    const y = position.y;
    const size = GAME_CONFIG.cellSize * 0.5;

    switch (type) {
      case CellType.LILYPAD:
        this.renderLilyPad(x, y, size);
        break;
      case CellType.LILYPAD_WITH_LILY:
        this.renderLilyPad(x, y, size);
        this.renderLily(x, y, size * 0.4);
        break;
      case CellType.ROCK:
        this.renderRock(x, y, size);
        break;
      case CellType.EMPTY:
        break;
    }
  }

  private renderLilyPad(x: number, y: number, size: number): void {
    this.ctx.fillStyle = COLORS.LILYPAD;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#78C878';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private renderLily(x: number, y: number, size: number): void {
    this.ctx.fillStyle = COLORS.LILY;

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const petalX = x + Math.cos(angle) * size * 0.3;
      const petalY = y + Math.sin(angle) * size * 0.3;

      this.ctx.beginPath();
      this.ctx.arc(petalX, petalY, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderRock(x: number, y: number, size: number): void {
    this.ctx.fillStyle = COLORS.ROCK;
    this.ctx.strokeStyle = '#606060';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(x - size / 2, y);
    this.ctx.lineTo(x - size / 4, y - size / 2);
    this.ctx.lineTo(x + size / 4, y - size / 3);
    this.ctx.lineTo(x + size / 2, y);
    this.ctx.lineTo(x + size / 3, y + size / 2);
    this.ctx.lineTo(x - size / 3, y + size / 2);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  renderFrogs(frogs: FrogData[]): void {
    frogs.forEach(frog => {
      this.renderFrog(frog);
    });
  }

  private renderFrog(frog: FrogData): void {
    const pos = {
      x: frog.gridPosition.col * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2,
      y: frog.gridPosition.row * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2,
    };

    const size = GAME_CONFIG.cellSize * 0.5;

    this.ctx.fillStyle = frog.stats.color;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - size / 4, pos.y - size / 4, size / 6, 0, Math.PI * 2);
    this.ctx.arc(pos.x + size / 4, pos.y - size / 4, size / 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - size / 4, pos.y - size / 4, size / 12, 0, Math.PI * 2);
    this.ctx.arc(pos.x + size / 4, pos.y - size / 4, size / 12, 0, Math.PI * 2);
    this.ctx.fill();

    if (frog.level > 1) {
      this.ctx.fillStyle = 'gold';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Lv${frog.level}`, pos.x, pos.y + size / 2 + 12);
    }
  }

  renderFoods(foods: FoodData[]): void {
    foods.forEach(food => {
      this.renderFood(food);

      if (food.currentHealth < food.stats.maxHealth) {
        this.renderHealthBar(food);
      }
    });
  }

  private renderFood(food: FoodData): void {
    const { position, type } = food;
    const size = 30;

    let color = '#FFA500';
    switch (type) {
      case 'CAKE':
        color = '#FFB6C1';
        break;
      case 'APPLE':
        color = '#FF0000';
        break;
      case 'BEANS':
        color = '#8B4513';
        break;
      case 'BURGER':
        color = '#FFD700';
        break;
      case 'PIZZA':
        color = '#FF6347';
        break;
    }

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private renderHealthBar(food: FoodData): void {
    const { position, currentHealth, stats } = food;
    const barWidth = 40;
    const barHeight = 6;
    const x = position.x - barWidth / 2;
    const y = position.y - 25;

    this.ctx.fillStyle = COLORS.HEALTH_BAR_BG;
    this.ctx.fillRect(x, y, barWidth, barHeight);

    const healthPercent = currentHealth / stats.maxHealth;
    const healthColor = healthPercent > 0.5 ? COLORS.HEALTH_BAR_FILL : COLORS.HEALTH_BAR_DAMAGED;
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, barWidth, barHeight);
  }

  renderUI(gameState: GameState): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, 40);

    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';

    this.ctx.fillText(`Lives: ${gameState.lives}`, 10, 25);
    this.ctx.fillText(`Money: $${gameState.money}`, 100, 25);
    this.ctx.fillText(`Wave: ${gameState.wave}`, 220, 25);
    this.ctx.fillText(`Score: ${gameState.score}`, 310, 25);

    if (gameState.isGameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

      this.ctx.fillStyle = 'red';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '24px Arial';
      this.ctx.fillText(
        `Final Score: ${gameState.score}`,
        GAME_CONFIG.canvasWidth / 2,
        GAME_CONFIG.canvasHeight / 2 + 50
      );
    }
  }
}