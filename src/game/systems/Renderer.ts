import { GridCell, FrogData, FoodData, FoodType, FloatingText, GameState, StreamPath, CellType, GridPosition } from '../../types/game';
import { COLORS, GAME_CONFIG } from '@data/constants';

export class Renderer {
  private hasLoggedStreams = false;
  private gameOverStartTime: number = 0;
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
      console.log('Rendering streams: Using pre-generated smooth paths');
      this.hasLoggedStreams = true;
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = COLORS.STREAM;
    this.ctx.lineWidth = 8;

    streams.forEach((stream) => {
      if (!stream.smoothPath || stream.smoothPath.points.length === 0) return;

      const points = stream.smoothPath.points;

      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
      this.ctx.stroke();
    });
  }

  // =========================================================
  //    EXISTING RENDER METHODS (Unchanged)
  // =========================================================

  renderGrid(grid: GridCell[][], hoveredCell: GridPosition | null, money: number, dropHighlightCell?: GridPosition | null): void {
    grid.forEach(row => {
      row.forEach(cell => {
        this.renderCell(cell);

        // Drop highlight for drag-and-drop
        if (dropHighlightCell &&
          cell.gridPosition.row === dropHighlightCell.row &&
          cell.gridPosition.col === dropHighlightCell.col &&
          cell.type === CellType.LILYPAD &&
          cell.frog === null) {
          this.renderDropHighlight(cell);
        }

        // Show lily removal tooltip if hovering over lily pad with lily
        if (hoveredCell &&
          cell.gridPosition.row === hoveredCell.row &&
          cell.gridPosition.col === hoveredCell.col &&
          cell.type === CellType.LILYPAD_WITH_LILY) {
          const canAfford = money >= GAME_CONFIG.lilyRemovalCost;
          this.renderLilyRemovalTooltip(cell, canAfford);
        }
      });
    });
  }

  private renderDropHighlight(cell: GridCell): void {
    const { x, y } = cell.position;
    const size = GAME_CONFIG.cellSize * 0.5;

    this.ctx.save();
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size + 2, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
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

  renderFrogs(frogs: FrogData[], grid: GridCell[][]): void {
    frogs.forEach(frog => {
      this.renderFrog(frog, grid);
    });
  }

  renderFrogUpgradeUI(selectedFrogId: string | null, frogs: Map<string, FrogData>, grid: GridCell[][], money: number): void {
    if (!selectedFrogId) return;

    const frog = frogs.get(selectedFrogId);
    if (!frog) return;

    const cell = grid[frog.gridPosition.row][frog.gridPosition.col];
    const pos = cell.position;
    const buttonSize = 60;
    const buttonY = pos.y - 50 - buttonSize; // Above the frog
    const isMaxLevel = frog.level >= 3;
    const sellValue = Math.floor((frog.stats.cost + frog.totalSpent) / 2);

    if (isMaxLevel) {
      // Only show sell button, centered
      const sellButtonX = pos.x - buttonSize / 2;

      this.ctx.fillStyle = '#E74C3C';
      this.roundRect(sellButtonX, buttonY, buttonSize, buttonSize, 8);
      this.ctx.fill();

      this.ctx.strokeStyle = '#C0392B';
      this.ctx.lineWidth = 2;
      this.roundRect(sellButtonX, buttonY, buttonSize, buttonSize, 8);
      this.ctx.stroke();

      // Sell label
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('$', sellButtonX + buttonSize / 2, buttonY + 20);

      // Sell value
      this.ctx.font = 'bold 20px Arial';
      this.drawCoinText(`${sellValue}`, sellButtonX + buttonSize / 2, buttonY + 44, 8);
    } else {
      // Show both upgrade and sell buttons
      const gap = 16;
      const upgradeButtonX = pos.x - buttonSize - gap / 2;
      const canUpgrade = money >= frog.stats.upgradeCost;

      // Upgrade button (left)
      this.ctx.fillStyle = canUpgrade ? '#4CAF50' : '#888';
      this.roundRect(upgradeButtonX, buttonY, buttonSize, buttonSize, 8);
      this.ctx.fill();

      this.ctx.strokeStyle = canUpgrade ? '#45a049' : '#666';
      this.ctx.lineWidth = 2;
      this.roundRect(upgradeButtonX, buttonY, buttonSize, buttonSize, 8);
      this.ctx.stroke();

      // Small up arrow
      this.ctx.fillStyle = 'white';
      const cx = upgradeButtonX + buttonSize / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, buttonY + 10);
      this.ctx.lineTo(cx - 8, buttonY + 20);
      this.ctx.lineTo(cx + 8, buttonY + 20);
      this.ctx.closePath();
      this.ctx.fill();

      // Cost text
      this.ctx.font = 'bold 20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = 'white';
      this.drawCoinText(`${frog.stats.upgradeCost}`, cx, buttonY + 42, 8);

      // Sell button (right)
      const sellButtonX = pos.x + gap / 2;

      this.ctx.fillStyle = '#E74C3C';
      this.roundRect(sellButtonX, buttonY, buttonSize, buttonSize, 8);
      this.ctx.fill();

      this.ctx.strokeStyle = '#C0392B';
      this.ctx.lineWidth = 2;
      this.roundRect(sellButtonX, buttonY, buttonSize, buttonSize, 8);
      this.ctx.stroke();

      // Sell label
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('$', sellButtonX + buttonSize / 2, buttonY + 18);

      // Sell value
      this.ctx.font = 'bold 20px Arial';
      this.drawCoinText(`${sellValue}`, sellButtonX + buttonSize / 2, buttonY + 42, 8);
    }
  }

  private drawCoin(cx: number, cy: number, radius: number): void {
    this.ctx.save();
    // Outer circle
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fill();
    this.ctx.strokeStyle = '#B8860B';
    this.ctx.lineWidth = radius * 0.15;
    this.ctx.stroke();
    // Inner ring
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#DAA520';
    this.ctx.lineWidth = radius * 0.1;
    this.ctx.stroke();
    // Highlight
    this.ctx.beginPath();
    this.ctx.ellipse(cx - radius * 0.2, cy - radius * 0.3, radius * 0.3, radius * 0.2, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 248, 220, 0.4)';
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawCoinText(text: string, x: number, y: number, coinRadius: number): void {
    const textWidth = this.ctx.measureText(text).width;
    const totalWidth = coinRadius * 2 + 3 + textWidth;
    const startX = x - totalWidth / 2;
    this.drawCoin(startX + coinRadius, y, coinRadius);
    this.ctx.fillText(text, startX + coinRadius * 2 + 3 + textWidth / 2, y);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private renderFrog(frog: FrogData, grid: GridCell[][]): void {
    const cell = grid[frog.gridPosition.row][frog.gridPosition.col];
    const pos = cell.position;

    const size = GAME_CONFIG.cellSize * 0.5 * 0.9;  // ← Multiply by 0.9 for 10% smaller

    if (frog.tongue && frog.tongue.active) {
      this.renderTongue(pos, frog.tongue);
    }

    // Body
    this.ctx.fillStyle = frog.stats.color;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Spots — seeded from frog ID for stable random positions
    this.ctx.fillStyle = this.darkenColor(frog.stats.color, 0.35);
    const bodyR = size / 2;
    let seed = this.hashString(frog.id);
    const spotCount = 2 + (seed % 5); // 2-6 spots
    for (let i = 0; i < spotCount; i++) {
      seed = this.nextSeed(seed);
      const angle = (seed % 1000) / 1000 * Math.PI * 2;
      seed = this.nextSeed(seed);
      const dist = ((seed % 1000) / 1000) * 0.6 * bodyR;
      seed = this.nextSeed(seed);
      const spotR = size * 0.04 + ((seed % 1000) / 1000) * size * 0.04;
      this.ctx.beginPath();
      this.ctx.arc(pos.x + Math.cos(angle) * dist, pos.y + Math.sin(angle) * dist, spotR, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Eyes
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - size / 4, pos.y - size / 4, size / 6, 0, Math.PI * 2);
    this.ctx.arc(pos.x + size / 4, pos.y - size / 4, size / 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Pupils
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

  private renderTongue(
    frogPos: { x: number; y: number },
    tongue: { targetPosition: { x: number; y: number }; progress: number }
  ): void {
    const currentX = frogPos.x + (tongue.targetPosition.x - frogPos.x) * tongue.progress;
    const currentY = frogPos.y + (tongue.targetPosition.y - frogPos.y) * tongue.progress;

    // Draw tongue line
    this.ctx.strokeStyle = '#FF69B4';
    this.ctx.lineWidth = 4;  // ← Slightly thicker
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(frogPos.x, frogPos.y);
    this.ctx.lineTo(currentX, currentY);
    this.ctx.stroke();

    // Draw tongue tip (only if extended past a certain threshold)
    if (tongue.progress > 0.1) {  // ← Only draw tip when tongue is visible
      this.ctx.fillStyle = '#FF1493';
      this.ctx.beginPath();
      this.ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);  // ← Slightly larger
      this.ctx.fill();

      // Add a white highlight for clarity
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.beginPath();
      this.ctx.arc(currentX - 1, currentY - 1, 2, 0, Math.PI * 2);
      this.ctx.fill();
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
    const baseSize = 30;
    const sizeMultiplier = this.getFoodSizeMultiplier(type);
    const size = baseSize * sizeMultiplier;
    const x = position.x;
    const y = position.y;
    const r = size / 2;

    this.ctx.save();

    switch (type) {
      case 'APPLE': {
        // Red apple body
        this.ctx.fillStyle = '#E53935';
        this.ctx.beginPath();
        this.ctx.arc(x, y + 2, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#B71C1C';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        // Stem
        this.ctx.strokeStyle = '#5D4037';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r + 2);
        this.ctx.lineTo(x + 1, y - r - 5);
        this.ctx.stroke();
        // Leaf
        this.ctx.fillStyle = '#43A047';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 5, y - r - 2, 5, 3, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }
      case 'BURGER': {
        const bw = r * 1.3;
        // Bottom bun
        this.ctx.fillStyle = '#D4A056';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 5, bw, r * 0.4, 0, 0, Math.PI);
        this.ctx.fill();
        // Patty
        this.ctx.fillStyle = '#5D4037';
        this.ctx.fillRect(x - bw + 2, y - 2, (bw - 2) * 2, 7);
        // Lettuce
        this.ctx.fillStyle = '#66BB6A';
        this.ctx.fillRect(x - bw + 1, y - 5, (bw - 1) * 2, 4);
        // Top bun
        this.ctx.fillStyle = '#E8A642';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 5, bw, r * 0.55, 0, Math.PI, Math.PI * 2);
        this.ctx.fill();
        // Sesame seeds
        this.ctx.fillStyle = '#FFF9C4';
        this.ctx.beginPath();
        this.ctx.ellipse(x - 4, y - 9, 2, 1.2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + 5, y - 8, 2, 1.2, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        // Outline
        this.ctx.strokeStyle = '#6D4C00';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 5, bw, r * 0.55, 0, Math.PI, Math.PI * 2);
        this.ctx.stroke();
        break;
      }
      case 'CAKE': {
        // Cake body
        this.ctx.fillStyle = '#FFCCBC';
        this.ctx.fillRect(x - r, y - r * 0.3, r * 2, r * 1.3);
        // Frosting top
        this.ctx.fillStyle = '#F48FB1';
        this.ctx.fillRect(x - r, y - r * 0.5, r * 2, r * 0.4);
        // Frosting drip
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.4, y - r * 0.1, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + r * 0.5, y - r * 0.05, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        // Cherry on top
        this.ctx.fillStyle = '#E53935';
        this.ctx.beginPath();
        this.ctx.arc(x, y - r * 0.65, 4, 0, Math.PI * 2);
        this.ctx.fill();
        // Outline
        this.ctx.strokeStyle = '#8D6E63';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - r, y - r * 0.5, r * 2, r * 1.5);
        break;
      }
      case 'BEANS': {
        // Can body
        this.ctx.fillStyle = '#A1887F';
        this.ctx.fillRect(x - r * 0.6, y - r * 0.8, r * 1.2, r * 1.6);
        // Label
        this.ctx.fillStyle = '#FF8A65';
        this.ctx.fillRect(x - r * 0.55, y - r * 0.4, r * 1.1, r * 0.9);
        // Can top rim
        this.ctx.fillStyle = '#BDBDBD';
        this.ctx.fillRect(x - r * 0.65, y - r * 0.85, r * 1.3, r * 0.15);
        // Can bottom rim
        this.ctx.fillRect(x - r * 0.65, y + r * 0.75, r * 1.3, r * 0.12);
        // Outline
        this.ctx.strokeStyle = '#5D4037';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - r * 0.6, y - r * 0.8, r * 1.2, r * 1.6);
        break;
      }
      case 'PIZZA': {
        // Triangle slice
        this.ctx.fillStyle = '#FDD835';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.lineTo(x - r, y + r * 0.7);
        this.ctx.lineTo(x + r, y + r * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
        // Crust
        this.ctx.fillStyle = '#D4A056';
        this.ctx.beginPath();
        this.ctx.moveTo(x - r, y + r * 0.7);
        this.ctx.lineTo(x + r, y + r * 0.7);
        this.ctx.lineTo(x + r * 0.85, y + r * 0.95);
        this.ctx.lineTo(x - r * 0.85, y + r * 0.95);
        this.ctx.closePath();
        this.ctx.fill();
        // Pepperoni
        this.ctx.fillStyle = '#C62828';
        this.ctx.beginPath();
        this.ctx.arc(x - 3, y, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + 4, y + 3, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x, y - r * 0.4, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        // Outline
        this.ctx.strokeStyle = '#BF360C';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.lineTo(x - r, y + r * 0.7);
        this.ctx.lineTo(x + r, y + r * 0.7);
        this.ctx.closePath();
        this.ctx.stroke();
        break;
      }
      case 'DONUT': {
        // Outer ring
        this.ctx.fillStyle = '#D4A056';
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
        // Frosting
        this.ctx.fillStyle = '#F48FB1';
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.9, Math.PI, Math.PI * 2);
        this.ctx.lineTo(x + r * 0.9, y + 2);
        this.ctx.arc(x, y + 2, r * 0.9, 0, Math.PI);
        this.ctx.closePath();
        this.ctx.fill();
        // Hole
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        // Sprinkles
        this.ctx.fillStyle = '#FFF176';
        this.ctx.fillRect(x - 6, y - 5, 4, 2);
        this.ctx.fillStyle = '#4FC3F7';
        this.ctx.fillRect(x + 3, y - 3, 4, 2);
        this.ctx.fillStyle = '#E53935';
        this.ctx.fillRect(x - 2, y + 3, 4, 2);
        // Outline
        this.ctx.strokeStyle = '#8D6E63';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      }
      case 'CHERRY': {
        // Two cherries
        this.ctx.fillStyle = '#C62828';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y + 2, r * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + 4, y + 2, r * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
        // Stems
        this.ctx.strokeStyle = '#33691E';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 4, y - r * 0.4);
        this.ctx.quadraticCurveTo(x - 1, y - r - 2, x + 1, y - r - 4);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4, y - r * 0.4);
        this.ctx.quadraticCurveTo(x + 1, y - r - 2, x + 1, y - r - 4);
        this.ctx.stroke();
        // Highlight
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x - 5, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + 3, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }
    }

    this.ctx.restore();
  }

  private getFoodSizeMultiplier(type: FoodType): number {
    switch (type) {
      case 'DONUT':
        return 1.5;  // 50% bigger
      case 'CHERRY':
        return 0.6;  // 40% smaller
      default:
        return 1.0;
    }
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

  renderUI(gameState: GameState, waveSystem: any, totalWaves: number, foods: Map<string, FoodData>): void {
    // REMOVE the top black bar and stats - those will be in React UI panel

    const currentTime = performance.now() / 1000;
    const timeRemaining = waveSystem.getTimeUntilNextWave(currentTime);
    const isLastWave = gameState.wave >= totalWaves;

    // Show "Call Next Wave" button (only if not last wave and not victory)
    if (waveSystem.canCallNextWave(currentTime, foods) && !gameState.isVictory && !isLastWave) {
      const buttonX = GAME_CONFIG.canvasWidth - 160;
      const buttonY = 55;  // ← Below speed/pause buttons
      const buttonWidth = 150;
      const buttonHeight = 35;

      const bonus = Math.floor(timeRemaining * 10);

      this.ctx.fillStyle = '#FFA500';
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.strokeStyle = '#FF8C00';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('CALL NEXT WAVE', buttonX + buttonWidth / 2, buttonY + 14);
      this.ctx.font = '11px Arial';
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillText(`(+$${bonus} bonus)`, buttonX + buttonWidth / 2, buttonY + 28);
    }

    // Pause screen
    if (gameState.isPaused && !gameState.isGameOver && !gameState.isVictory) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSED', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2 - 30);

      // Resume button
      const buttonX = GAME_CONFIG.canvasWidth / 2 - 75;
      const buttonY = GAME_CONFIG.canvasHeight / 2 + 20;
      const buttonWidth = 150;
      const buttonHeight = 50;

      this.ctx.fillStyle = '#27AE60';
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.strokeStyle = '#229954';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('RESUME', GAME_CONFIG.canvasWidth / 2, buttonY + buttonHeight / 2);

      return; // Don't render other UI elements
    }

    // Speed and Pause buttons (top right)
    if (!gameState.isGameOver && !gameState.isVictory) {
      const buttonSize = 40;
      const buttonY = 10;

      // Speed button
      const speedButtonX = GAME_CONFIG.canvasWidth - 90;

      this.ctx.fillStyle = gameState.gameSpeed === 1 ? '#4A90E2' : '#FF6B35';
      this.ctx.fillRect(speedButtonX, buttonY, buttonSize, buttonSize);

      this.ctx.strokeStyle = gameState.gameSpeed === 1 ? '#357ABD' : '#E85A2B';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(speedButtonX, buttonY, buttonSize, buttonSize);

      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        gameState.gameSpeed === 1 ? '1x' : '2x',
        speedButtonX + buttonSize / 2,
        buttonY + buttonSize / 2
      );

      // Pause button
      const pauseButtonX = GAME_CONFIG.canvasWidth - 45;

      this.ctx.fillStyle = gameState.isPaused ? '#E74C3C' : '#27AE60';
      this.ctx.fillRect(pauseButtonX, buttonY, buttonSize, buttonSize);

      this.ctx.strokeStyle = gameState.isPaused ? '#C0392B' : '#229954';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(pauseButtonX, buttonY, buttonSize, buttonSize);

      this.ctx.fillStyle = 'white';

      if (gameState.isPaused) {
        // Draw play triangle
        this.ctx.beginPath();
        this.ctx.moveTo(pauseButtonX + buttonSize / 2 - 6, buttonY + buttonSize / 2 - 8);
        this.ctx.lineTo(pauseButtonX + buttonSize / 2 - 6, buttonY + buttonSize / 2 + 8);
        this.ctx.lineTo(pauseButtonX + buttonSize / 2 + 8, buttonY + buttonSize / 2);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Draw pause bars
        this.ctx.fillRect(pauseButtonX + buttonSize / 2 - 8, buttonY + buttonSize / 2 - 8, 5, 16);
        this.ctx.fillRect(pauseButtonX + buttonSize / 2 + 3, buttonY + buttonSize / 2 - 8, 5, 16);
      }
    }

    if (gameState.isVictory) {
      // Victory screen
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('VICTORY!', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2 - 80);

      // Level complete message
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '24px Arial';
      this.ctx.fillText('Level Complete!', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2 - 30);
      this.ctx.fillText('Returning to map...', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2 + 10);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '20px Arial';
      this.ctx.fillText(
        `Final Score: ${gameState.score}`,
        GAME_CONFIG.canvasWidth / 2,
        GAME_CONFIG.canvasHeight / 2 + 50
      );
    }

    // Game Over screen
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

      const buttonX = GAME_CONFIG.canvasWidth / 2 - 75;
      const buttonY = GAME_CONFIG.canvasHeight / 2 + 80;
      const buttonWidth = 150;
      const buttonHeight = 40;

      this.ctx.fillStyle = '#4CAF50';
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.strokeStyle = '#45a049';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText('RESTART', GAME_CONFIG.canvasWidth / 2, buttonY + 26);
    }
  }

  renderRipples(ripples: { x: number; y: number; radius: number; opacity: number }[]): void {
    ripples.forEach(r => {
      this.ctx.save();
      this.ctx.globalAlpha = r.opacity;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    });
  }

  renderFloatingTexts(texts: FloatingText[]): void {
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    texts.forEach(text => {
      this.ctx.save();
      this.ctx.globalAlpha = text.opacity;

      const coinRadius = 16;
      const numberFont = 'bold 48px Arial';
      this.ctx.font = numberFont;
      const numberWidth = this.ctx.measureText(text.text).width;
      const gap = 4;
      const totalWidth = coinRadius * 2 + gap + numberWidth;
      const startX = text.x - totalWidth / 2;

      // Coin icon
      this.drawCoin(startX + coinRadius, text.y, coinRadius);

      // Number
      this.ctx.fillStyle = '#FFD700';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 4;
      const numX = startX + coinRadius * 2 + gap + numberWidth / 2;
      this.ctx.strokeText(text.text, numX, text.y);
      this.ctx.fillText(text.text, numX, text.y);

      this.ctx.restore();
    });
  }

  private renderLilyRemovalTooltip(
    cell: GridCell,
    canAfford: boolean
  ): void {
    const pos = cell.position;
    const buttonWidth = 120;
    const buttonHeight = 30;
    const buttonX = pos.x - buttonWidth / 2;
    const buttonY = pos.y - 50;

    // Button background
    this.ctx.fillStyle = canAfford ? 'rgba(255, 59, 48, 0.9)' : 'rgba(128, 128, 128, 0.9)';
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Button border
    this.ctx.strokeStyle = canAfford ? '#E63946' : '#666';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Button text
    this.ctx.fillStyle = canAfford ? 'white' : '#AAA';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      `Remove for $${GAME_CONFIG.lilyRemovalCost}`,  
      pos.x,
      buttonY + buttonHeight / 2
    );
  }

  private hashString(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  private nextSeed(seed: number): number {
    return Math.abs(((seed * 1103515245 + 12345) | 0));
  }

  private darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.floor(((num >> 16) & 0xFF) * (1 - amount)));
    const g = Math.max(0, Math.floor(((num >> 8) & 0xFF) * (1 - amount)));
    const b = Math.max(0, Math.floor((num & 0xFF) * (1 - amount)));
    return `rgb(${r},${g},${b})`;
  }
}