"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { ConnectedDeviceRow } from "@/app/(protected)/devices/_components/connected-device-row"
import { DeviceTypePicker } from "@/app/(protected)/devices/_components/device-type-picker"
import { ErrorAlert } from "@/components/feedback"
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

  const devices = devicesQuery.data ?? []

  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
            Connected Devices
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
            Manage devices enrolled with Cloudflare One. Protect traffic with the
            Cloudflare One client and enforce content policies on each device.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href={`/devices/setup?platform=${selectedPlatform}`}>
            <Plus aria-hidden className="size-4" />
            Add Device
          </Link>
        </Button>
      </div>

      {!enrollmentInfo.tenantReady ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-brand-text-heading">
          Cloudflare tenant is not ready yet. Provision your account before enrolling
          devices.
        </p>
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
            <Button asChild className="mt-4">
              <Link href={`/devices/setup?platform=${selectedPlatform}`}>
                Set up a device
              </Link>
            </Button>
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
