import { ipcMain, net } from 'electron'
import path from 'path'
import fs from 'fs'
import { getGame, updateGame, GameRecord } from './library'
import { getConfigValue } from './config'

interface ScreenScraperGame {
  id: string
  nom: string
  synopsis?: string
  editeur?: string
  developpeur?: string
  date?: string
  genres?: { nom: string }[]
  note?: string
  media?: {
    type: string
    url: string
    region?: string
  }[]
}

interface ScrapedMetadata {
  title: string
  description?: string
  developer?: string
  publisher?: string
  releaseDate?: string
  genres?: string[]
  rating?: number
  coverUrl?: string
  screenshotUrls?: string[]
}

const SCREENSCRAPER_API = 'https://www.screenscraper.fr/api2'
const SCREENSCRAPER_DEV_ID = 'easyemu'
const SCREENSCRAPER_DEV_PASSWORD = 'easyemu_dev'
const SCREENSCRAPER_SOFTWARE = 'EasyEmu'

// Platform mapping for ScreenScraper
const PLATFORM_TO_SCREENSCRAPER: Record<string, number> = {
  'nes': 3,
  'snes': 4,
  'n64': 14,
  'gamecube': 13,
  'wii': 16,
  'gb': 9,
  'gbc': 10,
  'gba': 12,
  'nds': 15,
  'genesis': 1,
  'saturn': 22,
  'dreamcast': 23,
  'ps1': 57,
  'ps2': 58,
  'psp': 61,
  'arcade': 75
}

async function fetchScreenScraper(endpoint: string, params: Record<string, string>): Promise<unknown> {
  const username = getConfigValue('screenScraperUsername')
  const password = getConfigValue('screenScraperPassword')

  const queryParams = new URLSearchParams({
    devid: SCREENSCRAPER_DEV_ID,
    devpassword: SCREENSCRAPER_DEV_PASSWORD,
    softname: SCREENSCRAPER_SOFTWARE,
    output: 'json',
    ...params
  })

  if (username && password) {
    queryParams.set('ssid', username)
    queryParams.set('sspassword', password)
  }

  const url = `${SCREENSCRAPER_API}/${endpoint}?${queryParams.toString()}`

  return new Promise((resolve, reject) => {
    const request = net.request(url)

    let data = ''

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        data += chunk.toString()
      })

      response.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('Failed to parse ScreenScraper response'))
        }
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.end()
  })
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)

    request.on('response', (response) => {
      const chunks: Buffer[] = []

      response.on('data', (chunk) => {
        chunks.push(chunk)
      })

      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks)
          const dir = path.dirname(destPath)

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }

          fs.writeFileSync(destPath, buffer)
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.end()
  })
}

function getCoverUrl(media: ScreenScraperGame['media'], region: string): string | undefined {
  if (!media) return undefined

  const regionOrder = [region, 'wor', 'us', 'eu', 'jp']

  for (const r of regionOrder) {
    const cover = media.find(m =>
      m.type === 'box-2D' && (!m.region || m.region === r)
    )
    if (cover) return cover.url
  }

  const anycover = media.find(m => m.type === 'box-2D')
  return anycover?.url
}

function getScreenshots(media: ScreenScraperGame['media']): string[] {
  if (!media) return []

  return media
    .filter(m => m.type === 'ss' || m.type === 'sstitle')
    .map(m => m.url)
    .slice(0, 5)
}

export async function scrapeGame(gameId: string): Promise<ScrapedMetadata | null> {
  const game = getGame(gameId)
  if (!game) return null

  const systemId = PLATFORM_TO_SCREENSCRAPER[game.platform]
  if (!systemId) {
    console.log(`No ScreenScraper mapping for platform: ${game.platform}`)
    return null
  }

  const filename = path.basename(game.path)
  const preferredRegion = getConfigValue('preferredRegion')

  try {
    const response = await fetchScreenScraper('jeuInfos.php', {
      systemeid: systemId.toString(),
      romnom: filename
    }) as { response?: { jeu?: ScreenScraperGame } }

    const gameData = response.response?.jeu
    if (!gameData) {
      console.log(`No match found for: ${filename}`)
      return null
    }

    const metadata: ScrapedMetadata = {
      title: gameData.nom || game.title,
      description: gameData.synopsis,
      developer: gameData.developpeur,
      publisher: gameData.editeur,
      releaseDate: gameData.date,
      genres: gameData.genres?.map(g => g.nom),
      rating: gameData.note ? parseFloat(gameData.note) / 20 * 10 : undefined,
      coverUrl: getCoverUrl(gameData.media, preferredRegion),
      screenshotUrls: getScreenshots(gameData.media)
    }

    // Download cover art if available
    if (metadata.coverUrl) {
      const coversPath = getConfigValue('coversPath')
      const coverFilename = `${gameId}${path.extname(metadata.coverUrl) || '.jpg'}`
      const localCoverPath = path.join(coversPath, coverFilename)

      try {
        await downloadImage(metadata.coverUrl, localCoverPath)
        updateGame(gameId, { coverPath: localCoverPath })
      } catch (error) {
        console.error('Failed to download cover:', error)
      }
    }

    // Update game metadata
    updateGame(gameId, {
      title: metadata.title,
      description: metadata.description,
      developer: metadata.developer,
      publisher: metadata.publisher,
      releaseDate: metadata.releaseDate,
      genres: metadata.genres,
      rating: metadata.rating
    })

    return metadata
  } catch (error) {
    console.error('Scraping failed:', error)
    return null
  }
}

export async function scrapeAllGames(): Promise<void> {
  console.log('Bulk scraping not yet implemented')
}

export function registerMetadataHandlers(): void {
  ipcMain.handle('metadata:scrape', async (_event, gameId: string) => {
    return scrapeGame(gameId)
  })

  ipcMain.handle('metadata:scrapeAll', async () => {
    await scrapeAllGames()
  })

  ipcMain.handle('metadata:update', async (_event, gameId: string, metadata: Record<string, unknown>) => {
    updateGame(gameId, metadata as Partial<GameRecord>)
  })
}
