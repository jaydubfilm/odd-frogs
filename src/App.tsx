import { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/game/GameCanvas';
import { FrogSelector } from './components/ui/FrogSelector';
import { GameStats } from './components/ui/GameStats';
import { LevelMap } from './components/ui/LevelMap';
import { GameState, FrogType, LevelProgress } from './types/game';
import { ProceduralLevelGenerator } from './game/utils/ProceduralLevelGenerator';
import './styles/index.css';

function App() {
  const levelGeneratorRef = useRef(new ProceduralLevelGenerator());

  // Level selection state
  const [showLevelMap, setShowLevelMap] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(1);

  // Initialize level progress (20 levels)
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      levelNumber: i + 1,
      completed: false,
      stars: 0,
      unlocked: i === 0, // Only first level unlocked
    }));
  });

  const [level, setLevel] = useState(() =>
    levelGeneratorRef.current.generateLevel(1)
  );
  const [levelKey, setLevelKey] = useState(0);

  const [gameState, setGameState] = useState<GameState>({
    lives: 3,
    money: 200,
    wave: 0,
    score: 0,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    currentLevel: 1,
    selectedFrogType: null,
    selectedGridCell: null,
    gameSpeed: 1,
  });

  const [waveInfo, setWaveInfo] = useState({
    current: 0,
    total: 0,
    timeUntilNext: 0
  });

  const handleSelectLevel = (levelNumber: number) => {
    setSelectedLevel(levelNumber);
    const proceduralLevel = levelGeneratorRef.current.generateLevel(levelNumber);
    setLevel(proceduralLevel);
    setLevelKey(k => k + 1);

    // Reset game state for new level
    setGameState({
      lives: 3,
      money: proceduralLevel.startingMoney,
      wave: 0,
      score: 0,
      isPaused: false,
      isGameOver: false,
      isVictory: false,
      currentLevel: levelNumber,
      selectedFrogType: null,
      selectedGridCell: null,
      gameSpeed: 1,
    });

    setShowLevelMap(false);
  };

  const handleLevelComplete = useCallback(() => {
    console.log('🎊 Level complete! Current level:', selectedLevel);
    console.log('Current lives:', gameState.lives);

    // Mark current level as completed
    setLevelProgress(prev => {
      const updated = [...prev];
      const currentIndex = selectedLevel - 1;

      console.log('Marking level', selectedLevel, 'as completed');
      console.log('Current index:', currentIndex);

      updated[currentIndex] = {
        ...updated[currentIndex],
        completed: true,
        stars: calculateStars(gameState),
      };

      // Unlock next level
      if (currentIndex + 1 < updated.length) {
        console.log('Unlocking level', currentIndex + 2);
        updated[currentIndex + 1] = {
          ...updated[currentIndex + 1],
          unlocked: true,
        };
      }

      console.log('Updated progress:', updated);
      return updated;
    });

    // Return to map
    setShowLevelMap(true);
  }, [selectedLevel, gameState.lives]);

  const calculateStars = (state: GameState): number => {
    // Award stars based on performance
    if (state.lives === 3) return 3;
    if (state.lives === 2) return 2;
    return 1;
  };

  const handleUnlockAll = useCallback(() => {
    console.log('🔓 DEV: Unlocking all levels');
    setLevelProgress(prev =>
      prev.map(level => ({
        ...level,
        unlocked: true,
      }))
    );
  }, []);

  const handleBackToMap = useCallback(() => {
    // If returning from a victory, mark level as complete
    if (gameState.isVictory) {
      console.log('🎊 Back to map from victory! Completing level:', selectedLevel);

      setLevelProgress(prev => {
        const updated = [...prev];
        const currentIndex = selectedLevel - 1;

        updated[currentIndex] = {
          ...updated[currentIndex],
          completed: true,
          stars: calculateStars(gameState),
        };

        // Unlock next level
        if (currentIndex + 1 < updated.length) {
          console.log('Unlocking level', currentIndex + 2);
          updated[currentIndex + 1] = {
            ...updated[currentIndex + 1],
            unlocked: true,
          };
        }

        return updated;
      });
    }

    setShowLevelMap(true);
  }, [gameState, selectedLevel]);

  const handleSelectFrog = (frogType: FrogType) => {
    setGameState(prev => ({
      ...prev,
      selectedFrogType: prev.selectedFrogType === frogType ? null : frogType,
    }));
  };

  const handleGameStateChange = (newState: GameState) => {
    setGameState(newState);
  };

  const handleWaveInfoChange = (newWaveInfo: { current: number; total: number; timeUntilNext: number }) => {
    setWaveInfo(newWaveInfo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
      {showLevelMap ? (
        <LevelMap
          progress={levelProgress}
          onSelectLevel={handleSelectLevel}
          onUnlockAll={handleUnlockAll}
        />
      ) : (
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={handleBackToMap}
              className="mb-4 px-6 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 font-bold"
            >
              ← Back to Map
            </button>
            <h1 className="text-6xl font-bold text-white mb-2 drop-shadow-lg">
              🐸 OddFrogs - Level {selectedLevel} 🐸
            </h1>
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
                  onWaveInfoChange={handleWaveInfoChange}
                  onLevelComplete={handleLevelComplete}
                />
            </div>

            {/* Right Panel - Game Stats */}
            <div className="w-full lg:w-80">
              <GameStats gameState={gameState} waveInfo={waveInfo} />

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
        </div>
      )}
    </div>
  );
}

export default App;