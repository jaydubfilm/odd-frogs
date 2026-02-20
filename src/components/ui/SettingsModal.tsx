interface SettingsModalProps {
  handedness: 'left' | 'right';
  onHandednessChange: (value: 'left' | 'right') => void;
  onClose: () => void;
}

export function SettingsModal({ handedness, onHandednessChange, onClose }: SettingsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-72"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            x
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Handedness
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onHandednessChange('left')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                handedness === 'left'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Left
            </button>
            <button
              onClick={() => onHandednessChange('right')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                handedness === 'right'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Right
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
