import { z } from "zod"

export const createCheckoutSessionSchema = z.object({
  planId: z.enum(["willpower_pro", "family_pack"]),
})

export type CreateCheckoutSessionResponse = {
  url: string
}

export type BillingStatusResponse = {
  hasAccess: boolean
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  planId: string | null
}
