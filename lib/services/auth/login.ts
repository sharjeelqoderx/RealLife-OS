import type { LoginInput, LoginResponse } from "@/schemas/auth/login"

export async function loginUser(_input: LoginInput): Promise<LoginResponse> {
  return {
    success: true,
    message: "Login successful",
  }
}
