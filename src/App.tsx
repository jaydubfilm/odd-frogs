import { useState, useEffect } from 'react';
import { GameCanvas } from './components/game/GameCanvas';
import { FrogSelector } from './components/ui/FrogSelector';
import { GameStats } from './components/ui/GameStats';
import { LEVEL_1 } from './data/levels';
import { GameState, FrogType } from './types/game';
import { generateRandomLevel } from './game/utils/LevelGenerator';
import './styles/index.css';

function App() {
  const [level, setLevel] = useState(LEVEL_1); 
  const [levelKey, setLevelKey] = useState(0);
  const [gameState, setGameState] = useState<GameState>({
    lives: 3,
    money: 200,
    wave: 0,
    score: 0,
    isPaused: false,
    isGameOver: false,
    selectedFrogType: null,
    selectedGridCell: null,
  });

  // Generate random level on mount
  useEffect(() => {
    console.log('LEVEL_1.streams:', LEVEL_1.streams); // ADD
    const randomLevel = generateRandomLevel();
    console.log('randomLevel.streams:', randomLevel.streams); // ADD
    randomLevel.waves = LEVEL_1.waves;
    setLevel(randomLevel);
    setLevelKey(k => k + 1); 
  }, []);

  const handleSelectFrog = (frogType: FrogType) => {
    setGameState(prev => ({
      ...prev,
      selectedFrogType: prev.selectedFrogType === frogType ? null : frogType,
    }));
  };
  
  const handleGameStateChange = (newState: GameState) => {
    setGameState(newState);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-2 drop-shadow-lg">
            🐸 OddFrogs 🐸
          </h1>
          <p className="text-xl text-white/90">
            Defend the pond from hungry invaders!
          </p>
        </div>
        
        {/* Main Game Area */}
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Left Panel - Frog Selector */}
          <div className="w-full lg:w-80">
            <FrogSelector
              selectedFrog={gameState.selectedFrogType}
              onSelectFrog={handleSelectFrog}
              playerMoney={gameState.money}
            />
          </div>
          
          {/* Center - Game Canvas */}
          <div className="flex-shrink-0">
            <GameCanvas
              key={levelKey}
              level={level} 
              selectedFrogType={gameState.selectedFrogType}
              onGameStateChange={handleGameStateChange}
            />
          </div>
          
          {/* Right Panel - Game Stats */}
          <div className="w-full lg:w-80">
            <GameStats gameState={gameState} />
            
            {/* Instructions */}
            <div className="mt-4 bg-white/90 rounded-lg p-4 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                How to Play
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Select a frog type</li>
                <li>• Click on a lily pad to place it</li>
                <li>• Frogs attack food automatically</li>
                <li>• Don't let food reach the bottom!</li>
                <li>• Earn money to buy more frogs</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-white/70 text-sm">
          <p>Created with React, TypeScript, and Canvas API</p>
        </div>
      </div>
    </div>
  );
}

export default App;
