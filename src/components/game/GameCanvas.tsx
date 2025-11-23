import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@game/GameEngine';
import { LevelData, GameState, FrogType } from '../../types/game';

interface GameCanvasProps {
  level: LevelData;
  selectedFrogType: FrogType | null;
  onGameStateChange?: (state: GameState) => void;
  onWaveInfoChange?: (waveInfo: { current: number; total: number; timeUntilNext: number }) => void;  // ← ADD THIS
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  selectedFrogType,
  onGameStateChange,
  onWaveInfoChange  // ← ADD THIS
}) => {
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

  // Expose game engine state to parent component
  useEffect(() => {
    if (!gameEngineRef.current) return;

    const interval = setInterval(() => {
      if (gameEngineRef.current) {
        if (onGameStateChange) {
          const state = gameEngineRef.current.getGameState();
          onGameStateChange(state);
        }
        if (onWaveInfoChange) {  // ← ADD THIS
          const waveInfo = gameEngineRef.current.getWaveInfo();
          onWaveInfoChange(waveInfo);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onGameStateChange, onWaveInfoChange]);  // ← ADD onWaveInfoChange to dependencies

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