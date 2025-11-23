import { 
  GameState, 
  LevelData, 
  GridCell, 
  FrogData, 
  FoodData,
  GridPosition,
  FrogType,
  CellType,
} from '../types/game';
import { GAME_CONFIG } from '@data/constants';
import { Renderer } from './systems/Renderer';
import { FrogSystem } from './systems/FrogSystem';
import { FoodSystem } from './systems/FoodSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { WaveSystem } from './systems/WaveSystem';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private currentLevel: LevelData | null = null;
  private grid: GridCell[][] = [];
  private frogs: Map<string, FrogData> = new Map();
  private foods: Map<string, FoodData> = new Map();

  private hoveredCell: GridPosition | null = null; 
  
  // Systems
  private renderer: Renderer;
  private frogSystem: FrogSystem;
  private foodSystem: FoodSystem;
  private collisionSystem: CollisionSystem;
  private waveSystem: WaveSystem;
  
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
      selectedFrogType: null,
      selectedGridCell: null,
      gameSpeed: 1, 
    };
    
    // Initialize systems
    this.renderer = new Renderer(this.ctx);
    this.frogSystem = new FrogSystem();
    this.foodSystem = new FoodSystem();
    this.collisionSystem = new CollisionSystem();
    this.waveSystem = new WaveSystem(this.foodSystem);
    
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

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
    const leftMargin = 60; // ADD THIS (centers 4 cols in 600px canvas)

    for (let row = 0; row < GAME_CONFIG.gridRows; row++) {
      const gridRow: GridCell[] = [];

      for (let col = 0; col < GAME_CONFIG.gridCols; col++) {
        const cellType = level.gridLayout[row][col];
        const position = {
          x: col * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 + leftMargin, // ADD leftMargin
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
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
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
      this.waveSystem.hasSpawnedAllEnemies() &&  // ← CHANGED: Check spawn queue instead of isActive
      this.foods.size === 0 &&
      !this.gameState.isVictory) {
      this.gameState.isVictory = true;
      this.gameState.isPaused = true;
      console.log('VICTORY! All enemies defeated!');
    }

    // Update food positions along paths
    this.foodSystem.updateFoods(this.foods, this.currentLevel.streams, deltaTime);

    // Update frog attacks
    this.frogSystem.updateFrogs(this.frogs, this.foods, this.grid, deltaTime);

    // Check for collisions and damage
    this.collisionSystem.checkCollisions(this.frogs, this.foods);

    // Remove destroyed foods and award money
    this.removeDestroyedFoods();

    // Check for foods that reached the end
    this.checkFoodsReachedEnd();
  }
  
  private render(): void {
    if (!this.currentLevel) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderer.renderBackground(this.ctx);
    this.renderer.renderStreams(this.currentLevel.streams);
    this.renderer.renderGrid(this.grid, this.hoveredCell, this.gameState.money); 
    this.renderer.renderFrogs(Array.from(this.frogs.values()), this.grid);
    this.renderer.renderFoods(Array.from(this.foods.values()));
    this.renderer.renderUI(
      this.gameState,
      this.waveSystem,
      this.currentLevel.waves.length,
      this.foods
    );
  }
  
  private removeDestroyedFoods(): void {
    for (const [id, food] of this.foods) {
      if (food.currentHealth <= 0) {
        this.gameState.money += food.stats.reward;
        this.gameState.score += food.stats.reward;
        this.foods.delete(id);
      }
    }
  }
  
  private checkFoodsReachedEnd(): void {
    for (const [id, food] of this.foods) {
      // Check if food has completed all path segments
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

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

    // Check for speed button click (bottom right)
    const speedButtonX = GAME_CONFIG.canvasWidth - 80;
    const speedButtonY = GAME_CONFIG.canvasHeight - 50;
    const speedButtonWidth = 70;
    const speedButtonHeight = 40;

    if (x >= speedButtonX && x <= speedButtonX + speedButtonWidth &&
      y >= speedButtonY && y <= speedButtonY + speedButtonHeight) {
      this.toggleSpeed();
      return;
    }

    // Check for "Call Next Wave" button click
    const currentTime = performance.now() / 1000;
    if (this.waveSystem.canCallNextWave(currentTime, this.foods)) {
      const buttonX = GAME_CONFIG.canvasWidth - 160;
      const buttonY = 10;
      const buttonWidth = 150;
      const buttonHeight = 35;

      if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
        this.callNextWave();
        return;
      }
    }

    const gridPos = this.pixelToGrid(x, y);


    if (gridPos) {
      const cell = this.grid[gridPos.row][gridPos.col];

      // Check if clicking on a lily pad with lily (make entire cell clickable)
      if (cell.type === CellType.LILYPAD_WITH_LILY &&
        !this.gameState.selectedFrogType) {  // ← Only if not placing a frog
        console.log('Lily removal clicked!');
        this.removeLily(gridPos);
        return;
      }

      // Normal frog placement
      if (this.gameState.selectedFrogType) {
        this.placeFrog(gridPos, this.gameState.selectedFrogType);
      }
    }
  }

  private removeLily(gridPos: GridPosition): boolean {
    const cell = this.grid[gridPos.row][gridPos.col];

    // Check if it's a lily pad with lily
    if (cell.type !== CellType.LILYPAD_WITH_LILY) {
      return false;
    }

    // Check if player has enough money
    if (this.gameState.money < GAME_CONFIG.lilyRemovalCost) {
      console.log('Not enough money to remove lily');
      return false;
    }

    // Remove the lily
    cell.type = CellType.LILYPAD;
    this.gameState.money -= GAME_CONFIG.lilyRemovalCost; 

    console.log(`Lily removed for $${GAME_CONFIG.lilyRemovalCost}`); 
    return true;
  }
  
  private pixelToGrid(x: number, y: number): GridPosition | null {
    const topMargin = 60;
    const leftMargin = 60; // ADD THIS
    const col = Math.floor((x - leftMargin) / GAME_CONFIG.cellSize); // SUBTRACT leftMargin
    const row = Math.floor((y - topMargin) / GAME_CONFIG.cellSize);
    
    if (row >= 0 && row < GAME_CONFIG.gridRows && col >= 0 && col < GAME_CONFIG.gridCols) {
      return { row, col };
    }
    
    return null;
  }
  
  placeFrog(gridPos: GridPosition, frogType: FrogType): boolean {
    const cell = this.grid[gridPos.row][gridPos.col];
    
    // Check if placement is valid
    if (cell.type !== CellType.LILYPAD || cell.frog !== null) {
      return false;
    }
    
    // Check if player has enough money
    const frogData = this.frogSystem.createFrog(frogType, gridPos);
    if (this.gameState.money < frogData.stats.cost) {
      return false;
    }
    
    // Place frog
    this.gameState.money -= frogData.stats.cost;
    cell.frog = frogData;
    this.frogs.set(frogData.id, frogData);
    
    return true;
  }

  callNextWave(): void {
    const currentTime = performance.now() / 1000;
    const bonus = this.waveSystem.callNextWaveEarly(currentTime, this.foods);  // ← ADD this.foods

    if (bonus > 0) {
      this.gameState.money += bonus;
      console.log(`Early wave bonus: $${bonus}`);
    }
  }

  selectFrogType(frogType: FrogType | null): void {
    this.gameState.selectedFrogType = frogType;
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
    console.log(`Game speed: ${this.gameState.gameSpeed}x`);
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

}
