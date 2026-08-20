"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { ConnectedDeviceRow } from "@/app/(protected)/devices/_components/connected-device-row"
import { DeviceProfilesPanel } from "@/app/(protected)/devices/_components/device-profiles-panel"
import { DeviceTypePicker } from "@/app/(protected)/devices/_components/device-type-picker"
import { ErrorAlert, WarningAlert } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import type { DeviceEnrollmentInfo } from "@/schemas/devices/api"
import type { ConnectedDevice, DevicePlatform } from "@/schemas/devices/device"

export interface ConnectedDevicesViewProps {
  initialDevices: ConnectedDevice[]
  enrollmentInfo: DeviceEnrollmentInfo
  initialPlatform?: DevicePlatform
}

function formatDeviceQuota(info: DeviceEnrollmentInfo): string {
  if (info.deviceLimit < 1) {
    return `${info.enrolledDeviceCount} enrolled · no device allowance`
  }
  return `${info.enrolledDeviceCount} / ${info.deviceLimit} devices`
}

function EmptyStateAction({
  quota,
  selectedPlatform,
}: {
  quota: DeviceEnrollmentInfo
  selectedPlatform: DevicePlatform
}) {
  const hasSlot = quota.canAddDevice
  const atLimit =
    quota.hasAccess &&
    quota.deviceLimit > 0 &&
    quota.enrolledDeviceCount >= quota.deviceLimit

  if (hasSlot && quota.tenantReady) {
    return (
      <Button asChild className="mt-4">
        <Link href={`/devices/setup?platform=${selectedPlatform}`}>
          Set up a device
        </Link>
      </Button>
    )
  }

  if (hasSlot && !quota.tenantReady) {
    return (
      <p className="mt-4 text-sm text-brand-text-muted">
        Device enrollment is temporarily unavailable. Please try again shortly.
      </p>
    )
  }

  if (atLimit) {
    return (
      <Button asChild className="mt-4" variant="brandOutline">
        <Link href="/billing">Upgrade plan</Link>
      </Button>
    )
  }

  return (
    <Button asChild className="mt-4" variant="brandOutline">
      <Link href="/billing">View billing</Link>
    </Button>
  )
}

export function ConnectedDevicesView({
  initialDevices,
  enrollmentInfo,
  initialPlatform = "android",
}: ConnectedDevicesViewProps) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<DevicePlatform>(initialPlatform)

  const devicesQuery = useQuery({
    queryKey: queryKeys.devices.list(),
    queryFn: () => apiClient<ConnectedDevice[]>("/api/devices"),
    initialData: initialDevices,
  })

  const enrollmentQuery = useQuery({
    queryKey: queryKeys.devices.enrollmentInfo(),
    queryFn: () =>
      apiClient<DeviceEnrollmentInfo>("/api/devices/enrollment-info"),
    initialData: enrollmentInfo,
  })

  const devices = devicesQuery.data ?? []
  const quota = enrollmentQuery.data ?? enrollmentInfo
  const canSetupDevice = quota.canAddDevice && quota.tenantReady
  const atDeviceLimit =
    quota.hasAccess &&
    quota.deviceLimit > 0 &&
    quota.enrolledDeviceCount >= quota.deviceLimit

  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
            Connected Devices
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
            Manage enrolled devices, application profiles, and effective Gateway
            policies. Per-device enforcement uses Cloudflare DNS locations
            (`dns.location`) with your identity email. Identity-scoped rules
            require Cloudflare One Traffic and DNS mode ({quota.planName}).
          </p>
          <p className="mt-2 text-sm font-medium text-brand-text-heading">
            {formatDeviceQuota(quota)}
            {quota.deviceLimit > 0
              ? ` · ${quota.remainingDeviceSlots} remaining`
              : null}
          </p>
        </div>
        {canSetupDevice ? (
          <Button asChild size="lg" className="shrink-0">
            <Link href={`/devices/setup?platform=${selectedPlatform}`}>
              <Plus aria-hidden className="size-4" />
              Add Device
            </Link>
          </Button>
        ) : atDeviceLimit ? (
          <Button asChild size="lg" variant="brandOutline" className="shrink-0">
            <Link href="/billing">Upgrade plan</Link>
          </Button>
        ) : !quota.hasAccess ? (
          <Button asChild size="lg" variant="brandOutline" className="shrink-0">
            <Link href="/billing">View billing</Link>
          </Button>
        ) : null}
      </div>

      {!quota.tenantReady ? (
        <WarningAlert message="Device enrollment is temporarily unavailable. Please try again shortly." />
      ) : null}

      {atDeviceLimit ? (
        <WarningAlert
          message={`Device limit reached (${quota.enrolledDeviceCount}/${quota.deviceLimit}). Remove a device or upgrade your plan.`}
        />
      ) : null}

      {!quota.hasAccess ? (
        <WarningAlert message="An active trial or subscription is required to connect devices." />
      ) : null}

      {devicesQuery.isError ? (
        <ErrorAlert
          message={
            devicesQuery.error instanceof Error
              ? devicesQuery.error.message
              : "Failed to load devices"
          }
        />
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-brand-text-heading">
          Select a Device
        </h2>
        <DeviceTypePicker
          selectedPlatform={selectedPlatform}
          onSelect={setSelectedPlatform}
        />
      </section>

      <DeviceProfilesPanel devices={devices} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-brand-text-heading">
          List of Connected Devices
        </h2>

        {devicesQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-brand-surface px-6 py-10 text-center">
            <p className="text-sm font-medium text-brand-text-heading">
              No devices connected yet
            </p>
            <p className="mt-1 text-sm text-brand-text-muted">
              Add a device to start enforcing your content policies.
            </p>
            <EmptyStateAction
              quota={quota}
              selectedPlatform={selectedPlatform}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <ConnectedDeviceRow key={device.id} device={device} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
