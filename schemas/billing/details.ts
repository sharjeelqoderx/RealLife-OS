export type PaymentMethodInfo = {
  brand: string
  last4: string
  expMonth: number
  expYear: number
  cardholderName: string | null
  funding: string | null
  country: string | null
  billingEmail: string | null
  billingAddress: string | null
}

export type BillingDetailsResponse = {
  hasAccess: boolean
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  planId: string | undefined
  planName: string
  deviceLimit: number
  enrolledDeviceCount: number
  remainingDeviceSlots: number
  canAddDevice: boolean
  paymentMethod: PaymentMethodInfo | null
  canManagePayment: boolean
  needsPaymentMethod: boolean
}

export type BillingPortalResponse = {
  url: string
}
