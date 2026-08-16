"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

import { ErrorAlert } from "@/components/feedback"
import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"

type CloudflareStatus = {
  cloudflare: {
    connected: boolean
    devicesApi: boolean
    gatewayApi: boolean
    accountConfigured: boolean
    tokenConfigured: boolean
  }
}

type StatusResponse = { success: true; data: CloudflareStatus }
type SyncResponse = {
  success: true
  data: { seen: number; updated: number; missing: number }
}

export interface AdminCloudflarePanelProps {
  initialStatus: CloudflareStatus
}

export function AdminCloudflarePanel({
  initialStatus,
}: AdminCloudflarePanelProps) {
  const statusQuery = useQuery({
    queryKey: ["admin", "cloudflare", "status"],
    queryFn: () =>
      apiClient<StatusResponse>("/api/admin/cloudflare/status"),
    initialData: { success: true, data: initialStatus },
  })

  const syncMutation = useMutation({
    mutationFn: () =>
      apiClient<SyncResponse>("/api/admin/cloudflare/sync", {
        method: "POST",
      }),
  })

  const status = statusQuery.data?.data.cloudflare ?? initialStatus.cloudflare

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-heading">
          Cloudflare platform status
        </h1>
        <p className="mt-2 text-sm text-brand-text-muted">
          Administrator-only health checks for the shared Zero Trust account.
          API tokens are never shown here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatusCard label="Connected" value={status.connected} />
        <StatusCard label="Account configured" value={status.accountConfigured} />
        <StatusCard label="Token configured" value={status.tokenConfigured} />
        <StatusCard label="Devices API" value={status.devicesApi} />
        <StatusCard label="Gateway API" value={status.gatewayApi} />
      </div>

      <Button
        type="button"
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
      >
        {syncMutation.isPending ? <CustomSpinner /> : null}
        Sync Cloudflare devices
      </Button>

      {syncMutation.isError ? (
        <ErrorAlert
          message={
            syncMutation.error instanceof Error
              ? syncMutation.error.message
              : "Sync failed"
          }
        />
      ) : null}

      {syncMutation.data ? (
        <p className="text-sm text-brand-text-muted">
          Seen {syncMutation.data.data.seen} devices · updated{" "}
          {syncMutation.data.data.updated} · missing locally{" "}
          {syncMutation.data.data.missing}
        </p>
      ) : null}
    </div>
  )
}

function StatusCard({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-brand-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-brand-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-brand-text-heading">
        {value ? "Yes" : "No"}
      </p>
    </div>
  )
}
