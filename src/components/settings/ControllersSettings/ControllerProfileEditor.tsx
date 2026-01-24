import { useState, useEffect } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { GamepadState, ButtonAction, getGamepadService } from '../../../services/gamepadService'
import { useInputStore } from '../../../store/inputStore'
import { useUIStore } from '../../../store/uiStore'
import ButtonCaptureModal from './ButtonCaptureModal'

interface ControllerProfileEditorProps {
  controller: GamepadState
  onClose: () => void
}

const BUTTON_ACTIONS: { action: ButtonAction; label: string; description: string }[] = [
  { action: 'confirm', label: 'Confirm', description: 'Select / OK' },
  { action: 'back', label: 'Back', description: 'Cancel / Go back' },
  { action: 'option1', label: 'Option 1', description: 'Context action (favorite, etc.)' },
  { action: 'option2', label: 'Option 2', description: 'Secondary action' },
  { action: 'lb', label: 'Left Bumper', description: 'Previous page / tab' },
  { action: 'rb', label: 'Right Bumper', description: 'Next page / tab' },
  { action: 'start', label: 'Start', description: 'Menu / pause' },
  { action: 'select', label: 'Select', description: 'View toggle' },
  { action: 'dpadUp', label: 'D-Pad Up', description: 'Navigate up' },
  { action: 'dpadDown', label: 'D-Pad Down', description: 'Navigate down' },
  { action: 'dpadLeft', label: 'D-Pad Left', description: 'Navigate left' },
  { action: 'dpadRight', label: 'D-Pad Right', description: 'Navigate right' }
]

function getButtonName(index: number, type: GamepadState['type']): string {
  // Xbox button names
  const xboxNames: Record<number, string> = {
    0: 'A', 1: 'B', 2: 'X', 3: 'Y',
    4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
    8: 'View', 9: 'Menu', 10: 'LS', 11: 'RS',
    12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'Guide'
  }

  // PlayStation button names
  const playstationNames: Record<number, string> = {
    0: '✕', 1: '○', 2: '□', 3: '△',
    4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2',
    8: 'Share', 9: 'Options', 10: 'L3', 11: 'R3',
    12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'PS'
  }

  // Nintendo button names
  const nintendoNames: Record<number, string> = {
    0: 'B', 1: 'A', 2: 'Y', 3: 'X',
    4: 'L', 5: 'R', 6: 'ZL', 7: 'ZR',
    8: '-', 9: '+', 10: 'LS', 11: 'RS',
    12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'Home'
  }

  switch (type) {
    case 'playstation':
      return playstationNames[index] ?? `Button ${index}`
    case 'nintendo':
      return nintendoNames[index] ?? `Button ${index}`
    case 'xbox':
    default:
      return xboxNames[index] ?? `Button ${index}`
  }
}

export default function ControllerProfileEditor({
  controller,
  onClose
}: ControllerProfileEditorProps) {
  const { controllerMappings, updateMapping, deleteMapping } = useInputStore()
  const { addToast } = useUIStore()

  const [mappings, setMappings] = useState<Partial<Record<ButtonAction, number>>>({})
  const [capturingAction, setCapturingAction] = useState<ButtonAction | null>(null)

  // Load existing mapping or use defaults
  useEffect(() => {
    const existing = controllerMappings[controller.id]
    if (existing) {
      setMappings(existing.buttonMappings as Record<ButtonAction, number>)
    } else {
      // Use default mapping for controller type
      const defaults = getGamepadService().getDefaultMapping(controller.type)
      setMappings(defaults)
    }
  }, [controller.id, controller.type, controllerMappings])

  const handleStartCapture = (action: ButtonAction) => {
    setCapturingAction(action)
  }

  const handleCaptureButton = (buttonIndex: number) => {
    if (capturingAction) {
      setMappings(prev => ({
        ...prev,
        [capturingAction]: buttonIndex
      }))
      setCapturingAction(null)
    }
  }

  const handleCancelCapture = () => {
    setCapturingAction(null)
  }

  const handleSave = () => {
    updateMapping(controller.id, {
      id: controller.id,
      name: controller.name,
      type: controller.type,
      buttonMappings: mappings,
      axisMappings: {}
    })
    addToast('success', 'Controller mapping saved')
    onClose()
  }

  const handleReset = () => {
    const defaults = getGamepadService().getDefaultMapping(controller.type)
    setMappings(defaults)
    addToast('info', 'Reset to default mapping')
  }

  const handleClearProfile = () => {
    deleteMapping(controller.id)
    addToast('info', 'Custom mapping removed')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-surface-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <div>
            <h3 className="text-lg font-semibold">{controller.name}</h3>
            <p className="text-surface-400 text-sm">Player {controller.index + 1}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-700 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          <p className="text-surface-400 text-sm mb-4">
            Click on a button to remap it. Press any button on your controller to assign it.
          </p>

          <div className="space-y-2">
            {BUTTON_ACTIONS.map(({ action, label, description }) => (
              <div
                key={action}
                className="flex items-center justify-between p-3 bg-surface-800 rounded-lg"
              >
                <div>
                  <span className="font-medium">{label}</span>
                  <span className="text-surface-400 text-sm ml-2">— {description}</span>
                </div>
                <button
                  onClick={() => handleStartCapture(action)}
                  className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm font-mono"
                >
                  {getButtonName(mappings[action] ?? 0, controller.type)}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-700">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-2 bg-surface-700 hover:bg-surface-600 rounded text-sm"
            >
              <RotateCcw size={14} />
              Reset to Defaults
            </button>
            {controllerMappings[controller.id] && (
              <button
                onClick={handleClearProfile}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
              >
                Remove Custom Profile
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-accent hover:bg-accent-hover rounded"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Button Capture Modal */}
      {capturingAction && (
        <ButtonCaptureModal
          controller={controller}
          action={capturingAction}
          onCapture={handleCaptureButton}
          onCancel={handleCancelCapture}
        />
      )}
    </div>
  )
}
