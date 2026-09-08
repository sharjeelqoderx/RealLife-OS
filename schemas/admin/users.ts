import { z } from "zod"

import { AUTH_ROLES } from "@/lib/auth/roles"

export const setAuthUserRoleSchema = z.object({
  role: z.enum([AUTH_ROLES.USER, AUTH_ROLES.ADMIN]),
})

export type SetAuthUserRoleInput = z.infer<typeof setAuthUserRoleSchema>
