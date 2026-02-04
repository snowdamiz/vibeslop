/**
 * API client for landing page - simplified version
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface Project {
  id: string
  title: string
  content: string
  image?: string
  author: {
    username: string
    name: string
    avatar_url?: string
    is_verified?: boolean
    is_premium?: boolean
  }
  tools?: string[]
  stack?: string[]
  likes: number
  comments: number
}

interface ProjectsResponse {
  data: Project[]
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}

export const api = {
  getProjects: (params?: { limit?: number; sort_by?: string }): Promise<ProjectsResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by)
    const query = searchParams.toString()
    return request(`/projects${query ? `?${query}` : ''}`)
  },
}
