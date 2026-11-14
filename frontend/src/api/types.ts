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

export interface SaleItemRequest {
  productId: number
  quantity: number
}

export interface SaleRequest {
  items: SaleItemRequest[]
  customerName?: string
  customerPhone?: string
  paymentMethod: 'CASH' | 'CARD'
  discountType: 'NONE' | 'PERCENT' | 'FIXED'
  discountValue?: number
  amountTendered?: number
  notes?: string
  idempotencyKey?: string
}

export interface SaleItemResponse {
  id: number
  productId: number | null
  productName: string
  unitPrice: number
  quantity: number
  subtotal: number
}

export interface SaleResponse {
  id: number
  receiptNumber: string
  idempotencyKey?: string
  shopId: number
  cashierId: number
  cashierName?: string
  customerName?: string
  customerPhone?: string
  status: string
  paymentMethod: 'CASH' | 'CARD'
  subtotal: number
  discountType: string
  discountValue: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  amountTendered?: number
  changeAmount: number
  notes?: string
  createdAt: string
  itemCount?: number
  items: SaleItemResponse[]
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface SalesSummaryResponse {
  totalSales: number
  totalRevenue: number
  averageSale: number
}

export type SalesPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'

export interface SalesFilterParams {
  page?: number
  size?: number
  query?: string
  startDate?: string
  endDate?: string
  paymentMethod?: 'CASH' | 'CARD' | ''
  status?: string
  sortBy?: 'createdAt' | 'totalAmount'
  sortDir?: 'asc' | 'desc'
}

export type AnalyticsPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'this_month' | 'custom'

export interface AnalyticsOverviewResponse {
  totalRevenue: number
  totalTransactions: number
  itemsSold: number
  averageTransactionValue: number
  period: string
  startDate: string
  endDate: string
}

export interface DailyRevenueTrend {
  date: string
  revenue: number
  transactionCount: number
  itemsSold: number
}

export interface TopProductResponse {
  productId: number | null
  productName: string
  category: string
  quantitySold: number
  totalRevenue: number
}

export interface AnalyticsFilterParams {
  period?: AnalyticsPeriod | string
  startDate?: string
  endDate?: string
  limit?: number
}

// =============================================================================
// Inventory Management Types (Step 50A/50B)
// =============================================================================

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export type StockAdjustmentReason =
  | 'STOCK_RECEIVED'
  | 'DAMAGED'
  | 'EXPIRED'
  | 'MANUAL_CORRECTION'

export interface InventoryOverviewResponse {
  totalProducts: number
  totalUnitsInStock: number
  inStockProducts: number
  lowStockProducts: number
  outOfStockProducts: number
}

export interface InventoryProductResponse {
  productId: number
  productName: string
  category?: string
  stockQuantity: number
  lowStockThreshold: number
  inventoryStatus: InventoryStatus
  sellingPrice: number
}

export interface StockAdjustmentRequest {
  adjustment: number
  reason: StockAdjustmentReason
  note?: string
}

export interface UpdateThresholdRequest {
  lowStockThreshold: number
}

export interface InventoryAdjustmentResponse {
  id: number
  productId: number | null
  productName: string
  userId: number | null
  userFullName: string
  adjustmentQuantity: number
  previousQuantity: number
  newQuantity: number
  reason: StockAdjustmentReason | string
  note?: string
  createdAt: string
}

export interface InventoryProductsFilterParams {
  status?: InventoryStatus | ''
  query?: string
  category?: string
}

export interface InventoryAdjustmentsFilterParams {
  productId?: number
  page?: number
  size?: number
}



