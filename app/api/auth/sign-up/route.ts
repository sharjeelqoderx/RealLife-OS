import { handleAuthRouteError } from "@/lib/api/auth-route"
import { signUpSchema } from "@/schemas/auth/sign-up"
import { signUpUser } from "@/lib/services/auth/sign-up"

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = signUpSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await signUpUser(parsed.data)
    return Response.json(result)
  } catch (error) {
    return handleAuthRouteError(error)
  }
}
