import { useGamepad } from '../../hooks/useGamepad'

interface ControllerHint {
  button: string
  label: string
}

interface BPControllerHintsProps {
  hints: ControllerHint[]
}

// Button display mappings by controller type
const BUTTON_GLYPHS = {
  xbox: {
    A: 'A',
    B: 'B',
    X: 'X',
    Y: 'Y',
    LB: 'LB',
    RB: 'RB',
    'LB/RB': 'LB/RB',
    Menu: '☰',
    View: '⧉'
  },
  playstation: {
    A: '✕',
    B: '○',
    X: '□',
    Y: '△',
    LB: 'L1',
    RB: 'R1',
    'LB/RB': 'L1/R1',
    Menu: 'OPTIONS',
    View: 'SHARE'
  },
  nintendo: {
    A: 'A',
    B: 'B',
    X: 'X',
    Y: 'Y',
    LB: 'L',
    RB: 'R',
    'LB/RB': 'L/R',
    Menu: '+',
    View: '-'
  },
  generic: {
    A: 'A',
    B: 'B',
    X: 'X',
    Y: 'Y',
    LB: 'LB',
    RB: 'RB',
    'LB/RB': 'LB/RB',
    Menu: 'Start',
    View: 'Select'
  }
}

export default function BPControllerHints({ hints }: BPControllerHintsProps) {
  const { activeGamepad } = useGamepad()

  const controllerType = activeGamepad?.type ?? 'xbox'
  const glyphs = BUTTON_GLYPHS[controllerType]

  return (
    <div className="flex-shrink-0 bg-surface-900/90 backdrop-blur-lg border-t border-surface-800 px-8 py-3">
      <div className="flex items-center justify-center gap-8">
        {hints.map((hint, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-2 bg-surface-700 rounded-lg font-mono text-sm font-medium">
              {glyphs[hint.button as keyof typeof glyphs] || hint.button}
            </span>
            <span className="text-surface-300 text-sm">{hint.label}</span>
          </div>
        ))}

        {/* Show controller status */}
        <div className="ml-auto flex items-center gap-2">
          {activeGamepad ? (
            <>
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-surface-400 text-sm">{activeGamepad.name}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-surface-500 rounded-full" />
              <span className="text-surface-500 text-sm">No controller</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
