import Link from "next/link"

import { AdminCloudflarePanel } from "@/app/(protected)/admin/cloudflare/_components/admin-cloudflare-panel"
import { requireAdminUser } from "@/lib/services/admin/require-admin"
import { getAdminCloudflareStatus } from "@/lib/services/admin/cloudflare-status"

export default async function AdminCloudflarePage() {
  try {
    await requireAdminUser()
  } catch {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10">
        <h1 className="text-2xl font-bold text-brand-text-heading">
          Administrator access required
        </h1>
        <p className="text-sm text-brand-text-muted">
          Only ADMIN accounts can open this page. Sign-up always creates USER.
          Bootstrap the first ADMIN with `ADMIN_EMAILS`, then promote others
          from `/admin/users`.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard" className="text-sm text-brand-primary underline">
            Back to dashboard
          </Link>
          <Link href="/admin/users" className="text-sm text-brand-primary underline">
            Admin users
          </Link>
        </div>
      </div>
    )
  }

  const status = await getAdminCloudflareStatus().catch(() => ({
    cloudflare: {
      connected: false,
      devicesApi: false,
      gatewayApi: false,
      accountConfigured: false,
      tokenConfigured: false,
      trafficAndDns: false,
      deviceProfile: null,
      blockPage: null,
    },
  }))

  return <AdminCloudflarePanel initialStatus={status} />
}
