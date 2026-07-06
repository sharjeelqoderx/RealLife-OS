import type { SignUpInput, SignUpResponse } from "@/schemas/auth/sign-up"

export async function signUpUser(_input: SignUpInput): Promise<SignUpResponse> {
  return {
    success: true,
    message: "Account created successfully",
  }
}
