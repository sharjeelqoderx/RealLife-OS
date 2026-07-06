import { changePasswordSchema } from "@/schemas/auth/change-password"
import {
  ResetTokenError,
  changePassword,
} from "@/lib/services/auth/change-password"

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = changePasswordSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await changePassword(parsed.data)
    return Response.json(result)
  } catch (error) {
    if (error instanceof ResetTokenError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.code === "EXPIRED_TOKEN" ? 410 : 404 }
      )
    }

    const message =
      error instanceof Error ? error.message : "Password change failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
