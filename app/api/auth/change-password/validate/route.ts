import { handleAuthRouteError } from "@/lib/api/auth-route"
import { validateRecoverySession } from "@/lib/services/auth/change-password"

export async function GET() {
  try {
    const result = await validateRecoverySession()
    return Response.json(result)
  } catch (error) {
    return handleAuthRouteError(error)
  }
}
