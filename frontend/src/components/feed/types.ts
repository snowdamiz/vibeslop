// Author type shared across all feed items
export interface PostAuthor {
  name: string
  username: string
  initials: string
  color?: string
}

// Base shared fields for all feed items
interface BaseFeedItem {
  id: string
  content: string // description for projects, text for updates
  likes: number
  comments: number
  reposts: number
  createdAt: string
  author: PostAuthor
}

// Project-specific post (showcasing a vibe-coded project)
export interface ProjectPost extends BaseFeedItem {
  type: 'project'
  title: string
  image?: string
  tools?: string[] // AI tools used (Cursor, Claude, etc.)
  stack?: string[] // Tech stack (React, Node.js, etc.)
}

// Status update (X-like post - thoughts, updates, tips)
export interface StatusUpdate extends BaseFeedItem {
  type: 'update'
  media?: string[] // Optional image attachments
  linkedProjectId?: string // Optional reference to a project
}

// Discriminated union of all feed item types
export type FeedItem = ProjectPost | StatusUpdate

// Type guards for narrowing
export function isProjectPost(item: FeedItem): item is ProjectPost {
  return item.type === 'project'
}

export function isStatusUpdate(item: FeedItem): item is StatusUpdate {
  return item.type === 'update'
}
