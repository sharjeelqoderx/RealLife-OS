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
          This page is only available to emails listed in the private
          `ADMIN_EMAILS` environment variable.
        </p>
        <Link href="/dashboard" className="text-sm text-brand-primary underline">
          Back to dashboard
        </Link>
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
    },
  }))

  return <AdminCloudflarePanel initialStatus={status} />
}
