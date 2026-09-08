import Link from "next/link"

import { AdminUsersPanel } from "@/app/(protected)/admin/users/_components/admin-users-panel"
import { requireAdminUser } from "@/lib/services/admin/require-admin"
import { listAdminUsers } from "@/lib/services/admin/users"

export default async function AdminUsersPage() {
  let currentUserId: string
  try {
    const admin = await requireAdminUser()
    currentUserId = admin.id
  } catch {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10">
        <h1 className="text-2xl font-bold text-brand-text-heading">
          Administrator access required
        </h1>
        <p className="text-sm text-brand-text-muted">
          Only ADMIN accounts can manage roles. Sign-up always creates USER.
          Bootstrap the first ADMIN with `ADMIN_EMAILS`, then promote others
          here.
        </p>
        <Link href="/dashboard" className="text-sm text-brand-primary underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const users = await listAdminUsers().catch(() => [])
  return (
    <AdminUsersPanel initialUsers={users} currentUserId={currentUserId} />
  )
}
