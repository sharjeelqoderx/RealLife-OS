"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { DeviceTypePicker } from "@/app/(protected)/devices/_components/device-type-picker"
import { ErrorAlert, WarningAlert } from "@/components/feedback"
import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import {
  devicePlatformSchema,
  type DevicePlatform,
} from "@/schemas/devices/device"
import type { DeviceEnrollmentInfo } from "@/schemas/devices/api"

export interface DeviceSetupViewProps {
  initialPlatform: DevicePlatform | null
  enrollmentInfo: DeviceEnrollmentInfo | null
}

type EnrollmentCreateResponse = {
  success: true
  data: {
    enrollmentId: string
    status: "pending"
    teamName: string
    enrollmentEmail: string
    platform: DevicePlatform
    resumed: boolean
    platformInstructions: Record<string, string>
  }
}

type EnrollmentStatusResponse = {
  success: true
  data: {
    status: "pending" | "completed" | "expired" | "failed" | "ambiguous"
  }
}

function syncPlatformQuery(
  pathname: string,
  router: ReturnType<typeof useRouter>,
  platform: DevicePlatform | null
) {
  const params = new URLSearchParams()
  if (platform) {
    params.set("platform", platform)
  }
  const query = params.toString()
  router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
}

export function DeviceSetupView({
  initialPlatform,
  enrollmentInfo,
}: DeviceSetupViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryPlatform = devicePlatformSchema.safeParse(
    searchParams.get("platform")
  )
  const [platform, setPlatform] = useState<DevicePlatform | null>(
    queryPlatform.success ? queryPlatform.data : initialPlatform
  )
  const [enrollment, setEnrollment] = useState<EnrollmentCreateResponse["data"] | null>(
    null
  )
  const [waiting, setWaiting] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const queryClient = useQueryClient()

  const blockedFromSetup =
    enrollmentInfo != null &&
    (!enrollmentInfo.hasAccess || !enrollmentInfo.canAddDevice)

  useEffect(() => {
    const parsed = devicePlatformSchema.safeParse(searchParams.get("platform"))
    const next = parsed.success ? parsed.data : null
    setPlatform((current) => (current === next ? current : next))
  }, [searchParams])

  const selectPlatform = (nextPlatform: DevicePlatform) => {
    setPlatform(nextPlatform)
    syncPlatformQuery(pathname, router, nextPlatform)
  }

  const startEnrollmentMutation = useMutation({
    mutationFn: (nextPlatform: DevicePlatform) =>
      apiClient<EnrollmentCreateResponse>("/api/devices/enrollment", {
        method: "POST",
        body: JSON.stringify({
          platform: nextPlatform,
          deviceName:
            nextPlatform === "android" ? "Android device" : "iPhone or iPad",
        }),
      }),
    onSuccess: (response) => {
      setPlatform(response.data.platform)
      syncPlatformQuery(pathname, router, response.data.platform)
      setEnrollment(response.data)
      setWaiting(true)
      setPollCount(0)
    },
  })

  const cancelEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      apiClient<{ success: true; data: { status: "cancelled" } }>(
        `/api/devices/enrollment/${enrollmentId}/cancel`,
        { method: "POST" }
      ),
    onSuccess: () => {
      setEnrollment(null)
      setWaiting(false)
      setPollCount(0)
      startEnrollmentMutation.reset()
    },
  })

  const statusQuery = useQuery({
    queryKey: queryKeys.devices.enrollmentStatus(enrollment?.enrollmentId ?? "none"),
    queryFn: () =>
      apiClient<EnrollmentStatusResponse>(
        `/api/devices/enrollment/${enrollment?.enrollmentId}/status`
      ),
    enabled: waiting && Boolean(enrollment) && pollCount < 40,
    refetchInterval: 4_000,
  })

  useEffect(() => {
    if (statusQuery.dataUpdatedAt && waiting) {
      setPollCount((count) => count + 1)
    }
  }, [statusQuery.dataUpdatedAt, waiting])

  useEffect(() => {
    if (statusQuery.data?.data.status === "completed") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.list() })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.enrollmentInfo(),
      })
    }
  }, [queryClient, statusQuery.data?.data.status])

  const status = statusQuery.data?.data.status
  const activePlatform = enrollment?.platform ?? platform
  const installUrl =
    activePlatform === "android"
      ? enrollmentInfo?.storeUrls.android
      : activePlatform === "iphone"
        ? enrollmentInfo?.storeUrls.iphone
        : undefined

  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ms-2 mb-2">
          <Link href="/devices">
            <ArrowLeft aria-hidden className="size-4" />
            Back to devices
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
          Add a device
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
          Install Cloudflare One, connect to our organization, and sign in with
          the same email as this account. We register that email for enrollment
          when you continue. Use Traffic and DNS mode for identity-scoped
          Gateway policies.
        </p>
        {enrollmentInfo && enrollmentInfo.deviceLimit > 0 ? (
          <p className="mt-2 text-sm font-medium text-brand-text-heading">
            Plan: {enrollmentInfo.planName} · {enrollmentInfo.enrolledDeviceCount}/
            {enrollmentInfo.deviceLimit} devices
          </p>
        ) : null}
      </div>

      {blockedFromSetup ? (
        <div className="max-w-3xl space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-8">
          <p className="text-sm font-medium text-brand-text-heading">
            {!enrollmentInfo.hasAccess
              ? "An active trial or subscription is required to set up a device."
              : enrollmentInfo.deviceLimit < 1
                ? "Your account has no device allowance. Contact sales to set an Enterprise cap, or choose a plan."
                : `Device limit reached (${enrollmentInfo.enrolledDeviceCount}/${enrollmentInfo.deviceLimit}). Remove a device or upgrade your plan to continue setup.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/billing">
                {!enrollmentInfo.hasAccess ? "View billing" : "Upgrade plan"}
              </Link>
            </Button>
            <Button asChild variant="brandOutline">
              <Link href="/devices">Back to devices</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {!enrollment ? (
            <section className="rounded-xl border border-border bg-brand-surface p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-brand-text-heading">
                    1. Choose device
                  </h2>
                  <p className="mt-1 text-sm text-brand-text-muted">
                    What type of device are you connecting?
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={!platform || startEnrollmentMutation.isPending}
                  onClick={() => {
                    if (!platform) return
                    startEnrollmentMutation.mutate(platform)
                  }}
                >
                  {startEnrollmentMutation.isPending ? <CustomSpinner /> : null}
                  Continue
                </Button>
              </div>
              <div className="mt-5">
                <DeviceTypePicker
                  selectedPlatform={platform}
                  onSelect={selectPlatform}
                />
              </div>
              {startEnrollmentMutation.isError ? (
                <div className="mt-4">
                  <ErrorAlert
                    message={
                      startEnrollmentMutation.error instanceof Error
                        ? startEnrollmentMutation.error.message
                        : "Unable to start enrollment."
                    }
                  />
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-xl border border-border bg-brand-surface p-6">
              <h2 className="text-lg font-semibold text-brand-text-heading">
                Connect your{" "}
                {activePlatform === "android"
                  ? "Android device"
                  : "iPhone or iPad"}
              </h2>

              {enrollment.resumed ? (
                <WarningAlert message="You already have a device enrollment in progress. Finish connecting that device here, or cancel it to start over." />
              ) : null}

              <p className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-brand-text-heading">
                Enrollment email registered:{" "}
                <strong>{enrollment.enrollmentEmail}</strong>
              </p>

              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-brand-text-muted">
                <li>Install Cloudflare One from the official app store.</li>
                <li>Open Cloudflare One and choose to connect to an organization.</li>
                <li>
                  Enter{" "}
                  <strong className="text-brand-text-heading">
                    {enrollment.teamName}
                  </strong>
                  .
                </li>
                <li>
                  Complete One-Time PIN sign-in with{" "}
                  <strong className="text-brand-text-heading">
                    {enrollment.enrollmentEmail}
                  </strong>
                  .
                </li>
                <li>Keep Cloudflare One connected while we detect the device.</li>
              </ol>

              <div className="mt-5 rounded-lg border border-border bg-white/70 px-4 py-4">
                <h3 className="text-sm font-semibold text-brand-text-heading">
                  Waiting for your device
                </h3>
                <p className="mt-1 text-sm text-brand-text-muted">
                  {enrollment.resumed
                    ? "We're continuing your existing enrollment request and will link the device once Cloudflare confirms it."
                    : "Complete the Cloudflare One setup on your device. We'll automatically detect it when enrollment is complete."}
                </p>

                {!status || status === "pending" ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-brand-text-muted">
                    <CustomSpinner />
                    Checking Cloudflare enrollment…
                  </p>
                ) : null}

                {statusQuery.isError ? (
                  <div className="mt-3">
                    <ErrorAlert message="Unable to check enrollment. Please try again shortly." />
                  </div>
                ) : null}

                {status === "completed" ? (
                  <p className="mt-3 text-sm font-medium text-emerald-700">
                    Device enrolled and linked to your account.
                  </p>
                ) : null}
                {status === "expired" ? (
                  <WarningAlert message="This enrollment expired. Cancel it or start a new device enrollment." />
                ) : null}
                {status === "ambiguous" ? (
                  <WarningAlert message="More than one new device matched this enrollment. Contact support so we can safely identify the device." />
                ) : null}
                {status === "failed" ? (
                  <ErrorAlert message="This device could not be linked to your account." />
                ) : null}
                {pollCount >= 40 && (!status || status === "pending") ? (
                  <WarningAlert message="Automatic checking paused. Keep Cloudflare One connected and try again." />
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {installUrl ? (
                  <Button asChild>
                    <a href={installUrl} target="_blank" rel="noopener noreferrer">
                      Install Cloudflare One
                      <ExternalLink aria-hidden className="size-4" />
                    </a>
                  </Button>
                ) : null}
                {status !== "completed" ? (
                  <Button
                    type="button"
                    variant="brandOutline"
                    disabled={cancelEnrollmentMutation.isPending}
                    onClick={() => {
                      if (!enrollment) return
                      cancelEnrollmentMutation.mutate(enrollment.enrollmentId)
                    }}
                  >
                    {cancelEnrollmentMutation.isPending ? <CustomSpinner /> : null}
                    Cancel enrollment
                  </Button>
                ) : (
                  <Button asChild variant="brandOutline">
                    <Link href="/devices">Back to devices</Link>
                  </Button>
                )}
              </div>

              {cancelEnrollmentMutation.isError ? (
                <div className="mt-4">
                  <ErrorAlert
                    message={
                      cancelEnrollmentMutation.error instanceof Error
                        ? cancelEnrollmentMutation.error.message
                        : "Unable to cancel enrollment."
                    }
                  />
                </div>
              ) : null}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
