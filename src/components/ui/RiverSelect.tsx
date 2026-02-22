import { RiverDefinition, LevelProgress } from '../../types/game';

interface RiverSelectProps {
  rivers: RiverDefinition[];
  riverProgress: Record<string, LevelProgress[]>;
  onSelectRiver: (riverId: string) => void;
  onOpenSettings: () => void;
  isRiverUnlocked: (riverId: string) => boolean;
}

export function RiverSelect({
  rivers,
  riverProgress,
  onSelectRiver,
  onOpenSettings,
  isRiverUnlocked,
}: RiverSelectProps) {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-teal-200 to-blue-400 flex flex-col items-center relative">
      {/* Settings gear */}
      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 z-30 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Title */}
      <div className="mt-16 mb-8">
        <h1 className="text-5xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] tracking-wider">
          OddFrogs
        </h1>
      </div>

      {/* Carousel */}
      <div className="flex-1 w-full flex items-center overflow-x-auto snap-x snap-mandatory px-8 gap-6 scrollbar-hide">
        {rivers.map(river => {
          const unlocked = isRiverUnlocked(river.id);
          const progress = riverProgress[river.id] || [];
          const completedCount = progress.filter(lp => lp.completed).length;
          const totalStars = progress.reduce((sum, lp) => sum + lp.stars, 0);

          return (
            <div
              key={river.id}
              className="snap-center flex-shrink-0"
              style={{ width: 280 }}
            >
              <button
                onClick={() => unlocked && onSelectRiver(river.id)}
                disabled={!unlocked}
                className={`
                  relative w-[280px] h-[360px] rounded-2xl border-4 shadow-xl
                  flex flex-col items-center justify-center gap-4
                  transition-all duration-200
                  ${unlocked
                    ? 'bg-white/90 border-white/60 cursor-pointer hover:scale-[1.02] active:scale-95'
                    : 'bg-gray-300/80 border-gray-400/60 cursor-not-allowed'
                  }
                `}
              >
                {/* Colored accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-24 rounded-t-xl"
                  style={{
                    background: unlocked
                      ? `linear-gradient(135deg, ${river.color}, ${river.color}88)`
                      : 'linear-gradient(135deg, #9ca3af, #6b7280)',
                  }}
                />

                {/* Lock overlay */}
                {!unlocked && river.unlockRequirement && (
                  <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center z-10">
                    <div className="text-center">
                      <span className="text-5xl block mb-2">&#x1f512;</span>
                      <span className="text-white text-sm font-bold drop-shadow">
                        Earn {river.unlockRequirement.stars} stars in {rivers.find(r => r.id === river.unlockRequirement!.riverId)?.name}
                      </span>
                    </div>
                  </div>
                )}

                {/* River name */}
                <div className="relative z-[1] mt-16">
                  <h2 className="text-2xl font-black text-gray-800 drop-shadow-sm">
                    {river.name}
                  </h2>
                </div>

                {/* Progress */}
                <div className="relative z-[1] text-center">
                  <p className="text-lg font-bold text-gray-600">
                    {completedCount}/{river.levelCount}
                  </p>
                  <p className="text-sm text-gray-500">levels completed</p>
                </div>

                {/* Stars */}
                <div className="relative z-[1] flex items-center gap-1">
                  <svg className="w-5 h-5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-lg font-bold text-gray-600">
                    {totalStars}/{river.levelCount * 3}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
