import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@game/GameEngine';
import { LevelData, GameState, FrogType, FrogData } from '../../types/game';
import { RadialUpgradeMenu } from './RadialUpgradeMenu';
import { UpgradeSystem } from '../../game/systems/UpgradeSystem';
import { GAME_CONFIG } from '../../data/constants';

interface GameCanvasProps {
  level: LevelData;
  selectedFrogType: FrogType | null;
  onGameStateChange?: (state: GameState) => void;
  onWaveInfoChange?: (waveInfo: { current: number; total: number; timeUntilNext: number }) => void;
  onLevelComplete?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  selectedFrogType,
  onGameStateChange,
  onWaveInfoChange,
  onLevelComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const initializationRef = useRef(false);
  const upgradeSystemRef = useRef(new UpgradeSystem());
  const frogsBeforeClickRef = useRef<Map<string, FrogData>>(new Map());

  const [hoveredFrog, setHoveredFrog] = useState<FrogData | null>(null);
  const [upgradeMenuPosition, setUpgradeMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);

  // Initialize once
  useEffect(() => {
    if (!canvasRef.current || initializationRef.current) return;

    initializationRef.current = true;

    const gameEngine = new GameEngine(canvasRef.current);
    gameEngineRef.current = gameEngine;
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

  // Expose game engine state to parent component
  useEffect(() => {
    if (!gameEngineRef.current) return;

    const interval = setInterval(() => {
      if (gameEngineRef.current) {
        const state = gameEngineRef.current.getGameState();

        // Log when victory is detected
        if (state.isVictory) {
          console.log('🎉 GameCanvas detected victory in state update!', state);
        }

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

  // Detect victory and trigger level completion
  useEffect(() => {
    console.log('🔍 Victory check:', {
      isVictory: currentGameState?.isVictory,
      hasCallback: !!onLevelComplete,
      currentGameState
    });

    if (currentGameState?.isVictory && onLevelComplete) {
      console.log('✅ Victory detected! Calling onLevelComplete in 2 seconds...');

      // Delay slightly so player can see victory screen
      const timer = setTimeout(() => {
        console.log('📞 Executing onLevelComplete callback NOW');
        onLevelComplete();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentGameState?.isVictory, onLevelComplete]);

  const handleCanvasClickCapture = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const gameEngine = gameEngineRef.current;
    if (!gameEngine) return;

    // Capture frogs BEFORE GameEngine's handler processes the click
    frogsBeforeClickRef.current = new Map(gameEngine.getFrogs());
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const gameEngine = gameEngineRef.current;
    if (!canvas || !gameEngine) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const frogsArrayBefore = Array.from(frogsBeforeClickRef.current.values()) as FrogData[];

    // Account for canvas margins
    const topMargin = 60;
    const leftMargin = 60;

    // Check if clicking on an EXISTING frog (that was there BEFORE the click)
    let foundFrog: FrogData | null = null;
    for (const frog of frogsArrayBefore) {
      const frogPos = {
        x: frog.gridPosition.col * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 + leftMargin,
        y: frog.gridPosition.row * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 + topMargin,
      };
      const distance = Math.sqrt((x - frogPos.x) ** 2 + (y - frogPos.y) ** 2);
      if (distance < GAME_CONFIG.cellSize / 2) {
        foundFrog = frog;
        break;
      }
    }

    if (foundFrog) {
      // Clicked on existing frog - show upgrade menu
      setHoveredFrog(foundFrog);
      const frogCanvasX = foundFrog.gridPosition.col * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 + leftMargin;
      const frogCanvasY = foundFrog.gridPosition.row * GAME_CONFIG.cellSize + GAME_CONFIG.cellSize / 2 + topMargin;
      setUpgradeMenuPosition({ x: frogCanvasX, y: frogCanvasY });
    } else {
      // Clicked elsewhere - close menu if open
      if (hoveredFrog) {
        setHoveredFrog(null);
        setUpgradeMenuPosition(null);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent default context menu

    // Close upgrade menu on right-click
    if (hoveredFrog) {
      setHoveredFrog(null);
      setUpgradeMenuPosition(null);
    }
  };

  const handlePurchaseUpgrade = (nodeId: string) => {
    if (!hoveredFrog || !gameEngineRef.current) return;

    const cost = upgradeSystemRef.current.purchaseUpgrade(hoveredFrog, nodeId);
    if (cost > 0) {
      const currentState = gameEngineRef.current.getGameState();
      gameEngineRef.current.updateMoney(currentState.money - cost);

      if (onGameStateChange) {
        onGameStateChange({
          ...currentState,
          money: currentState.money - cost,
        });
      }
    }
  };

  const handleSellFrog = () => {
    if (!hoveredFrog || !gameEngineRef.current) return;

    const sellValue = gameEngineRef.current.sellFrog(hoveredFrog.id);

    if (sellValue > 0) {
      const currentState = gameEngineRef.current.getGameState();

      if (onGameStateChange) {
        onGameStateChange(currentState);
      }

      // Close menu after selling
      setHoveredFrog(null);
      setUpgradeMenuPosition(null);
    }
  };

  const handleCloseMenu = () => {
    setHoveredFrog(null);
    setUpgradeMenuPosition(null);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={660}
        onClickCapture={handleCanvasClickCapture}
        onClick={handleCanvasClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'block',
          width: '600px',
          height: '660px'
        }}
      />

      {hoveredFrog && upgradeMenuPosition && (
        <RadialUpgradeMenu
          frog={hoveredFrog}
          position={upgradeMenuPosition}
          availableUpgrades={upgradeSystemRef.current.getAvailableUpgrades(hoveredFrog)}
          playerMoney={gameEngineRef.current?.getGameState().money || 0}
          onPurchase={handlePurchaseUpgrade}
          onSell={handleSellFrog}
          onClose={handleCloseMenu}
        />
      )}
    </div>
  );
};