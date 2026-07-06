import { handleAuthRouteError } from "@/lib/api/auth-route"
import { logoutUser } from "@/lib/services/auth/logout"

export async function POST() {
  try {
    const result = await logoutUser()
    return Response.json(result)
  } catch (error) {
    return handleAuthRouteError(error)
  }
}
