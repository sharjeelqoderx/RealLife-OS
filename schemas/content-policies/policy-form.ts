import { z } from "zod"

export const policyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Policy name is required")
    .max(100, "Policy name is too long"),
  type: z.enum(["allow", "block", "ytrestricted", "safesearch"]),
  status: z.enum(["active", "inactive"]),
})

export type PolicyFormInput = z.infer<typeof policyFormSchema>
