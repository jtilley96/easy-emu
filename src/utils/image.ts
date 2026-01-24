/**
 * Converts a local file path to a local-image:// URL that the Electron
 * custom protocol handler can serve. Use this for cover, backdrop, and
 * screenshot paths so they display correctly in the renderer.
 */
export function pathToLocalImageUrl(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') return ''
  return `local-image://local/${encodeURIComponent(filePath)}`
}
