/**
 * Downloads platform logos from Monochrome Gaming Logos (HVR88) via jsDelivr
 * and saves to src/assets/systems/ (used by app as data URLs).
 * Run: npm run download-platform-images
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'https://cdn.jsdelivr.net/gh/HVR88/Monochrome-Gaming-Logos@main/svg'

const PLATFORM_IMAGE_MAP = {
  nes: 'nintendo_nes',
  snes: 'nintendo_snes',
  n64: 'nintendo_64',
  gamecube: 'nintendo_gamecube',
  wii: 'nintendo_wii',
  switch: 'nintendo_switch',
  gb: 'nintendo_gameboy',
  gbc: 'nintendo_gameboy_color',
  gba: 'nintendo_gameboy_advance',
  nds: 'nintendo_ds',
  '3ds': 'nintendo_3ds',
  genesis: 'sega_genesis',
  saturn: 'sega_saturn',
  dreamcast: 'sega_dreamcast',
  ps1: 'playstation_flat',
  ps2: 'playstation_ps2',
  ps3: 'playstation3_flat',
  psp: 'playstation_psp',
  xbox: 'xbox_original',
  arcade: 'arcade'
}

const outDir = path.join(__dirname, '..', 'src', 'assets', 'systems')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

for (const [platformId, slug] of Object.entries(PLATFORM_IMAGE_MAP)) {
  const url = `${BASE}/${slug}.svg`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const svg = await res.text()
    fs.writeFileSync(path.join(outDir, `${platformId}.svg`), svg, 'utf8')
    console.log(`✓ ${platformId}.svg`)
  } catch (e) {
    console.error(`✗ ${platformId}: ${e.message}`)
  }
}

console.log('Done.')
