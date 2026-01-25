import { useParams, Link } from 'react-router-dom'
import { useLibraryStore } from '../store/libraryStore'
import { PLATFORMS } from '../constants/platforms'
import { getPlatformImageUrl } from '../constants/platformImages'
import GameCard from '../components/GameCard'

export default function SystemBrowser() {
  const { platform } = useParams<{ platform?: string }>()
  const { games } = useLibraryStore()

  // Group games by platform
  const gamesByPlatform = games.reduce((acc, game) => {
    if (!acc[game.platform]) {
      acc[game.platform] = []
    }
    acc[game.platform].push(game)
    return acc
  }, {} as Record<string, typeof games>)

  // If specific platform selected, show games for that platform
  if (platform) {
    const platformGames = gamesByPlatform[platform] || []
    const platformInfo = PLATFORMS.find(p => p.id === platform)

    return (
      <div className="h-full overflow-auto">
        <div className="px-6 py-4 border-b border-surface-800">
          <Link to="/systems" className="text-accent hover:underline text-sm mb-2 inline-block">
            ← All Systems
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {platform && (() => {
              const imgUrl = getPlatformImageUrl(platform)
              return imgUrl ? (
                <img
                  src={imgUrl}
                  alt={platformInfo?.name ?? platform}
                  className="h-8 w-auto object-contain"
                />
              ) : platformInfo?.icon ? (
                <span className="text-3xl" aria-label={platformInfo?.name ?? platform}>
                  {platformInfo.icon}
                </span>
              ) : null
            })()}
          </h1>
          <p className="text-surface-400">{platformGames.length} games</p>
        </div>

        <div className="p-6">
          {platformGames.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              No games found for this platform
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {platformGames.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show all platforms overview
  return (
    <div className="h-full overflow-auto">
      <div className="px-6 py-4 border-b border-surface-800">
        <h1 className="text-2xl font-bold">Systems</h1>
        <p className="text-surface-400">Browse games by platform</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {PLATFORMS.map(platform => {
            const count = gamesByPlatform[platform.id]?.length || 0
            const imgUrl = getPlatformImageUrl(platform.id)
            return (
              <Link
                key={platform.id}
                to={`/systems/${platform.id}`}
                className="bg-surface-800 hover:bg-surface-700 rounded-lg p-6 text-center transition-colors flex flex-col items-center"
              >
                <div className="mb-3 flex items-center justify-center">
                  {imgUrl ? (
                    <img src={imgUrl} alt={platform.name} className="h-8 w-auto object-contain" />
                  ) : (
                    <span className="text-4xl" aria-label={platform.name}>{platform.icon}</span>
                  )}
                </div>
                <p className="text-surface-400 text-sm">
                  {count} {count === 1 ? 'game' : 'games'}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
