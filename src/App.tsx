import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GameCanvas, GameCanvasHandle } from './components/game/GameCanvas';
import { FrogSelector } from './components/ui/FrogSelector';
import { FrogPreview } from './components/ui/FrogPreview';
import { GameStats } from './components/ui/GameStats';
import { LevelMap } from './components/ui/LevelMap';
import { RiverSelect } from './components/ui/RiverSelect';
import { FrogSelectionScreen } from './components/ui/FrogSelectionScreen';
import { FrogUnlockedScreen } from './components/ui/FrogUnlockedScreen';
import { SettingsModal } from './components/ui/SettingsModal';
import { GameState, FrogType, LevelProgress, RiverDefinition, ConsumableType, ConsumableInventory } from './types/game';
import { ConsumableSelector, ConsumableIcon } from './components/ui/ConsumableSelector';
import { ProceduralLevelGenerator } from './game/utils/ProceduralLevelGenerator';
import { FROG_UNLOCK_LEVEL, CONSUMABLE_CONFIG } from './data/constants';
import { RIVERS } from './data/rivers';
import './styles/index.css';

function createRiverProgress(): Record<string, LevelProgress[]> {
  const progress: Record<string, LevelProgress[]> = {};
  for (const river of RIVERS) {
    progress[river.id] = Array.from({ length: river.levelCount }, (_, i) => ({
      levelNumber: i + 1,
      completed: false,
      stars: 0,
      unlocked: river.unlockRequirement === null && i === 0,
    }));
  }
  return progress;
}

function App() {
  const levelGeneratorRef = useRef(new ProceduralLevelGenerator());
  const gameCanvasRef = useRef<GameCanvasHandle>(null);

  // River & level selection state
  const [showRiverSelect, setShowRiverSelect] = useState(true);
  const [showLevelMap, setShowLevelMap] = useState(false);
  const [showFrogSelection, setShowFrogSelection] = useState(false);
  const [selectedRiverId, setSelectedRiverId] = useState('rio-ribbit');
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

  // Consumable state
  const [showConsumables, setShowConsumables] = useState(false);
  const [consumables, setConsumables] = useState<Record<ConsumableType, ConsumableInventory>>({
    [ConsumableType.RAIN]: { count: CONSUMABLE_CONFIG.STARTING_COUNT, cooldownUntil: 0 },
    [ConsumableType.HEAL]: { count: CONSUMABLE_CONFIG.STARTING_COUNT, cooldownUntil: 0 },
    [ConsumableType.WHIRLPOOL]: { count: CONSUMABLE_CONFIG.STARTING_COUNT, cooldownUntil: 0 },
  });
  const [draggingConsumable, setDraggingConsumable] = useState<{
    type: ConsumableType;
    x: number; y: number;
    startX: number; startY: number;
    startTime: number;
  } | null>(null);
  const [activeConsumable, setActiveConsumable] = useState<ConsumableType | null>(null);

  // River progress (20 levels per river)
  const [riverProgress, setRiverProgress] = useState<Record<string, LevelProgress[]>>(createRiverProgress);

  const selectedRiver = useMemo(
    () => RIVERS.find(r => r.id === selectedRiverId) ?? RIVERS[0],
    [selectedRiverId]
  );

  const isRiverUnlocked = useCallback((riverId: string): boolean => {
    const river = RIVERS.find(r => r.id === riverId);
    if (!river) return false;
    if (!river.unlockRequirement) return true;
    const { riverId: reqRiverId, stars: reqStars } = river.unlockRequirement;
    const reqProgress = riverProgress[reqRiverId];
    if (!reqProgress) return false;
    const totalStars = reqProgress.reduce((sum, lp) => sum + lp.stars, 0);
    return totalStars >= reqStars;
  }, [riverProgress]);

  // Derive unlocked frog types from rio-ribbit progress only
  const unlockedFrogTypes = useMemo(() => {
    const ribbitProgress = riverProgress['rio-ribbit'] || [];
    const highestUnlocked = ribbitProgress.reduce(
      (max, lp) => (lp.unlocked ? Math.max(max, lp.levelNumber) : max),
      1
    );
    return Object.values(FrogType).filter(
      ft => FROG_UNLOCK_LEVEL[ft] <= highestUnlocked
    );
  }, [riverProgress]);

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
    showConsumables: false,
    hasConsumables: CONSUMABLE_CONFIG.STARTING_COUNT > 0,
  });

  const [waveInfo, setWaveInfo] = useState({
    current: 0,
    total: 0,
    timeUntilNext: 0
  });

  useEffect(() => {
    localStorage.setItem('handedness', handedness);
  }, [handedness]);

  const handleSelectRiver = (riverId: string) => {
    setSelectedRiverId(riverId);
    setShowRiverSelect(false);
    setShowLevelMap(true);
  };

  const handleBackToRiverSelect = () => {
    setShowLevelMap(false);
    setShowRiverSelect(true);
  };

  const handleSelectLevel = (levelNumber: number) => {
    setSelectedLevel(levelNumber);
    const proceduralLevel = levelGeneratorRef.current.generateLevel(levelNumber, selectedRiver);
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
      showConsumables: false,
      hasConsumables: CONSUMABLE_CONFIG.STARTING_COUNT > 0,
    });

    // Reset consumables for new level
    setShowConsumables(false);
    setConsumables({
      [ConsumableType.RAIN]: { count: CONSUMABLE_CONFIG.STARTING_COUNT, cooldownUntil: 0 },
      [ConsumableType.HEAL]: { count: CONSUMABLE_CONFIG.STARTING_COUNT, cooldownUntil: 0 },
      [ConsumableType.WHIRLPOOL]: { count: CONSUMABLE_CONFIG.STARTING_COUNT, cooldownUntil: 0 },
    });
    setActiveConsumable(null);
  };

  const handleBackFromSelection = () => {
    setShowFrogSelection(false);
    setShowLevelMap(true);
  };

  const updateProgressAfterComplete = useCallback(() => {
    setRiverProgress(prev => {
      const riverId = selectedRiverId;
      const currentProgress = [...(prev[riverId] || [])];
      const currentIndex = selectedLevel - 1;

      currentProgress[currentIndex] = {
        ...currentProgress[currentIndex],
        completed: true,
        stars: calculateStars(gameState),
      };

      // Unlock next level in same river
      if (currentIndex + 1 < currentProgress.length) {
        currentProgress[currentIndex + 1] = {
          ...currentProgress[currentIndex + 1],
          unlocked: true,
        };
      }

      const updated = { ...prev, [riverId]: currentProgress };

      // Check if this river now meets the star threshold to unlock dependent rivers
      const totalStars = currentProgress.reduce((sum, lp) => sum + lp.stars, 0);
      for (const river of RIVERS) {
        if (river.unlockRequirement && river.unlockRequirement.riverId === riverId && totalStars >= river.unlockRequirement.stars) {
          const depProgress = [...(updated[river.id] || [])];
          if (depProgress.length > 0 && !depProgress[0].unlocked) {
            depProgress[0] = { ...depProgress[0], unlocked: true };
            updated[river.id] = depProgress;
          }
        }
      }

      return updated;
    });
  }, [selectedRiverId, selectedLevel, gameState]);

  const handleLevelComplete = useCallback(() => {
    console.log('Level complete! Current level:', selectedLevel);
    updateProgressAfterComplete();

    // Check if beating this level unlocks a new frog (rio-ribbit only)
    if (selectedRiverId === 'rio-ribbit') {
      const nextLevel = selectedLevel + 1;
      const unlockedFrog = Object.entries(FROG_UNLOCK_LEVEL).find(
        ([, lvl]) => lvl === nextLevel
      );

      if (unlockedFrog) {
        setNewlyUnlockedFrog(unlockedFrog[0] as FrogType);
        return;
      }
    }

    setShowLevelMap(true);
  }, [selectedLevel, selectedRiverId, updateProgressAfterComplete]);

  const calculateStars = (state: GameState): number => {
    if (state.lives >= 20) return 3;
    if (state.lives >= 10) return 2;
    return 1;
  };

  const handleUnlockAll = useCallback(() => {
    setRiverProgress(prev => {
      const updated: Record<string, LevelProgress[]> = {};
      for (const riverId of Object.keys(prev)) {
        updated[riverId] = prev[riverId].map(lp => ({
          ...lp,
          unlocked: true,
        }));
      }
      return updated;
    });
  }, []);

  const handleBackToMap = useCallback(() => {
    if (gameState.isVictory) {
      updateProgressAfterComplete();
    }
    setShowLevelMap(true);
  }, [gameState, updateProgressAfterComplete]);

  const handleSelectFrog = (frogType: FrogType) => {
    setGameState(prev => ({
      ...prev,
      selectedFrogType: prev.selectedFrogType === frogType ? null : frogType,
    }));
  };

  const handleGameStateChange = (newState: GameState) => {
    setGameState(newState);
    const shouldShow = hasAnyConsumables && newState.showConsumables;
    setShowConsumables(shouldShow);
    if (!shouldShow) setActiveConsumable(null);
  };

  const handleWaveInfoChange = (newWaveInfo: { current: number; total: number; timeUntilNext: number }) => {
    setWaveInfo(newWaveInfo);
  };

  // Drag handlers
  const handleDragStart = useCallback((frogType: FrogType, startX: number, startY: number) => {
    setDragging({ frogType, x: startX, y: startY, startX, startY, startTime: Date.now() });
  }, []);

  const getDragOffsetY = (clientY: number): number => {
    const screenHeight = window.innerHeight;
    const normalizedY = Math.max(0, Math.min(1, 1 - clientY / screenHeight));
    const BASE_OFFSET = -19;
    const MAX_EXTRA_OFFSET = -181;
    return BASE_OFFSET + normalizedY * MAX_EXTRA_OFFSET;
  };

  const getDragOffsetX = (clientX: number, clientY: number): number => {
    const rect = gameCanvasRef.current?.getCanvasRect();
    if (!rect) return 0;

    const normalizedX = handedness === 'right'
      ? Math.max(0, (rect.right - clientX) / rect.width)
      : Math.max(0, (clientX - rect.left) / rect.width);

    const normalizedY = Math.max(0, (window.innerHeight - clientY) / (window.innerHeight - rect.top));

    const MAX_OFFSET = 200;
    const result = (handedness === 'right' ? -1 : 1) * MAX_OFFSET * normalizedX * normalizedY;
    console.log('dragOffsetX', { normalizedX: normalizedX.toFixed(2), normalizedY: normalizedY.toFixed(2), result: result.toFixed(1), rect: !!rect });
    return result;
  };

  // Consumable handlers
  const handleUseConsumable = useCallback((type: ConsumableType) => {
    const inv = consumables[type];
    if (inv.count <= 0 || (inv.cooldownUntil > 0 && Date.now() < inv.cooldownUntil)) return;

    if (type === ConsumableType.RAIN) {
      gameCanvasRef.current?.applyRain();
      setConsumables(prev => ({
        ...prev,
        [type]: { count: prev[type].count - 1, cooldownUntil: Date.now() + CONSUMABLE_CONFIG.COOLDOWN_MS },
      }));
    } else if (type === ConsumableType.HEAL) {
      gameCanvasRef.current?.applyHeal();
      setConsumables(prev => ({
        ...prev,
        [type]: { count: prev[type].count - 1, cooldownUntil: Date.now() + CONSUMABLE_CONFIG.COOLDOWN_MS },
      }));
    } else if (type === ConsumableType.WHIRLPOOL) {
      setActiveConsumable(prev => prev === ConsumableType.WHIRLPOOL ? null : ConsumableType.WHIRLPOOL);
    }
  }, [consumables]);

  const handleConsumableDragStart = useCallback((type: ConsumableType, startX: number, startY: number) => {
    setDraggingConsumable({ type, x: startX, y: startY, startX, startY, startTime: Date.now() });
    setActiveConsumable(null);
  }, []);

  // Cooldown tick for re-rendering countdown
  useEffect(() => {
    if (!showConsumables) return;
    const interval = setInterval(() => {
      setConsumables(prev => ({ ...prev }));
    }, 1000);
    return () => clearInterval(interval);
  }, [showConsumables]);

  const hasAnyConsumables = Object.values(consumables).some(inv => inv.count > 0);
  const isConsumableReady = Object.values(consumables).some(
    inv => inv.count > 0 && (inv.cooldownUntil <= 0 || Date.now() >= inv.cooldownUntil)
  );

  const handleConsumablePlaced = useCallback((type: string) => {
    const cType = type as ConsumableType;
    setConsumables(prev => ({
      ...prev,
      [cType]: {
        count: prev[cType].count - 1,
        cooldownUntil: Date.now() + CONSUMABLE_CONFIG.COOLDOWN_MS,
      },
    }));
    setActiveConsumable(null);
  }, []);

  const handlePointerMoveDrag = useCallback((e: React.PointerEvent) => {
    if (dragging) {
      setDragging(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
      if (gameCanvasRef.current) {
        gameCanvasRef.current.updateDragHighlight(e.clientX + getDragOffsetX(e.clientX, e.clientY), e.clientY + getDragOffsetY(e.clientY), dragging.frogType);
      }
    }
    if (draggingConsumable) {
      setDraggingConsumable(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
      if (gameCanvasRef.current) {
        gameCanvasRef.current.updateWhirlpoolHighlight(e.clientX + getDragOffsetX(e.clientX, e.clientY), e.clientY + getDragOffsetY(e.clientY));
      }
    }
  }, [dragging, draggingConsumable, handedness]);

  const handlePointerUpDrag = useCallback((e: React.PointerEvent) => {
    if (dragging) {
      if (gameCanvasRef.current) {
        gameCanvasRef.current.placeFrogAtScreenPos(e.clientX + getDragOffsetX(e.clientX, e.clientY), e.clientY + getDragOffsetY(e.clientY), dragging.frogType);
        gameCanvasRef.current.clearDragHighlight();
      }
      setDragging(null);
    }
    if (draggingConsumable) {
      if (gameCanvasRef.current) {
        gameCanvasRef.current.placeWhirlpoolAtScreenPos(e.clientX + getDragOffsetX(e.clientX, e.clientY), e.clientY + getDragOffsetY(e.clientY));
        gameCanvasRef.current.clearWhirlpoolHighlight();
      }
      setConsumables(prev => ({
        ...prev,
        [ConsumableType.WHIRLPOOL]: {
          count: prev[ConsumableType.WHIRLPOOL].count - 1,
          cooldownUntil: Date.now() + CONSUMABLE_CONFIG.COOLDOWN_MS,
        },
      }));
      setDraggingConsumable(null);
    }
  }, [dragging, draggingConsumable, handedness]);

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
      ) : showRiverSelect ? (
        <RiverSelect
          rivers={RIVERS}
          riverProgress={riverProgress}
          onSelectRiver={handleSelectRiver}
          onOpenSettings={() => setShowSettings(true)}
          isRiverUnlocked={isRiverUnlocked}
        />
      ) : showLevelMap ? (
        <LevelMap
          progress={riverProgress[selectedRiverId] || []}
          river={selectedRiver}
          onSelectLevel={handleSelectLevel}
          onUnlockAll={handleUnlockAll}
          onOpenSettings={() => setShowSettings(true)}
          onBack={handleBackToRiverSelect}
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
              <span className="text-white font-bold text-sm drop-shadow flex-shrink-0">
                Lv {selectedLevel}
              </span>
              <div className="flex-1 min-w-0">
                <GameStats gameState={gameState} waveInfo={waveInfo} compact />
              </div>
            </div>

            {/* Desktop: Full header */}
            <div className="hidden lg:block text-center mb-2 flex-shrink-0">
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
                onBackToMap={handleBackToMap}
                handedness={handedness}
                hasConsumables={hasAnyConsumables}
                consumableReady={isConsumableReady}
                activeConsumable={activeConsumable}
                onConsumablePlaced={handleConsumablePlaced}
              />
            </div>

            {/* Mobile: Frog/Consumable selector at bottom */}
            <div className="lg:hidden flex-shrink-0 pb-1">
              {showConsumables && hasAnyConsumables ? (
                <ConsumableSelector
                  consumableState={consumables}
                  onUseConsumable={handleUseConsumable}
                  onDragStart={handleConsumableDragStart}
                  draggingConsumable={draggingConsumable?.type ?? null}
                  activeConsumable={activeConsumable}
                  handedness={handedness}
                />
              ) : (
                <FrogSelector
                  selectedFrog={gameState.selectedFrogType}
                  onSelectFrog={handleSelectFrog}
                  onDragStart={handleDragStart}
                  draggingFrogType={dragging?.frogType ?? null}
                  playerMoney={gameState.money}
                  handedness={handedness}
                  availableFrogTypes={selectedFrogTypes.length > 0 ? selectedFrogTypes : undefined}
                />
              )}
            </div>

            {/* Desktop: Side panels */}
            <div className="hidden lg:flex flex-row gap-6 justify-center">
              <div className="w-80">
                {showConsumables && hasAnyConsumables ? (
                  <ConsumableSelector
                    consumableState={consumables}
                    onUseConsumable={handleUseConsumable}
                    onDragStart={handleConsumableDragStart}
                    draggingConsumable={draggingConsumable?.type ?? null}
                    activeConsumable={activeConsumable}
                    handedness={handedness}
                  />
                ) : (
                  <FrogSelector
                    selectedFrog={gameState.selectedFrogType}
                    onSelectFrog={handleSelectFrog}
                    onDragStart={handleDragStart}
                    draggingFrogType={dragging?.frogType ?? null}
                    playerMoney={gameState.money}
                    handedness={handedness}
                    availableFrogTypes={selectedFrogTypes.length > 0 ? selectedFrogTypes : undefined}
                  />
                )}
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
          onUnlockAll={handleUnlockAll}
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

      {/* Consumable drag ghost */}
      {draggingConsumable && draggingConsumable.x !== 0 && (() => {
        const LERP_DURATION = 150;
        const elapsed = Date.now() - draggingConsumable.startTime;
        const t = Math.min(1, elapsed / LERP_DURATION);
        const ease = t * (2 - t);
        const offsetY = getDragOffsetY(draggingConsumable.y);
        const offsetX = getDragOffsetX(draggingConsumable.x, draggingConsumable.y);
        const targetX = draggingConsumable.x + offsetX - 30;
        const targetY = draggingConsumable.y + offsetY - 30;
        const lerpX = draggingConsumable.startX - 30 + (targetX - (draggingConsumable.startX - 30)) * ease;
        const lerpY = draggingConsumable.startY - 30 + (targetY - (draggingConsumable.startY - 30)) * ease;
        return (
          <div
            className="fixed pointer-events-none z-50"
            style={{ left: lerpX, top: lerpY }}
          >
            <div className="w-[60px] h-[60px] flex items-center justify-center">
              <ConsumableIcon type={draggingConsumable.type} size={50} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;
