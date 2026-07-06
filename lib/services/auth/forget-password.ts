import type {
  ForgetPasswordInput,
  ForgetPasswordResponse,
} from "@/schemas/auth/forget-password"

export async function requestPasswordReset(
  _input: ForgetPasswordInput
): Promise<ForgetPasswordResponse> {
  return {
    success: true,
    message: "Password reset link sent to your email",
  }
}
