import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@game/GameEngine';
import { LevelData, GameState, FrogType } from '../../types/game';

interface GameCanvasProps {
  level: LevelData;
  selectedFrogType: FrogType | null;  
  onGameStateChange?: (state: GameState) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ level, selectedFrogType, onGameStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const initializationRef = useRef(false);

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
  }, []); // Empty array - run once only

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

  // Expose game engine methods to parent component
  useEffect(() => {
    if (!gameEngineRef.current || !onGameStateChange) return;
    
    const interval = setInterval(() => {
      if (gameEngineRef.current) {
        const state = gameEngineRef.current.getGameState();
        onGameStateChange(state);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [onGameStateChange]);
  
  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={660}
      style={{
        display: 'block',
        width: '600px',
        height: '660px'
      }}
    />
  );
};
