import { GridCell, FrogData, FoodData, GameState, StreamPath, CellType } from '../../types/game';
import { COLORS, GAME_CONFIG } from '@data/constants';
import { channelsToSegments } from '../utils/LevelGenerator';

const LANE_GAP = 12;          // Distance between streams
const CORNER_RADIUS = 20;     // How much to "cut" the corner
const SMOOTHING_PASSES = 5;   // High smoothing for "liquid" curves

interface Point { x: number; y: number; }

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

  renderStreams(streams: StreamPath[]): void {
    if (!streams || streams.length === 0) return;

    if (!this.hasLoggedStreams) {
      console.log('Rendering streams: Parallel Curve Offsetting');
      this.hasLoggedStreams = true;
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = COLORS.STREAM;
    this.ctx.lineWidth = 8;

    const centerIndex = (streams.length - 1) / 2;

    streams.forEach((stream, i) => {
      // Calculate offset distance from center
      const relIndex = i - centerIndex;
      const offsetDistance = relIndex * LANE_GAP;

      // 1. Build the base path (without offset)
      const segments = channelsToSegments(stream.channels);
      let basePath: Point[] = [];

      segments.forEach((seg) => {
        if (!('start' in seg)) return;

        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        // Unit direction
        const ux = dx / segLen;
        const uy = dy / segLen;

        // Retract for smooth corners
        const trim = Math.min(CORNER_RADIUS, segLen * 0.4);

        basePath.push({
          x: seg.start.x + ux * trim,
          y: seg.start.y + uy * trim
        });
        basePath.push({
          x: seg.end.x - ux * trim,
          y: seg.end.y - uy * trim
        });
      });

      // 2. Smooth the CENTER path first
      let smoothPath = basePath;
      for (let j = 0; j < SMOOTHING_PASSES; j++) {
        smoothPath = this.chaikinSmooth(smoothPath);
      }

      // 3. Create parallel curve by offsetting perpendicular to the path
      const offsetPath = this.createParallelCurve(smoothPath, offsetDistance);

      // 4. Draw
      if (offsetPath.length > 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(offsetPath[0].x, offsetPath[0].y);
        for (let k = 1; k < offsetPath.length; k++) {
          this.ctx.lineTo(offsetPath[k].x, offsetPath[k].y);
        }
        this.ctx.stroke();
      }
    });
  }

  /**
   * Standard Chaikin Smoothing.
   */
  private chaikinSmooth(points: Point[]): Point[] {
    if (points.length < 3) return points;

    const newPoints: Point[] = [];

    // Anchor start
    newPoints.push(points[0]);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      // If points are super close (degenerate segment), skip
      if (Math.abs(p0.x - p1.x) < 0.1 && Math.abs(p0.y - p1.y) < 0.1) continue;

      // Cut 25%
      newPoints.push({
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y
      });

      // Cut 75%
      newPoints.push({
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y
      });
    }

    // Anchor end
    newPoints.push(points[points.length - 1]);

    return newPoints;
  }

  /**
   * Create a parallel curve at a given offset distance.
   * Positive offset goes to the "right" of the curve direction.
   */
  private createParallelCurve(points: Point[], offset: number): Point[] {
    if (points.length < 2) return points;

    const offsetPoints: Point[] = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      // Calculate tangent at this point
      let tangent: Point;

      if (i === 0) {
        // First point - use forward difference
        const next = points[i + 1];
        tangent = this.normalize({
          x: next.x - p.x,
          y: next.y - p.y
        });
      } else if (i === points.length - 1) {
        // Last point - use backward difference
        const prev = points[i - 1];
        tangent = this.normalize({
          x: p.x - prev.x,
          y: p.y - prev.y
        });
      } else {
        // Middle points - use average of forward and backward
        const prev = points[i - 1];
        const next = points[i + 1];
        tangent = this.normalize({
          x: next.x - prev.x,
          y: next.y - prev.y
        });
      }

      // Calculate normal (perpendicular) - rotate tangent 90° clockwise
      const normal = { x: tangent.y, y: -tangent.x };

      // Offset along the normal
      offsetPoints.push({
        x: p.x + normal.x * offset,
        y: p.y + normal.y * offset
      });
    }

    return offsetPoints;
  }

  /**
   * Normalize a vector to unit length
   */
  private normalize(v: Point): Point {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 0.0001) return { x: 0, y: 1 }; // Fallback
    return { x: v.x / len, y: v.y / len };
  }

  // =========================================================
  //    EXISTING RENDER METHODS (Unchanged)
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