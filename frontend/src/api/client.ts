import type {
  LoginRequest,
  LoginResponse,
  TestAuthResponse,
  AuthUser,
  ShopRegistrationRequest,
  ShopRegistrationResponse,
  ProductRequest,
  ProductResponse,
} from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace(/\/+$/, '')

/**
 * In-memory token and user store.
 * Strictly held in memory for this session; not stored in localStorage or sessionStorage.
 */
let inMemoryAccessToken: string | null = null
let inMemoryUser: AuthUser | null = null

export const getAccessToken = (): string | null => inMemoryAccessToken

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token
}

export const getAuthUser = (): AuthUser | null => inMemoryUser

export const setAuthUser = (user: AuthUser | null): void => {
  inMemoryUser = user
}

export const clearAuth = (): void => {
  inMemoryAccessToken = null
  inMemoryUser = null
}

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/**
 * Reusable HTTP client with error handling and Authorization header injection.
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // Inject in-memory Bearer token if not explicitly provided and available
  if (!headers['Authorization'] && inMemoryAccessToken) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      `Unable to connect to POS server (${API_BASE_URL}). Please verify that the backend is running.`,
      0
    )
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    let fieldErrors: Record<string, string> | undefined

    try {
      const errorData = await response.json()
      if (errorData && typeof errorData === 'object') {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message
        } else {
          // Field-level validation error map from Spring Boot MethodArgumentNotValidException:
          // { "shopName": "Shop name is required", "email": "Invalid email format" }
          fieldErrors = errorData as Record<string, string>
          const firstKey = Object.keys(fieldErrors)[0]
          if (firstKey && typeof fieldErrors[firstKey] === 'string') {
            errorMessage = fieldErrors[firstKey]
          }
        }
      }
    } catch {
      // Non-JSON error body fallback
    }

    throw new ApiError(errorMessage, response.status, fieldErrors)
  }

  if (response.status === 204) {
    return null as T
  }

  // Parse JSON response
  return (await response.json()) as T
}

export const authApi = {
  /**
   * Authenticate user with work email and password.
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })

    if (response.accessToken) {
      setAccessToken(response.accessToken)
      setAuthUser({
        userId: response.userId,
        shopId: response.shopId,
        fullName: response.fullName,
        email: response.email,
        role: response.role,
      })
    }

    return response
  },

  /**
   * Register a new shop and merchant account.
   */
  async register(data: ShopRegistrationRequest): Promise<ShopRegistrationResponse> {
    return apiRequest<ShopRegistrationResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Protected test endpoint to verify Bearer token authentication.
   */
  async testAuth(tokenOverride?: string): Promise<TestAuthResponse> {
    const token = tokenOverride || inMemoryAccessToken
    if (!token) {
      throw new ApiError('No authentication token available to verify.', 401)
    }

    return apiRequest<TestAuthResponse>('/api/test', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  /**
   * Clear in-memory credentials.
   */
  logout(): void {
    clearAuth()
  },
}

export const productApi = {
  /**
   * List all products for the authenticated shop.
   * Supports server-side search and category filtering.
   */
  async getAll(params?: { search?: string; category?: string }): Promise<ProductResponse[]> {
    const query = new URLSearchParams()
    if (params?.search && params.search.trim()) {
      query.set('search', params.search.trim())
    }
    if (params?.category && params.category.trim() && params.category.toLowerCase() !== 'all') {
      query.set('category', params.category.trim())
    }
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiRequest<ProductResponse[]>(`/api/products${qs}`, {
      method: 'GET',
    })
  },

  /**
   * Get single product by ID (scoped to authenticated shop).
   */
  async getById(id: number): Promise<ProductResponse> {
    return apiRequest<ProductResponse>(`/api/products/${id}`, {
      method: 'GET',
    })
  },

  /**
   * Create a new product. Shop is automatically assigned server-side.
   */
  async create(data: ProductRequest): Promise<ProductResponse> {
    return apiRequest<ProductResponse>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update an existing product. Only permitted fields are modified.
   */
  async update(id: number, data: ProductRequest): Promise<ProductResponse> {
    return apiRequest<ProductResponse>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete a product by ID.
   */
  async delete(id: number): Promise<void> {
    await apiRequest<void>(`/api/products/${id}`, {
      method: 'DELETE',
    })
  },
}
