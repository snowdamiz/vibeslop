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
   * Initiate GitHub OAuth login
   */
  loginWithGithub(): void {
    window.location.href = `${this.baseUrl}/auth/github`
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
    offset?: number
    search?: string
    tools?: string[]
    stacks?: string[]
    sort_by?: string
  }): Promise<any> {
    const queryParams = new URLSearchParams()
    if (params?.feed) queryParams.append('feed', params.feed)
    if (params?.type) queryParams.append('type', params.type)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.tools) params.tools.forEach(t => queryParams.append('tools[]', t))
    if (params?.stacks) params.stacks.forEach(s => queryParams.append('stacks[]', s))
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)

    return this.get(`/posts?${queryParams}`)
  }

  async getPost(id: string): Promise<any> {
    return this.get(`/posts/${id}`)
  }

  async createPost(data: { content: string; linked_project_id?: string }): Promise<any> {
    return this.post('/posts', { post: data })
  }

  // Projects
  async getProjects(params?: {
    limit?: number
    offset?: number
    search?: string
    tools?: string[]
    stacks?: string[]
    sort_by?: string
  }): Promise<any> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.tools) params.tools.forEach(t => queryParams.append('tools[]', t))
    if (params?.stacks) params.stacks.forEach(s => queryParams.append('stacks[]', s))
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)

    return this.get(`/projects?${queryParams}`)
  }

  async getProject(id: string): Promise<any> {
    return this.get(`/projects/${id}`)
  }

  // Users
  async getUser(username: string): Promise<any> {
    return this.get(`/users/${username}`)
  }

  async getUserPosts(username: string, params?: { limit?: number; offset?: number }): Promise<any> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/users/${username}/posts?${queryParams}`)
  }

  async getUserProjects(username: string, params?: { limit?: number; offset?: number }): Promise<any> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/users/${username}/projects?${queryParams}`)
  }

  async getUserLikes(username: string, params?: { limit?: number; offset?: number }): Promise<any> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/users/${username}/likes?${queryParams}`)
  }

  async followUser(username: string): Promise<any> {
    return this.post(`/users/${username}/follow`)
  }

  async unfollowUser(username: string): Promise<any> {
    return this.delete(`/users/${username}/follow`)
  }

  // Likes
  async toggleLike(type: string, id: string): Promise<any> {
    return this.post('/likes', { type, id })
  }

  // Catalog
  async getTools(): Promise<any> {
    return this.get('/tools')
  }

  async getStacks(): Promise<any> {
    return this.get('/stacks')
  }

  // Notifications
  async getNotifications(params?: { limit?: number; offset?: number }): Promise<NotificationResponse> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/notifications?${queryParams}`)
  }

  async markNotificationRead(id: string): Promise<any> {
    return this.post(`/notifications/${id}/read`)
  }

  async markAllNotificationsRead(): Promise<any> {
    return this.post('/notifications/read-all')
  }
}

export const api = new ApiClient(API_BASE_URL)
