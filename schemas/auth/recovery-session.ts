import { z } from "zod"

export const recoverySessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
})

export type RecoverySessionInput = z.infer<typeof recoverySessionSchema>

export type RecoverySessionResponse = {
  success: true
}
