import { loginSchema } from "@/schemas/auth/login"
import { loginUser } from "@/lib/services/auth/login"

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await loginUser(parsed.data)
    return Response.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Login failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
