import { handleAuthRouteError } from "@/lib/api/auth-route"
import { recoverySessionSchema } from "@/schemas/auth/recovery-session"
import { establishRecoverySession } from "@/lib/services/auth/recovery-session"

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = recoverySessionSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await establishRecoverySession(parsed.data)
    return Response.json(result)
  } catch (error) {
    return handleAuthRouteError(error)
  }
}
