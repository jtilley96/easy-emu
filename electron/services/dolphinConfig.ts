/**
 * Dolphin Emulator Controller Configuration
 * Automatically configures GCPadNew.ini based on detected controller type
 */

import path from 'path'
import fs from 'fs'
import os from 'os'

export type ControllerType = 'xbox' | 'playstation' | 'nintendo' | 'generic'

/**
 * Get Dolphin's user configuration directory
 */
function getDolphinConfigDir(): string {
  switch (process.platform) {
    case 'win32':
      // Windows: Documents\Dolphin Emulator\Config
      return path.join(os.homedir(), 'Documents', 'Dolphin Emulator', 'Config')
    case 'darwin':
      // macOS: ~/Library/Application Support/Dolphin/Config
      return path.join(os.homedir(), 'Library', 'Application Support', 'Dolphin', 'Config')
    default:
      // Linux: ~/.config/dolphin-emu
      return path.join(os.homedir(), '.config', 'dolphin-emu')
  }
}

/**
 * Generate GCPad configuration for a specific controller type
 * Maps the controller to standard GameCube layout
 * @param controllerType - The type of controller (xbox, playstation, nintendo, generic)
 * @param playerIndex - The player port (1-4)
 * @param deviceName - Optional actual device name from Gamepad API (for Bluetooth controllers)
 */
function generateGCPadConfig(controllerType: ControllerType, playerIndex: number = 1, deviceName?: string): string {
  // Dolphin uses XInput on Windows, SDL on Linux/macOS
  // XInput is the most reliable for Xbox controllers on Windows
  const isWindows = process.platform === 'win32'

  // Device string varies by platform
  // SDL/0/Xbox One Controller for Xbox controllers (Dolphin uses SDL even on Windows)
  // SDL/0/Controller Name for others
  let device: string

  // If an actual device name is provided (e.g., from Gamepad API), use it
  // This handles Bluetooth controllers like "Xbox Wireless Controller"
  if (deviceName) {
    device = `SDL/0/${deviceName}`
  } else if (controllerType === 'xbox') {
    // Fallback: Dolphin uses SDL device format for Xbox controllers
    device = 'SDL/0/Xbox One Controller'
  } else if (isWindows) {
    // XInput works best on Windows for most controllers
    device = 'XInput/0/Gamepad'
  } else {
    // SDL on Linux/macOS - use generic device index
    device = 'SDL/0/Gamepad'
  }

  // Button mapping - GameCube has:
  // A (main), B (secondary), X, Y, Z (shoulder), Start
  // L/R triggers, D-pad, Main stick, C-stick

  // Xbox controller mapping (SDL format):
  // Xbox A (South) = GC A, Xbox B (East) = GC B, Xbox X (West) = GC X, Xbox Y (North) = GC Y
  // Xbox RB = GC Z, Xbox Start = GC Start
  // Xbox LT = GC L, Xbox RT = GC R

  let buttonA: string, buttonB: string, buttonX: string, buttonY: string
  let buttonZ: string, buttonStart: string
  let triggerL: string, triggerR: string

  if (controllerType === 'xbox') {
    // SDL button names for Xbox controllers (directional names)
    buttonA = '`Button S`'  // South = A button
    buttonB = '`Button E`'  // East = B button
    buttonX = '`Button W`'  // West = X button
    buttonY = '`Button N`'  // North = Y button
    buttonZ = '`Shoulder R`'  // RB = Z
    buttonStart = '`Start`'
    triggerL = '`Trigger L`'
    triggerR = '`Trigger R`'
  } else if (isWindows) {
    // XInput button names
    buttonA = '`Button A`'
    buttonB = '`Button B`'
    buttonX = '`Button X`'
    buttonY = '`Button Y`'
    buttonZ = '`Shoulder R`'  // RB = Z
    buttonStart = '`Button Start`'
    triggerL = '`Trigger L`'
    triggerR = '`Trigger R`'
  } else {
    // SDL button names (indices)
    buttonA = '`Button 0`'  // A/Cross
    buttonB = '`Button 1`'  // B/Circle
    buttonX = '`Button 2`'  // X/Square
    buttonY = '`Button 3`'  // Y/Triangle
    buttonZ = '`Button 5`'  // RB/R1
    buttonStart = '`Button 7`'  // Start/Options
    triggerL = '`Axis 4+`'  // LT
    triggerR = '`Axis 5+`'  // RT
  }

  // For Nintendo controllers, swap A/B positions (Nintendo B is in Xbox A position)
  if (controllerType === 'nintendo') {
    // Nintendo layout: A is right (GC A position), B is down (GC B position)
    // But Nintendo physical positions are swapped from Xbox
    // On Nintendo: A=right, B=down; on Xbox: A=down, B=right
    // For GC mapping: GC A should be the "confirm" button
    // Nintendo A (right) = confirm, so map it to GC A
    // This should already be correct with standard mapping since
    // Nintendo Pro Controller reports in standard layout via SDL
  }

  // For PlayStation, the layout is the same positionally
  // Cross = A position, Circle = B position, etc.

  // Stick configuration
  let mainStickUp: string, mainStickDown: string, mainStickLeft: string, mainStickRight: string
  let cStickUp: string, cStickDown: string, cStickLeft: string, cStickRight: string
  let dpadUp: string, dpadDown: string, dpadLeft: string, dpadRight: string
  let mainStickModifier: string, cStickModifier: string

  if (controllerType === 'xbox') {
    // Xbox controller stick mappings (SDL format)
    mainStickUp = '`Left Y+`'
    mainStickDown = '`Left Y-`'
    mainStickLeft = '`Left X-`'
    mainStickRight = '`Left X+`'
    cStickUp = '`Right Y+`'
    cStickDown = '`Right Y-`'
    cStickLeft = '`Right X-`'
    cStickRight = '`Right X+`'
    dpadUp = '`Pad N`'
    dpadDown = '`Pad S`'
    dpadLeft = '`Pad W`'
    dpadRight = '`Pad E`'
    mainStickModifier = '`Shift`'
    cStickModifier = '`Ctrl`'
  } else if (isWindows) {
    // XInput stick/dpad names
    mainStickUp = '`Left Y-`'
    mainStickDown = '`Left Y+`'
    mainStickLeft = '`Left X-`'
    mainStickRight = '`Left X+`'
    cStickUp = '`Right Y-`'
    cStickDown = '`Right Y+`'
    cStickLeft = '`Right X-`'
    cStickRight = '`Right X+`'
    dpadUp = '`Pad N`'
    dpadDown = '`Pad S`'
    dpadLeft = '`Pad W`'
    dpadRight = '`Pad E`'
    mainStickModifier = '`Thumb L`'
    cStickModifier = '`Thumb R`'
  } else {
    // SDL axis/hat names
    mainStickUp = '`Axis 1-`'
    mainStickDown = '`Axis 1+`'
    mainStickLeft = '`Axis 0-`'
    mainStickRight = '`Axis 0+`'
    cStickUp = '`Axis 3-`'
    cStickDown = '`Axis 3+`'
    cStickLeft = '`Axis 2-`'
    cStickRight = '`Axis 2+`'
    dpadUp = '`Hat 0 N`'
    dpadDown = '`Hat 0 S`'
    dpadLeft = '`Hat 0 W`'
    dpadRight = '`Hat 0 E`'
    mainStickModifier = '`Thumb L`'
    cStickModifier = '`Thumb R`'
  }

  return `[GCPad${playerIndex}]
Device = ${device}
Buttons/A = ${buttonA}
Buttons/B = ${buttonB}
Buttons/X = ${buttonX}
Buttons/Y = ${buttonY}
Buttons/Z = ${buttonZ}
Buttons/Start = ${buttonStart}
Main Stick/Up = ${mainStickUp}
Main Stick/Down = ${mainStickDown}
Main Stick/Left = ${mainStickLeft}
Main Stick/Right = ${mainStickRight}
Main Stick/Modifier = ${mainStickModifier}
Main Stick/Modifier/Range = 50.0
Main Stick/Calibration = 100.00 141.42 100.00 141.42 100.00 141.42 100.00 141.42
C-Stick/Up = ${cStickUp}
C-Stick/Down = ${cStickDown}
C-Stick/Left = ${cStickLeft}
C-Stick/Right = ${cStickRight}
C-Stick/Modifier = ${cStickModifier}
C-Stick/Modifier/Range = 50.0
C-Stick/Calibration = 100.00 141.42 100.00 141.42 100.00 141.42 100.00 141.42
Triggers/L = ${triggerL}
Triggers/R = ${triggerR}
D-Pad/Up = ${dpadUp}
D-Pad/Down = ${dpadDown}
D-Pad/Left = ${dpadLeft}
D-Pad/Right = ${dpadRight}
Rumble/Motor = \`Motor L\`|\`Motor R\`
`
}

/**
 * Generate complete GCPadNew.ini content
 * Configures all 4 controller ports (only port 1 is typically used)
 * @param controllerType - The type of controller
 * @param deviceName - Optional actual device name from Gamepad API
 */
function generateGCPadNewIni(controllerType: ControllerType, deviceName?: string): string {
  // Configure port 1 with the detected controller, leave others empty
  const port1 = generateGCPadConfig(controllerType, 1, deviceName)

  // Ports 2-4 are left unconfigured (Dolphin defaults)
  const emptyPorts = `[GCPad2]
[GCPad3]
[GCPad4]
`

  const deviceInfo = deviceName ? `\n# Device Name: ${deviceName}` : ''
  return `# Dolphin GCPad Configuration
# Auto-generated by EasyEmu
# Controller Type: ${controllerType}${deviceInfo}

${port1}
${emptyPorts}`
}

/**
 * Update Dolphin.ini to enable GameCube controller port 1
 * SIDevice values:
 * 0 = None
 * 6 = Standard Controller
 * 12 = GameCube Adapter for Wii U
 */
function configureDolphinIni(configDir: string): void {
  const dolphinIniPath = path.join(configDir, 'Dolphin.ini')

  let iniContent = ''

  // Read existing Dolphin.ini if it exists
  if (fs.existsSync(dolphinIniPath)) {
    iniContent = fs.readFileSync(dolphinIniPath, 'utf-8')
  }

  // Check if [Core] section exists
  if (!iniContent.includes('[Core]')) {
    // Add [Core] section with SIDevice0
    iniContent += '\n[Core]\nSIDevice0 = 6\nSIDevice1 = 0\nSIDevice2 = 0\nSIDevice3 = 0\n'
  } else {
    // Update SIDevice0 in existing [Core] section
    if (iniContent.includes('SIDevice0')) {
      // Replace existing SIDevice0 value
      iniContent = iniContent.replace(/SIDevice0\s*=\s*\d+/g, 'SIDevice0 = 6')
    } else {
      // Add SIDevice0 after [Core]
      iniContent = iniContent.replace(/\[Core\]/g, '[Core]\nSIDevice0 = 6')
    }
  }

  fs.writeFileSync(dolphinIniPath, iniContent, 'utf-8')
  console.log(`[DolphinConfig] Enabled GCPad controller port 1 in ${dolphinIniPath}`)
}

/**
 * Configure Dolphin's GCPad settings for the detected controller
 * @param controllerType - The type of controller
 * @param deviceName - Optional actual device name from Gamepad API (for Bluetooth controllers)
 */
export function configureDolphinController(controllerType: ControllerType, deviceName?: string): { success: boolean; error?: string } {
  try {
    const configDir = getDolphinConfigDir()

    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // Step 1: Configure Dolphin.ini to enable controller port 1
    configureDolphinIni(configDir)

    // Step 2: Configure GCPadNew.ini with button mappings
    const gcpadPath = path.join(configDir, 'GCPadNew.ini')
    const content = generateGCPadNewIni(controllerType, deviceName)

    // Backup existing config if it exists
    if (fs.existsSync(gcpadPath)) {
      const backupPath = path.join(configDir, 'GCPadNew.ini.backup')
      fs.copyFileSync(gcpadPath, backupPath)
    }

    // Write new configuration
    fs.writeFileSync(gcpadPath, content, 'utf-8')

    const deviceInfo = deviceName ? ` (device: ${deviceName})` : ''
    console.log(`[DolphinConfig] Configured GCPad for ${controllerType} controller${deviceInfo} at ${gcpadPath}`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[DolphinConfig] Failed to configure:', message)
    return { success: false, error: message }
  }
}

/**
 * Check if Dolphin configuration exists
 */
export function hasDolphinConfig(): boolean {
  const configDir = getDolphinConfigDir()
  const gcpadPath = path.join(configDir, 'GCPadNew.ini')
  return fs.existsSync(gcpadPath)
}

/**
 * Get the path to Dolphin's config directory
 */
export function getDolphinConfigPath(): string {
  return getDolphinConfigDir()
}
