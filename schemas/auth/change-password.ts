import { z } from "zod"

import { passwordField } from "@/schemas/generic/password"

export const validateResetTokenSchema = z.object({
  id: z.string().trim().min(1, "Reset token is required"),
})

export const changePasswordSchema = z
  .object({
    id: z.string().trim().min(1, "Reset token is required"),
    password: passwordField,
    confirmPassword: passwordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type ValidateResetTokenInput = z.infer<typeof validateResetTokenSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export type ValidateResetTokenResponse = {
  valid: true
}

export type ChangePasswordResponse = {
  success: true
  message: string
}
