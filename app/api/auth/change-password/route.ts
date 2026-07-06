import { handleAuthRouteError } from "@/lib/api/auth-route"
import { changePasswordSchema } from "@/schemas/auth/change-password"
import { changePassword } from "@/lib/services/auth/change-password"

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
    return handleAuthRouteError(error)
  }
}
