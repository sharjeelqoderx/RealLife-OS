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
    trafficAndDns: boolean
    deviceProfile: {
      trafficAndDns: boolean
      serviceMode: string | null
      disableAutoFallback: boolean | null
    } | null
    blockPage: {
      configured: boolean
      targetUri: string | null
      mode: string | null
      includeContext: boolean | null
    } | null
  }
}

type StatusResponse = { success: true; data: CloudflareStatus }
type SyncResponse = {
  success: true
  data: { seen: number; updated: number; missing: number }
}
type ProfileResponse = {
  success: true
  data: { trafficAndDns: boolean; serviceMode: string | null }
}
type BlockPageResponse = {
  success: true
  data: { updated: boolean; status: CloudflareStatus["cloudflare"]["blockPage"] }
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

  const profileMutation = useMutation({
    mutationFn: () =>
      apiClient<ProfileResponse>("/api/admin/cloudflare/device-profile", {
        method: "POST",
      }),
    onSuccess: () => {
      void statusQuery.refetch()
    },
  })

  const blockPageMutation = useMutation({
    mutationFn: () =>
      apiClient<BlockPageResponse>("/api/admin/cloudflare/block-page", {
        method: "POST",
      }),
    onSuccess: () => {
      void statusQuery.refetch()
    },
  })

  const logpushMutation = useMutation({
    mutationFn: () =>
      apiClient<{
        success: true
        data: {
          created: string[]
          existing: string[]
          destinationHost: string
        }
      }>("/api/admin/cloudflare/logpush", { method: "POST" }),
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
        <StatusCard
          label="Traffic and DNS mode"
          value={status.trafficAndDns}
        />
        <StatusCard
          label="Block page redirect"
          value={status.blockPage?.configured === true}
        />
      </div>

      {status.deviceProfile?.serviceMode ? (
        <p className="text-sm text-brand-text-muted">
          Default device profile service mode:{" "}
          <strong>{status.deviceProfile.serviceMode}</strong>
          {status.deviceProfile.disableAutoFallback === true
            ? " · auto DNS fallback disabled"
            : " · auto DNS fallback may still be on"}
        </p>
      ) : (
        <p className="text-sm text-brand-text-muted">
          Default device profile could not be read. Set Traffic and DNS
          manually in Cloudflare Zero Trust, or retry Apply below.
        </p>
      )}

      {status.blockPage?.targetUri ? (
        <p className="text-sm text-brand-text-muted">
          Gateway block page redirect:{" "}
          <strong>{status.blockPage.targetUri}</strong>
          {status.blockPage.includeContext ? " · policy context enabled" : ""}
        </p>
      ) : (
        <p className="text-sm text-brand-text-muted">
          Gateway block page is not configured yet. Apply below or create a block
          policy to set it automatically.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        onClick={() => syncMutation.mutate()}
        disabled={
          syncMutation.isPending ||
          profileMutation.isPending ||
          blockPageMutation.isPending ||
          logpushMutation.isPending
        }
      >
        {syncMutation.isPending ? <CustomSpinner /> : null}
        Sync Cloudflare devices
      </Button>
      <Button
        type="button"
        variant="brandOutline"
        onClick={() => profileMutation.mutate()}
        disabled={
          profileMutation.isPending ||
          syncMutation.isPending ||
          blockPageMutation.isPending ||
          logpushMutation.isPending
        }
      >
        {profileMutation.isPending ? <CustomSpinner /> : null}
        Apply Traffic and DNS profile
      </Button>
      <Button
        type="button"
        variant="brandOutline"
        onClick={() => blockPageMutation.mutate()}
        disabled={
          blockPageMutation.isPending ||
          syncMutation.isPending ||
          profileMutation.isPending ||
          logpushMutation.isPending
        }
      >
        {blockPageMutation.isPending ? <CustomSpinner /> : null}
        Apply block page redirect
      </Button>
      <Button
        type="button"
        variant="brandOutline"
        onClick={() => logpushMutation.mutate()}
        disabled={
          logpushMutation.isPending ||
          syncMutation.isPending ||
          profileMutation.isPending ||
          blockPageMutation.isPending
        }
      >
        {logpushMutation.isPending ? <CustomSpinner /> : null}
        Ensure Gateway Logpush jobs
      </Button>
      </div>

      {blockPageMutation.isError ? (
        <ErrorAlert
          message={
            blockPageMutation.error instanceof Error
              ? blockPageMutation.error.message
              : "Unable to apply Gateway block page"
          }
        />
      ) : null}

      {profileMutation.isError ? (
        <ErrorAlert
          message={
            profileMutation.error instanceof Error
              ? profileMutation.error.message
              : "Unable to apply Traffic and DNS profile"
          }
        />
      ) : null}

      {syncMutation.isError ? (
        <ErrorAlert
          message={
            syncMutation.error instanceof Error
              ? syncMutation.error.message
              : "Sync failed"
          }
        />
      ) : null}

      {logpushMutation.isError ? (
        <ErrorAlert
          message={
            logpushMutation.error instanceof Error
              ? logpushMutation.error.message
              : "Unable to create Logpush jobs. Token may lack Logs Edit."
          }
        />
      ) : null}

      {logpushMutation.data ? (
        <p className="text-sm text-brand-text-muted">
          Logpush destination host {logpushMutation.data.data.destinationHost} ·
          created {logpushMutation.data.data.created.join(", ") || "none"} ·
          existing {logpushMutation.data.data.existing.join(", ") || "none"}
        </p>
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
