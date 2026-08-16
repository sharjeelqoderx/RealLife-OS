"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ErrorAlert, WarningAlert } from "@/components/feedback"
import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"

type EnrollmentCreateResponse = {
  success: true
  data: {
    enrollmentId: string
    status: "pending"
    teamName: string
    enrollmentEmail: string
    platformInstructions: Record<string, string>
  }
}

type EnrollmentStatusResponse = {
  success: true
  data: {
    status: "pending" | "completed" | "expired" | "failed" | "ambiguous"
  }
}

const MAX_POLLS = 40

export function DeviceEnrollmentChecker() {
  const queryClient = useQueryClient()
  const [deviceName, setDeviceName] = useState("")
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  const startMutation = useMutation({
    mutationFn: (name: string) =>
      apiClient<EnrollmentCreateResponse>("/api/devices/enrollment", {
        method: "POST",
        body: JSON.stringify({ deviceName: name }),
      }),
    onSuccess: (response) => {
      setEnrollmentId(response.data.enrollmentId)
      setPollCount(0)
    },
  })

  const statusQuery = useQuery({
    queryKey: queryKeys.devices.enrollmentStatus(enrollmentId ?? "none"),
    queryFn: () =>
      apiClient<EnrollmentStatusResponse>(
        `/api/devices/enrollment/${enrollmentId}/status`
      ),
    enabled: Boolean(enrollmentId) && pollCount < MAX_POLLS,
    refetchInterval: (query) => {
      const status = query.state.data?.data.status
      if (!status || status === "pending") return 3000
      return false
    },
  })

  useEffect(() => {
    if (statusQuery.isFetching && enrollmentId) {
      setPollCount((count) => count + 1)
    }
  }, [statusQuery.dataUpdatedAt, enrollmentId, statusQuery.isFetching])

  useEffect(() => {
    if (statusQuery.data?.data.status === "completed") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.list() })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.enrollmentInfo(),
      })
    }
  }, [statusQuery.data?.data.status, queryClient])

  const status = statusQuery.data?.data.status
  const stopped =
    status === "completed" ||
    status === "expired" ||
    status === "failed" ||
    pollCount >= MAX_POLLS

  return (
    <div className="space-y-4 rounded-xl border border-border bg-brand-surface p-5">
      <div>
        <h3 className="text-base font-semibold text-brand-text-heading">
          Verify enrolled device
        </h3>
        <p className="mt-1 text-sm text-brand-text-muted">
          After Cloudflare One Client enrollment completes, check here. We mark
          the device as enrolled once Cloudflare shows an active registration
          for your account email.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="enrollment-device-name">Device name</Label>
        <Input
          id="enrollment-device-name"
          value={deviceName}
          onChange={(event) => setDeviceName(event.target.value)}
          placeholder="John's Laptop"
          disabled={Boolean(enrollmentId) && !stopped}
        />
      </div>

      <Button
        type="button"
        onClick={() => startMutation.mutate(deviceName.trim())}
        disabled={
          startMutation.isPending ||
          deviceName.trim().length === 0 ||
          (Boolean(enrollmentId) && !stopped)
        }
      >
        {startMutation.isPending ? <CustomSpinner /> : null}
        {enrollmentId && !stopped ? "Waiting for Cloudflare…" : "Check Device"}
      </Button>

      {startMutation.isError ? (
        <ErrorAlert
          message={
            startMutation.error instanceof Error
              ? startMutation.error.message
              : "Unable to start enrollment verification"
          }
        />
      ) : null}

      {statusQuery.isError ? (
        <ErrorAlert
          message={
            statusQuery.error instanceof Error
              ? statusQuery.error.message
              : "Unable to check enrollment status"
          }
        />
      ) : null}

      {status === "pending" && !stopped ? (
        <WarningAlert message="Enrollment is still pending. Finish Cloudflare One Client sign-in, then wait for verification." />
      ) : null}
      {status === "completed" ? (
        <p className="text-sm font-medium text-emerald-700">
          Device enrolled and linked to your account.
        </p>
      ) : null}
      {status === "expired" ? (
        <WarningAlert message="This enrollment expired. Start Check Device again." />
      ) : null}
      {status === "failed" ? (
        <ErrorAlert message="That Cloudflare device belongs to another account." />
      ) : null}
      {status === "ambiguous" ? (
        <WarningAlert message="More than one new device matched. Contact support so we can safely identify the device." />
      ) : null}
      {pollCount >= MAX_POLLS && status === "pending" ? (
        <WarningAlert message="Stopped polling. Click Check Device again after enrollment finishes." />
      ) : null}
    </div>
  )
}
