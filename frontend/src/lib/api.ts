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
  is_premium: boolean
  is_admin: boolean
  has_onboarded: boolean
  message_privacy?: 'everyone' | 'followers' | 'following'
  subscription_status?: 'free' | 'active' | 'trialing' | 'past_due' | 'canceled'
}

export interface BillingStatus {
  status: string
  is_premium: boolean
  current_period_end: string | null
}

export interface CheckoutResponse {
  url: string
}

export interface PortalResponse {
  url: string
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
  type: 'Post' | 'Project' | 'Gig'
  id: string
  title?: string
  preview?: string
}

export interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'repost' | 'mention'
  | 'bid_received' | 'bid_accepted' | 'bid_rejected'
  | 'gig_completed' | 'review_received'
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

export interface AdminUser {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url?: string
  is_verified: boolean
  has_onboarded: boolean
  inserted_at: string
  updated_at: string
}

export interface AdminUsersResponse {
  data: AdminUser[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  developer_score?: number
  is_verified: boolean
  is_premium?: boolean
}

export interface Gig {
  id: string
  title: string
  description: string
  budget_min?: number
  budget_max?: number
  currency: string
  deadline?: string
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  bids_count: number
  views_count: number
  user: UserProfile
  hired_bid?: Bid
  skills: string[]
  stacks: string[]
  inserted_at: string
  updated_at: string
}

export interface Bid {
  id: string
  amount: number
  currency: string
  delivery_days: number
  proposal: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  user: UserProfile
  gig?: Gig
  inserted_at: string
  updated_at: string
}

export interface GigReview {
  id: string
  rating: number
  content?: string
  review_type: 'client_to_freelancer' | 'freelancer_to_client'
  reviewer: UserProfile
  reviewee: UserProfile
  gig_id: string
  inserted_at: string
}

export interface GigFilters {
  limit?: number
  offset?: number
  search?: string
  tools?: string[]
  stacks?: string[]
  status?: string
  min_budget?: number
  max_budget?: number
  sort_by?: string
}

export interface CreateGigData {
  title: string
  description: string
  budget_min?: number
  budget_max?: number
  currency?: string
  deadline?: string
  tools?: string[]
  stacks?: string[]
}

export interface UpdateGigData {
  title?: string
  description?: string
  budget_min?: number
  budget_max?: number
  currency?: string
  deadline?: string
}

export interface PlaceBidData {
  amount: number
  currency?: string
  delivery_days: number
  proposal: string
}

export interface UpdateBidData {
  amount?: number
  delivery_days?: number
  proposal?: string
}

export interface CreateReviewData {
  rating: number
  content?: string
}

export interface AdminReport {
  id: string
  reportable_type: 'Post' | 'Project' | 'Comment' | 'Gig'
  reportable_id: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  inserted_at: string
  reporter: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

export interface AdminReportsResponse {
  data: AdminReport[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export interface AdminBotPost {
  id: string
  bot_type: 'trending_projects' | 'milestone' | 'announcement'
  metadata: Record<string, unknown>
  post: {
    id: string
    content: string
    inserted_at: string
  }
  inserted_at: string
}

export interface AdminBotPostsResponse {
  data: AdminBotPost[]
  meta: {
    total: number
    limit: number
    offset: number
  }
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
    return localStorage.getItem('onvibe_token')
  }

  /**
   * Store the auth token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem('onvibe_token', token)
  }

  /**
   * Remove the auth token from localStorage
   */
  clearToken(): void {
    localStorage.removeItem('onvibe_token')
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
    message_privacy?: 'everyone' | 'followers' | 'following'
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
    timeline?: { date: string; title: string; description?: string }[]
  }): Promise<{ data: unknown }> {
    return this.post('/projects', { project: data })
  }

  async updateProject(id: string, data: {
    title?: string
    description?: string
    images?: string[]
    tools?: string[]
    stack?: string[]
    links?: { live?: string; github?: string }
    highlights?: string[]
    timeline?: { date: string; title: string; description?: string }[]
  }): Promise<{ data: unknown }> {
    return this.put(`/projects/${id}`, { project: data })
  }

  async deleteProject(id: string): Promise<void> {
    return this.delete(`/projects/${id}`)
  }

  async getProjectGithubUrls(): Promise<{ github_urls: string[] }> {
    return this.get('/projects/github-urls')
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

  async getUserTimeline(username: string, params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/users/${username}/timeline?${queryParams}`)
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

  async updatePreferences(data: {
    ai_tool_ids: string[]
    tech_stack_ids: string[]
  }): Promise<{
    favorite_ai_tools: Array<{ id: string; name: string; slug: string }>
    preferred_tech_stacks: Array<{ id: string; name: string; slug: string; category?: string }>
  }> {
    return this.put('/me/preferences', { preferences: data })
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
    type?: 'top' | 'people' | 'projects' | 'posts' | 'gigs'
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

  async searchSuggestions(query: string, limit?: number): Promise<{ data: { users: SuggestedUser[]; projects: Array<{ id: string; title: string; image_url?: string; user: { username: string; display_name: string } }>; posts: Array<{ id: string; content: string; user: { username: string; display_name: string } }>; gigs: Array<{ id: string; title: string; budget_min?: number; budget_max?: number; currency: string; user: { username: string; display_name: string } }> } }> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Admin
  async getAdminUsers(params?: {
    limit?: number
    offset?: number
    search?: string
  }): Promise<AdminUsersResponse> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.search) queryParams.append('search', params.search)
    return this.get(`/admin/users?${queryParams}`)
  }

  async toggleUserVerified(userId: string): Promise<{ data: AdminUser }> {
    return this.post(`/admin/users/${userId}/toggle-verified`)
  }

  async deleteUser(userId: string): Promise<void> {
    return this.delete(`/admin/users/${userId}`)
  }

  async createAiTool(name: string): Promise<{ data: { id: string; name: string; slug: string } }> {
    return this.post('/admin/ai-tools', { name })
  }

  async deleteAiTool(id: string): Promise<void> {
    return this.delete(`/admin/ai-tools/${id}`)
  }

  async createTechStack(name: string, category?: string): Promise<{ data: { id: string; name: string; slug: string; category: string } }> {
    return this.post('/admin/tech-stacks', { name, category: category || 'other' })
  }

  async deleteTechStack(id: string): Promise<void> {
    return this.delete(`/admin/tech-stacks/${id}`)
  }

  async syncOpenRouterModels(): Promise<{ success: boolean; created: number; skipped: number; total: number }> {
    return this.post('/admin/ai-tools/sync-openrouter')
  }

  // Admin Bot Management
  async getAdminBotPosts(params?: {
    limit?: number
    offset?: number
  }): Promise<AdminBotPostsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    return this.get(`/admin/bot/posts?${queryParams}`)
  }

  async triggerTrendingBot(): Promise<{ success: boolean; post_id: string }> {
    return this.post('/admin/bot/trigger-trending')
  }

  async deleteAdminBotPost(id: string): Promise<void> {
    return this.delete(`/admin/bot/posts/${id}`)
  }

  // Admin Reports
  async getAdminReports(params?: {
    limit?: number
    offset?: number
    status?: string
    type?: string
  }): Promise<AdminReportsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.type) queryParams.append('type', params.type)
    return this.get(`/admin/reports?${queryParams}`)
  }

  async updateReportStatus(reportId: string, status: string): Promise<{ data: AdminReport }> {
    return this.put(`/admin/reports/${reportId}`, { status })
  }

  async deleteReportedContent(reportId: string): Promise<{ success: boolean }> {
    return this.delete(`/admin/reports/${reportId}/content`)
  }

  // Reports (user-submitted)
  async reportPost(id: string): Promise<{ success: boolean }> {
    return this.post('/reports', { type: 'post', id })
  }

  async reportGig(id: string): Promise<{ success: boolean }> {
    return this.post('/reports', { type: 'gig', id })
  }

  async reportProject(id: string): Promise<{ success: boolean }> {
    return this.post('/reports', { type: 'project', id })
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

  /**
   * Improves gig description content with AI streaming (uses specialized gig prompt)
   */
  async improveGig(
    content: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const token = this.getToken()
    const response = await fetch(`${this.baseUrl}/ai/improve-gig`, {
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
        message: 'Failed to improve gig description',
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

  // Gigs
  async getGigs(params?: GigFilters): Promise<{ data: Gig[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.tools) params.tools.forEach(t => queryParams.append('tools[]', t))
    if (params?.stacks) params.stacks.forEach(s => queryParams.append('stacks[]', s))
    if (params?.status) queryParams.append('status', params.status)
    if (params?.min_budget) queryParams.append('min_budget', params.min_budget.toString())
    if (params?.max_budget) queryParams.append('max_budget', params.max_budget.toString())
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)

    return this.get(`/gigs?${queryParams}`)
  }

  async getGig(id: string): Promise<{ data: Gig }> {
    return this.get(`/gigs/${id}`)
  }

  async createGig(data: CreateGigData): Promise<{ data: Gig }> {
    return this.post('/gigs', { gig: data })
  }

  async updateGig(id: string, data: UpdateGigData): Promise<{ data: Gig }> {
    return this.put(`/gigs/${id}`, { gig: data })
  }

  async cancelGig(id: string): Promise<{ data: Gig }> {
    return this.post(`/gigs/${id}/cancel`)
  }

  async hireForGig(gigId: string, bidId: string): Promise<{ data: Gig }> {
    return this.post(`/gigs/${gigId}/hire`, { bid_id: bidId })
  }

  async completeGig(id: string): Promise<{ data: Gig }> {
    return this.post(`/gigs/${id}/complete`)
  }

  async getGigBids(gigId: string): Promise<{ data: Bid[] }> {
    return this.get(`/gigs/${gigId}/bids`)
  }

  async placeBid(gigId: string, data: PlaceBidData): Promise<{ data: Bid }> {
    return this.post(`/gigs/${gigId}/bids`, { bid: data })
  }

  async updateBid(gigId: string, bidId: string, data: UpdateBidData): Promise<{ data: Bid }> {
    return this.put(`/gigs/${gigId}/bids/${bidId}`, { bid: data })
  }

  async withdrawBid(gigId: string, bidId: string): Promise<void> {
    return this.delete(`/gigs/${gigId}/bids/${bidId}`)
  }

  async getGigReviews(gigId: string): Promise<{ data: GigReview[] }> {
    return this.get(`/gigs/${gigId}/reviews`)
  }

  async createGigReview(gigId: string, data: CreateReviewData): Promise<{ data: GigReview }> {
    return this.post(`/gigs/${gigId}/reviews`, { review: data })
  }

  async getUserReviews(username: string): Promise<{ data: GigReview[] }> {
    return this.get(`/users/${username}/reviews`)
  }

  async getMyGigs(): Promise<{ data: Gig[] }> {
    return this.get('/my/gigs')
  }

  async getMyBids(): Promise<{ data: Bid[] }> {
    return this.get('/my/bids')
  }

  // ============================================================================
  // Billing / Subscription
  // ============================================================================

  async getBillingStatus(): Promise<BillingStatus> {
    return this.get('/billing/status')
  }

  async createCheckoutSession(params?: { success_url?: string; cancel_url?: string }): Promise<CheckoutResponse> {
    return this.post('/billing/checkout', params || {})
  }

  async createPortalSession(params?: { return_url?: string }): Promise<PortalResponse> {
    return this.post('/billing/portal', params || {})
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
