"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Smartphone } from "lucide-react"

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
          "flex flex-col gap-4 rounded-xl border border-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Smartphone aria-hidden className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-text-heading">
              {device.name}
            </p>
            <p className="mt-0.5 text-sm text-brand-text-muted">
              {device.status === "active" ? "Active" : "Inactive"} • Last seen{" "}
              {formatLastSeen(device.lastSeenMinutes)} • {platformLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="brandOutline"
            size="sm"
            onClick={() => {
              setDisplayName(device.name)
              setRenameOpen(true)
            }}
          >
            Rename Device
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setRemoveOpen(true)}
          >
            Remove Device
          </Button>
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
