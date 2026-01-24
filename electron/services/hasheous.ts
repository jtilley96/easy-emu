import { ipcMain, BrowserWindow } from 'electron'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { getGame, updateGame, getGames, GameRecord } from './library'
import { getConfigValue } from './config'

const HASHEOUS_API = 'https://hasheous.org/api/v1'

// Hasheous API response format
export interface HasheousLookupResult {
  id: number
  name?: string
  platform?: {
    name?: string
    metadata?: HasheousMetadataItem[]
  }
  publisher?: {
    name?: string
    metadata?: HasheousMetadataItem[]
  }
  signatures?: {
    TOSEC?: HasheousSignature[]
    NoIntros?: HasheousSignature[]
    RetroAchievements?: HasheousSignature[]
  }
  metadata?: HasheousMetadataItem[]
  attributes?: HasheousAttribute[]
}

export interface HasheousSignature {
  game?: {
    name?: string
    year?: string
    publisher?: string
    description?: string
  }
  rom?: {
    name?: string
    md5?: string
    sha1?: string
  }
}

export interface HasheousAttribute {
  attributeName?: string
  attributeType?: string
  value?: string
  link?: string
}

export interface HasheousMetadataItem {
  id: string | number
  immutableId?: string | number
  source: string
  status?: string
  link?: string
}

export interface IGDBGameMetadata {
  id: number
  name: string
  summary?: string
  storyline?: string
  first_release_date?: number
  rating?: number
  total_rating?: number
  genres?: { id: number; name: string }[]
  involved_companies?: {
    company: { id: number; name: string }
    developer: boolean
    publisher: boolean
  }[]
  cover?: {
    image_id: string
    url?: string
  }
  screenshots?: {
    image_id: string
    url?: string
  }[]
  artworks?: {
    image_id: string
    url?: string
  }[]
}

export interface ScrapeResult {
  gameId: string
  success: boolean
  error?: string
  matched: boolean
  title?: string
}

export interface ScrapeProgress {
  current: number
  total: number
  currentGame: string
  gameId: string
}

let scrapeCancelled = false
let mainWindow: BrowserWindow | null = null

export function setHasheousMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

/**
 * Calculate MD5 and SHA1 hashes of a file
 */
export async function calculateFileHash(filePath: string): Promise<{ md5: string; sha1: string }> {
  return new Promise((resolve, reject) => {
    const md5Hash = crypto.createHash('md5')
    const sha1Hash = crypto.createHash('sha1')

    const stream = fs.createReadStream(filePath)

    stream.on('data', (chunk) => {
      md5Hash.update(chunk)
      sha1Hash.update(chunk)
    })

    stream.on('end', () => {
      resolve({
        md5: md5Hash.digest('hex'),
        sha1: sha1Hash.digest('hex')
      })
    })

    stream.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Look up a game by its hash via Hasheous API
 */
export async function lookupByHash(md5: string, sha1: string): Promise<HasheousLookupResult | null> {
  try {
    // Hasheous expects PascalCase property names and the endpoint is /Lookup/ByHash
    const response = await fetch(`${HASHEOUS_API}/Lookup/ByHash?returnAllSources=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ MD5: md5, SHA1: sha1 })
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const text = await response.text()
      console.error(`Hasheous lookup failed: ${response.status} - ${text}`)
      throw new Error(`Hasheous lookup failed: ${response.status}`)
    }

    const data = await response.json()
    return data as HasheousLookupResult
  } catch (error) {
    console.error('Hasheous lookup error:', error)
    throw error
  }
}

/**
 * Get full game metadata from Hasheous IGDB proxy
 */
export async function getMetadata(igdbId: number): Promise<IGDBGameMetadata | null> {
  try {
    const url = `${HASHEOUS_API}/Metadata/Game/IGDB/${igdbId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const text = await response.text()
      console.error(`Hasheous metadata fetch failed: ${response.status} - ${text}`)
      throw new Error(`Hasheous metadata fetch failed: ${response.status}`)
    }

    const data = await response.json()
    return data as IGDBGameMetadata
  } catch (error) {
    console.error('Hasheous metadata error:', error)
    throw error
  }
}

/**
 * Download cover art and save to local covers directory
 */
export async function downloadCoverArt(imageId: string, gameId: string): Promise<string | null> {
  try {
    // IGDB cover URL format: https://images.igdb.com/igdb/image/upload/t_cover_big/{imageId}.jpg
    const coverUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`

    const response = await fetch(coverUrl)
    if (!response.ok) {
      console.error(`Failed to download cover: ${response.status}`)
      return null
    }

    const coversPath = getConfigValue('coversPath')
    const coverFilePath = path.join(coversPath, `${gameId}.jpg`)

    // Ensure covers directory exists
    if (!fs.existsSync(coversPath)) {
      fs.mkdirSync(coversPath, { recursive: true })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(coverFilePath, buffer)

    return coverFilePath
  } catch (error) {
    console.error('Cover download error:', error)
    return null
  }
}

/**
 * Download backdrop/artwork and save to local covers directory
 */
export async function downloadBackdrop(imageId: string, gameId: string): Promise<string | null> {
  try {
    // IGDB artwork URL format: https://images.igdb.com/igdb/image/upload/t_1080p/{imageId}.jpg
    const artworkUrl = `https://images.igdb.com/igdb/image/upload/t_1080p/${imageId}.jpg`

    const response = await fetch(artworkUrl)
    if (!response.ok) {
      console.error(`Failed to download backdrop: ${response.status}`)
      return null
    }

    const coversPath = getConfigValue('coversPath')
    const backdropFilePath = path.join(coversPath, `${gameId}_backdrop.jpg`)

    if (!fs.existsSync(coversPath)) {
      fs.mkdirSync(coversPath, { recursive: true })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(backdropFilePath, buffer)

    return backdropFilePath
  } catch (error) {
    console.error('Backdrop download error:', error)
    return null
  }
}

/**
 * Download image from Hasheous and save locally
 */
async function downloadHasheousImage(imageHash: string, gameId: string, suffix: string = ''): Promise<string | null> {
  try {
    const imageUrl = `${HASHEOUS_API}/images/${imageHash}`

    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`Failed to download Hasheous image: ${response.status}`)
      return null
    }

    const coversPath = getConfigValue('coversPath')
    const filename = suffix ? `${gameId}_${suffix}.jpg` : `${gameId}.jpg`
    const filePath = path.join(coversPath, filename)

    if (!fs.existsSync(coversPath)) {
      fs.mkdirSync(coversPath, { recursive: true })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    return filePath
  } catch (error) {
    console.error('Hasheous image download error:', error)
    return null
  }
}

/**
 * Use Hasheous response data directly when IGDB lookup fails
 */
async function useHasheousDataDirectly(gameId: string, lookupResult: HasheousLookupResult): Promise<ScrapeResult> {
  const updateData: Partial<GameRecord> = {}

  // Get title from Hasheous
  if (lookupResult.name) {
    updateData.title = lookupResult.name
  }

  // Get publisher from Hasheous
  if (lookupResult.publisher?.name) {
    updateData.publisher = lookupResult.publisher.name
  }

  // Try to get year from signatures (TOSEC usually has good data)
  const tosecSig = lookupResult.signatures?.TOSEC?.[0]
  const noIntroSig = lookupResult.signatures?.NoIntros?.[0]

  if (tosecSig?.game?.year) {
    updateData.releaseDate = `${tosecSig.game.year}-01-01`
  } else if (noIntroSig?.game?.year) {
    updateData.releaseDate = `${noIntroSig.game.year}-01-01`
  }

  // Try to get description
  if (tosecSig?.game?.description) {
    updateData.description = tosecSig.game.description
  } else if (noIntroSig?.game?.description) {
    updateData.description = noIntroSig.game.description
  }

  // Try to download logo from Hasheous attributes
  const logoAttr = lookupResult.attributes?.find(a => a.attributeName === 'Logo')
  if (logoAttr?.value) {
    const coverPath = await downloadHasheousImage(logoAttr.value, gameId)
    if (coverPath) {
      updateData.coverPath = coverPath
    }
  }

    if (Object.keys(updateData).length > 0) {
      updateGame(gameId, updateData)
      return { gameId, success: true, matched: true, title: updateData.title }
    }

  return { gameId, success: true, matched: false }
}

/**
 * Scrape metadata for a single game
 */
export async function scrapeGame(gameId: string): Promise<ScrapeResult> {
  const game = getGame(gameId)
  if (!game) {
    return { gameId, success: false, error: 'Game not found', matched: false }
  }

  try {
    // Calculate hash
    const hashes = await calculateFileHash(game.path)

    // Look up by hash
    const lookupResult = await lookupByHash(hashes.md5, hashes.sha1)

    if (!lookupResult) {
      return { gameId, success: true, matched: false }
    }

    // Find IGDB metadata entry in the metadata array
    const igdbMetadata = lookupResult.metadata?.find(m => m.source === 'IGDB' && m.status === 'Mapped')
    if (!igdbMetadata || !igdbMetadata.immutableId) {
      // If no IGDB metadata but we have a name from the hash match, use that
      if (lookupResult.name) {
        updateGame(gameId, { title: lookupResult.name })
        return { gameId, success: true, matched: true, title: lookupResult.name }
      }
      return { gameId, success: true, matched: false }
    }

    // Use immutableId which contains the actual IGDB game ID (id field is a slug)
    const immutableId = igdbMetadata.immutableId
    const igdbId = typeof immutableId === 'string' ? parseInt(immutableId, 10) : immutableId

    // Get full metadata from IGDB
    const metadata = await getMetadata(igdbId)

    if (metadata) {
      // IGDB metadata found - use it

      // Extract developer and publisher
      let developer: string | undefined
      let publisher: string | undefined
      if (metadata.involved_companies) {
        const devCompany = metadata.involved_companies.find(c => c.developer)
        const pubCompany = metadata.involved_companies.find(c => c.publisher)
        developer = devCompany?.company?.name
        publisher = pubCompany?.company?.name
      }

      // Extract genres
      const genres = metadata.genres?.map(g => g.name)

      // Convert release date from Unix timestamp
      let releaseDate: string | undefined
      if (metadata.first_release_date) {
        releaseDate = new Date(metadata.first_release_date * 1000).toISOString().split('T')[0]
      }

      // Download cover art
      let coverPath: string | undefined
      if (metadata.cover?.image_id) {
        const downloaded = await downloadCoverArt(metadata.cover.image_id, gameId)
        if (downloaded) {
          coverPath = downloaded
        }
      }

      // Download backdrop (first artwork if available)
      let backdropPath: string | undefined
      if (metadata.artworks?.[0]?.image_id) {
        const downloaded = await downloadBackdrop(metadata.artworks[0].image_id, gameId)
        if (downloaded) {
          backdropPath = downloaded
        }
      }

      // Update game record
      const updateData: Partial<GameRecord> = {
        title: metadata.name,
        description: metadata.summary || metadata.storyline,
        developer,
        publisher,
        releaseDate,
        genres,
        rating: metadata.total_rating ? Math.round(metadata.total_rating) / 10 : undefined
      }

      if (coverPath) {
        updateData.coverPath = coverPath
      }
      if (backdropPath) {
        updateData.backdropPath = backdropPath
      }

      updateGame(gameId, updateData)

      return { gameId, success: true, matched: true, title: metadata.name }
    }

    // IGDB failed - fall back to Hasheous data directly
    return await useHasheousDataDirectly(gameId, lookupResult)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to scrape ${game.title}:`, error)
    return { gameId, success: false, error: errorMessage, matched: false }
  }
}

/**
 * Scrape metadata for multiple games
 */
export async function scrapeGames(
  gameIds: string[],
  onProgress?: (progress: ScrapeProgress) => void
): Promise<ScrapeResult[]> {
  scrapeCancelled = false
  const results: ScrapeResult[] = []

  for (let i = 0; i < gameIds.length; i++) {
    if (scrapeCancelled) {
      break
    }

    const gameId = gameIds[i]
    const game = getGame(gameId)
    const gameName = game?.title || 'Unknown'

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: gameIds.length,
        currentGame: gameName,
        gameId
      })
    }

    // Emit progress via IPC
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hasheous:scrapeProgress', {
        current: i + 1,
        total: gameIds.length,
        currentGame: gameName,
        gameId
      })
    }

    const result = await scrapeGame(gameId)
    results.push(result)

    // Small delay between requests to be nice to the API
    if (i < gameIds.length - 1 && !scrapeCancelled) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return results
}

/**
 * Cancel ongoing scrape operation
 */
export function cancelScrape(): void {
  scrapeCancelled = true
}

/**
 * Register IPC handlers for Hasheous operations
 */
export function registerHasheousHandlers(window?: BrowserWindow | null): void {
  if (window) {
    mainWindow = window
  }

  ipcMain.handle('hasheous:scrapeGame', async (_event, gameId: string) => {
    return scrapeGame(gameId)
  })

  ipcMain.handle('hasheous:scrapeGames', async (_event, gameIds: string[]) => {
    return scrapeGames(gameIds)
  })

  ipcMain.handle('hasheous:cancelScrape', () => {
    cancelScrape()
  })

  ipcMain.handle('hasheous:scrapeAllGames', async () => {
    const games = getGames()
    const gameIds = games.map(g => g.id)
    return scrapeGames(gameIds)
  })
}
