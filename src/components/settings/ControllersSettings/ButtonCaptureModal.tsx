import { useEffect, useState, useRef } from 'react'
import { Gamepad2 } from 'lucide-react'
import { GamepadState, ButtonAction, getGamepadService } from '../../../services/gamepadService'

interface ButtonCaptureModalProps {
  controller: GamepadState
  action: ButtonAction
  onCapture: (buttonIndex: number) => void
  onCancel: () => void
}

const ACTION_LABELS: Record<ButtonAction, string> = {
  confirm: 'Confirm',
  back: 'Back',
  option1: 'Option 1',
  option2: 'Option 2',
  lb: 'Left Bumper',
  rb: 'Right Bumper',
  lt: 'Left Trigger',
  rt: 'Right Trigger',
  select: 'Select',
  start: 'Start',
  l3: 'Left Stick Click',
  r3: 'Right Stick Click',
  dpadUp: 'D-Pad Up',
  dpadDown: 'D-Pad Down',
  dpadLeft: 'D-Pad Left',
  dpadRight: 'D-Pad Right',
  home: 'Home'
}

export default function ButtonCaptureModal({
  controller,
  action,
  onCapture,
  onCancel
}: ButtonCaptureModalProps) {
  const [pressedButtons, setPressedButtons] = useState<number[]>([])
  const previousStates = useRef<boolean[]>([])

  useEffect(() => {
    const service = getGamepadService()
    let animationFrameId: number

    // Initialize previous states
    const gamepad = service.getGamepad(controller.index)
    if (gamepad) {
      previousStates.current = gamepad.buttons.map(b => b.pressed)
    }

    const poll = () => {
      const gamepad = service.getGamepad(controller.index)
      if (!gamepad) {
        animationFrameId = requestAnimationFrame(poll)
        return
      }

      // Update pressed buttons display
      const currentlyPressed = gamepad.buttons
        .map((b, i) => b.pressed ? i : -1)
        .filter(i => i >= 0)
      setPressedButtons(currentlyPressed)

      // Check for just-pressed button
      for (let i = 0; i < gamepad.buttons.length; i++) {
        const isPressed = gamepad.buttons[i].pressed
        const wasPressed = previousStates.current[i] ?? false

        if (isPressed && !wasPressed) {
          // Button was just pressed
          onCapture(i)
          return
        }
      }

      // Update previous states
      previousStates.current = gamepad.buttons.map(b => b.pressed)
      animationFrameId = requestAnimationFrame(poll)
    }

    animationFrameId = requestAnimationFrame(poll)

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [controller.index, onCapture, onCancel])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="bg-surface-800 rounded-xl p-8 text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-accent animate-pulse" />
        </div>

        <h3 className="text-xl font-semibold mb-2">
          Press a Button for "{ACTION_LABELS[action]}"
        </h3>

        <p className="text-surface-400 mb-6">
          Press any button on your controller to assign it
        </p>

        {/* Button visualization */}
        <div className="flex justify-center gap-1 mb-6">
          {Array.from({ length: Math.min(controller.buttons.length, 16) }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                pressedButtons.includes(i)
                  ? 'bg-accent scale-125'
                  : 'bg-surface-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={onCancel}
          className="px-6 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
        >
          Cancel (Esc)
        </button>
      </div>
    </div>
  )
}
