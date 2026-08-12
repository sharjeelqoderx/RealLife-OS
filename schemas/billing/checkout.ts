import { z } from "zod"

export const createCheckoutSessionSchema = z.object({
  planId: z.enum(["focus", "family"]),
})

export type CreateCheckoutSessionResponse = {
  url: string
}

export type BillingStatusResponse = {
  hasAccess: boolean
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  planId: string | undefined
  deviceLimit: number
  planName: string
}
