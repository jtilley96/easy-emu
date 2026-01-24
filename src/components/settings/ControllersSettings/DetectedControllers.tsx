import { Gamepad2, Check } from 'lucide-react'
import { GamepadState } from '../../../services/gamepadService'

interface DetectedControllersProps {
  gamepads: GamepadState[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

function getControllerIcon(type: GamepadState['type']): string {
  switch (type) {
    case 'xbox':
      return '🎮'
    case 'playstation':
      return '🎮'
    case 'nintendo':
      return '🕹️'
    default:
      return '🎮'
  }
}

function getControllerTypeName(type: GamepadState['type']): string {
  switch (type) {
    case 'xbox':
      return 'Xbox'
    case 'playstation':
      return 'PlayStation'
    case 'nintendo':
      return 'Nintendo'
    default:
      return 'Generic'
  }
}

export default function DetectedControllers({
  gamepads,
  selectedIndex,
  onSelect
}: DetectedControllersProps) {
  if (gamepads.length === 0) {
    return (
      <div className="bg-surface-800 rounded-lg p-6 text-center">
        <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-surface-500" />
        <p className="text-surface-400 mb-2">No controllers detected</p>
        <p className="text-surface-500 text-sm">
          Connect a controller and press a button to detect it
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {gamepads.map((gamepad) => (
        <button
          key={gamepad.index}
          onClick={() => onSelect(gamepad.index)}
          className={`w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors ${
            selectedIndex === gamepad.index
              ? 'bg-accent/20 border border-accent'
              : 'bg-surface-800 hover:bg-surface-700 border border-transparent'
          }`}
        >
          <span className="text-2xl" role="img" aria-label="controller">
            {getControllerIcon(gamepad.type)}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{gamepad.name}</span>
              <span className="text-xs px-2 py-0.5 bg-surface-600 rounded-full">
                {getControllerTypeName(gamepad.type)}
              </span>
            </div>
            <p className="text-surface-400 text-sm truncate">
              Player {gamepad.index + 1} • {gamepad.buttons.length} buttons
            </p>
          </div>

          <div className="flex items-center gap-2">
            {gamepad.connected && (
              <span className="flex items-center gap-1 text-green-400 text-sm">
                <Check size={14} />
                Connected
              </span>
            )}

            {/* Button activity indicator */}
            <div className="flex gap-0.5">
              {gamepad.buttons.slice(0, 4).map((button, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    button.pressed ? 'bg-accent' : 'bg-surface-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
