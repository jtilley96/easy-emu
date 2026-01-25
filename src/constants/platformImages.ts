/**
 * System images from Monochrome Gaming Logos (HVR88/Monochrome-Gaming-Logos).
 * Imported from src/assets/systems/ as data URLs so they work in dev, Electron file://, and build.
 * Source: https://github.com/HVR88/Monochrome-Gaming-Logos
 * To refresh: npm run download-platform-images
 */

const glob = import.meta.glob<string>('../assets/systems/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const IMAGE_MAP: Record<string, string> = {}
for (const [modulePath, raw] of Object.entries(glob)) {
  const match = modulePath.match(/([^/\\]+)\.svg$/)
  if (match) IMAGE_MAP[match[1]] = svgToDataUrl(raw)
}

/**
 * Returns a data URL for a platform's system image, or null if none.
 */
export function getPlatformImageUrl(platformId: string): string | null {
  return IMAGE_MAP[platformId] ?? null
}
