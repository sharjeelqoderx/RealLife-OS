import { z } from "zod"

import { emailField } from "@/schemas/generic/email"

export const forgetPasswordSchema = z.object({
  email: emailField,
})

export type ForgetPasswordInput = z.infer<typeof forgetPasswordSchema>

export type ForgetPasswordResponse = {
  success: true
  message: string
}
