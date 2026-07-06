import { z } from "zod"

import { passwordField } from "@/schemas/generic/password"

export const changePasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: passwordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export type ValidateResetTokenResponse = {
  valid: true
}

export type ChangePasswordResponse = {
  success: true
  message: string
}
