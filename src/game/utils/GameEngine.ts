import {
  GameState,
  LevelData,
  GridCell,
  FrogData,
  FoodData,
  GridPosition,
  FrogType,
  CellType,
} from '../../types/game';
import { UpgradePath } from '../../types/upgrades';
import { GAME_CONFIG, UPGRADE_PATH_COSTS } from '@data/constants';
import { Renderer } from './../systems/Renderer';
import { FrogSystem } from './../systems/FrogSystem';
import { FoodSystem } from './../systems/FoodSystem';
import { CollisionSystem } from './../systems/CollisionSystem';
import { WaveSystem } from './../systems/WaveSystem';
import { AudioManager } from './../systems/AudioManager';
import { FloatingTextSystem } from './../systems/FloatingTextSystem';
import { RippleSystem } from './../systems/RippleSystem';
import { UpgradeSystem } from './../systems/UpgradeSystem';


export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private currentLevel: LevelData | null = null;
  private grid: GridCell[][] = [];
  private frogs: Map<string, FrogData> = new Map();
  private foods: Map<string, FoodData> = new Map();

  private handedness: 'left' | 'right' = 'right';
  private hoveredCell: GridPosition | null = null;
  private selectedLilyCell: GridPosition | null = null;
  private lilySelectTimer: ReturnType<typeof setTimeout> | null = null;
  private lilySelectTime: number = 0;
  private dropHighlightCell: GridPosition | null = null;
  private frogSelectTimer: ReturnType<typeof setTimeout> | null = null;
  private frogSelectTime: number = 0;

  // Systems
  private renderer: Renderer;
  private audioManager: AudioManager;
  private frogSystem: FrogSystem;
  private foodSystem: FoodSystem;
  private floatingTextSystem: FloatingTextSystem;
  private rippleSystem: RippleSystem;
  private collisionSystem: CollisionSystem;
  private waveSystem: WaveSystem;
  private upgradeSystem: UpgradeSystem;

  // Game loop
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = context;

    // Initialize game state
    this.gameState = {
      lives: GAME_CONFIG.startingLives,
      money: 0,
      wave: 0,
      score: 0,
      isPaused: false,
      isGameOver: false,
      isVictory: false,
      currentLevel: 1,
      selectedFrogType: null,
      selectedGridCell: null,
      selectedFrog: null,
      gameSpeed: 1,
    };

    // Initialize systems
    this.renderer = new Renderer(this.ctx);
    this.audioManager = new AudioManager();
    this.audioManager.loadSound('slurp', '/sounds/shortlick.m4a');
    this.frogSystem = new FrogSystem(this.audioManager);
    this.floatingTextSystem = new FloatingTextSystem();
    this.rippleSystem = new RippleSystem();
    this.foodSystem = new FoodSystem();
    this.collisionSystem = new CollisionSystem();
    this.waveSystem = new WaveSystem(this.foodSystem);
    this.upgradeSystem = new UpgradeSystem();

    // Setup canvas
    this.canvas.width = GAME_CONFIG.canvasWidth;
    this.canvas.height = GAME_CONFIG.canvasHeight;

    // Bind methods
    this.gameLoop = this.gameLoop.bind(this);
    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);

    // Setup event listeners
    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
  }

  loadLevel(level: LevelData): void {
    this.currentLevel = level;
    this.gameState.money = level.startingMoney;
    this.gameState.wave = 0;
    this.gameState.lives = GAME_CONFIG.startingLives;
    this.gameState.score = 0;
    this.gameState.isGameOver = false;
    this.gameState.isVictory = false;
    this.gameState.isPaused = false;
    this.gameState.gameSpeed = 1;
    this.gameState.currentLevel = 1;

    // Initialize grid from level layout
    this.initializeGrid(level);

    // Clear existing frogs and foods
    this.frogs.clear();
    this.foods.clear();

    // Reset wave system
    this.waveSystem.reset();

    // Start the first wave immediately
    if (level.waves.length > 0) {
      const currentTime = performance.now() / 1000;
      this.gameState.wave = 1;
      this.waveSystem.startWave(level.waves[0], currentTime);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const gridPos = this.pixelToGrid(x, y);

    // Update hovered cell
    this.hoveredCell = gridPos;

    // Change cursor if hovering over lily with lily
    if (gridPos && !this.gameState.isGameOver && !this.gameState.isVictory) {
      const cell = this.grid[gridPos.row]?.[gridPos.col];
      if (cell?.type === CellType.LILYPAD_WITH_LILY) {
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'default';
      }
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private initializeGrid(level: LevelData): void {
    this.grid = [];
    const topMargin = 60;
    const leftMargin = 60;

    for (let row = 0; row < GAME_CONFIG.gridRows; row++) {
      const gridRow: GridCell[] = [];

      for (let col = 0; col < GAME_CONFIG.gridCols; col++) {
        const cellType = level.gridLayout[row][col];
        const position = {
          x: col * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 + leftMargin,
          y: row * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 + topMargin,
        };

        gridRow.push({
          type: cellType,
          gridPosition: { row, col },
          position,
          frog: null,
        });
      }

      this.grid.push(gridRow);
    }
  }

  start(): void {
    if (this.animationFrameId === null) {
      this.lastFrameTime = performance.now();

      this.render();

      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
  }

  restart(): void {
    console.log('Restart method called');
    if (this.currentLevel) {
      console.log('Reloading level:', this.currentLevel.id);
      this.loadLevel(this.currentLevel);
      this.start();
    } else {
      console.log('No current level to restart!');
    }
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  pause(): void {
    this.gameState.isPaused = true;
  }

  resume(): void {
    this.gameState.isPaused = false;
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    if (!this.gameState.isPaused && !this.gameState.isGameOver) {
      this.update(deltaTime * this.gameState.gameSpeed);
    }

    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  private update(deltaTime: number): void {
    if (!this.currentLevel) return;

    const currentTime = performance.now() / 1000;

    // Update wave system
    this.waveSystem.update(currentTime, this.foods, this.currentLevel.streams);

    // Check if current wave is complete and start next wave
    if (this.waveSystem.isWaveComplete(currentTime)) {
      if (this.gameState.wave < this.currentLevel.waves.length) {
        // Start next wave
        const nextWave = this.currentLevel.waves[this.gameState.wave];
        if (nextWave) {
          this.gameState.wave++;
          this.waveSystem.startWave(nextWave, currentTime);
        }
      }
    }

    // Check for victory: final wave + all enemies spawned + all enemies dead
    if (this.gameState.wave >= this.currentLevel.waves.length &&
      this.waveSystem.hasSpawnedAllEnemies() &&
      this.foods.size === 0 &&
      !this.gameState.isVictory) {
      this.gameState.isVictory = true;
      this.gameState.isPaused = true;
      console.log('VICTORY! All enemies defeated!');
    }

    // Update food positions along paths
    this.foodSystem.updateFoods(this.foods, this.currentLevel.streams, deltaTime);

    // Update frog attacks (with upgrade system for effective stats)
    this.frogSystem.updateFrogs(this.frogs, this.foods, this.grid, deltaTime, this.upgradeSystem);

    // Check for collisions and damage
    this.collisionSystem.checkCollisions(this.frogs, this.foods);

    // Remove destroyed foods and award money
    this.removeDestroyedFoods();

    // Update floating texts
    this.floatingTextSystem.update(deltaTime * 1000);

    // Update ripples
    this.rippleSystem.update();

    // Check for foods that reached the end
    this.checkFoodsReachedEnd();
  }

  private render(): void {
    if (!this.currentLevel) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderer.renderBackground(this.ctx);

    if (!this.gameState.isPaused) {
      this.renderer.renderStreams(this.currentLevel.streams);
      this.renderer.renderGrid(this.grid, this.selectedLilyCell, this.gameState.money, this.dropHighlightCell, this.getMenuOpacity(this.lilySelectTime));
      this.renderer.renderFrogs(Array.from(this.frogs.values()), this.grid);
      this.renderer.renderFrogUpgradeUI(this.gameState.selectedFrog, this.frogs, this.grid, this.gameState.money, this.getMenuOpacity(this.frogSelectTime), this.upgradeSystem);
      this.renderer.renderFoods(Array.from(this.foods.values()));
      this.renderer.renderRipples(this.rippleSystem.getRipples());
      this.renderer.renderFloatingTexts(this.floatingTextSystem.getTexts());
    }

    this.renderer.renderUI(
      this.gameState,
      this.waveSystem,
      this.currentLevel.waves.length,
      this.foods,
      this.handedness
    );
  }

  private removeDestroyedFoods(): void {
    for (const [id, food] of this.foods) {
      if (food.currentHealth <= 0) {
        this.floatingTextSystem.add(food.position.x, food.position.y, food.stats.reward);
        this.gameState.money += food.stats.reward;
        this.gameState.score += food.stats.reward;
        this.foods.delete(id);
      }
    }
  }

  private checkFoodsReachedEnd(): void {
    for (const [id, food] of this.foods) {
      if (this.foodSystem.hasReachedEnd(food)) {
        this.gameState.lives--;
        this.foods.delete(id);

        if (this.gameState.lives <= 0) {
          this.gameState.isGameOver = true;
        }
      }
    }
  }

  private handleCanvasClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check for restart button click if game is over OR victory
    if (this.gameState.isGameOver || this.gameState.isVictory) {
      const buttonX = GAME_CONFIG.canvasWidth / 2 - 75;
      const buttonY = GAME_CONFIG.canvasHeight / 2 + 80;
      const buttonWidth = 150;
      const buttonHeight = 40;

      if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
        this.restart();
        return;
      }
    }

    // Check for resume button click if paused
    if (this.gameState.isPaused && !this.gameState.isGameOver && !this.gameState.isVictory) {
      const buttonX = GAME_CONFIG.canvasWidth / 2 - 75;
      const buttonY = GAME_CONFIG.canvasHeight / 2 + 20;
      const buttonWidth = 150;
      const buttonHeight = 50;

      if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
        this.resume();
        return;
      }
      return;
    }

    // Stacked button layout (60px, 5px gap)
    const uiButtonSize = 60;
    const gap = 5;
    const isLeft = this.handedness === 'left';
    const baseX = isLeft ? 5 : GAME_CONFIG.canvasWidth - uiButtonSize - 5;

    // Check for pause button click (top of stack)
    if (x >= baseX && x <= baseX + uiButtonSize &&
      y >= 5 && y <= 5 + uiButtonSize) {
      this.togglePause();
      return;
    }

    // Check for speed button click (second in stack)
    const speedButtonY = 5 + uiButtonSize + gap;
    if (x >= baseX && x <= baseX + uiButtonSize &&
      y >= speedButtonY && y <= speedButtonY + uiButtonSize) {
      this.toggleSpeed();
      return;
    }

    // Check for "Call Next Wave" button click (third in stack)
    const currentTime = performance.now() / 1000;
    if (this.waveSystem.canCallNextWave(currentTime, this.foods)) {
      const callButtonY = 5 + (uiButtonSize + gap) * 2;
      if (x >= baseX && x <= baseX + uiButtonSize &&
        y >= callButtonY && y <= callButtonY + uiButtonSize) {
        this.callNextWave();
        return;
      }
    }

    // Check for upgrade/sell button clicks if frog is selected
    if (this.gameState.selectedFrog && !this.gameState.selectedFrogType) {
      const frog = this.frogs.get(this.gameState.selectedFrog);
      if (frog) {
        const cell = this.grid[frog.gridPosition.row][frog.gridPosition.col];
        const frogPos = cell.position;
        const btnSize = 60;
        const btnGap = 16;
        const level = frog.upgradeState.level;
        const availablePaths = this.upgradeSystem.getAvailablePaths(frog);

        if (level === 0) {
          // Level 0: show 3 path buttons (V-Stripes, Spots, H-Stripes) + sell
          // Layout: 3 path buttons in a row above frog, sell button below them
          const totalWidth = btnSize * 3 + btnGap * 2;
          const startX = frogPos.x - totalWidth / 2;
          const pathButtonY = frogPos.y - 50 - btnSize * 2 - btnGap;
          const sellButtonY = frogPos.y - 50 - btnSize;

          // Check path buttons (V-Stripes, Spots, H-Stripes)
          const pathOrder = [UpgradePath.VERTICAL_STRIPES, UpgradePath.SPOTS, UpgradePath.HORIZONTAL_STRIPES];
          for (let i = 0; i < 3; i++) {
            const btnX = startX + i * (btnSize + btnGap);
            if (x >= btnX && x <= btnX + btnSize &&
              y >= pathButtonY && y <= pathButtonY + btnSize) {
              this.purchasePathUpgrade(frog.id, pathOrder[i]);
              return;
            }
          }

          // Check sell button (centered below path buttons)
          const sellBtnX = frogPos.x - btnSize / 2;
          if (x >= sellBtnX && x <= sellBtnX + btnSize &&
            y >= sellButtonY && y <= sellButtonY + btnSize) {
            this.sellFrog(frog.id);
            this.deselectFrog();
            return;
          }
        } else if (level < 3 && availablePaths.length > 0) {
          // Level 1-2: show 1 upgrade button (locked path) + sell
          const buttonY = frogPos.y - 50 - btnSize;
          const upgradeButtonX = frogPos.x - btnSize - btnGap / 2;

          if (x >= upgradeButtonX && x <= upgradeButtonX + btnSize &&
            y >= buttonY && y <= buttonY + btnSize) {
            this.purchasePathUpgrade(frog.id, availablePaths[0]);
            return;
          }

          // Sell button (right)
          const sellButtonX = frogPos.x + btnGap / 2;
          if (x >= sellButtonX && x <= sellButtonX + btnSize &&
            y >= buttonY && y <= buttonY + btnSize) {
            this.sellFrog(frog.id);
            this.deselectFrog();
            return;
          }
        } else {
          // Level 3: sell only (centered)
          const buttonY = frogPos.y - 50 - btnSize;
          const sellButtonX = frogPos.x - btnSize / 2;
          if (x >= sellButtonX && x <= sellButtonX + btnSize &&
            y >= buttonY && y <= buttonY + btnSize) {
            this.sellFrog(frog.id);
            this.deselectFrog();
            return;
          }
        }
      }
    }

    const gridPos = this.pixelToGrid(x, y);

    // Check if clicking the lily removal confirm button
    if (this.selectedLilyCell) {
      const lilyCell = this.grid[this.selectedLilyCell.row]?.[this.selectedLilyCell.col];
      if (lilyCell) {
        const pos = lilyCell.position;
        const btnSize = 60;
        const buttonX = pos.x - btnSize / 2;
        const buttonY = pos.y - 90;
        if (x >= buttonX && x <= buttonX + btnSize &&
          y >= buttonY && y <= buttonY + btnSize) {
          this.removeLily(this.selectedLilyCell);
          this.deselectLily();
          return;
        }
      }
      // Clicked elsewhere - deselect lily
      this.deselectLily();
    }

    if (gridPos) {
      const cell = this.grid[gridPos.row][gridPos.col];

      // First tap on lily: select it to show remove button
      if (cell.type === CellType.LILYPAD_WITH_LILY &&
        !this.gameState.selectedFrogType) {
        this.selectLily(gridPos);
        return;
      }

      // Normal frog placement (check first)
      if (this.gameState.selectedFrogType) {
        const success = this.placeFrog(gridPos, this.gameState.selectedFrogType);
        if (success) {
          this.gameState.selectedFrogType = null;
        }
        return;
      }

      // Check if clicking on a frog to select it
      if (cell.frog) {
        this.selectFrog(cell.frog.id);
        return;
      }

      // Deselect frog if clicking elsewhere
      this.deselectFrog();
    }
  }

  private removeLily(gridPos: GridPosition): boolean {
    const cell = this.grid[gridPos.row][gridPos.col];

    if (cell.type !== CellType.LILYPAD_WITH_LILY) {
      return false;
    }

    if (this.gameState.money < GAME_CONFIG.lilyRemovalCost) {
      return false;
    }

    cell.type = CellType.LILYPAD;
    this.gameState.money -= GAME_CONFIG.lilyRemovalCost;
    return true;
  }

  private pixelToGrid(x: number, y: number): GridPosition | null {
    const topMargin = 60;
    const leftMargin = 60;
    const col = Math.floor((x - leftMargin) / GAME_CONFIG.cellSize);
    const row = Math.floor((y - topMargin) / GAME_CONFIG.cellSize);

    if (row >= 0 && row < GAME_CONFIG.gridRows && col >= 0 && col < GAME_CONFIG.gridCols) {
      return { row, col };
    }

    return null;
  }

  placeFrog(gridPos: GridPosition, frogType: FrogType): boolean {
    const cell = this.grid[gridPos.row][gridPos.col];

    if (cell.type !== CellType.LILYPAD || cell.frog !== null) {
      return false;
    }

    const frogData = this.frogSystem.createFrog(frogType, gridPos);
    if (this.gameState.money < frogData.stats.cost) {
      return false;
    }

    this.gameState.money -= frogData.stats.cost;
    cell.frog = frogData;
    this.frogs.set(frogData.id, frogData);

    this.rippleSystem.add(cell.position.x, cell.position.y);

    return true;
  }

  purchasePathUpgrade(frogId: string, path: UpgradePath): boolean {
    const frog = this.frogs.get(frogId);
    if (!frog) return false;

    if (!this.upgradeSystem.canPurchaseUpgrade(frog, path, this.gameState.money)) return false;

    const cost = this.upgradeSystem.purchaseUpgrade(frog, path);
    this.gameState.money -= cost;

    return true;
  }

  sellFrog(frogId: string): number {
    const frog = this.frogs.get(frogId);
    if (!frog) return 0;

    // Calculate sell value: half of (original cost + upgrades)
    const sellValue = Math.floor((frog.stats.cost + frog.totalSpent) / 2);

    // Remove frog from grid
    const cell = this.grid[frog.gridPosition.row][frog.gridPosition.col];
    cell.frog = null;

    // Remove from frogs map
    this.frogs.delete(frogId);

    // Add money
    this.gameState.money += sellValue;

    return sellValue;
  }

  callNextWave(): void {
    const currentTime = performance.now() / 1000;
    const bonus = this.waveSystem.callNextWaveEarly(currentTime, this.foods);

    if (bonus > 0) {
      this.gameState.money += bonus;
    }
  }

  selectFrogType(frogType: FrogType | null): void {
    this.gameState.selectedFrogType = frogType;
    this.deselectFrog();
  }

  setHandedness(handedness: 'left' | 'right'): void {
    this.handedness = handedness;
  }

  private static readonly MENU_VISIBLE_MS = 3000;
  private static readonly MENU_FADE_MS = 1000;

  private selectFrog(frogId: string): void {
    this.gameState.selectedFrog = frogId;
    this.frogSelectTime = Date.now();
    if (this.frogSelectTimer) clearTimeout(this.frogSelectTimer);
    this.frogSelectTimer = setTimeout(() => {
      this.deselectFrog();
    }, GameEngine.MENU_VISIBLE_MS + GameEngine.MENU_FADE_MS);
  }

  private deselectFrog(): void {
    this.gameState.selectedFrog = null;
    this.frogSelectTime = 0;
    if (this.frogSelectTimer) {
      clearTimeout(this.frogSelectTimer);
      this.frogSelectTimer = null;
    }
  }

  private selectLily(pos: GridPosition): void {
    this.selectedLilyCell = pos;
    this.lilySelectTime = Date.now();
    if (this.lilySelectTimer) clearTimeout(this.lilySelectTimer);
    this.lilySelectTimer = setTimeout(() => {
      this.deselectLily();
    }, GameEngine.MENU_VISIBLE_MS + GameEngine.MENU_FADE_MS);
  }

  private deselectLily(): void {
    this.selectedLilyCell = null;
    this.lilySelectTime = 0;
    if (this.lilySelectTimer) {
      clearTimeout(this.lilySelectTimer);
      this.lilySelectTimer = null;
    }
  }

  private getMenuOpacity(selectTime: number): number {
    if (selectTime === 0) return 1;
    const elapsed = Date.now() - selectTime;
    if (elapsed < GameEngine.MENU_VISIBLE_MS) return 1;
    const fadeElapsed = elapsed - GameEngine.MENU_VISIBLE_MS;
    return Math.max(0, 1 - fadeElapsed / GameEngine.MENU_FADE_MS);
  }

  setDropHighlight(gridPos: GridPosition | null): void {
    this.dropHighlightCell = gridPos;
  }

  getGridCell(row: number, col: number): GridCell | null {
    return this.grid[row]?.[col] ?? null;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getWaveSystem(): WaveSystem {
    return this.waveSystem;
  }

  destroy(): void {
    this.stop();
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
  }

  toggleSpeed(): void {
    this.gameState.gameSpeed = this.gameState.gameSpeed === 1 ? 2 : 1;
  }

  togglePause(): void {
    this.gameState.isPaused = !this.gameState.isPaused;
  }

  getHoveredCell(): GridPosition | null {
    return this.hoveredCell;
  }

  getWaveInfo(): { current: number; total: number; timeUntilNext: number } {
    if (!this.currentLevel) {
      return { current: 0, total: 0, timeUntilNext: 0 };
    }

    const currentTime = performance.now() / 1000;
    return {
      current: this.gameState.wave,
      total: this.currentLevel.waves.length,
      timeUntilNext: this.waveSystem.getTimeUntilNextWave(currentTime)
    };
  }

  getFrogs(): Map<string, FrogData> {
    return this.frogs;
  }

  updateMoney(amount: number): void {
    this.gameState.money = amount;
  }

}
