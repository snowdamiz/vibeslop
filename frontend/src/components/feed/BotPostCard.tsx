import { TrendingProjectsBotCard } from './TrendingProjectsBotCard'
import type { BotPost } from './types'

interface BotPostCardProps {
  item: BotPost
  showBorder?: boolean
  trackRef?: (element: HTMLElement | null) => void
}

/**
 * Router component that renders the appropriate bot post card
 * based on the bot_type field.
 */
export function BotPostCard({ item, showBorder = true, trackRef }: BotPostCardProps) {
  switch (item.bot_type) {
    case 'trending_projects':
      return (
        <TrendingProjectsBotCard
          item={item}
          showBorder={showBorder}
          trackRef={trackRef}
        />
      )

    case 'milestone':
    case 'announcement':
    default:
      // Fallback: render a simple text post for unsupported bot types
      return (
        <TrendingProjectsBotCard
          item={item}
          showBorder={showBorder}
          trackRef={trackRef}
        />
      )
  }
}
