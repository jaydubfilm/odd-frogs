import {
  GameState,
  LevelData,
  GridCell,
  FrogData,
  FoodData,
  GridPosition,
  FrogType,
  CellType,
  FoodCrumb,
} from '../../types/game';
import { UpgradePath } from '../../types/upgrades';
import { GAME_CONFIG, UPGRADE_PATH_COSTS, FROG_STATS, UPGRADE_TOKEN_CONFIG } from '@data/constants';
import { Renderer } from './../systems/Renderer';
import { FrogSystem } from './../systems/FrogSystem';
import { FoodSystem } from './../systems/FoodSystem';
import { CollisionSystem } from './../systems/CollisionSystem';
import { WaveSystem } from './../systems/WaveSystem';
import { AudioManager } from './../systems/AudioManager';
import { FloatingTextSystem } from './../systems/FloatingTextSystem';
import { RippleSystem } from './../systems/RippleSystem';
import { UpgradeSystem } from './../systems/UpgradeSystem';
import { AoeEffectSystem } from './../systems/AoeEffectSystem';
import { SynergyVisualSystem } from './../systems/SynergyVisualSystem';
import { ConsumableSystem } from './../systems/ConsumableSystem';
import { HeartFloatSystem } from './../systems/HeartFloatSystem';
import { UpgradeTokenSystem } from './../systems/UpgradeTokenSystem';


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
  private dropHighlightFrogType: FrogType | null = null;
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
  private aoeEffectSystem: AoeEffectSystem;
  private synergyVisualSystem: SynergyVisualSystem;
  private consumableSystem: ConsumableSystem;
  private heartFloatSystem: HeartFloatSystem;
  private upgradeTokenSystem: UpgradeTokenSystem;
  private whirlpoolHighlight: { x: number; y: number } | null = null;

  // Food crumbs (burst + sink on food death)
  private foodCrumbs: FoodCrumb[] = [];

  // Token drag state
  private draggingToken: string | null = null;
  private draggingTokenPos: { x: number; y: number } = { x: 0, y: 0 };
  private highlightedFrog: { id: string; compatible: boolean } | null = null;
  private suppressClick: boolean = false;

  // Callbacks
  onVictoryContinue: (() => void) | null = null;
  onBackToMap: (() => void) | null = null;
  onFrogPlaced: ((frogCount: number) => void) | null = null;

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
      showConsumables: false,
      hasConsumables: true,
      allLilypadsFilled: false,
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
    this.aoeEffectSystem = new AoeEffectSystem();
    this.synergyVisualSystem = new SynergyVisualSystem();
    this.consumableSystem = new ConsumableSystem();
    this.heartFloatSystem = new HeartFloatSystem();
    this.upgradeTokenSystem = new UpgradeTokenSystem();
    this.upgradeTokenSystem.onTokenPop = () => this.audioManager.playPop(0.4);

    // Setup canvas
    this.canvas.width = GAME_CONFIG.canvasWidth;
    this.canvas.height = GAME_CONFIG.canvasHeight;

    // Bind methods
    this.gameLoop = this.gameLoop.bind(this);
    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    // Setup event listeners
    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
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
    this.gameState.showConsumables = false;
    this.gameState.hasConsumables = true;
    this.gameState.allLilypadsFilled = false;

    // Initialize grid from level layout
    this.initializeGrid(level);

    // Clear existing frogs and foods
    this.frogs.clear();
    this.foods.clear();

    // Reset wave system
    this.waveSystem.reset();

    // Reset token system
    this.upgradeTokenSystem.reset();
    this.draggingToken = null;
    this.highlightedFrog = null;
    this.foodCrumbs = [];

    // Wait for player to call the first wave
    if (level.waves.length > 0) {
      this.waveSystem.prepareForFirstWave();
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

  private getCanvasPos(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  private getCanvasPosWithDragOffset(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    // Y offset: move above finger, stronger near bottom of screen
    const screenHeight = window.innerHeight;
    const normalizedY = Math.max(0, Math.min(1, 1 - event.clientY / screenHeight));
    const BASE_OFFSET = -19;
    const MAX_EXTRA_OFFSET = -181;
    const offsetY = BASE_OFFSET + normalizedY * MAX_EXTRA_OFFSET;

    // X offset: push away from hand side based on handedness
    const normalizedX = this.handedness === 'right'
      ? Math.max(0, (rect.right - event.clientX) / rect.width)
      : Math.max(0, (event.clientX - rect.left) / rect.width);
    const normalizedYx = Math.max(0, (screenHeight - event.clientY) / (screenHeight - rect.top));
    const MAX_X_OFFSET = 200;
    const offsetX = (this.handedness === 'right' ? -1 : 1) * MAX_X_OFFSET * normalizedX * normalizedYx;

    return {
      x: (event.clientX + offsetX - rect.left) * scaleX,
      y: (event.clientY + offsetY - rect.top) * scaleY,
    };
  }

  private handlePointerDown(event: PointerEvent): void {
    if (this.gameState.isPaused || this.gameState.isGameOver || this.gameState.isVictory) return;

    const { x, y } = this.getCanvasPos(event);
    const token = this.upgradeTokenSystem.getTokenAtPosition(x, y);
    if (token) {
      this.draggingToken = token.id;
      this.draggingTokenPos = { x, y };
      this.upgradeTokenSystem.startDrag(token.id);
      this.canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.draggingToken) return;

    const { x, y } = this.getCanvasPosWithDragOffset(event);
    this.draggingTokenPos = { x, y };
    this.upgradeTokenSystem.updateDragPosition(this.draggingToken, x, y);

    // Find frog under cursor
    const gridPos = this.pixelToGrid(x, y);
    this.highlightedFrog = null;

    if (gridPos) {
      const cell = this.grid[gridPos.row]?.[gridPos.col];
      if (cell?.frog) {
        const token = this.upgradeTokenSystem.getTokens().get(this.draggingToken);
        if (token) {
          const compatible = this.upgradeSystem.canApplyToken(cell.frog, token.type);
          this.highlightedFrog = { id: cell.frog.id, compatible };
        }
      }
    }

    event.preventDefault();
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.draggingToken) return;

    const { x, y } = this.getCanvasPosWithDragOffset(event);
    const tokenId = this.draggingToken;
    const token = this.upgradeTokenSystem.getTokens().get(tokenId);
    this.draggingToken = null;
    this.highlightedFrog = null;
    this.suppressClick = true;

    if (!token) return;

    // Check if dropped on a frog
    const gridPos = this.pixelToGrid(x, y);
    if (gridPos) {
      const cell = this.grid[gridPos.row]?.[gridPos.col];
      if (cell?.frog && this.upgradeSystem.canApplyToken(cell.frog, token.type)) {
        this.upgradeSystem.applyTokenUpgrade(cell.frog, token.type);
        this.upgradeTokenSystem.consumeToken(tokenId);
        this.rippleSystem.add(cell.position.x, cell.position.y);
        event.preventDefault();
        return;
      }
    }

    // Not a valid drop -- return token to landed position
    this.upgradeTokenSystem.cancelDrag(tokenId);
    event.preventDefault();
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
    this.frogSystem.updateFrogs(this.frogs, this.foods, this.grid, deltaTime, this.upgradeSystem, this.aoeEffectSystem, this.gameState.gameSpeed);

    // Check for collisions and damage
    this.collisionSystem.checkCollisions(this.frogs, this.foods);

    // Remove destroyed foods and award money
    this.removeDestroyedFoods();

    // Update floating texts
    this.floatingTextSystem.update(deltaTime * 1000);

    // Remove expired food crumbs
    const now = Date.now();
    this.foodCrumbs = this.foodCrumbs.filter(c => now - c.createdAt <= c.duration);

    // Update ripples
    this.rippleSystem.update();

    // Update AoE effects
    this.aoeEffectSystem.update();

    // Update synergy visuals
    this.synergyVisualSystem.update(this.frogs, this.grid);

    // Update consumable effects
    this.consumableSystem.update(deltaTime, this.foods);

    // Update heart float particles
    this.heartFloatSystem.update();

    // Update upgrade tokens
    this.upgradeTokenSystem.update(currentTime);

    // Check for foods that reached the end
    this.checkFoodsReachedEnd();
  }

  private render(): void {
    if (!this.currentLevel) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderer.renderBackground(this.ctx);

    if (!this.gameState.isPaused) {
      this.renderer.renderStreams(this.currentLevel.streams);
      this.renderer.renderSynergyConnections(this.synergyVisualSystem.getConnections());
      const dropStats = this.dropHighlightFrogType ? FROG_STATS[this.dropHighlightFrogType] : undefined;
      this.renderer.renderGrid(this.grid, this.selectedLilyCell, this.gameState.money, this.dropHighlightCell, this.getMenuOpacity(this.lilySelectTime), dropStats?.range, dropStats?.minRange, dropStats?.ignoresRocks, dropStats?.blockedByFrogs);
      this.renderer.renderFrogs(Array.from(this.frogs.values()), this.grid, this.gameState.money);
      this.renderer.renderFoods(Array.from(this.foods.values()));
      this.renderer.renderAoeEffects(this.aoeEffectSystem.getEffects());
      this.renderer.renderWhirlpools(this.consumableSystem.getWhirlpools());
      this.renderer.renderWhirlpoolHighlight(this.whirlpoolHighlight);
      this.renderer.renderRainEffect(this.consumableSystem.getRainEffect());
      this.renderer.renderRipples(this.rippleSystem.getRipples());
      this.renderer.renderFloatingTexts(this.floatingTextSystem.getTexts());
      this.renderer.renderHeartFloats(this.heartFloatSystem.getHearts());
      this.renderer.renderUpgradeTokens(this.upgradeTokenSystem.getTokens(), this.draggingToken);

      // Highlight valid frogs when dragging a token
      if (this.draggingToken) {
        const token = this.upgradeTokenSystem.getTokens().get(this.draggingToken);
        if (token) {
          const validFrogs = Array.from(this.frogs.values()).filter(
            f => this.upgradeSystem.canApplyToken(f, token.type)
          );
          this.renderer.renderValidTokenTargets(validFrogs, this.grid, this.highlightedFrog?.id ?? null);
        }
      }

      // Highlight frog directly under cursor
      if (this.highlightedFrog) {
        const hFrog = this.frogs.get(this.highlightedFrog.id);
        if (hFrog) {
          this.renderer.renderTokenDragHighlight(hFrog, this.grid, this.highlightedFrog.compatible);
        }
      }

      this.renderer.renderFoodCrumbs(this.foodCrumbs);
      this.renderer.renderFrogUpgradeUI(this.gameState.selectedFrog, this.frogs, this.grid, this.gameState.money, this.getMenuOpacity(this.frogSelectTime), this.upgradeSystem);
    }

    this.renderer.renderUI(
      this.gameState,
      this.waveSystem,
      this.currentLevel.waves.length,
      this.foods,
      this.handedness
    );

    // Consumable toggle button (4th slot in button column)
    if (!this.gameState.isGameOver && !this.gameState.isVictory && !this.gameState.isPaused && this.gameState.hasConsumables) {
      const btnSize = 60;
      const gap = 15;
      const isLeft = this.handedness === 'left';
      const baseX = isLeft ? 5 : GAME_CONFIG.canvasWidth - btnSize - 5;
      const toggleY = GAME_CONFIG.canvasHeight - btnSize - 10;
      this.renderer.renderConsumableToggle(baseX, toggleY, btnSize, this.gameState.showConsumables, this.consumableReady);
    }
  }

  private static readonly FOOD_COLORS: Record<string, string[]> = {
    APPLE: ['#E53935', '#B71C1C', '#43A047'],
    BEANS: ['#8D6E63', '#5D4037', '#6D4C41'],
    CAKE: ['#FFECB3', '#F8BBD0', '#D4E157'],
    BURGER: ['#D4A056', '#5D4037', '#66BB6A'],
    PIZZA: ['#FFA726', '#E53935', '#F9A825'],
    DONUT: ['#F48FB1', '#CE93D8', '#FFCC80'],
    CHERRY: ['#C62828', '#D32F2F', '#388E3C'],
  };

  private removeDestroyedFoods(): void {
    const currentTime = performance.now() / 1000;
    const now = Date.now();
    for (const [id, food] of this.foods) {
      if (food.currentHealth <= 0) {
        this.gameState.money += food.stats.reward;
        this.gameState.score += food.stats.reward;
        this.upgradeTokenSystem.onFoodKilled(food.stats.reward, currentTime, this.currentLevel!.streams);

        // Spawn crumbs that burst outward and sink
        const colors = GameEngine.FOOD_COLORS[food.type] || ['#888', '#666', '#AAA'];
        const count = UPGRADE_TOKEN_CONFIG.CRUMB_COUNT;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
          const speed = 30 + Math.random() * 50;
          this.foodCrumbs.push({
            x: food.position.x,
            y: food.position.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed * 0.6 - 20,
            size: 2 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            createdAt: now,
            duration: UPGRADE_TOKEN_CONFIG.CRUMB_DURATION,
          });
        }

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
    // Suppress click after a token drag completes
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check for continue button click on victory
    if (this.gameState.isVictory) {
      const buttonX = GAME_CONFIG.canvasWidth / 2 - 75;
      const buttonY = GAME_CONFIG.canvasHeight / 2 + 80;
      const buttonWidth = 150;
      const buttonHeight = 40;

      if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
        if (this.onVictoryContinue) this.onVictoryContinue();
        return;
      }
    }

    // Check for restart button click if game is over
    if (this.gameState.isGameOver) {
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

    // Pause menu button clicks
    if (this.gameState.isPaused && !this.gameState.isGameOver && !this.gameState.isVictory) {
      const buttonWidth = 200;
      const buttonHeight = 50;
      const buttonGap = 15;
      const buttonX = GAME_CONFIG.canvasWidth / 2 - buttonWidth / 2;
      const startY = GAME_CONFIG.canvasHeight / 2 - 20;

      // Resume
      if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= startY && y <= startY + buttonHeight) {
        this.resume();
        return;
      }
      // Restart
      const restartY = startY + buttonHeight + buttonGap;
      if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= restartY && y <= restartY + buttonHeight) {
        this.restart();
        return;
      }
      // Back to Map
      const mapY = restartY + buttonHeight + buttonGap;
      if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= mapY && y <= mapY + buttonHeight) {
        if (this.onBackToMap) this.onBackToMap();
        return;
      }
      return;
    }

    // Stacked button layout (60px, 5px gap)
    const uiButtonSize = 60;
    const gap = 15;
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

    // Check for consumable toggle button (bottom of button column)
    if (this.gameState.hasConsumables) {
      const toggleY = GAME_CONFIG.canvasHeight - uiButtonSize - 10;
      if (x >= baseX && x <= baseX + uiButtonSize &&
        y >= toggleY && y <= toggleY + uiButtonSize) {
        this.gameState.showConsumables = !this.gameState.showConsumables;
        return;
      }
    }

    // Place active consumable on canvas click
    if (this.activeConsumable && this.onConsumablePlaced) {
      if (this.activeConsumable === 'WHIRLPOOL') {
        this.consumableSystem.addWhirlpool(x, y);
      }
      this.onConsumablePlaced(this.activeConsumable, x, y);
      this.activeConsumable = null;
      return;
    }

    // Check for sell button click if frog is selected
    if (this.gameState.selectedFrog && !this.gameState.selectedFrogType) {
      const frog = this.frogs.get(this.gameState.selectedFrog);
      if (frog) {
        const cell = this.grid[frog.gridPosition.row][frog.gridPosition.col];
        const frogPos = cell.position;
        const btnSize = 60;
        const sellBtnX = frogPos.x - btnSize / 2;
        const sellBtnY = frogPos.y + 45;

        if (x >= sellBtnX && x <= sellBtnX + btnSize &&
          y >= sellBtnY && y <= sellBtnY + btnSize) {
          this.sellFrog(frog.id);
          this.deselectFrog();
          return;
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

      // Clicking on a frog deselects purchase and opens its context menu
      if (cell.frog) {
        this.gameState.selectedFrogType = null;
        this.selectFrog(cell.frog.id);
        return;
      }

      // Normal frog placement
      if (this.gameState.selectedFrogType) {
        const success = this.placeFrog(gridPos, this.gameState.selectedFrogType);
        if (success) {
          this.gameState.selectedFrogType = null;
        }
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
    cell.frog = frogData;
    this.frogs.set(frogData.id, frogData);

    this.rippleSystem.add(cell.position.x, cell.position.y);

    // Auto-start the first wave when the first frog is placed
    if (this.waveSystem.isWaitingForFirstWave()) {
      this.callNextWave();
    }

    if (this.onFrogPlaced) this.onFrogPlaced(this.frogs.size);

    return true;
  }

  purchaseUpgradeChoice(frogId: string, choice: string): boolean {
    const frog = this.frogs.get(frogId);
    if (!frog) return false;

    if (!this.upgradeSystem.canPurchaseUpgrade(frog, choice, this.gameState.money)) return false;

    const cost = this.upgradeSystem.purchaseUpgrade(frog, choice);
    this.gameState.money -= cost;
    this.deselectFrog();

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

      // Cookie crumbs burst from the button position
      const btnSize = 60;
      const gap = 15;
      const isLeft = this.handedness === 'left';
      const baseX = isLeft ? 5 : GAME_CONFIG.canvasWidth - btnSize - 5;
      const btnCx = baseX + btnSize / 2;
      const btnCy = 5 + (btnSize + gap) * 2 + btnSize / 2;

      const colors = ['#D4A056', '#A0752E', '#5D3A1A'];
      const count = 8;
      const now = Date.now();
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 30 + Math.random() * 50;
        this.foodCrumbs.push({
          x: btnCx,
          y: btnCy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.6 - 20,
          size: 2 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          createdAt: now,
          duration: UPGRADE_TOKEN_CONFIG.CRUMB_DURATION,
        });
      }
    }
  }

  selectFrogType(frogType: FrogType | null): void {
    this.gameState.selectedFrogType = frogType;
    if (frogType) {
      this.deselectFrog();
    }
  }

  setHandedness(handedness: 'left' | 'right'): void {
    this.handedness = handedness;
  }

  setHasConsumables(has: boolean): void {
    this.gameState.hasConsumables = has;
    if (!has) this.gameState.showConsumables = false;
  }

  private consumableReady = false;
  private activeConsumable: string | null = null;
  onConsumablePlaced: ((type: string, canvasX: number, canvasY: number) => void) | null = null;

  setConsumableReady(ready: boolean): void {
    this.consumableReady = ready;
  }

  setActiveConsumable(type: string | null): void {
    this.activeConsumable = type;
  }

  private static readonly MENU_VISIBLE_MS = 3500;
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

  setDropHighlight(gridPos: GridPosition | null, frogType?: FrogType | null): void {
    this.dropHighlightCell = gridPos;
    this.dropHighlightFrogType = frogType ?? null;
  }

  getGridCell(row: number, col: number): GridCell | null {
    return this.grid[row]?.[col] ?? null;
  }

  getGameState(): GameState {
    const allFilled = this.grid.length > 0 && this.grid.every(row =>
      row.every(cell => cell.type !== CellType.LILYPAD || cell.frog !== null)
    );
    return { ...this.gameState, allLilypadsFilled: allFilled };
  }

  getWaveSystem(): WaveSystem {
    return this.waveSystem;
  }

  destroy(): void {
    this.stop();
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
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

  getFoods(): Map<string, FoodData> {
    return this.foods;
  }

  updateMoney(amount: number): void {
    this.gameState.money = amount;
  }

  applyRain(): void {
    this.consumableSystem.applyRain(this.foods);
  }

  applyHeal(): void {
    this.consumableSystem.applyHeal(this.gameState);
    this.triggerHealEffect();
  }

  triggerHealEffect(): void {
    // Hearts fly from bottom-center toward top-left (where lives display is)
    const startX = GAME_CONFIG.canvasWidth / 2;
    const startY = GAME_CONFIG.canvasHeight - 30;
    const targetX = 50;
    const targetY = 30;
    this.heartFloatSystem.add(startX, startY, targetX, targetY);
  }

  placeWhirlpool(px: number, py: number): void {
    this.consumableSystem.addWhirlpool(px, py);
  }

  setWhirlpoolHighlight(pos: { x: number; y: number } | null): void {
    this.whirlpoolHighlight = pos;
  }

}
