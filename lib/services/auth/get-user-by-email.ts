import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env"

type AdminUsersResponse = {
  users?: Array<{ id: string; email?: string }>
}

export async function getUserByEmail(
  email: string
): Promise<{ id: string } | null> {
  const serviceRoleKey = getSupabaseServiceRoleKey()
  const normalizedEmail = email.trim().toLowerCase()

  const query = new URLSearchParams({
    filter: normalizedEmail,
    per_page: "1",
  })

  const response = await fetch(
    `${getSupabaseUrl()}/auth/v1/admin/users?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  )

  if (!response.ok) {
    return null
  }

  const body = (await response.json()) as AdminUsersResponse
  const user = body.users?.find(
    (entry) => entry.email?.toLowerCase() === normalizedEmail
  )

  if (!user) {
    return null
  }

  return { id: user.id }
}
