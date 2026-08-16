"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { DeviceTypePicker } from "@/app/(protected)/devices/_components/device-type-picker"
import { SetupStep } from "@/app/(protected)/devices/_components/setup-step"
import { ErrorAlert, WarningAlert } from "@/components/feedback"
import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import {
  devicePlatformSchema,
  getPlatformLabel,
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
    if (enrollment) return
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
        `/api/devices/enrollment/${enrollment!.enrollmentId}/status`
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
  const enrollmentComplete = status === "completed"
  const showFollowUpSteps = platform != null

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
          the same email as this account. Steps update as you continue. Use
          Traffic and DNS mode for identity-scoped Gateway policies.
        </p>
        {enrollmentInfo && enrollmentInfo.deviceLimit > 0 ? (
          <p className="mt-2 text-sm font-medium text-brand-text-heading">
            Plan: {enrollmentInfo.planName} · {enrollmentInfo.enrolledDeviceCount}/
            {enrollmentInfo.deviceLimit} devices
          </p>
        ) : null}
      </div>

      {blockedFromSetup ? (
        <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-8">
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
        <div>
          <SetupStep
            step={1}
            title="Choose device"
            description="What type of device are you connecting?"
            isLast={!showFollowUpSteps}
          >
            <DeviceTypePicker
              selectedPlatform={platform}
              onSelect={selectPlatform}
            />
            {enrollment ? (
              <p className="mt-3 text-sm text-brand-text-muted">
                Selected: {getPlatformLabel(activePlatform!)}. Cancel enrollment
                below if you need to switch devices.
              </p>
            ) : null}
          </SetupStep>

          {showFollowUpSteps ? (
            <SetupStep
              step={2}
              title="Register enrollment email"
              description="We add your SaaS account email to the Cloudflare WARP enrollment Access policy."
              isLast={!enrollment}
            >
              {!enrollment ? (
                <div className="space-y-4">
                  <p className="text-sm text-brand-text-muted">
                    Continue to register your email and get organization
                    connection instructions for your{" "}
                    {getPlatformLabel(platform)}.
                  </p>
                  <Button
                    type="button"
                    disabled={startEnrollmentMutation.isPending}
                    onClick={() => {
                      if (!platform) return
                      startEnrollmentMutation.mutate(platform)
                    }}
                  >
                    {startEnrollmentMutation.isPending ? <CustomSpinner /> : null}
                    Continue
                  </Button>
                  {startEnrollmentMutation.isError ? (
                    <ErrorAlert
                      message={
                        startEnrollmentMutation.error instanceof Error
                          ? startEnrollmentMutation.error.message
                          : "Unable to start enrollment."
                      }
                    />
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollment.resumed ? (
                    <WarningAlert message="You already have a device enrollment in progress. Finish connecting that device here, or cancel it to start over." />
                  ) : null}
                  <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-brand-text-heading">
                    Enrollment email registered:{" "}
                    <strong>{enrollment.enrollmentEmail}</strong>
                  </p>
                  {!enrollmentComplete ? (
                    <Button
                      type="button"
                      variant="brandOutline"
                      disabled={cancelEnrollmentMutation.isPending}
                      onClick={() => {
                        cancelEnrollmentMutation.mutate(enrollment.enrollmentId)
                      }}
                    >
                      {cancelEnrollmentMutation.isPending ? <CustomSpinner /> : null}
                      Cancel enrollment
                    </Button>
                  ) : null}
                  {cancelEnrollmentMutation.isError ? (
                    <ErrorAlert
                      message={
                        cancelEnrollmentMutation.error instanceof Error
                          ? cancelEnrollmentMutation.error.message
                          : "Unable to cancel enrollment."
                      }
                    />
                  ) : null}
                </div>
              )}
            </SetupStep>
          ) : null}

          {enrollment ? (
            <>
              <SetupStep
                step={3}
                title={`Connect your ${
                  activePlatform === "android"
                    ? "Android device"
                    : "iPhone or iPad"
                }`}
                description="Install Cloudflare One and enroll with your account email."
              >
                <div className="space-y-4">
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-brand-text-muted">
                    <li>Install Cloudflare One from the official app store.</li>
                    <li>
                      Open Cloudflare One and choose to connect to an organization.
                    </li>
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
                    <li>
                      Keep Cloudflare One connected while we detect the device.
                    </li>
                  </ol>
                  {installUrl ? (
                    <Button asChild>
                      <a
                        href={installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Install Cloudflare One
                        <ExternalLink aria-hidden className="size-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </SetupStep>

              <SetupStep
                step={4}
                title="Waiting for your device"
                description="We'll link the device to your account once Cloudflare confirms enrollment."
                isLast
              >
                <div className="space-y-3 rounded-xl border border-border bg-white/70 px-4 py-4">
                  <p className="text-sm text-brand-text-muted">
                    {enrollment.resumed
                      ? "We're continuing your existing enrollment request and will link the device once Cloudflare confirms it."
                      : "Complete the Cloudflare One setup on your device. We'll automatically detect it when enrollment is complete."}
                  </p>

                  {!status || status === "pending" ? (
                    <p className="flex items-center gap-2 text-sm text-brand-text-muted">
                      <CustomSpinner />
                      Checking Cloudflare enrollment…
                    </p>
                  ) : null}

                  {statusQuery.isError ? (
                    <ErrorAlert message="Unable to check enrollment. Please try again shortly." />
                  ) : null}

                  {status === "completed" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-emerald-700">
                        Device enrolled and linked to your account.
                      </p>
                      <Button asChild>
                        <Link href="/devices">Back to devices</Link>
                      </Button>
                    </div>
                  ) : null}
                  {status === "expired" ? (
                    <WarningAlert message="This enrollment expired. Cancel it above, or start a new device enrollment." />
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
              </SetupStep>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
