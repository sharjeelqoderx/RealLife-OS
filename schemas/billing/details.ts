export type PaymentMethodInfo = {
  brand: string
  last4: string
  expMonth: number
  expYear: number
  cardholderName: string | null
}

export type BillingDetailsResponse = {
  hasAccess: boolean
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  planId: string | null
  planName: string
  paymentMethod: PaymentMethodInfo | null
  canManagePayment: boolean
  needsPaymentMethod: boolean
}

export type BillingPortalResponse = {
  url: string
}
