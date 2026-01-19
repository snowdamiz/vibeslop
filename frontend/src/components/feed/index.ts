export { Post } from './Post'
export { Feed } from './Feed'
export { ComposeBox } from './ComposeBox'

// Export types from centralized types file
export type { 
  PostAuthor, 
  ProjectPost, 
  StatusUpdate, 
  FeedItem 
} from './types'

export { isProjectPost, isStatusUpdate } from './types'

// Legacy alias for backwards compatibility
export type { ProjectPost as PostProject } from './types'
