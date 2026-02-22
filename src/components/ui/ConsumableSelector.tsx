import { useRef, useCallback } from 'react';
import { ConsumableType, ConsumableInventory } from '../../types/game';
import { CONSUMABLE_CONFIG } from '@data/constants';

interface ConsumableSelectorProps {
  consumableState: Record<ConsumableType, ConsumableInventory>;
  onUseConsumable: (type: ConsumableType) => void;
  onDragStart?: (type: ConsumableType, startX: number, startY: number) => void;
  draggingConsumable: ConsumableType | null;
  activeConsumable: ConsumableType | null;
  handedness?: 'left' | 'right';
}


function RainIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path d="M16 4 C16 4 8 14 8 20 C8 24.4 11.6 28 16 28 C20.4 28 24 24.4 24 20 C24 14 16 4 16 4Z" fill="#60A5FA" stroke="#2563EB" strokeWidth="1.5" />
      <ellipse cx="13" cy="18" rx="2" ry="3" fill="#93C5FD" opacity="0.6" />
    </svg>
  );
}

function HealIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path d="M16 6 C13 6 10 8 10 12 C10 18 16 26 16 26 C16 26 22 18 22 12 C22 8 19 6 16 6Z" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5" />
      <path d="M16 6 C13 6 10 8 10 12 C10 18 16 26 16 26 C16 26 22 18 22 12 C22 8 19 6 16 6Z" fill="#F87171" />
      <path d="M14 12 h4 M16 10 v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WhirlpoolIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="12" fill="none" stroke="#818CF8" strokeWidth="2" strokeDasharray="6 4" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="#6366F1" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="16" cy="16" r="3" fill="#4F46E5" />
    </svg>
  );
}

function ConsumableIcon({ type, size }: { type: ConsumableType; size: number }) {
  switch (type) {
    case ConsumableType.RAIN: return <RainIcon size={size} />;
    case ConsumableType.HEAL: return <HealIcon size={size} />;
    case ConsumableType.WHIRLPOOL: return <WhirlpoolIcon size={size} />;
  }
}

export const ConsumableSelector = ({
  consumableState,
  onUseConsumable,
  onDragStart,
  draggingConsumable,
  activeConsumable,
  handedness = 'right',
}: ConsumableSelectorProps) => {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragType = useRef<ConsumableType | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, type: ConsumableType) => {
    const inv = consumableState[type];
    if (inv.count <= 0 || (inv.cooldownUntil > 0 && Date.now() < inv.cooldownUntil)) return;

    if (type === ConsumableType.WHIRLPOOL) {
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      dragType.current = type;
    }
  }, [consumableState]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartPos.current || !onDragStart || dragType.current !== ConsumableType.WHIRLPOOL) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      const btn = (e.target as HTMLElement).closest('button');
      const rect = btn?.getBoundingClientRect();
      const sx = rect ? rect.left + rect.width / 2 : dragStartPos.current.x;
      const sy = rect ? rect.top + rect.height / 2 : dragStartPos.current.y;
      onDragStart(ConsumableType.WHIRLPOOL, sx, sy);
      dragStartPos.current = null;
      dragType.current = null;
    }
  }, [onDragStart]);

  const handlePointerUp = useCallback((_e: React.PointerEvent, type: ConsumableType) => {
    dragStartPos.current = null;
    dragType.current = null;
    onUseConsumable(type);
  }, [onUseConsumable]);

  const types = [ConsumableType.RAIN, ConsumableType.HEAL, ConsumableType.WHIRLPOOL];

  const available = types.filter(type => consumableState[type].count > 0);

  return (
    <div className="bg-white/90 rounded-lg p-2 shadow-lg">
      <div className="flex gap-2 justify-center items-center min-h-[88px]">
        {available.length === 0 ? (
          <span className="text-gray-400 text-sm font-medium">no consumables</span>
        ) : available.map(type => {
          const inv = consumableState[type];
          const now = Date.now();
          const onCooldown = inv.count > 0 && inv.cooldownUntil > 0 && now < inv.cooldownUntil;
          const cooldownFraction = onCooldown
            ? (inv.cooldownUntil - now) / CONSUMABLE_CONFIG.COOLDOWN_MS
            : 0;
          const disabled = inv.count <= 0 || onCooldown;
          const isDragging = draggingConsumable === type;
          const isSelected = activeConsumable === type;

          return (
            <button
              key={type}
              onPointerDown={(e) => handlePointerDown(e, type)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, type)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center gap-1 p-2 rounded-lg touch-none overflow-hidden
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                ${isSelected ? 'bg-indigo-100 border-2 border-indigo-500 ring-2 ring-indigo-300' : 'bg-white border-2 border-gray-300'}
              `}
            >
              <div className="w-12 h-12 flex items-center justify-center">
                {isDragging ? (
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300" />
                ) : (
                  <ConsumableIcon type={type} size={40} />
                )}
              </div>
              <div className="font-bold text-sm text-gray-600">x{inv.count}</div>
              {onCooldown && (
                <div
                  className="absolute inset-x-0 top-0 bg-black/50 pointer-events-none"
                  style={{ height: `${cooldownFraction * 100}%` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { ConsumableIcon };
