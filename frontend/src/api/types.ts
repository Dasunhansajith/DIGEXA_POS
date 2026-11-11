export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  userId: number
  shopId: number | null
  fullName: string
  email: string
  role: string
  message: string
  accessToken: string
  tokenType: string
}

export interface TestAuthResponse {
  status: string
  message: string
  userId: number
  email: string
  role: string
}

export interface AuthUser {
  userId: number
  shopId: number | null
  fullName: string
  email: string
  role: string
}

export interface ShopRegistrationRequest {
  shopName: string
  ownerFullName: string
  email: string
  phone?: string
  password: string
  confirmPassword: string
}

export interface ShopRegistrationResponse {
  shopId: number
  ownerId: number
  shopName: string
  email: string
  message: string
}

export interface ProductRequest {
  name: string
  description?: string
  price: number
  category?: string
  imageUrl?: string
  stock?: number
}

export interface ProductResponse {
  id: number
  name: string
  description?: string
  price: number
  category?: string
  imageUrl?: string
  stock: number
  shopId: number
}
