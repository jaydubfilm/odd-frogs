import { GridCell, FrogData, FoodData, FoodType, FloatingText, GameState, StreamPath, CellType, GridPosition } from '../../types/game';
import { UpgradePath } from '../../types/upgrades';
import { COLORS, GAME_CONFIG, UPGRADE_PATH_COSTS, CONSUMABLE_CONFIG } from '@data/constants';
import { UpgradeSystem } from './UpgradeSystem';
import { SynergyConnection } from './SynergyVisualSystem';
import { WhirlpoolEffect, RainEffect } from './ConsumableSystem';

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

    const time = performance.now() / 1000;

    streams.forEach((stream) => {
      if (!stream.smoothPath || stream.smoothPath.points.length === 0) return;
      const points = stream.smoothPath.points;

      const tracePath = () => {
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          this.ctx.lineTo(points[i].x, points[i].y);
        }
      };

      this.ctx.save();
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      // Soft current
      this.ctx.globalAlpha = 0.5;
      this.ctx.strokeStyle = COLORS.STREAM;
      this.ctx.lineWidth = 18;
      tracePath();
      this.ctx.stroke();

      // Flow lines (animated dashes)
      this.ctx.globalAlpha = 0.4;
      this.ctx.strokeStyle = 'rgba(140, 200, 220, 1)';
      this.ctx.lineWidth = 9;
      this.ctx.setLineDash([15, 25]);
      this.ctx.lineDashOffset = -time * 24;
      tracePath();
      this.ctx.stroke();

      // Shimmer highlights
      this.ctx.globalAlpha = 0.3;
      this.ctx.strokeStyle = 'rgba(220, 240, 255, 1)';
      this.ctx.lineWidth = 6;
      this.ctx.setLineDash([8, 35]);
      this.ctx.lineDashOffset = -time * 36;
      tracePath();
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  renderSynergyConnections(connections: SynergyConnection[]): void {
    if (connections.length === 0) return;

    const time = performance.now() / 1000;

    connections.forEach(conn => {
      let color: string;
      switch (conn.path) {
        case UpgradePath.CIRCLES:
          color = '100, 180, 255';
          break;
        case UpgradePath.HORIZONTAL_STRIPES:
          color = '100, 255, 150';
          break;
        case UpgradePath.VERTICAL_STRIPES:
          color = '200, 130, 255';
          break;
        default:
          return;
      }

      const traceLine = () => {
        this.ctx.beginPath();
        this.ctx.moveTo(conn.x1, conn.y1);
        this.ctx.lineTo(conn.x2, conn.y2);
      };

      this.ctx.save();
      this.ctx.lineCap = 'round';

      // Base glow
      this.ctx.globalAlpha = 0.25;
      this.ctx.strokeStyle = `rgba(${color}, 1)`;
      this.ctx.lineWidth = 4;
      traceLine();
      this.ctx.stroke();

      // Animated dashes
      this.ctx.globalAlpha = 0.35;
      this.ctx.strokeStyle = `rgba(${color}, 1)`;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([10, 20]);
      this.ctx.lineDashOffset = -time * 30;
      traceLine();
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  renderGrid(grid: GridCell[][], hoveredCell: GridPosition | null, money: number, dropHighlightCell?: GridPosition | null, menuOpacity: number = 1, dropHighlightRange?: number, dropHighlightMinRange?: number, dropHighlightIgnoresRocks?: boolean, dropHighlightBlockedByFrogs?: boolean): void {
    grid.forEach(row => {
      row.forEach(cell => {
        this.renderCell(cell);

        if (dropHighlightCell &&
          cell.gridPosition.row === dropHighlightCell.row &&
          cell.gridPosition.col === dropHighlightCell.col &&
          cell.type === CellType.LILYPAD &&
          cell.frog === null) {
          this.renderDropHighlight(cell, dropHighlightRange, dropHighlightMinRange, grid, dropHighlightIgnoresRocks, dropHighlightBlockedByFrogs);
        }

        if (hoveredCell &&
          cell.gridPosition.row === hoveredCell.row &&
          cell.gridPosition.col === hoveredCell.col &&
          cell.type === CellType.LILYPAD_WITH_LILY) {
          const canAfford = money >= GAME_CONFIG.lilyRemovalCost;
          this.ctx.save();
          this.ctx.globalAlpha = menuOpacity;
          this.renderLilyRemovalTooltip(cell, canAfford);
          this.ctx.restore();
        }
      });
    });
  }

  private renderDropHighlight(cell: GridCell, range?: number, minRange?: number, grid?: GridCell[][], ignoresRocks?: boolean, blockedByFrogs?: boolean): void {
    const { x, y } = cell.position;
    const rangeRadius = range ? range * GAME_CONFIG.cellSize : GAME_CONFIG.cellSize * 0.5 + 2;
    const minRangeRadius = minRange ? minRange * GAME_CONFIG.cellSize : 0;
    const showRockShadows = !ignoresRocks;

    this.ctx.save();

    // Fill the valid attack area
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, rangeRadius, 0, Math.PI * 2);
    if (minRangeRadius > 0) {
      this.ctx.moveTo(x + minRangeRadius, y);
      this.ctx.arc(x, y, minRangeRadius, 0, Math.PI * 2, true);
    }
    this.ctx.fill();

    // Shadow wedges for line-of-sight blockers
    if (grid && (showRockShadows || blockedByFrogs)) {
      const blockerRadius = GAME_CONFIG.cellSize * 0.25;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const gridCell = grid[r][c];

          // Skip the placement cell itself
          if (gridCell.gridPosition.row === cell.gridPosition.row &&
            gridCell.gridPosition.col === cell.gridPosition.col) continue;

          const isRock = gridCell.type === CellType.ROCK;
          const hasFrog = gridCell.frog !== null;

          if (isRock && !showRockShadows) continue;
          if (hasFrog && !blockedByFrogs) continue;
          if (!isRock && !hasFrog) continue;

          const bx = gridCell.position.x;
          const by = gridCell.position.y;
          const dx = bx - x;
          const dy = by - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 1 || dist > rangeRadius) continue;

          const centerAngle = Math.atan2(dy, dx);
          const halfAngle = Math.atan2(blockerRadius, dist);

          this.ctx.beginPath();
          this.ctx.arc(x, y, dist, centerAngle - halfAngle, centerAngle + halfAngle);
          this.ctx.arc(x, y, rangeRadius, centerAngle + halfAngle, centerAngle - halfAngle, true);
          this.ctx.closePath();
          this.ctx.fill();
        }
      }
    }

    // Outer range stroke
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.arc(x, y, rangeRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner dead zone stroke
    if (minRangeRadius > 0) {
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 4]);
      this.ctx.beginPath();
      this.ctx.arc(x, y, minRangeRadius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

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

  renderFrogs(frogs: FrogData[], grid: GridCell[][], money: number): void {
    frogs.forEach(frog => {
      this.renderFrog(frog, grid, money);
    });
  }

  renderFrogUpgradeUI(
    selectedFrogId: string | null,
    frogs: Map<string, FrogData>,
    grid: GridCell[][],
    money: number,
    menuOpacity: number = 1,
    upgradeSystem?: UpgradeSystem
  ): void {
    if (!selectedFrogId) return;

    const frog = frogs.get(selectedFrogId);
    if (!frog) return;

    this.ctx.save();
    this.ctx.globalAlpha = menuOpacity;

    const cell = grid[frog.gridPosition.row][frog.gridPosition.col];
    const pos = cell.position;

    // Draw range circle
    const rangeRadius = frog.stats.range * GAME_CONFIG.cellSize;
    const minRangeRadius = (frog.stats.minRange ?? 0) * GAME_CONFIG.cellSize;
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, rangeRadius, 0, Math.PI * 2);
    if (minRangeRadius > 0) {
      this.ctx.moveTo(pos.x + minRangeRadius, pos.y);
      this.ctx.arc(pos.x, pos.y, minRangeRadius, 0, Math.PI * 2, true);
    }
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, rangeRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    if (minRangeRadius > 0) {
      this.ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
      this.ctx.setLineDash([6, 4]);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, minRangeRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    const buttonSize = 60;
    const level = frog.upgradeState.level;
    const sellValue = Math.floor((frog.stats.cost + frog.totalSpent) / 2);
    const arcRadius = 105;
    const sellBtnX = pos.x - buttonSize / 2;
    const sellBtnY = pos.y + 45;

    if (level === 0) {
      // Level 0: 1 centered button (L1 = spot)
      const cost = UPGRADE_PATH_COSTS[0];
      const canAfford = money >= cost;
      const cx = pos.x;
      const cy = pos.y - arcRadius;
      const btnX = cx - buttonSize / 2;
      const btnY = cy - buttonSize / 2;

      this.ctx.fillStyle = canAfford ? '#4CAF50' : '#888';
      this.roundRect(btnX, btnY, buttonSize, buttonSize, 8);
      this.ctx.fill();
      this.ctx.strokeStyle = canAfford ? '#45a049' : '#666';
      this.ctx.lineWidth = 2;
      this.roundRect(btnX, btnY, buttonSize, buttonSize, 8);
      this.ctx.stroke();

      this.ctx.save();
      this.ctx.fillStyle = canAfford ? 'white' : '#AAA';
      this.drawUpgradeIcon('SPOT', cx, cy - 8, 12);
      this.ctx.restore();

      this.ctx.fillStyle = canAfford ? 'white' : '#AAA';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.drawCoinText(`${cost}`, cx, cy + 18, 6);

      this.renderSellButton(sellBtnX, sellBtnY, buttonSize, sellValue);
    } else if (level === 1) {
      // Level 1: 4 path buttons in arc (spots / circle / h-stripe / v-stripe)
      const pathColors = ['#E67E22', '#3498DB', '#27AE60', '#9B59B6'];
      const iconTypes: string[] = ['TWO_SPOTS', 'CIRCLE', 'H_STRIPE', 'V_STRIPE'];
      const angles = [-2.70, -1.95, -1.19, -0.44];
      const cost = UPGRADE_PATH_COSTS[1];
      const canAfford = money >= cost;

      // Price label above frog
      this.ctx.fillStyle = canAfford ? 'white' : '#AAA';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.drawCoinText(`${cost}`, pos.x, pos.y - arcRadius - 38, 6);

      for (let i = 0; i < 4; i++) {
        const cx = pos.x + arcRadius * Math.cos(angles[i]);
        const cy = pos.y + arcRadius * Math.sin(angles[i]);
        const btnX = cx - buttonSize / 2;
        const btnY = cy - buttonSize / 2;

        this.ctx.fillStyle = canAfford ? pathColors[i] : '#888';
        this.roundRect(btnX, btnY, buttonSize, buttonSize, 8);
        this.ctx.fill();
        this.ctx.strokeStyle = canAfford ? this.darkenColor(pathColors[i], 0.2) : '#666';
        this.ctx.lineWidth = 2;
        this.roundRect(btnX, btnY, buttonSize, buttonSize, 8);
        this.ctx.stroke();

        this.ctx.save();
        this.ctx.fillStyle = canAfford ? 'white' : '#AAA';
        this.drawUpgradeIcon(iconTypes[i], cx, cy, 12);
        this.ctx.restore();
      }

      this.renderSellButton(sellBtnX, sellBtnY, buttonSize, sellValue);
    } else if (level === 2) {
      // Level 2: 1 centered button (continue to L3)
      const cost = UPGRADE_PATH_COSTS[2];
      const canAfford = money >= cost;
      const cx = pos.x;
      const cy = pos.y - arcRadius;
      const btnX = cx - buttonSize / 2;
      const btnY = cy - buttonSize / 2;

      this.ctx.fillStyle = canAfford ? '#4CAF50' : '#888';
      this.roundRect(btnX, btnY, buttonSize, buttonSize, 8);
      this.ctx.fill();
      this.ctx.strokeStyle = canAfford ? '#45a049' : '#666';
      this.ctx.lineWidth = 2;
      this.roundRect(btnX, btnY, buttonSize, buttonSize, 8);
      this.ctx.stroke();

      // Up arrow
      this.ctx.fillStyle = canAfford ? 'white' : '#AAA';
      this.ctx.beginPath();
      this.ctx.moveTo(cx, btnY + 10);
      this.ctx.lineTo(cx - 8, btnY + 20);
      this.ctx.lineTo(cx + 8, btnY + 20);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.drawCoinText(`${cost}`, cx, btnY + 42, 6);

      this.renderSellButton(sellBtnX, sellBtnY, buttonSize, sellValue);
    } else {
      // Level 3: sell only
      this.renderSellButton(sellBtnX, sellBtnY, buttonSize, sellValue);
    }

    this.ctx.restore();
  }

  private drawUpgradeIcon(type: string, cx: number, cy: number, r: number): void {
    this.ctx.save();
    const color = this.ctx.fillStyle as string;

    switch (type) {
      case 'SPOT':
        // Single centered spot
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'TWO_SPOTS':
        // Two spots side by side
        this.ctx.beginPath();
        this.ctx.arc(cx - r * 0.35, cy, r * 0.25, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(cx + r * 0.35, cy, r * 0.25, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'CIRCLE':
        // Single ring
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case 'TWO_CIRCLES':
        // Two concentric rings
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case 'H_STRIPE':
        // Single horizontal line
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - r * 0.7, cy);
        this.ctx.lineTo(cx + r * 0.7, cy);
        this.ctx.stroke();
        break;
      case 'TWO_H_STRIPES':
        // Two horizontal lines
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2.5;
        for (let i = -1; i <= 1; i += 2) {
          this.ctx.beginPath();
          this.ctx.moveTo(cx - r * 0.7, cy + i * r * 0.3);
          this.ctx.lineTo(cx + r * 0.7, cy + i * r * 0.3);
          this.ctx.stroke();
        }
        break;
      case 'V_STRIPE':
        // Single vertical line
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - r * 0.7);
        this.ctx.lineTo(cx, cy + r * 0.7);
        this.ctx.stroke();
        break;
      case 'TWO_V_STRIPES':
        // Two vertical lines
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2.5;
        for (let i = -1; i <= 1; i += 2) {
          this.ctx.beginPath();
          this.ctx.moveTo(cx + i * r * 0.3, cy - r * 0.7);
          this.ctx.lineTo(cx + i * r * 0.3, cy + r * 0.7);
          this.ctx.stroke();
        }
        break;
    }

    this.ctx.restore();
  }

  private renderSellButton(x: number, y: number, size: number, sellValue: number): void {
    this.ctx.fillStyle = '#E74C3C';
    this.roundRect(x, y, size, size, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = '#C0392B';
    this.ctx.lineWidth = 2;
    this.roundRect(x, y, size, size, 8);
    this.ctx.stroke();

    // Sell label
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('$', x + size / 2, y + 20);

    // Sell value
    this.ctx.font = 'bold 20px Arial';
    this.drawCoinText(`${sellValue}`, x + size / 2, y + 44, 8);
  }

  private drawCoin(cx: number, cy: number, radius: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fill();
    this.ctx.strokeStyle = '#B8860B';
    this.ctx.lineWidth = radius * 0.15;
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#DAA520';
    this.ctx.lineWidth = radius * 0.1;
    this.ctx.stroke();
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

  private renderFrog(frog: FrogData, grid: GridCell[][], money: number): void {
    const cell = grid[frog.gridPosition.row][frog.gridPosition.col];
    const pos = cell.position;

    const size = GAME_CONFIG.cellSize * 0.5 * 0.9;

    if (frog.tongue && frog.tongue.active) {
      this.renderTongue(pos, frog.tongue);
    }

    // Body
    this.ctx.fillStyle = frog.stats.color;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw pattern based on upgrade level
    const bodyR = size / 2;
    const state = frog.upgradeState;

    if (state.level === 1) {
      this.renderOneSpot(pos.x, pos.y, bodyR, frog.stats.color);
    } else if (state.level === 2) {
      if (state.path === UpgradePath.SPOTS) {
        this.renderTwoSpots(pos.x, pos.y, bodyR, frog.stats.color);
      } else if (state.path === UpgradePath.CIRCLES) {
        this.renderCircles(pos.x, pos.y, bodyR, 1, frog.stats.color);
      } else if (state.path === UpgradePath.HORIZONTAL_STRIPES) {
        this.renderHorizontalStripes(pos.x, pos.y, bodyR, 1, frog.stats.color);
      } else if (state.path === UpgradePath.VERTICAL_STRIPES) {
        this.renderVerticalStripes(pos.x, pos.y, bodyR, 1, frog.stats.color);
      }
    } else if (state.level === 3) {
      if (state.path === UpgradePath.SPOTS) {
        this.renderThreeSpots(pos.x, pos.y, bodyR, frog.stats.color);
      } else if (state.path === UpgradePath.CIRCLES) {
        this.renderCircles(pos.x, pos.y, bodyR, 2, frog.stats.color);
      } else if (state.path === UpgradePath.HORIZONTAL_STRIPES) {
        this.renderHorizontalStripes(pos.x, pos.y, bodyR, 2, frog.stats.color);
      } else if (state.path === UpgradePath.VERTICAL_STRIPES) {
        this.renderVerticalStripes(pos.x, pos.y, bodyR, 2, frog.stats.color);
      }
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

    // Upgrade-available triangle indicator on lilypad perimeter
    if (frog.upgradeState.level < 3 && money >= UPGRADE_PATH_COSTS[frog.upgradeState.level]) {
      const padRadius = GAME_CONFIG.cellSize * 0.5 / 2;
      const angle = Math.PI * 0.25; // bottom-right, 45 degrees
      const tx = pos.x + Math.cos(angle) * padRadius;
      const ty = pos.y + Math.sin(angle) * padRadius;
      const triSize = 15.6;
      this.ctx.fillStyle = '#22C55E';
      this.ctx.strokeStyle = '#166534';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(tx, ty - triSize * 0.6);
      this.ctx.lineTo(tx - triSize * 0.5, ty + triSize * 0.4);
      this.ctx.lineTo(tx + triSize * 0.5, ty + triSize * 0.4);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }

  }

  private renderOneSpot(cx: number, cy: number, bodyR: number, baseColor: string): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.fillStyle = this.darkenColor(baseColor, 0.35);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, bodyR * 0.2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderTwoSpots(cx: number, cy: number, bodyR: number, baseColor: string): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.fillStyle = this.darkenColor(baseColor, 0.35);
    const offset = bodyR * 0.25;
    this.ctx.beginPath();
    this.ctx.arc(cx - offset, cy, bodyR * 0.18, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(cx + offset, cy, bodyR * 0.18, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderThreeSpots(cx: number, cy: number, bodyR: number, baseColor: string): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.fillStyle = this.darkenColor(baseColor, 0.35);
    const r = bodyR * 0.16;
    const d = bodyR * 0.28;
    // Triangle arrangement
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - d, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(cx - d * 0.87, cy + d * 0.5, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(cx + d * 0.87, cy + d * 0.5, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderCircles(cx: number, cy: number, bodyR: number, count: number, baseColor: string): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.strokeStyle = this.darkenColor(baseColor, 0.35);
    this.ctx.lineWidth = 2;
    // Outer ring
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, bodyR * 0.65, 0, Math.PI * 2);
    this.ctx.stroke();
    // Inner ring (if 2)
    if (count >= 2) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, bodyR * 0.38, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private renderHorizontalStripes(cx: number, cy: number, bodyR: number, count: number, baseColor: string): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.strokeStyle = this.darkenColor(baseColor, 0.35);
    this.ctx.lineWidth = 3;
    const spacing = (bodyR * 2) / (count + 1);
    for (let i = 1; i <= count; i++) {
      const lineY = cy - bodyR + spacing * i;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - bodyR, lineY);
      this.ctx.lineTo(cx + bodyR, lineY);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private renderVerticalStripes(cx: number, cy: number, bodyR: number, count: number, baseColor: string): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.strokeStyle = this.darkenColor(baseColor, 0.35);
    this.ctx.lineWidth = 3;
    const spacing = (bodyR * 2) / (count + 1);
    for (let i = 1; i <= count; i++) {
      const lineX = cx - bodyR + spacing * i;
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, cy - bodyR);
      this.ctx.lineTo(lineX, cy + bodyR);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private renderTongue(
    frogPos: { x: number; y: number },
    tongue: { targetPosition: { x: number; y: number }; progress: number }
  ): void {
    const currentX = frogPos.x + (tongue.targetPosition.x - frogPos.x) * tongue.progress;
    const currentY = frogPos.y + (tongue.targetPosition.y - frogPos.y) * tongue.progress;

    this.ctx.strokeStyle = '#FF69B4';
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(frogPos.x, frogPos.y);
    this.ctx.lineTo(currentX, currentY);
    this.ctx.stroke();

    if (tongue.progress > 0.1) {
      this.ctx.fillStyle = '#FF1493';
      this.ctx.beginPath();
      this.ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
      this.ctx.fill();

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
        this.ctx.fillStyle = '#E53935';
        this.ctx.beginPath();
        this.ctx.arc(x, y + 2, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#B71C1C';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.strokeStyle = '#5D4037';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r + 2);
        this.ctx.lineTo(x + 1, y - r - 5);
        this.ctx.stroke();
        this.ctx.fillStyle = '#43A047';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 5, y - r - 2, 5, 3, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }
      case 'BURGER': {
        const bw = r * 1.3;
        this.ctx.fillStyle = '#D4A056';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 5, bw, r * 0.4, 0, 0, Math.PI);
        this.ctx.fill();
        this.ctx.fillStyle = '#5D4037';
        this.ctx.fillRect(x - bw + 2, y - 2, (bw - 2) * 2, 7);
        this.ctx.fillStyle = '#66BB6A';
        this.ctx.fillRect(x - bw + 1, y - 5, (bw - 1) * 2, 4);
        this.ctx.fillStyle = '#E8A642';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 5, bw, r * 0.55, 0, Math.PI, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#FFF9C4';
        this.ctx.beginPath();
        this.ctx.ellipse(x - 4, y - 9, 2, 1.2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + 5, y - 8, 2, 1.2, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#6D4C00';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 5, bw, r * 0.55, 0, Math.PI, Math.PI * 2);
        this.ctx.stroke();
        break;
      }
      case 'CAKE': {
        this.ctx.fillStyle = '#FFCCBC';
        this.ctx.fillRect(x - r, y - r * 0.3, r * 2, r * 1.3);
        this.ctx.fillStyle = '#F48FB1';
        this.ctx.fillRect(x - r, y - r * 0.5, r * 2, r * 0.4);
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.4, y - r * 0.1, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + r * 0.5, y - r * 0.05, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#E53935';
        this.ctx.beginPath();
        this.ctx.arc(x, y - r * 0.65, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#8D6E63';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - r, y - r * 0.5, r * 2, r * 1.5);
        break;
      }
      case 'BEANS': {
        this.ctx.fillStyle = '#A1887F';
        this.ctx.fillRect(x - r * 0.6, y - r * 0.8, r * 1.2, r * 1.6);
        this.ctx.fillStyle = '#FF8A65';
        this.ctx.fillRect(x - r * 0.55, y - r * 0.4, r * 1.1, r * 0.9);
        this.ctx.fillStyle = '#BDBDBD';
        this.ctx.fillRect(x - r * 0.65, y - r * 0.85, r * 1.3, r * 0.15);
        this.ctx.fillRect(x - r * 0.65, y + r * 0.75, r * 1.3, r * 0.12);
        this.ctx.strokeStyle = '#5D4037';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - r * 0.6, y - r * 0.8, r * 1.2, r * 1.6);
        break;
      }
      case 'PIZZA': {
        this.ctx.fillStyle = '#FDD835';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.lineTo(x - r, y + r * 0.7);
        this.ctx.lineTo(x + r, y + r * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#D4A056';
        this.ctx.beginPath();
        this.ctx.moveTo(x - r, y + r * 0.7);
        this.ctx.lineTo(x + r, y + r * 0.7);
        this.ctx.lineTo(x + r * 0.85, y + r * 0.95);
        this.ctx.lineTo(x - r * 0.85, y + r * 0.95);
        this.ctx.closePath();
        this.ctx.fill();
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
        this.ctx.fillStyle = '#D4A056';
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#F48FB1';
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.9, Math.PI, Math.PI * 2);
        this.ctx.lineTo(x + r * 0.9, y + 2);
        this.ctx.arc(x, y + 2, r * 0.9, 0, Math.PI);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#FFF176';
        this.ctx.fillRect(x - 6, y - 5, 4, 2);
        this.ctx.fillStyle = '#4FC3F7';
        this.ctx.fillRect(x + 3, y - 3, 4, 2);
        this.ctx.fillStyle = '#E53935';
        this.ctx.fillRect(x - 2, y + 3, 4, 2);
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
        this.ctx.fillStyle = '#C62828';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y + 2, r * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + 4, y + 2, r * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
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
        return 1.5;
      case 'CHERRY':
        return 0.6;
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

  renderUI(gameState: GameState, waveSystem: any, totalWaves: number, foods: Map<string, FoodData>, handedness: 'left' | 'right' = 'right'): void {
    const isLeft = handedness === 'left';
    const currentTime = performance.now() / 1000;
    const timeRemaining = waveSystem.getTimeUntilNextWave(currentTime);
    const isLastWave = gameState.wave >= totalWaves;

    // Wave timer button (circular)
    if (waveSystem.isActive() && !gameState.isVictory && !isLastWave) {
      const btnSize = 60;
      const gap = 15;
      const callButtonX = isLeft ? 5 : GAME_CONFIG.canvasWidth - btnSize - 5;
      const callButtonY = 5 + (btnSize + gap) * 2;
      const cx = callButtonX + btnSize / 2;
      const cy = callButtonY + btnSize / 2;
      const radius = btnSize / 2 - 2;

      const canCall = waveSystem.canCallNextWave(currentTime, foods);
      const progress = waveSystem.getWaveTimerProgress(currentTime);
      const timeRemaining = waveSystem.getTimeUntilNextWave(currentTime);
      const bonus = Math.floor(timeRemaining / 2);

      // Background circle
      this.ctx.fillStyle = '#555';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Progress arc (fills clockwise from top)
      this.ctx.fillStyle = canCall ? 'rgba(255, 165, 0, 0.8)' : 'rgba(255, 165, 0, 0.35)';
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      this.ctx.closePath();
      this.ctx.fill();

      // Ring border
      this.ctx.strokeStyle = canCall ? '#FFA500' : '#777';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      if (canCall) {
        if (waveSystem.isWaitingForFirstWave()) {
          // "START" label
          this.ctx.font = 'bold 14px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillStyle = 'white';
          this.ctx.fillText('START', cx, cy);
        } else {
          // Black pill background behind coin + text
          this.ctx.font = 'bold 16px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          const coinR = 7;
          const textW = this.ctx.measureText(`${bonus}`).width;
          const pillW = coinR * 2 + 3 + textW + 10;
          const pillH = 20;
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          this.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, pillH / 2);
          this.ctx.fill();

          // Gold coin + amount
          this.ctx.fillStyle = 'white';
          this.drawCoinText(`${bonus}`, cx, cy, coinR);
        }
      }
    }

    // Pause screen
    if (gameState.isPaused && !gameState.isGameOver && !gameState.isVictory) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSED', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2 - 80);

      const buttonWidth = 200;
      const buttonHeight = 50;
      const buttonGap = 15;
      const buttonX = GAME_CONFIG.canvasWidth / 2 - buttonWidth / 2;
      const startY = GAME_CONFIG.canvasHeight / 2 - 20;

      // Resume button
      this.ctx.fillStyle = '#27AE60';
      this.roundRect(buttonX, startY, buttonWidth, buttonHeight, 8);
      this.ctx.fill();
      this.ctx.strokeStyle = '#229954';
      this.ctx.lineWidth = 3;
      this.roundRect(buttonX, startY, buttonWidth, buttonHeight, 8);
      this.ctx.stroke();
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('RESUME', GAME_CONFIG.canvasWidth / 2, startY + buttonHeight / 2);

      // Restart button
      const restartY = startY + buttonHeight + buttonGap;
      this.ctx.fillStyle = '#E67E22';
      this.roundRect(buttonX, restartY, buttonWidth, buttonHeight, 8);
      this.ctx.fill();
      this.ctx.strokeStyle = '#D35400';
      this.ctx.lineWidth = 3;
      this.roundRect(buttonX, restartY, buttonWidth, buttonHeight, 8);
      this.ctx.stroke();
      this.ctx.fillStyle = 'white';
      this.ctx.fillText('RESTART', GAME_CONFIG.canvasWidth / 2, restartY + buttonHeight / 2);

      // Back to Map button
      const mapY = restartY + buttonHeight + buttonGap;
      this.ctx.fillStyle = '#4A90E2';
      this.roundRect(buttonX, mapY, buttonWidth, buttonHeight, 8);
      this.ctx.fill();
      this.ctx.strokeStyle = '#357ABD';
      this.ctx.lineWidth = 3;
      this.roundRect(buttonX, mapY, buttonWidth, buttonHeight, 8);
      this.ctx.stroke();
      this.ctx.fillStyle = 'white';
      this.ctx.fillText('BACK TO MAP', GAME_CONFIG.canvasWidth / 2, mapY + buttonHeight / 2);

      return;
    }

    // Speed and Pause buttons
    if (!gameState.isGameOver && !gameState.isVictory) {
      const buttonSize = 60;
      const gap = 15;
      const baseX = isLeft ? 5 : GAME_CONFIG.canvasWidth - buttonSize - 5;

      // Pause button
      const pauseButtonX = baseX;
      const pauseButtonY = 5;

      this.ctx.fillStyle = gameState.isPaused ? '#E74C3C' : '#27AE60';
      this.roundRect(pauseButtonX, pauseButtonY, buttonSize, buttonSize, 6);
      this.ctx.fill();

      this.ctx.strokeStyle = gameState.isPaused ? '#C0392B' : '#229954';
      this.ctx.lineWidth = 2;
      this.roundRect(pauseButtonX, pauseButtonY, buttonSize, buttonSize, 6);
      this.ctx.stroke();

      this.ctx.fillStyle = 'white';

      if (gameState.isPaused) {
        this.ctx.beginPath();
        this.ctx.moveTo(pauseButtonX + buttonSize / 2 - 9, pauseButtonY + buttonSize / 2 - 12);
        this.ctx.lineTo(pauseButtonX + buttonSize / 2 - 9, pauseButtonY + buttonSize / 2 + 12);
        this.ctx.lineTo(pauseButtonX + buttonSize / 2 + 12, pauseButtonY + buttonSize / 2);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        this.ctx.fillRect(pauseButtonX + buttonSize / 2 - 11, pauseButtonY + buttonSize / 2 - 12, 8, 24);
        this.ctx.fillRect(pauseButtonX + buttonSize / 2 + 3, pauseButtonY + buttonSize / 2 - 12, 8, 24);
      }

      // Speed button
      const speedButtonX = baseX;
      const speedButtonY = 5 + buttonSize + gap;

      this.ctx.fillStyle = gameState.gameSpeed === 1 ? '#4A90E2' : '#FF6B35';
      this.roundRect(speedButtonX, speedButtonY, buttonSize, buttonSize, 6);
      this.ctx.fill();

      this.ctx.strokeStyle = gameState.gameSpeed === 1 ? '#357ABD' : '#E85A2B';
      this.ctx.lineWidth = 2;
      this.roundRect(speedButtonX, speedButtonY, buttonSize, buttonSize, 6);
      this.ctx.stroke();

      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 28px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        gameState.gameSpeed === 1 ? '1x' : '2x',
        speedButtonX + buttonSize / 2,
        speedButtonY + buttonSize / 2
      );

    }

    if (gameState.isVictory) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('VICTORY!', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2 - 80);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '24px Arial';
      this.ctx.fillText('Level Complete!', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2 - 30);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '20px Arial';
      this.ctx.fillText(
        `Final Score: ${gameState.score}`,
        GAME_CONFIG.canvasWidth / 2,
        GAME_CONFIG.canvasHeight / 2 + 20
      );

      // Continue button
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
      this.ctx.fillText('CONTINUE', GAME_CONFIG.canvasWidth / 2, buttonY + 26);
    }

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

  renderAoeEffects(effects: { x: number; y: number; radius: number; opacity: number }[]): void {
    effects.forEach(e => {
      this.ctx.save();
      this.ctx.globalAlpha = e.opacity;
      this.ctx.fillStyle = 'rgba(255, 80, 40, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(255, 120, 50, 0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    });
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

      this.drawCoin(startX + coinRadius, text.y, coinRadius);

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
    const buttonSize = 60;
    const buttonX = pos.x - buttonSize / 2;
    const buttonY = pos.y - 90;

    this.ctx.fillStyle = canAfford ? '#8B4513' : '#888';
    this.roundRect(buttonX, buttonY, buttonSize, buttonSize, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = canAfford ? '#6B3410' : '#666';
    this.ctx.lineWidth = 2;
    this.roundRect(buttonX, buttonY, buttonSize, buttonSize, 8);
    this.ctx.stroke();

    this.ctx.save();
    this.ctx.translate(pos.x, buttonY + 22);
    this.ctx.fillStyle = canAfford ? '#DDD' : '#AAA';
    this.ctx.strokeStyle = canAfford ? '#DDD' : '#AAA';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(4, -10);
    this.ctx.lineTo(-4, 8);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(-4, 8);
    this.ctx.lineTo(-9, 6);
    this.ctx.lineTo(-7, 14);
    this.ctx.lineTo(1, 14);
    this.ctx.lineTo(3, 6);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.fillStyle = canAfford ? 'white' : '#AAA';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.drawCoinText(`${GAME_CONFIG.lilyRemovalCost}`, pos.x, buttonY + 48, 6);
  }

  renderWhirlpools(whirlpools: WhirlpoolEffect[]): void {
    const time = performance.now() / 1000;
    whirlpools.forEach(wp => {
      const age = time - wp.createdAt;
      const fadeStart = wp.duration - 2;
      const alpha = age > fadeStart ? Math.max(0, 1 - (age - fadeStart) / 2) : 1;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;

      // Fill
      this.ctx.fillStyle = 'rgba(40, 100, 220, 0.35)';
      this.ctx.beginPath();
      this.ctx.arc(wp.x, wp.y, wp.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Outer swirling ring
      this.ctx.strokeStyle = 'rgba(60, 130, 255, 0.9)';
      this.ctx.lineWidth = 5;
      this.ctx.setLineDash([12, 8]);
      this.ctx.lineDashOffset = -time * 60;
      this.ctx.beginPath();
      this.ctx.arc(wp.x, wp.y, wp.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Inner ring
      this.ctx.strokeStyle = 'rgba(100, 170, 255, 0.7)';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([8, 12]);
      this.ctx.lineDashOffset = time * 40;
      this.ctx.beginPath();
      this.ctx.arc(wp.x, wp.y, wp.radius * 0.55, 0, Math.PI * 2);
      this.ctx.stroke();

      // Center dot
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = 'rgba(60, 120, 255, 0.7)';
      this.ctx.beginPath();
      this.ctx.arc(wp.x, wp.y, 7, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  renderRainEffect(rainEffect: RainEffect | null): void {
    if (!rainEffect) return;
    const elapsed = Date.now() - rainEffect.createdAt;
    if (elapsed > rainEffect.duration) return;

    const alpha = Math.max(0, 1 - elapsed / rainEffect.duration) * 0.6;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = 'rgba(100, 180, 255, 0.7)';
    this.ctx.lineWidth = 1.5;
    this.ctx.lineCap = 'round';

    // Rain streaks across the whole canvas
    const seed = rainEffect.createdAt;
    for (let i = 0; i < 60; i++) {
      const x = ((seed * 7 + i * 37) % GAME_CONFIG.canvasWidth);
      const y = ((seed * 13 + i * 53) % GAME_CONFIG.canvasHeight);
      const len = 12 + (i % 8);
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x - 2, y + len);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderWhirlpoolHighlight(pos: { x: number; y: number } | null): void {
    if (!pos) return;
    const radius = CONSUMABLE_CONFIG.WHIRLPOOL_RADIUS_GRID * GAME_CONFIG.cellSize;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([8, 6]);
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderConsumableToggle(x: number, y: number, size: number, active: boolean): void {
    // Background
    this.ctx.fillStyle = active ? '#6366F1' : '#7C3AED';
    this.roundRect(x, y, size, size, 6);
    this.ctx.fill();

    this.ctx.strokeStyle = active ? '#4F46E5' : '#6D28D9';
    this.ctx.lineWidth = 2;
    this.roundRect(x, y, size, size, 6);
    this.ctx.stroke();

    // Potion icon
    const cx = x + size / 2;
    const cy = y + size / 2;
    this.ctx.fillStyle = 'white';

    // Bottle body
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 8, cy - 4);
    this.ctx.lineTo(cx - 10, cy + 12);
    this.ctx.quadraticCurveTo(cx, cy + 18, cx + 10, cy + 12);
    this.ctx.lineTo(cx + 8, cy - 4);
    this.ctx.closePath();
    this.ctx.fill();

    // Bottle neck
    this.ctx.fillRect(cx - 4, cy - 12, 8, 10);

    // Cork
    this.ctx.fillStyle = active ? '#C4B5FD' : '#DDD6FE';
    this.ctx.fillRect(cx - 5, cy - 15, 10, 5);
  }

  private darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.floor(((num >> 16) & 0xFF) * (1 - amount)));
    const g = Math.max(0, Math.floor(((num >> 8) & 0xFF) * (1 - amount)));
    const b = Math.max(0, Math.floor((num & 0xFF) * (1 - amount)));
    return `rgb(${r},${g},${b})`;
  }
}
