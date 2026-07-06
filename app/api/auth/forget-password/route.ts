import { forgetPasswordSchema } from "@/schemas/auth/forget-password"
import { requestPasswordReset } from "@/lib/services/auth/forget-password"

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = forgetPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await requestPasswordReset(parsed.data)
    return Response.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Password reset request failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
