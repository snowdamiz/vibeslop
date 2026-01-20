/**
 * API client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  bio?: string
  location?: string
  website_url?: string
  twitter_handle?: string
  github_username?: string
  avatar_url?: string
  banner_url?: string
  is_verified: boolean
  has_onboarded: boolean
}

export interface SuggestedUser {
  id: string
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  is_verified: boolean
}

export interface NotificationActor {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  initials: string
}

export interface NotificationTarget {
  type: 'Post' | 'Project'
  id: string
  title?: string
  preview?: string
}

export interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'repost' | 'mention'
  actor: NotificationActor
  target?: NotificationTarget
  content?: string
  created_at: string
  read: boolean
}

export interface NotificationResponse {
  data: Notification[]
  unread_count: number
}

interface ApiError {
  error: string
  message: string
  errors?: Record<string, string[]>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Get the stored auth token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('vibeslop_token')
  }

  /**
   * Store the auth token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem('vibeslop_token', token)
  }

  /**
   * Remove the auth token from localStorage
   */
  clearToken(): void {
    localStorage.removeItem('vibeslop_token')
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'unknown_error',
        message: 'An unknown error occurred',
      }))
      throw new Error(error.message || `API error: ${response.status}`)
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    return this.get<User>('/me')
  }

  /**
   * Get unread counts for notifications and messages
   */
  async getUnreadCounts(): Promise<{ notifications: number; messages: number }> {
    return this.get('/me/counts')
  }

  /**
   * Complete user onboarding
   */
  async completeOnboarding(data: {
    username: string
    display_name: string
    avatar_url?: string
    bio?: string
  }): Promise<User> {
    return this.put<User>('/me/onboard', { user: data })
  }

  /**
   * Update user profile
   */
  async updateProfile(data: {
    display_name?: string
    username?: string
    bio?: string
    avatar_url?: string
    location?: string
    website_url?: string
    twitter_handle?: string
  }): Promise<User> {
    return this.put<User>('/me', { user: data })
  }

  /**
   * Check if username is available
   */
  async checkUsername(username: string): Promise<{ available: boolean }> {
    return this.get(`/users/check-username/${username}`)
  }

  /**
   * Initiate GitHub OAuth login
   * Uses prompt=select_account to always show the account picker,
   * allowing users to switch GitHub accounts
   */
  loginWithGithub(): void {
    window.location.href = `${this.baseUrl}/auth/github?prompt=select_account`
  }

  /**
   * Logout (clears token)
   */
  async logout(): Promise<void> {
    try {
      await this.post('/auth/logout')
    } finally {
      this.clearToken()
    }
  }

  // Posts
  async getPosts(params?: {
    feed?: string
    type?: string
    limit?: number
    cursor?: string
    offset?: number // Legacy support for explore
    search?: string
    tools?: string[]
    stacks?: string[]
    sort_by?: string
  }): Promise<{ data: unknown[]; next_cursor?: string; has_more?: boolean }> {
    const queryParams = new URLSearchParams()
    if (params?.feed) queryParams.append('feed', params.feed)
    if (params?.type) queryParams.append('type', params.type)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.cursor) queryParams.append('cursor', params.cursor)
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.tools) params.tools.forEach(t => queryParams.append('tools[]', t))
    if (params?.stacks) params.stacks.forEach(s => queryParams.append('stacks[]', s))
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)

    return this.get(`/posts?${queryParams}`)
  }

  async getPost(id: string): Promise<{ data: unknown }> {
    return this.get(`/posts/${id}`)
  }

  async createPost(data: { 
    content: string
    linked_project_id?: string
    media?: string[]
    quoted_post_id?: string
    quoted_project_id?: string
  }): Promise<{ data: unknown }> {
    return this.post('/posts', { post: data })
  }

  async deletePost(id: string): Promise<void> {
    return this.delete(`/posts/${id}`)
  }

  // Projects
  async getProjects(params?: {
    limit?: number
    offset?: number
    search?: string
    tools?: string[]
    stacks?: string[]
    sort_by?: string
  }): Promise<{ data: unknown[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.tools) params.tools.forEach(t => queryParams.append('tools[]', t))
    if (params?.stacks) params.stacks.forEach(s => queryParams.append('stacks[]', s))
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)

    return this.get(`/projects?${queryParams}`)
  }

  async getProject(id: string): Promise<{ data: unknown }> {
    return this.get(`/projects/${id}`)
  }

  async createProject(data: {
    title: string
    description: string
    images?: string[]
    tools?: string[]
    stack?: string[]
    links?: { live?: string; github?: string }
    highlights?: string[]
    prompts?: { title: string; description?: string; code: string }[]
    timeline?: { date: string; title: string; description?: string }[]
  }): Promise<{ data: unknown }> {
    return this.post('/projects', { project: data })
  }

  async deleteProject(id: string): Promise<void> {
    return this.delete(`/projects/${id}`)
  }

  // Users
  async getUser(username: string): Promise<{ data: unknown }> {
    return this.get(`/users/${username}`)
  }

  async getUserPosts(username: string, params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/users/${username}/posts?${queryParams}`)
  }

  async getUserProjects(username: string, params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/users/${username}/projects?${queryParams}`)
  }

  async getUserLikes(username: string, params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/users/${username}/likes?${queryParams}`)
  }

  async getUserReposts(username: string, params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/users/${username}/reposts?${queryParams}`)
  }

  async followUser(username: string): Promise<{ data: unknown }> {
    return this.post(`/users/${username}/follow`)
  }

  async unfollowUser(username: string): Promise<{ data: unknown }> {
    return this.delete(`/users/${username}/follow`)
  }

  async getSuggestedUsers(params?: { limit?: number }): Promise<{ data: SuggestedUser[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    return this.get(`/users/suggested?${queryParams}`)
  }

  async searchUsers(query: string, params?: { limit?: number }): Promise<{ data: SuggestedUser[] }> {
    const queryParams = new URLSearchParams()
    queryParams.append('q', query)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    return this.get(`/users/search?${queryParams}`)
  }

  // Likes
  async toggleLike(type: string, id: string): Promise<{ success: boolean; liked: boolean }> {
    return this.post('/likes', { type, id })
  }

  // Reposts
  async toggleRepost(type: string, id: string): Promise<{ success: boolean; reposted: boolean }> {
    return this.post('/reposts', { type, id })
  }

  // Bookmarks
  async toggleBookmark(type: string, id: string): Promise<{ success: boolean; bookmarked: boolean }> {
    return this.post('/bookmarks', { type, id })
  }

  async getBookmarks(params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/bookmarks?${queryParams}`)
  }

  // Catalog
  async getTools(): Promise<{ data: unknown[] }> {
    return this.get('/tools')
  }

  async getStacks(): Promise<{ data: unknown[] }> {
    return this.get('/stacks')
  }

  // Notifications
  async getNotifications(params?: { limit?: number; offset?: number }): Promise<NotificationResponse> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/notifications?${queryParams}`)
  }

  async markNotificationRead(id: string): Promise<{ data: unknown }> {
    return this.post(`/notifications/${id}/read`)
  }

  async markAllNotificationsRead(): Promise<{ data: unknown }> {
    return this.post('/notifications/read-all')
  }

  // Messaging
  async getConversations(params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/conversations?${queryParams}`)
  }

  async getConversation(id: string, params?: { limit?: number; offset?: number }): Promise<{ data: unknown }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/conversations/${id}?${queryParams}`)
  }

  async createConversation(username: string): Promise<{ data: unknown }> {
    return this.post('/conversations', { username })
  }

  async sendMessage(conversationId: string, content: string): Promise<{ data: unknown }> {
    return this.post(`/conversations/${conversationId}/messages`, { content })
  }

  async markConversationRead(id: string): Promise<{ data: unknown }> {
    return this.post(`/conversations/${id}/read`)
  }

  // Comments
  async getComments(type: string, id: string): Promise<{ data: unknown[] }> {
    return this.get(`/comments?type=${type}&id=${id}`)
  }

  async createComment(data: {
    commentable_type: string
    commentable_id: string
    content: string
    parent_id?: string
  }): Promise<{ data: unknown }> {
    return this.post('/comments', { comment: data })
  }

  async deleteComment(id: string): Promise<void> {
    return this.delete(`/comments/${id}`)
  }

  async reportComment(id: string): Promise<{ success: boolean }> {
    return this.post('/reports', { type: 'comment', id })
  }

  async reportUser(id: string): Promise<{ success: boolean }> {
    return this.post('/reports', { type: 'user', id })
  }

  // Impressions
  async recordImpressions(impressions: Array<{ type: string; id: string }>, fingerprint?: string): Promise<{ success: boolean; count: number }> {
    return this.post('/impressions', { impressions, fingerprint })
  }

  // Search
  async search(params: {
    q: string
    type?: 'top' | 'people' | 'projects' | 'posts'
    limit?: number
    offset?: number
  }): Promise<{ data: unknown; meta: { query: string; total_results?: number; total?: number } }> {
    const queryParams = new URLSearchParams()
    queryParams.append('q', params.q)
    if (params.type) queryParams.append('type', params.type)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/search?${queryParams}`)
  }

  async searchSuggestions(query: string, limit?: number): Promise<{ data: { users: SuggestedUser[]; projects: Array<{ id: string; title: string; user: { username: string; display_name: string } }> } }> {
    const queryParams = new URLSearchParams()
    queryParams.append('q', query)
    if (limit) queryParams.append('limit', limit.toString())
    return this.get(`/search/suggestions?${queryParams}`)
  }

  // GitHub Integration
  async getGitHubRepos(params?: { per_page?: number; page?: number; sort?: string }): Promise<{ data: GitHubRepo[] }> {
    const queryParams = new URLSearchParams()
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.sort) queryParams.append('sort', params.sort)
    return this.get(`/github/repos?${queryParams}`)
  }

  async getGitHubRepo(owner: string, repo: string): Promise<{ data: GitHubRepoDetails }> {
    return this.get(`/github/repos/${owner}/${repo}`)
  }

  // AI Generation
  async generateProjectFromRepo(owner: string, repo: string): Promise<{ data: GeneratedProject }> {
    return this.post('/ai/generate-project', { repo: { owner, name: repo } })
  }

  async generateProjectImage(projectData: ProjectImageData): Promise<{ data: { image: string } }> {
    const body: any = { project: { title: projectData.title, stack: projectData.stack } }
    if (projectData.description) {
      body.project.description = projectData.description
    }
    if (projectData.repo) {
      body.repo = projectData.repo
    }
    return this.post('/ai/generate-image', body)
  }

  async getAIQuota(): Promise<{ text_generation: QuotaInfo; image_generation: QuotaInfo }> {
    return this.get('/ai/quota')
  }

  /**
   * Improves post content with AI streaming
   */
  async improvePost(
    content: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const token = this.getToken()
    const response = await fetch(`${this.baseUrl}/ai/improve-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'unknown_error',
        message: 'Failed to improve post',
      }))
      throw new Error(error.message || `API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      // Parse SSE format: "data: {...}\n\n"
      const lines = buffer.split('\n')
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') return
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              throw new Error(parsed.error)
            }
            if (parsed.content) {
              onChunk(parsed.content)
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', data, e)
          }
        }
      }
    }
  }
}

// GitHub Types
export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description?: string
  owner: {
    login: string
    avatar_url: string
  }
  html_url: string
  private: boolean
  stargazers_count: number
  language?: string
  pushed_at: string
  created_at: string
  updated_at: string
}

export interface GitHubRepoDetails extends GitHubRepo {
  homepage?: string
  watchers_count: number
  forks_count: number
  languages: Record<string, number>
  topics: string[]
  readme?: string
  size: number
  default_branch: string
}

// AI Generation Types
export interface GeneratedProject {
  title: string
  description: string
  long_description: string
  highlights: string[]
  tools: string[]
  stack: string[]
  suggested_image_prompt: string
  links: {
    github?: string
    live?: string
  }
  cover_image?: string
}

export interface ProjectImageData {
  title: string
  description?: string
  stack: string[]
  repo?: {
    owner: string
    name: string
  }
  [key: string]: unknown
}

export interface QuotaInfo {
  used: number
  remaining: number
  limit: number
}

export const api = new ApiClient(API_BASE_URL)
