import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { GameEngine } from '../../game/utils/GameEngine';
import { LevelData, GameState, FrogType } from '../../types/game';
import { GAME_CONFIG } from '../../data/constants';

interface GameCanvasProps {
  level: LevelData;
  selectedFrogType: FrogType | null;
  onGameStateChange?: (state: GameState) => void;
  onWaveInfoChange?: (waveInfo: { current: number; total: number; timeUntilNext: number }) => void;
  onLevelComplete?: () => void;
  onBackToMap?: () => void;
  handedness?: 'left' | 'right';
  hasConsumables?: boolean;
  consumableReady?: boolean;
  activeConsumable?: string | null;
  onConsumablePlaced?: (type: string, canvasX: number, canvasY: number) => void;
  onFrogPlaced?: (frogCount: number) => void;
}

export interface GameCanvasHandle {
  placeFrogAtScreenPos: (screenX: number, screenY: number, frogType: FrogType) => boolean;
  updateDragHighlight: (screenX: number, screenY: number, frogType?: FrogType) => void;
  clearDragHighlight: () => void;
  getCanvasRect: () => DOMRect | null;
  applyRain: () => void;
  applyHeal: () => void;
  triggerHealEffect: () => void;
  placeWhirlpoolAtScreenPos: (screenX: number, screenY: number) => void;
  updateWhirlpoolHighlight: (screenX: number, screenY: number) => void;
  clearWhirlpoolHighlight: () => void;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({
  level,
  selectedFrogType,
  onGameStateChange,
  onWaveInfoChange,
  onLevelComplete,
  onBackToMap,
  handedness = 'right',
  hasConsumables = true,
  consumableReady = false,
  activeConsumable = null,
  onConsumablePlaced,
  onFrogPlaced,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const initializationRef = useRef(false);

  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);

  const screenToGrid = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (screenX - rect.left) * scaleX;
    const cy = (screenY - rect.top) * scaleY;
    const topMargin = 60;
    const leftMargin = 60;
    const col = Math.floor((cx - leftMargin) / GAME_CONFIG.cellSize);
    const row = Math.floor((cy - topMargin) / GAME_CONFIG.cellSize);
    if (row < 0 || row >= GAME_CONFIG.gridRows || col < 0 || col >= GAME_CONFIG.gridCols) return null;
    return { row, col };
  };

  const screenToCanvasPixel = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (screenX - rect.left) * scaleX,
      y: (screenY - rect.top) * scaleY,
    };
  };

  useImperativeHandle(ref, () => ({
    placeFrogAtScreenPos(screenX: number, screenY: number, frogType: FrogType): boolean {
      const engine = gameEngineRef.current;
      if (!engine) return false;
      const gridPos = screenToGrid(screenX, screenY);
      if (!gridPos) return false;
      engine.setDropHighlight(null);
      return engine.placeFrog(gridPos, frogType);
    },
    updateDragHighlight(screenX: number, screenY: number, frogType?: FrogType): void {
      const engine = gameEngineRef.current;
      if (!engine) return;
      const gridPos = screenToGrid(screenX, screenY);
      engine.setDropHighlight(gridPos, frogType ?? null);
    },
    clearDragHighlight(): void {
      const engine = gameEngineRef.current;
      if (!engine) return;
      engine.setDropHighlight(null);
    },
    getCanvasRect(): DOMRect | null {
      return canvasRef.current?.getBoundingClientRect() ?? null;
    },
    applyRain(): void {
      gameEngineRef.current?.applyRain();
    },
    applyHeal(): void {
      gameEngineRef.current?.applyHeal();
    },
    triggerHealEffect(): void {
      gameEngineRef.current?.triggerHealEffect();
    },
    placeWhirlpoolAtScreenPos(screenX: number, screenY: number): void {
      const engine = gameEngineRef.current;
      if (!engine) return;
      const pos = screenToCanvasPixel(screenX, screenY);
      if (pos) engine.placeWhirlpool(pos.x, pos.y);
    },
    updateWhirlpoolHighlight(screenX: number, screenY: number): void {
      const engine = gameEngineRef.current;
      if (!engine) return;
      const pos = screenToCanvasPixel(screenX, screenY);
      engine.setWhirlpoolHighlight(pos);
    },
    clearWhirlpoolHighlight(): void {
      gameEngineRef.current?.setWhirlpoolHighlight(null);
    },
  }));

  // Initialize once
  useEffect(() => {
    if (!canvasRef.current || initializationRef.current) return;

    initializationRef.current = true;

    const gameEngine = new GameEngine(canvasRef.current);
    gameEngineRef.current = gameEngine;
    gameEngine.onVictoryContinue = () => {
      if (onLevelComplete) onLevelComplete();
    };
    gameEngine.onBackToMap = () => {
      if (onBackToMap) onBackToMap();
    };
    gameEngine.loadLevel(level);
    gameEngine.start();

    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.destroy();
        gameEngineRef.current = null;
      }
      initializationRef.current = false;
    };
  }, []);

  // Handle level changes separately
  useEffect(() => {
    if (gameEngineRef.current && initializationRef.current) {
      gameEngineRef.current.loadLevel(level);
    }
  }, [level]);

  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.selectFrogType(selectedFrogType);
    }
  }, [selectedFrogType]);

  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.setHandedness(handedness);
    }
  }, [handedness]);

  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.setHasConsumables(hasConsumables);
    }
  }, [hasConsumables]);

  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.setConsumableReady(consumableReady);
    }
  }, [consumableReady]);

  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.setActiveConsumable(activeConsumable ?? null);
    }
  }, [activeConsumable]);

  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.onConsumablePlaced = onConsumablePlaced ?? null;
    }
  }, [onConsumablePlaced]);

  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.onFrogPlaced = onFrogPlaced ?? null;
    }
  }, [onFrogPlaced]);

  // Expose game engine state to parent component
  useEffect(() => {
    if (!gameEngineRef.current) return;

    const interval = setInterval(() => {
      if (gameEngineRef.current) {
        const state = gameEngineRef.current.getGameState();

        setCurrentGameState(state);

        if (onGameStateChange) {
          onGameStateChange(state);
        }
        if (onWaveInfoChange) {
          const waveInfo = gameEngineRef.current.getWaveInfo();
          onWaveInfoChange(waveInfo);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onGameStateChange, onWaveInfoChange]);


  return (
    <div className="relative w-full h-full flex items-end justify-center">
      <canvas
        ref={canvasRef}
        width={600}
        height={660}
        onTouchStart={(e) => {
          e.preventDefault();
        }}
        className="mx-auto"
        style={{
          display: 'block',
          touchAction: 'none',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
});
