import { UpgradeToken, StreamPath } from '../../types/game';
import { UpgradePath } from '../../types/upgrades';
import { GAME_CONFIG, UPGRADE_TOKEN_CONFIG } from '@data/constants';

const TOKEN_PATHS = [
  UpgradePath.SPOTS,
  UpgradePath.CIRCLES,
  UpgradePath.HORIZONTAL_STRIPES,
  UpgradePath.VERTICAL_STRIPES,
];

export class UpgradeTokenSystem {
  private tokens: Map<string, UpgradeToken> = new Map();
  private idCounter: number = 0;
  private accumulatedReward: number = 0;
  private lastUpdateTime: number = 0;
  onTokenPop: (() => void) | null = null;

  reset(): void {
    this.tokens.clear();
    this.idCounter = 0;
    this.accumulatedReward = 0;
    this.lastUpdateTime = 0;
  }

  onFoodKilled(reward: number, currentTime: number, streams: StreamPath[]): void {
    this.accumulatedReward += reward;

    while (this.accumulatedReward >= UPGRADE_TOKEN_CONFIG.REWARD_PER_TOKEN) {
      this.accumulatedReward -= UPGRADE_TOKEN_CONFIG.REWARD_PER_TOKEN;
      if (this.tokens.size < UPGRADE_TOKEN_CONFIG.MAX_TOKENS) {
        this.spawnToken(currentTime, streams);
      }
    }
  }

  update(currentTime: number): void {
    const cfg = UPGRADE_TOKEN_CONFIG;
    const dt = this.lastUpdateTime > 0 ? Math.min(currentTime - this.lastUpdateTime, 0.05) : 0;
    this.lastUpdateTime = currentTime;

    const floorY = GAME_CONFIG.canvasHeight - cfg.TOKEN_SIZE - 8;
    const bounceDamping = 0.45;
    const friction = 0.97;

    for (const token of this.tokens.values()) {
      if (token.landed || token.beingDragged) continue;

      if (token.phase === 'bubbling') {
        token.position.x = token.spawnPosition.x;
        token.position.y = token.spawnPosition.y;
        const elapsed = currentTime - token.phaseStart;
        if (elapsed >= cfg.BUBBLE_DURATION) {
          token.phase = 'physics';
          // Pop upward with some horizontal drift toward landing slot
          const dx = token.landedPosition.x - token.spawnPosition.x;
          const dist = Math.abs(dx);
          const horizontalSpeed = Math.min(dist * 0.8, 150) * Math.sign(dx);
          token.vx = horizontalSpeed + (Math.random() - 0.5) * 30;
          token.vy = -(180 + Math.random() * 60);
          if (this.onTokenPop) this.onTokenPop();
        }
      } else if (token.phase === 'physics') {
        // Gravity
        token.vy += cfg.GRAVITY * dt;

        // Integrate
        token.position.x += token.vx * dt;
        token.position.y += token.vy * dt;

        // Horizontal friction
        token.vx *= friction;

        // Bounce off floor
        if (token.position.y >= floorY) {
          token.position.y = floorY;
          token.vy = -Math.abs(token.vy) * bounceDamping;

          // Settle when bounce is tiny
          if (Math.abs(token.vy) < 15) {
            token.vy = 0;
            token.vx = 0;
            token.position.y = floorY;
            token.landedPosition.x = token.position.x;
            token.landedPosition.y = floorY;
            token.phase = 'landed';
            token.landed = true;
          }
        }

        // Keep in bounds horizontally
        const minX = cfg.TOKEN_SIZE;
        const maxX = GAME_CONFIG.canvasWidth - cfg.TOKEN_SIZE;
        if (token.position.x < minX) {
          token.position.x = minX;
          token.vx = Math.abs(token.vx) * bounceDamping;
        } else if (token.position.x > maxX) {
          token.position.x = maxX;
          token.vx = -Math.abs(token.vx) * bounceDamping;
        }
      }
    }
  }

  private spawnToken(currentTime: number, streams: StreamPath[]): void {
    const type = TOKEN_PATHS[Math.floor(Math.random() * TOKEN_PATHS.length)];
    const id = `token_${this.idCounter++}`;

    const topMargin = 60;
    const leftMargin = 60;
    const cellSize = GAME_CONFIG.cellSize;

    // Pick a random open-water position from actual stream channels
    const { x: spawnX, y: spawnY } = this.pickWaterPosition(streams, topMargin, leftMargin, cellSize);

    // Landing position: evenly spaced slot at the bottom of the screen
    const landY = GAME_CONFIG.canvasHeight - UPGRADE_TOKEN_CONFIG.TOKEN_SIZE - 8;
    const landX = this.pickLandingSlotX(leftMargin, cellSize);

    const token: UpgradeToken = {
      id,
      type,
      position: { x: spawnX, y: spawnY },
      spawnPosition: { x: spawnX, y: spawnY },
      phase: 'bubbling',
      phaseStart: currentTime,
      landed: false,
      beingDragged: false,
      landedPosition: { x: landX, y: landY },
      vx: 0,
      vy: 0,
    };

    this.tokens.set(id, token);
  }

  private pickWaterPosition(
    streams: StreamPath[],
    topMargin: number,
    leftMargin: number,
    cellSize: number,
  ): { x: number; y: number } {
    // Build list of non-stream water positions (columns not used by any stream per row)
    const candidates: { col: number; row: number }[] = [];
    for (let row = 0; row < GAME_CONFIG.gridRows; row++) {
      const streamCols = new Set<number>();
      for (const stream of streams) {
        if (row < stream.channels.length) {
          streamCols.add(stream.channels[row]);
        }
      }
      for (let col = 0; col < GAME_CONFIG.gridCols; col++) {
        if (!streamCols.has(col)) {
          candidates.push({ col, row });
        }
      }
    }

    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const x = leftMargin + pick.col * cellSize + cellSize / 2;
      const rowTop = topMargin + pick.row * cellSize + 20;
      const rowBot = topMargin + (pick.row + 1) * cellSize - 20;
      const y = rowTop + Math.random() * (rowBot - rowTop);
      return { x, y };
    }

    // Fallback: random position
    return {
      x: leftMargin + Math.random() * GAME_CONFIG.gridCols * cellSize,
      y: topMargin + Math.random() * GAME_CONFIG.gridRows * cellSize,
    };
  }

  private pickLandingSlotX(leftMargin: number, cellSize: number): number {
    const maxTokens = UPGRADE_TOKEN_CONFIG.MAX_TOKENS;
    const playWidth = GAME_CONFIG.gridCols * cellSize;
    const slotWidth = playWidth / maxTokens;

    // Find which slots are already occupied by existing tokens
    const occupied = new Set<number>();
    for (const token of this.tokens.values()) {
      const slot = Math.round((token.landedPosition.x - leftMargin - slotWidth / 2) / slotWidth);
      occupied.add(Math.max(0, Math.min(maxTokens - 1, slot)));
    }

    // Pick the first open slot (left to right)
    let slot = 0;
    for (let i = 0; i < maxTokens; i++) {
      if (!occupied.has(i)) {
        slot = i;
        break;
      }
    }

    return leftMargin + slotWidth * slot + slotWidth / 2;
  }

  getTokenAtPosition(px: number, py: number): UpgradeToken | null {
    const hitR = UPGRADE_TOKEN_CONFIG.HIT_RADIUS;
    for (const token of this.tokens.values()) {
      if (!token.landed || token.beingDragged) continue;
      const dx = px - token.position.x;
      const dy = py - token.position.y;
      if (dx * dx + dy * dy <= hitR * hitR) {
        return token;
      }
    }
    return null;
  }

  startDrag(tokenId: string): void {
    const token = this.tokens.get(tokenId);
    if (token) token.beingDragged = true;
  }

  updateDragPosition(tokenId: string, x: number, y: number): void {
    const token = this.tokens.get(tokenId);
    if (token && token.beingDragged) {
      token.position.x = x;
      token.position.y = y;
    }
  }

  cancelDrag(tokenId: string): void {
    const token = this.tokens.get(tokenId);
    if (token) {
      token.beingDragged = false;
      token.position.x = token.landedPosition.x;
      token.position.y = token.landedPosition.y;
    }
  }

  consumeToken(tokenId: string): void {
    this.tokens.delete(tokenId);
  }

  getTokens(): Map<string, UpgradeToken> {
    return this.tokens;
  }
}
