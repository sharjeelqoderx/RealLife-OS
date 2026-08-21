"use client"

import Image from "next/image"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ErrorAlert } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import { cn } from "@/lib/utils"
import {
  formatLastSeen,
  getPlatformLabel,
  type ConnectedDevice,
} from "@/schemas/devices/device"

export interface ConnectedDeviceRowProps {
  device: ConnectedDevice
  className?: string
}

export function ConnectedDeviceRow({ device, className }: ConnectedDeviceRowProps) {
  const queryClient = useQueryClient()
  const [renameOpen, setRenameOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [displayName, setDisplayName] = useState(device.name)

  const platformLabel = getPlatformLabel(device.platform)

  const renameMutation = useMutation({
    mutationFn: (name: string) =>
      apiClient<{ data: { id: string; name: string } }>(
        `/api/devices/${encodeURIComponent(device.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ displayName: name }),
        }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.list() })
      setRenameOpen(false)
    },
  })

  const removeMutation = useMutation({
    mutationFn: () =>
      apiClient<{ data: { id: string } }>(
        `/api/devices/${encodeURIComponent(device.id)}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.list() })
      setRemoveOpen(false)
    },
  })

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-border bg-white px-4 py-4",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-brand-surface">
              <Image
                src={
                  device.platform === "android" ? "/android.png" : "/iphone.png"
                }
                alt=""
                width={40}
                height={40}
                className="size-full object-cover object-top"
              />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-brand-text-heading">
                {device.name}
              </p>
              <p className="mt-0.5 text-sm text-brand-text-muted">
                {device.status === "active" ? "Active" : "Inactive"} • Last seen{" "}
                {formatLastSeen(device.lastSeenMinutes)} • {platformLabel}
              </p>
              <p className="mt-1 text-xs text-brand-text-muted">
                Profile: {device.profileName ?? "None"}
                {" · "}
                Effective: {device.effectivePolicyName ?? "None"}
                {device.effectivePolicySource &&
                device.effectivePolicySource !== "none"
                  ? ` (${device.effectivePolicySource === "device" ? "Device" : "Profile"})`
                  : ""}
              </p>
              {device.dohSubdomain ? (
                <p className="mt-1 text-xs text-brand-text-muted">
                  DNS location DoH:{" "}
                  <a
                    className="underline underline-offset-2"
                    href={`/api/dns-profile/mobileconfig?deviceId=${encodeURIComponent(device.id)}`}
                  >
                    Download profile
                  </a>{" "}
                  ({device.dohSubdomain})
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              type="button"
              variant="brandOutline"
              size="lg"
              className="h-11 min-h-11 max-h-11 w-fit shrink-0 px-3"
              onClick={() => {
                setDisplayName(device.name)
                setRenameOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="h-11 min-h-11 max-h-11 w-fit shrink-0 px-3"
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 min-w-0 sm:hidden">
          <p className="truncate text-sm font-semibold text-brand-text-heading">
            {device.name}
          </p>
          <p className="mt-0.5 text-sm text-brand-text-muted">
            {device.status === "active" ? "Active" : "Inactive"} • Last seen{" "}
            {formatLastSeen(device.lastSeenMinutes)} • {platformLabel}
          </p>
          <p className="mt-1 text-xs text-brand-text-muted">
            Profile: {device.profileName ?? "None"}
            {" · "}
            Effective: {device.effectivePolicyName ?? "None"}
            {device.effectivePolicySource &&
            device.effectivePolicySource !== "none"
              ? ` (${device.effectivePolicySource === "device" ? "Device" : "Profile"})`
              : ""}
          </p>
          {device.dohSubdomain ? (
            <p className="mt-1 text-xs text-brand-text-muted">
              DNS location DoH:{" "}
              <a
                className="underline underline-offset-2"
                href={`/api/dns-profile/mobileconfig?deviceId=${encodeURIComponent(device.id)}`}
              >
                Download profile
              </a>{" "}
              ({device.dohSubdomain})
            </p>
          ) : null}
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename device</DialogTitle>
            <DialogDescription>
              Choose a friendly name for this device. It only updates in RealLife OS.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            aria-label="Device name"
          />
          {renameMutation.isError ? (
            <ErrorAlert
              message={
                renameMutation.error instanceof Error
                  ? renameMutation.error.message
                  : "Failed to rename device"
              }
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!displayName.trim() || renameMutation.isPending}
              onClick={() => renameMutation.mutate(displayName.trim())}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove device</DialogTitle>
            <DialogDescription>
              This revokes the Cloudflare One registration for{" "}
              <strong>{device.name}</strong> and removes it from your list.
            </DialogDescription>
          </DialogHeader>
          {removeMutation.isError ? (
            <ErrorAlert
              message={
                removeMutation.error instanceof Error
                  ? removeMutation.error.message
                  : "Failed to remove device"
              }
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removeMutation.mutate()}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
