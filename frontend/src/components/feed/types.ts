// Author type shared across all feed items
export interface PostAuthor {
  name: string
  username: string
  initials: string
  color?: string
  avatar_url?: string
  is_verified?: boolean
  is_premium?: boolean
}

// Base shared fields for all feed items
interface BaseFeedItem {
  id: string
  content: string // description for projects, text for updates
  likes: number
  comments: number
  reposts: number
  impressions: number
  created_at: string
  author: PostAuthor
  liked?: boolean
  bookmarked?: boolean
  reposted?: boolean
  is_repost?: boolean
  reposted_by?: PostAuthor
  original_id?: string // For reposts: the original post/project ID
}

// Project-specific post (showcasing a vibe-coded project)
export interface ProjectPost extends BaseFeedItem {
  type: 'project'
  title: string
  image?: string
  images?: string[] // Multiple images for gallery
  tools?: string[] // AI tools used (Cursor, Claude, etc.)
  stack?: string[] // Tech stack (React, Node.js, etc.)
  links?: {
    live?: string
    github?: string
  }
  highlights?: string[] // Key feature bullet points
  prompts?: {
    title: string
    description?: string
    code: string
  }[]
  timeline?: {
    date: string
    title: string
    description?: string
  }[]
}

// Quoted item (embedded in a post)
export interface QuotedItem {
  id: string
  type: 'update' | 'project'
  content: string
  title?: string // For projects
  image?: string // For projects
  media?: string[] // For posts
  tools?: string[] // For projects
  stack?: string[] // For projects
  created_at: string
  author: PostAuthor
}

// Status update (X-like post - thoughts, updates, tips)
export interface StatusUpdate extends BaseFeedItem {
  type: 'update'
  media?: string[] // Optional image attachments
  linkedProjectId?: string // Optional reference to a project
  quoted_post?: QuotedItem | null // Quote repost of another post
  quoted_project?: QuotedItem | null // Quote repost of a project
}

// Gig post (freelance opportunity)
export interface GigPost extends Omit<BaseFeedItem, 'likes' | 'comments' | 'reposts'> {
  type: 'gig'
  title: string
  budget_min?: number
  budget_max?: number
  currency: string
  deadline?: string
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  bids_count: number
  views_count: number
  tools?: string[]
  stack?: string[]
  likes: 0
  comments: 0
  reposts: 0
}

// Featured project for bot posts
export interface FeaturedProject {
  id: string
  title: string
  description: string
  image?: string
  tools: string[]
  stack: string[]
  author: PostAuthor
  likes: number
  comments: number
}

// Bot post (system-generated content)
export interface BotPost extends Omit<BaseFeedItem, 'liked' | 'bookmarked' | 'reposted'> {
  type: 'bot_post'
  bot_type: 'trending_projects' | 'milestone' | 'announcement'
  featured_projects?: FeaturedProject[]
  liked: false
  bookmarked: false
  reposted: false
}

// Discriminated union of all feed item types
export type FeedItem = ProjectPost | StatusUpdate | GigPost | BotPost

// Type guards for narrowing
export function isProjectPost(item: FeedItem): item is ProjectPost {
  return item.type === 'project'
}

export function isStatusUpdate(item: FeedItem): item is StatusUpdate {
  return item.type === 'update'
}

export function isGigPost(item: FeedItem): item is GigPost {
  return item.type === 'gig'
}

export function isBotPost(item: FeedItem): item is BotPost {
  return item.type === 'bot_post'
}
