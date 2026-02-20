import { useRef, useCallback } from 'react';
import { FrogType } from '../../types/game';
import { FROG_STATS } from '@data/constants';
import { FrogPreview } from './FrogPreview';
import { CoinIcon } from './CoinIcon';

interface FrogSelectorProps {
  selectedFrog: FrogType | null;
  onSelectFrog: (frogType: FrogType) => void;
  onDragStart?: (frogType: FrogType, startX: number, startY: number) => void;
  draggingFrogType?: FrogType | null;
  playerMoney: number;
  handedness?: 'left' | 'right';
}

export const FrogSelector = ({
  selectedFrog,
  onSelectFrog,
  onDragStart,
  draggingFrogType,
  playerMoney,
  handedness = 'right',
}: FrogSelectorProps) => {
  const frogTypes = Object.values(FrogType);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, frogType: FrogType) => {
    const stats = FROG_STATS[frogType];
    if (playerMoney < stats.cost) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  }, [playerMoney]);

  const handlePointerMove = useCallback((e: React.PointerEvent, frogType: FrogType) => {
    if (!dragStartPos.current || !onDragStart) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      // Pass the original button center as start position
      const btn = (e.target as HTMLElement).closest('button');
      const rect = btn?.getBoundingClientRect();
      const sx = rect ? rect.left + rect.width / 2 : dragStartPos.current.x;
      const sy = rect ? rect.top + rect.height / 2 : dragStartPos.current.y;
      onDragStart(frogType, sx, sy);
      dragStartPos.current = null;
    }
  }, [onDragStart]);

  const handlePointerUp = useCallback((_e: React.PointerEvent, frogType: FrogType) => {
    if (dragStartPos.current) {
      onSelectFrog(frogType);
      dragStartPos.current = null;
    }
  }, [onSelectFrog]);

  return (
    <div className="bg-white/90 rounded-lg p-2 shadow-lg">
      <div className={`flex gap-2 ${handedness === 'right' ? 'justify-end' : 'justify-start'}`}>
        {frogTypes.map(frogType => {
            const stats = FROG_STATS[frogType];
            const canAfford = playerMoney >= stats.cost;
            const isSelected = selectedFrog === frogType;
            const isDragging = draggingFrogType === frogType;

            return (
              <button
                key={frogType}
                onPointerDown={(e) => handlePointerDown(e, frogType)}
                onPointerMove={(e) => handlePointerMove(e, frogType)}
                onPointerUp={(e) => handlePointerUp(e, frogType)}
                disabled={!canAfford}
                className={`
                flex flex-col items-center gap-1 p-2 rounded-lg touch-none
                ${isSelected ? 'ring-2 ring-yellow-400 bg-yellow-50' : 'bg-white'}
                ${canAfford ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                border-2 border-gray-300
              `}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  {isDragging ? (
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300" />
                  ) : (
                    <FrogPreview frogType={frogType} size={48} />
                  )}
                </div>
                <div className="font-bold text-sm text-green-600 flex items-center gap-0.5 justify-center"><CoinIcon size={14} />{stats.cost}</div>
              </button>
            );
          })}
      </div>
    </div>
  );
};
