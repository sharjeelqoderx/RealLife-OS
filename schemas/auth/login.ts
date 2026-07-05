import { z } from "zod"

import { emailField } from "@/schemas/generic/email"
import { passwordField } from "@/schemas/generic/password"

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
})

export type LoginInput = z.infer<typeof loginSchema>

export type LoginResponse = {
  success: true
  message: string
}
