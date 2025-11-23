import { GridCell, FrogData, FoodData, GameState, StreamPath, CellType } from '../../types/game';
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

  renderFrogs(frogs: FrogData[], grid: GridCell[][]): void {
    frogs.forEach(frog => {
      this.renderFrog(frog, grid);
    });
  }

  private renderFrog(frog: FrogData, grid: GridCell[][]): void {
    const cell = grid[frog.gridPosition.row][frog.gridPosition.col];
    const pos = cell.position;

    const size = GAME_CONFIG.cellSize * 0.5 * 0.9;  // ← Multiply by 0.9 for 10% smaller

    if (frog.tongue && frog.tongue.active) {
      this.renderTongue(pos, frog.tongue);
    }

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

  renderUI(gameState: GameState, waveSystem: any, totalWaves: number, foods: Map<string, FoodData>): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, 40);

    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';

    this.ctx.fillText(`Lives: ${gameState.lives}`, 10, 25);
    this.ctx.fillText(`Money: $${gameState.money}`, 100, 25);
    this.ctx.fillText(`Wave: ${gameState.wave}/${totalWaves}`, 220, 25);
    this.ctx.fillText(`Score: ${gameState.score}`, 310, 25);

    const currentTime = performance.now() / 1000;
    const timeRemaining = waveSystem.getTimeUntilNextWave(currentTime);
    const isLastWave = gameState.wave >= totalWaves;

    // Show countdown timer (only if not last wave and not victory)
    if (timeRemaining > 0 && !gameState.isVictory && !isLastWave) {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = Math.floor(timeRemaining % 60);
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      this.ctx.fillStyle = '#FFD700';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`Next wave in ${timeString}`, GAME_CONFIG.canvasWidth - 10, 25);
    }

    // Show "Call Next Wave" button (only if not last wave and not victory)
    if (waveSystem.canCallNextWave(currentTime, foods) && !gameState.isVictory && !isLastWave) {  // ← ADD foods
      const buttonX = GAME_CONFIG.canvasWidth - 160;
      const buttonY = 50;
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
      this.ctx.fillText('CALL NEXT WAVE', buttonX + buttonWidth / 2, buttonY + 14);
      this.ctx.font = '11px Arial';
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillText(`(+$${bonus} bonus)`, buttonX + buttonWidth / 2, buttonY + 28);
    }

    if (!gameState.isGameOver && !gameState.isVictory) {
      const buttonX = GAME_CONFIG.canvasWidth - 80;
      const buttonY = GAME_CONFIG.canvasHeight - 50;
      const buttonWidth = 70;
      const buttonHeight = 40;

      // Button background
      this.ctx.fillStyle = gameState.gameSpeed === 1 ? '#4A90E2' : '#FF6B35';
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Button border
      this.ctx.strokeStyle = gameState.gameSpeed === 1 ? '#357ABD' : '#E85A2B';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Speed icon/text
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        gameState.gameSpeed === 1 ? '1x' : '2x',
        buttonX + buttonWidth / 2,
        buttonY + buttonHeight / 2
      );
    }

    if (gameState.isVictory) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('VICTORY!', GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2 - 30);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '24px Arial';
      this.ctx.fillText(
        `Final Score: ${gameState.score}`,
        GAME_CONFIG.canvasWidth / 2,
        GAME_CONFIG.canvasHeight / 2 + 20
      );

      // Restart button
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

    if (gameState.isGameOver) {

      if (this.gameOverStartTime === 0) {
        this.gameOverStartTime = performance.now();
      }
      const fadeProgress = Math.min((performance.now() - this.gameOverStartTime) / 1000, 1);

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

      // Restart button
      const buttonX = GAME_CONFIG.canvasWidth / 2 - 75;
      const buttonY = GAME_CONFIG.canvasHeight / 2 + 80;
      const buttonWidth = 150;
      const buttonHeight = 40;


      // Only show button after fade completes
      if (fadeProgress >= 0.5) {
        const buttonAlpha = (fadeProgress - 0.5) * 2; // Fade in from 0.5s to 1s

        // Button background
        this.ctx.fillStyle = `rgba(76, 175, 80, ${buttonAlpha})`;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Button border
        this.ctx.strokeStyle = '#45a049';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Button text
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText('RESTART', GAME_CONFIG.canvasWidth / 2, buttonY + 26);
      }
    } else {
      // Reset timer when game is playing
      this.gameOverStartTime = 0;
    }
  }
}