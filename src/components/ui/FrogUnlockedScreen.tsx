import { FrogType } from '../../types/game';
import { FROG_STATS } from '@data/constants';
import { FrogPreview } from './FrogPreview';

interface FrogUnlockedScreenProps {
  frogType: FrogType;
  onContinue: () => void;
}

const FROG_DESCRIPTIONS: Record<FrogType, { name: string; desc: string }> = {
  [FrogType.GREEN]: { name: 'Green Frog', desc: 'A balanced fighter with solid damage.' },
  [FrogType.BLUE]: { name: 'Blue Frog', desc: 'Rapid-fire attacks shred swarms of small enemies.' },
  [FrogType.RED]: { name: 'Red Frog', desc: 'Long-range artillery with area damage. Watch the dead zone!' },
  [FrogType.YELLOW]: { name: 'Yellow Frog', desc: 'Slows enemies to a crawl. Pairs well with heavy hitters.' },
  [FrogType.PURPLE]: { name: 'Purple Frog', desc: 'Infinite range sniper. Blocked by other frogs, so place wisely.' },
};

export function FrogUnlockedScreen({ frogType, onContinue }: FrogUnlockedScreenProps) {
  const stats = FROG_STATS[frogType];
  const info = FROG_DESCRIPTIONS[frogType];

  return (
    <div className="w-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-teal-200 to-blue-400"
      style={{ height: '100dvh' }}
    >
      {/* Glow ring behind frog */}
      <div className="relative flex items-center justify-center mb-6">
        <div
          className="absolute w-40 h-40 rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${stats.color}66 0%, transparent 70%)` }}
        />
        <div className="relative">
          <FrogPreview frogType={frogType} size={120} />
        </div>
      </div>

      <p className="text-white/80 text-sm font-bold uppercase tracking-widest mb-1">New Frog Unlocked!</p>
      <h1 className="text-3xl font-black text-white drop-shadow-lg mb-3">{info.name}</h1>

      {/* Description */}
      <p className="text-white/90 text-center text-sm max-w-[280px] mb-6 leading-relaxed">
        {info.desc}
      </p>

      {/* Stat chips */}
      <div className="flex gap-3 mb-8">
        <StatChip label="DMG" value={stats.damage} />
        <StatChip label="SPD" value={stats.attackSpeed} />
        <StatChip label="RNG" value={stats.range === 999 ? 'MAX' : stats.range} />
        <StatChip label="COST" value={stats.cost} />
      </div>

      <button
        onClick={onContinue}
        className="px-10 py-3 bg-white rounded-xl text-lg font-bold shadow-lg active:scale-95 transition-all"
      >
        Continue
      </button>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center bg-white/20 rounded-lg px-3 py-1.5">
      <span className="text-[10px] font-bold text-white/70 uppercase">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}
