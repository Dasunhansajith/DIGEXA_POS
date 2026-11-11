import type { ProductResponse } from '../../api/types'

export interface CartItem {
  product: ProductResponse
  quantity: number
}

export type DiscountType = 'percent' | 'fixed'

export interface POSCustomerInfo {
  name: string
  phone: string
  note?: string
}

export interface POSSummary {
  itemCount: number
  unitCount: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  grandTotal: number
}

/**
 * Sri Lankan Rupee currency formatter.
 * Returns formatted string like "Rs. 1,450.00"
 */
export const formatLKR = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return `Rs. ${safeAmount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Accurate 2-decimal financial rounding using EPSILON
 */
export const roundTo2Decimals = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

