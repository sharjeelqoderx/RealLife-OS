import { z } from "zod"

export const createCheckoutSessionSchema = z.object({
  planId: z.enum(["basic_monthly"]).default("basic_monthly"),
})

export type CreateCheckoutSessionInput = z.infer<
  typeof createCheckoutSessionSchema
>

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
