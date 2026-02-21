import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GameCanvas, GameCanvasHandle } from './components/game/GameCanvas';
import { FrogSelector } from './components/ui/FrogSelector';
import { FrogPreview } from './components/ui/FrogPreview';
import { GameStats } from './components/ui/GameStats';
import { LevelMap } from './components/ui/LevelMap';
import { FrogSelectionScreen } from './components/ui/FrogSelectionScreen';
import { FrogUnlockedScreen } from './components/ui/FrogUnlockedScreen';
import { SettingsModal } from './components/ui/SettingsModal';
import { GameState, FrogType, LevelProgress } from './types/game';
import { ProceduralLevelGenerator } from './game/utils/ProceduralLevelGenerator';
import { FROG_UNLOCK_LEVEL } from './data/constants';
import './styles/index.css';

function App() {
  const levelGeneratorRef = useRef(new ProceduralLevelGenerator());
  const gameCanvasRef = useRef<GameCanvasHandle>(null);

  // Level selection state
  const [showLevelMap, setShowLevelMap] = useState(true);
  const [showFrogSelection, setShowFrogSelection] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedFrogTypes, setSelectedFrogTypes] = useState<FrogType[]>([]);
  const [newlyUnlockedFrog, setNewlyUnlockedFrog] = useState<FrogType | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [handedness, setHandedness] = useState<'left' | 'right'>(
    () => (localStorage.getItem('handedness') as 'left' | 'right') || 'right'
  );

  // Drag state
  const [dragging, setDragging] = useState<{
    frogType: FrogType;
    x: number; y: number;
    startX: number; startY: number;
    startTime: number;
  } | null>(null);

  // Initialize level progress (20 levels)
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>(() => {
    return Array.from({ length: 100 }, (_, i) => ({
      levelNumber: i + 1,
      completed: false,
      stars: 0,
      unlocked: i === 0, // Only first level unlocked
    }));
  });

  // Derive unlocked frog types from level progress
  const unlockedFrogTypes = useMemo(() => {
    const highestUnlocked = levelProgress.reduce(
      (max, lp) => (lp.unlocked ? Math.max(max, lp.levelNumber) : max),
      1
    );
    return Object.values(FrogType).filter(
      ft => FROG_UNLOCK_LEVEL[ft] <= highestUnlocked
    );
  }, [levelProgress]);

  const [level, setLevel] = useState(() =>
    levelGeneratorRef.current.generateLevel(1)
  );
  const [levelKey, setLevelKey] = useState(0);

  const [gameState, setGameState] = useState<GameState>({
    lives: 3,
    money: 20,
    wave: 0,
    score: 0,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    currentLevel: 1,
    selectedFrogType: null,
    selectedFrog: null,
    selectedGridCell: null,
    gameSpeed: 1,
  });

  const [waveInfo, setWaveInfo] = useState({
    current: 0,
    total: 0,
    timeUntilNext: 0
  });

  useEffect(() => {
    localStorage.setItem('handedness', handedness);
  }, [handedness]);

  const handleSelectLevel = (levelNumber: number) => {
    setSelectedLevel(levelNumber);
    const proceduralLevel = levelGeneratorRef.current.generateLevel(levelNumber);
    setLevel(proceduralLevel);

    setShowLevelMap(false);
    setShowFrogSelection(true);
  };

  const handleConfirmSelection = (chosenFrogs: FrogType[]) => {
    setSelectedFrogTypes(chosenFrogs);
    setShowFrogSelection(false);
    setLevelKey(k => k + 1);

    // Reset game state for new level
    setGameState({
      lives: 3,
      money: level.startingMoney,
      wave: 0,
      score: 0,
      isPaused: false,
      isGameOver: false,
      isVictory: false,
      currentLevel: selectedLevel,
      selectedFrogType: null,
      selectedFrog: null,
      selectedGridCell: null,
      gameSpeed: 1,
    });
  };

  const handleBackFromSelection = () => {
    setShowFrogSelection(false);
    setShowLevelMap(true);
  };

  const handleLevelComplete = useCallback(() => {
    console.log('Level complete! Current level:', selectedLevel);

    // Mark current level as completed
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
        updated[currentIndex + 1] = {
          ...updated[currentIndex + 1],
          unlocked: true,
        };
      }

      return updated;
    });

    // Check if beating this level unlocks a new frog
    const nextLevel = selectedLevel + 1;
    const unlockedFrog = Object.entries(FROG_UNLOCK_LEVEL).find(
      ([, lvl]) => lvl === nextLevel
    );

    if (unlockedFrog) {
      setNewlyUnlockedFrog(unlockedFrog[0] as FrogType);
    } else {
      setShowLevelMap(true);
    }
  }, [selectedLevel, gameState.lives]);

  const calculateStars = (state: GameState): number => {
    // Award stars based on performance
    if (state.lives === 3) return 3;
    if (state.lives === 2) return 2;
    return 1;
  };

  const handleUnlockAll = useCallback(() => {
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

  // Drag handlers
  const handleDragStart = useCallback((frogType: FrogType, startX: number, startY: number) => {
    setDragging({ frogType, x: startX, y: startY, startX, startY, startTime: Date.now() });
  }, []);

  // Dynamic offset: the higher the thumb, the further the frog icon floats above it
  const getDragOffsetY = (clientY: number): number => {
    const screenHeight = window.innerHeight;
    const normalizedY = Math.max(0, Math.min(1, 1 - clientY / screenHeight));
    const BASE_OFFSET = -19;
    const MAX_EXTRA_OFFSET = -181;
    return BASE_OFFSET + normalizedY * MAX_EXTRA_OFFSET;
  };

  // Horizontal offset: stretches reach diagonally away from the dominant hand.
  // Normalized (0,0) = handedness-side frog buttons, (1,1) = opposite top corner.
  // offset = MAX * x * y  →  zero along either axis, max at the diagonal.
  const getDragOffsetX = (clientX: number, clientY: number): number => {
    const rect = gameCanvasRef.current?.getCanvasRect();
    if (!rect) return 0;

    // X axis: 0 at handedness edge of canvas, 1 at opposite edge
    const normalizedX = handedness === 'right'
      ? Math.max(0, (rect.right - clientX) / rect.width)
      : Math.max(0, (clientX - rect.left) / rect.width);

    // Y axis: 0 at bottom of screen (frog buttons), 1 at top of canvas
    const normalizedY = Math.max(0, (window.innerHeight - clientY) / (window.innerHeight - rect.top));

    const MAX_OFFSET = 200;
    const result = (handedness === 'right' ? -1 : 1) * MAX_OFFSET * normalizedX * normalizedY;
    console.log('dragOffsetX', { normalizedX: normalizedX.toFixed(2), normalizedY: normalizedY.toFixed(2), result: result.toFixed(1), rect: !!rect });
    return result;
  };

  const handlePointerMoveDrag = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    if (gameCanvasRef.current) {
      gameCanvasRef.current.updateDragHighlight(e.clientX + getDragOffsetX(e.clientX, e.clientY), e.clientY + getDragOffsetY(e.clientY), dragging.frogType);
    }
  }, [dragging, handedness]);

  const handlePointerUpDrag = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    if (gameCanvasRef.current) {
      gameCanvasRef.current.placeFrogAtScreenPos(e.clientX + getDragOffsetX(e.clientX, e.clientY), e.clientY + getDragOffsetY(e.clientY), dragging.frogType);
      gameCanvasRef.current.clearDragHighlight();
    }
    setDragging(null);
  }, [dragging, handedness]);

  return (
    <div
      className="overflow-hidden bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500"
      style={{ height: '100dvh' }}
      onPointerMove={handlePointerMoveDrag}
      onPointerUp={handlePointerUpDrag}
    >
      {newlyUnlockedFrog ? (
        <FrogUnlockedScreen
          frogType={newlyUnlockedFrog}
          onContinue={() => {
            setNewlyUnlockedFrog(null);
            setShowLevelMap(true);
          }}
        />
      ) : showLevelMap ? (
        <LevelMap
          progress={levelProgress}
          onSelectLevel={handleSelectLevel}
          onUnlockAll={handleUnlockAll}
          onOpenSettings={() => setShowSettings(true)}
        />
      ) : showFrogSelection ? (
        <FrogSelectionScreen
          level={level}
          levelNumber={selectedLevel}
          unlockedFrogTypes={unlockedFrogTypes}
          purchaseSlots={level.purchaseSlots}
          onConfirm={handleConfirmSelection}
          onBack={handleBackFromSelection}
        />
      ) : (
          <div className="h-full flex flex-col px-1">
            {/* Mobile: Combined header + stats bar */}
            <div className="lg:hidden flex-shrink-0 flex items-center gap-2 py-1">
              <button
                onClick={handleBackToMap}
                className="px-2 py-1 bg-white rounded shadow text-xs font-bold flex-shrink-0"
              >
                ←
              </button>
              <span className="text-white font-bold text-sm drop-shadow flex-shrink-0">
                Lv {selectedLevel}
              </span>
              <div className="flex-1 min-w-0">
                <GameStats gameState={gameState} waveInfo={waveInfo} compact />
              </div>
            </div>

            {/* Desktop: Full header */}
            <div className="hidden lg:block text-center mb-2 flex-shrink-0">
              <button
                onClick={handleBackToMap}
                className="mb-4 px-6 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 font-bold"
              >
                ← Back to Map
              </button>
              <h1 className="text-6xl font-bold text-white mb-2 drop-shadow-lg">
                OddFrogs - Level {selectedLevel}
              </h1>
            </div>

            {/* Canvas - takes all remaining space */}
            <div className="flex-1 flex items-end justify-center min-h-0">
              <GameCanvas
                ref={gameCanvasRef}
                key={levelKey}
                level={level}
                selectedFrogType={gameState.selectedFrogType}
                onGameStateChange={handleGameStateChange}
                onWaveInfoChange={handleWaveInfoChange}
                onLevelComplete={handleLevelComplete}
                handedness={handedness}
              />
            </div>

            {/* Mobile: Frog selector at bottom */}
            <div className="lg:hidden flex-shrink-0 pb-1">
              <FrogSelector
                selectedFrog={gameState.selectedFrogType}
                onSelectFrog={handleSelectFrog}
                onDragStart={handleDragStart}
                draggingFrogType={dragging?.frogType ?? null}
                playerMoney={gameState.money}
                handedness={handedness}
                availableFrogTypes={selectedFrogTypes.length > 0 ? selectedFrogTypes : undefined}
              />
            </div>

            {/* Desktop: Side panels */}
            <div className="hidden lg:flex flex-row gap-6 justify-center">
              <div className="w-80">
                <FrogSelector
                  selectedFrog={gameState.selectedFrogType}
                  onSelectFrog={handleSelectFrog}
                  onDragStart={handleDragStart}
                  draggingFrogType={dragging?.frogType ?? null}
                  playerMoney={gameState.money}
                  handedness={handedness}
                  availableFrogTypes={selectedFrogTypes.length > 0 ? selectedFrogTypes : undefined}
                />
              </div>
              <div className="w-80">
                <GameStats gameState={gameState} waveInfo={waveInfo} />
              </div>
            </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          handedness={handedness}
          onHandednessChange={setHandedness}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Drag ghost overlay - lerps from button to offset position */}
      {dragging && dragging.x !== 0 && (() => {
        const LERP_DURATION = 150; // ms
        const elapsed = Date.now() - dragging.startTime;
        const t = Math.min(1, elapsed / LERP_DURATION);
        const ease = t * (2 - t); // ease-out quad
        const offsetY = getDragOffsetY(dragging.y);
        const offsetX = getDragOffsetX(dragging.x, dragging.y);
        const targetX = dragging.x + offsetX - 30;
        const targetY = dragging.y + offsetY - 30;
        const lerpX = dragging.startX - 30 + (targetX - (dragging.startX - 30)) * ease;
        const lerpY = dragging.startY - 30 + (targetY - (dragging.startY - 30)) * ease;
        return (
          <div
            className="fixed pointer-events-none z-50"
            style={{ left: lerpX, top: lerpY }}
          >
            <div className="w-[60px] h-[60px]">
              <FrogPreview frogType={dragging.frogType} size={60} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;
