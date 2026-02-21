import { useState, useRef, useCallback, useMemo } from 'react';
import { FrogType, FoodType, LevelData, CellType } from '../../types/game';
import { FROG_STATS, FROG_UNLOCK_LEVEL, GAME_CONFIG, COLORS } from '@data/constants';
import { FrogPreview } from './FrogPreview';

interface FrogSelectionScreenProps {
  level: LevelData;
  levelNumber: number;
  unlockedFrogTypes: FrogType[];
  purchaseSlots: number;
  onConfirm: (chosenFrogs: FrogType[]) => void;
  onBack: () => void;
}

const ALL_FROGS = [FrogType.GREEN, FrogType.BLUE, FrogType.RED, FrogType.YELLOW, FrogType.PURPLE];

const DRAG_THRESHOLD = 8;

export function FrogSelectionScreen({
  level,
  levelNumber,
  unlockedFrogTypes,
  purchaseSlots,
  onConfirm,
  onBack,
}: FrogSelectionScreenProps) {
  const [selectedFrogs, setSelectedFrogs] = useState<(FrogType | null)[]>(() => {
    if (unlockedFrogTypes.length <= purchaseSlots) {
      const slots: (FrogType | null)[] = [...unlockedFrogTypes];
      while (slots.length < purchaseSlots) slots.push(null);
      return slots;
    }
    return Array(purchaseSlots).fill(null);
  });

  // Drag state
  const [dragFrog, setDragFrog] = useState<FrogType | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragSourceSlot, setDragSourceSlot] = useState<number | null>(null);
  const pointerStart = useRef<{ x: number; y: number; frog: FrogType; sourceSlot: number | null } | null>(null);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleRosterPointerDown = useCallback((e: React.PointerEvent, frogType: FrogType) => {
    if (!unlockedFrogTypes.includes(frogType)) return;
    if (selectedFrogs.includes(frogType)) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerStart.current = { x: e.clientX, y: e.clientY, frog: frogType, sourceSlot: null };
  }, [unlockedFrogTypes, selectedFrogs]);

  const handleSlotPointerDown = useCallback((e: React.PointerEvent, index: number) => {
    const frog = selectedFrogs[index];
    if (!frog) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerStart.current = { x: e.clientX, y: e.clientY, frog, sourceSlot: index };
  }, [selectedFrogs]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (!dragFrog && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      setDragFrog(pointerStart.current.frog);
      setDragSourceSlot(pointerStart.current.sourceSlot);
    }
    if (dragFrog || Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  }, [dragFrog]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;

    if (!start) return;

    // Was this a tap (no drag started)?
    if (!dragFrog) {
      if (start.sourceSlot !== null) {
        // Tap on a filled slot -> remove
        setSelectedFrogs(prev => {
          const updated = [...prev];
          updated[start.sourceSlot!] = null;
          return updated;
        });
      } else {
        // Tap on roster frog -> add to next empty slot
        setSelectedFrogs(prev => {
          const emptyIndex = prev.indexOf(null);
          if (emptyIndex === -1) return prev;
          const updated = [...prev];
          updated[emptyIndex] = start.frog;
          return updated;
        });
      }
      return;
    }

    // Drag ended - find which slot we dropped on
    const dropX = e.clientX;
    const dropY = e.clientY;
    let targetSlot = -1;

    for (let i = 0; i < slotRefs.current.length; i++) {
      const el = slotRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
        targetSlot = i;
        break;
      }
    }

    setSelectedFrogs(prev => {
      const updated = [...prev];

      // Remove from source slot if dragging from a slot
      if (dragSourceSlot !== null) {
        updated[dragSourceSlot] = null;
      }

      if (targetSlot >= 0) {
        const existing = updated[targetSlot];
        if (existing && dragSourceSlot !== null) {
          // Swap: put the displaced frog back into the source slot
          updated[dragSourceSlot] = existing;
        } else if (existing) {
          // Dragging from roster onto an occupied slot - put existing back, place new
          // Don't place since slot is occupied by a different frog
          // Actually let's swap: remove existing, place dragged
          updated[targetSlot] = dragFrog;
          // existing goes back to roster (just clear the slot, it returns automatically)
        }
        if (!existing || dragSourceSlot !== null) {
          updated[targetSlot] = dragFrog;
        } else {
          updated[targetSlot] = dragFrog;
        }
      }
      // If dropped outside all slots (targetSlot === -1) and came from a slot,
      // it was already cleared above (effectively removing it).
      return updated;
    });

    setDragFrog(null);
    setDragPos(null);
    setDragSourceSlot(null);
  }, [dragFrog, dragSourceSlot]);

  const handlePointerCancel = useCallback(() => {
    pointerStart.current = null;
    setDragFrog(null);
    setDragPos(null);
    setDragSourceSlot(null);
  }, []);

  const filledCount = selectedFrogs.filter(f => f !== null).length;
  const canStart = filledCount >= 1;

  const isInSlot = (frogType: FrogType) => selectedFrogs.includes(frogType);
  // While dragging from a slot, that frog is visually "lifted" so treat its slot as empty
  const isVisuallyInSlot = (frogType: FrogType) => {
    if (dragFrog === frogType && dragSourceSlot !== null) return false;
    return selectedFrogs.includes(frogType);
  };

  // Tally enemy counts across all waves
  const enemyCounts = useMemo(() => {
    const counts = new Map<FoodType, number>();
    for (const wave of level.waves) {
      for (const food of wave.foods) {
        counts.set(food.type, (counts.get(food.type) ?? 0) + food.count);
      }
    }
    return counts;
  }, [level.waves]);

  return (
    <div
      className="w-full bg-gradient-to-b from-teal-200 to-blue-400 flex flex-col overflow-hidden"
      style={{ height: '100dvh' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Header */}
      <div className="flex items-center px-4 py-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-white rounded-lg shadow text-sm font-bold"
        >
          &larr; Back
        </button>
        <h2 className="flex-1 text-center text-xl font-bold text-white drop-shadow">
          Level {levelNumber}
        </h2>
        <div className="w-16" />
      </div>

      {/* Level Preview + Enemy List */}
      <div className="flex-1 flex justify-center items-center px-4 min-h-0 gap-3">
        {/* Enemy summary - vertical column */}
        {enemyCounts.size > 0 && (
          <div className="flex flex-col gap-1.5">
            {Array.from(enemyCounts.entries()).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1 bg-white/30 rounded-full px-2 py-0.5">
                <FoodIcon type={type} />
                <span className="text-xs font-bold text-white drop-shadow">x{count}</span>
              </div>
            ))}
          </div>
        )}
        <LevelPreviewSVG level={level} />
      </div>

      {/* Bottom section: roster, slots, start */}
      <div className="flex-shrink-0 px-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 16px))' }}>
        {/* Roster */}
        <div className="py-2">
          <p className="text-white font-bold text-sm mb-2 drop-shadow text-center">Your Frogs</p>
          <div className="flex gap-3 justify-center">
            {ALL_FROGS.map(frogType => {
              const unlocked = unlockedFrogTypes.includes(frogType);
              const inSlot = isVisuallyInSlot(frogType);
              const unlockLevel = FROG_UNLOCK_LEVEL[frogType];
              const isBeingDragged = dragFrog === frogType && dragSourceSlot === null;

              return (
                <button
                  key={frogType}
                  disabled={!unlocked || inSlot}
                  onPointerDown={(e) => handleRosterPointerDown(e, frogType)}
                  className={`
                    w-14 h-14 rounded-xl border-2 flex items-center justify-center relative touch-none select-none
                    ${unlocked && !inSlot && !isBeingDragged
                      ? 'bg-white border-gray-300 cursor-pointer hover:border-yellow-400 active:scale-95'
                      : unlocked && (inSlot || isBeingDragged)
                        ? 'bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed'
                        : 'bg-gray-400 border-gray-500 cursor-not-allowed'
                    }
                    transition-all
                  `}
                >
                  {unlocked ? (
                    isBeingDragged ? (
                      <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300" />
                    ) : (
                      <FrogPreview frogType={frogType} size={36} />
                    )
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-[10px] font-bold text-gray-600">Lv {unlockLevel}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots */}
        <div className="py-2">
          <p className="text-white font-bold text-sm mb-2 drop-shadow text-center">
            Bring to Battle ({filledCount}/{purchaseSlots})
          </p>
          <div className="flex gap-3 justify-center">
            {selectedFrogs.map((frog, index) => {
              const isLiftedFromHere = dragSourceSlot === index;
              const displayFrog = isLiftedFromHere ? null : frog;

              return (
                <button
                  key={index}
                  ref={el => { slotRefs.current[index] = el; }}
                  onPointerDown={(e) => handleSlotPointerDown(e, index)}
                  className={`
                    w-14 h-14 rounded-full border-2 flex items-center justify-center touch-none select-none
                    transition-all
                    ${displayFrog
                      ? 'bg-white border-yellow-400 cursor-pointer hover:border-red-400 active:scale-95'
                      : 'bg-white/20 border-dashed border-white/60 cursor-default'
                    }
                  `}
                >
                  {displayFrog ? (
                    <FrogPreview frogType={displayFrog} size={36} />
                  ) : (
                    <span className="text-white/40 text-2xl">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center pt-2">
          <button
            disabled={!canStart}
            onClick={() => onConfirm(selectedFrogs.filter((f): f is FrogType => f !== null))}
            className={`
              px-12 py-3 rounded-xl text-xl font-bold shadow-lg transition-all
              ${canStart
                ? 'bg-green-500 hover:bg-green-600 text-white active:scale-95 shadow-green-500/40'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }
            `}
          >
            START
          </button>
        </div>
      </div>

      {/* Floating drag preview */}
      {dragFrog && dragPos && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x - 28,
            top: dragPos.y - 28,
          }}
        >
          <div className="w-14 h-14 rounded-full bg-white/80 shadow-lg flex items-center justify-center border-2 border-yellow-400">
            <FrogPreview frogType={dragFrog} size={40} />
          </div>
        </div>
      )}
    </div>
  );
}

/** SVG-based miniature level preview showing grid cells and stream paths */
function LevelPreviewSVG({ level }: { level: LevelData }) {
  const { cellSize, gridRows, gridCols } = GAME_CONFIG;
  const topMargin = 60;
  const leftMargin = 60;
  const fullWidth = GAME_CONFIG.canvasWidth;
  const fullHeight = GAME_CONFIG.canvasHeight;

  // Scale to fit ~300px wide
  const scale = 300 / fullWidth;
  const displayWidth = fullWidth * scale;
  const displayHeight = fullHeight * scale;

  // Build cell positions
  const cells: { x: number; y: number; type: CellType }[] = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cellType = level.gridLayout[row]?.[col] ?? CellType.EMPTY;
      cells.push({
        x: col * cellSize + cellSize / 2 + leftMargin,
        y: row * cellSize + cellSize / 2 + topMargin,
        type: cellType,
      });
    }
  }

  // Build stream polylines from smoothPath points
  const streamPolylines = level.streams.map(stream => {
    if (!stream.smoothPath || stream.smoothPath.points.length === 0) return '';
    return stream.smoothPath.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }).filter(Boolean);

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg bg-gradient-to-b from-sky-300 to-blue-500"
      style={{ width: displayWidth, height: displayHeight }}
    >
      <svg
        width={displayWidth}
        height={displayHeight}
        viewBox={`0 0 ${fullWidth} ${fullHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect width={fullWidth} height={fullHeight} fill="url(#previewWaterGrad)" />
        <defs>
          <linearGradient id="previewWaterGrad" x1="0" y1="0" x2="0" y2={fullHeight}>
            <stop offset="0%" stopColor={COLORS.WATER_LIGHT} />
            <stop offset="100%" stopColor={COLORS.WATER_DARK} />
          </linearGradient>
        </defs>

        {/* Streams */}
        {streamPolylines.map((d, i) => (
          <path
            key={`stream-${i}`}
            d={d}
            stroke={COLORS.STREAM}
            strokeWidth={18}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
        ))}

        {/* Grid cells */}
        {cells.map((cell, i) => {
          const r = cellSize * 0.25;
          switch (cell.type) {
            case CellType.LILYPAD:
              return <circle key={i} cx={cell.x} cy={cell.y} r={r} fill={COLORS.LILYPAD} stroke="#78C878" strokeWidth={2} />;
            case CellType.LILYPAD_WITH_LILY:
              return (
                <g key={i}>
                  <circle cx={cell.x} cy={cell.y} r={r} fill={COLORS.LILYPAD} stroke="#78C878" strokeWidth={2} />
                  <circle cx={cell.x} cy={cell.y} r={r * 0.4} fill={COLORS.LILY} />
                </g>
              );
            case CellType.ROCK:
              return <circle key={i} cx={cell.x} cy={cell.y} r={r} fill={COLORS.ROCK} stroke="#666" strokeWidth={2} />;
            default:
              return null;
          }
        })}
      </svg>
    </div>
  );
}

const FOOD_COLORS: Record<FoodType, { fill: string; stroke: string; label: string }> = {
  [FoodType.APPLE]: { fill: '#E53935', stroke: '#B71C1C', label: 'Apple' },
  [FoodType.BURGER]: { fill: '#8D6E63', stroke: '#5D4037', label: 'Burger' },
  [FoodType.CAKE]: { fill: '#F48FB1', stroke: '#C2185B', label: 'Cake' },
  [FoodType.BEANS]: { fill: '#FF8A65', stroke: '#BF360C', label: 'Beans' },
  [FoodType.PIZZA]: { fill: '#FDD835', stroke: '#F9A825', label: 'Pizza' },
  [FoodType.DONUT]: { fill: '#D4A056', stroke: '#8D6E63', label: 'Donut' },
  [FoodType.CHERRY]: { fill: '#C62828', stroke: '#8E0000', label: 'Cherry' },
};

function FoodIcon({ type }: { type: FoodType }) {
  const { fill, stroke } = FOOD_COLORS[type] ?? { fill: '#999', stroke: '#666' };
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <circle cx={8} cy={8} r={6} fill={fill} stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}
