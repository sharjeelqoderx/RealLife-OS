import { z } from "zod"

import { emailField } from "@/schemas/generic/email"
import { passwordField } from "@/schemas/generic/password"
import { personNameField } from "@/schemas/generic/person-name"

export const signUpSchema = z.object({
  fullName: personNameField,
  email: emailField,
  password: passwordField,
})

export type SignUpInput = z.infer<typeof signUpSchema>

export type SignUpResponse = {
  success: true
  message: string
}
