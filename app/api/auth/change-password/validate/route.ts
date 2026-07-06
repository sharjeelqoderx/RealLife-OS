import { validateResetTokenSchema } from "@/schemas/auth/change-password"
import {
  ResetTokenError,
  validateResetToken,
} from "@/lib/services/auth/change-password"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = validateResetTokenSchema.safeParse({
    id: searchParams.get("id") ?? "",
  })

  if (!parsed.success) {
    return Response.json(
      {
        error: "Reset token is required",
        code: "INVALID_TOKEN",
      },
      { status: 400 }
    )
  }

  try {
    const result = await validateResetToken(parsed.data.id)
    return Response.json(result)
  } catch (error) {
    if (error instanceof ResetTokenError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.code === "EXPIRED_TOKEN" ? 410 : 404 }
      )
    }

    const message =
      error instanceof Error ? error.message : "Token validation failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
