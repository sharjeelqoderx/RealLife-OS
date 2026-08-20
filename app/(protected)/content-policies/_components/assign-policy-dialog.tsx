"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { ErrorAlert, WarningAlert } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api/client"
import type { DeviceProfileListItem } from "@/lib/services/devices/device-profiles"
import type { PolicyAssignmentListItem } from "@/lib/services/policy-assignments/policy-assignments"
import { queryKeys } from "@/lib/query/keys"
import type { ConnectedDevice } from "@/schemas/devices/device"
import type { PolicyListItem } from "@/schemas/content-policies/policy"

export interface AssignPolicyDialogProps {
  policy: PolicyListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignPolicyDialog({
  policy,
  open,
  onOpenChange,
}: AssignPolicyDialogProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"profiles" | "devices">("profiles")
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])

  const profilesQuery = useQuery({
    queryKey: queryKeys.devices.profiles(),
    queryFn: () => apiClient<DeviceProfileListItem[]>("/api/device-profiles"),
    enabled: open,
  })

  const devicesQuery = useQuery({
    queryKey: queryKeys.devices.list(),
    queryFn: () => apiClient<ConnectedDevice[]>("/api/devices"),
    enabled: open,
  })

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.policyAssignments.list(),
    queryFn: () =>
      apiClient<PolicyAssignmentListItem[]>("/api/policy-assignments"),
    enabled: open,
  })

  const overrideWarnings = useMemo(() => {
    const devices = devicesQuery.data ?? []
    return selectedDeviceIds
      .map((deviceId) => {
        const device = devices.find((row) => row.id === deviceId)
        if (!device?.profileName || !device.effectivePolicyName) return null
        if (device.effectivePolicySource === "profile") {
          return `${device.name} currently inherits “${device.effectivePolicyName}” from ${device.profileName}. Direct assignment will override it.`
        }
        return null
      })
      .filter((value): value is string => Boolean(value))
  }, [devicesQuery.data, selectedDeviceIds])

  const assignMutation = useMutation({
    mutationFn: async () => {
      const tasks: Promise<unknown>[] = []
      for (const profileId of selectedProfileIds) {
        tasks.push(
          apiClient("/api/policy-assignments", {
            method: "POST",
            body: JSON.stringify({
              policyId: policy.id,
              targetType: "profile",
              targetId: profileId,
            }),
          })
        )
      }
      for (const deviceId of selectedDeviceIds) {
        tasks.push(
          apiClient("/api/policy-assignments", {
            method: "POST",
            body: JSON.stringify({
              policyId: policy.id,
              targetType: "device",
              targetId: deviceId,
            }),
          })
        )
      }
      await Promise.all(tasks)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.policyAssignments.list(),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.list(),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.profiles(),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.gatewayPolicies.list(),
      })
      onOpenChange(false)
      setSelectedDeviceIds([])
      setSelectedProfileIds([])
    },
  })

  const profiles = profilesQuery.data ?? []
  const devices = devicesQuery.data ?? []

  const failedAssignments = useMemo(
    () =>
      (assignmentsQuery.data ?? []).filter(
        (row) =>
          row.policyId === policy.id && row.syncStatus === "sync_failed"
      ),
    [assignmentsQuery.data, policy.id]
  )

  const hasBlockingIssue =
    assignMutation.isError || failedAssignments.length > 0

  const canSave =
    !assignMutation.isPending &&
    !hasBlockingIssue &&
    (selectedProfileIds.length > 0 || selectedDeviceIds.length > 0)

  function updateProfileSelection(next: string[]) {
    if (assignMutation.isError) {
      assignMutation.reset()
    }
    setSelectedProfileIds(next)
  }

  function updateDeviceSelection(next: string[]) {
    if (assignMutation.isError) {
      assignMutation.reset()
    }
    setSelectedDeviceIds(next)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          setSelectedDeviceIds([])
          setSelectedProfileIds([])
          setTab("profiles")
          assignMutation.reset()
        }
      }}
    >
      <DialogContent className="max-h-[min(90svh,36rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign “{policy.name}”</DialogTitle>
          <DialogDescription>
            Choose profiles and/or devices. Cloudflare sync must succeed before
            the assignment is considered active.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "profiles" ? "default" : "outline"}
            onClick={() => setTab("profiles")}
          >
            Profiles
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "devices" ? "default" : "outline"}
            onClick={() => setTab("devices")}
          >
            Devices
          </Button>
        </div>

        {tab === "profiles" ? (
          <ul className="space-y-2">
            {profiles.map((profile) => {
              const checked = selectedProfileIds.includes(profile.id)
              return (
                <li key={profile.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        updateProfileSelection(
                          event.target.checked
                            ? [...selectedProfileIds, profile.id]
                            : selectedProfileIds.filter(
                                (id) => id !== profile.id
                              )
                        )
                      }}
                    />
                    <span>
                      {profile.name}
                      {profile.policyName
                        ? ` (current: ${profile.policyName})`
                        : ""}
                    </span>
                  </label>
                </li>
              )
            })}
            {profiles.length === 0 ? (
              <li className="text-sm text-brand-text-muted">
                No profiles yet. Create one on the Devices page.
              </li>
            ) : null}
          </ul>
        ) : (
          <ul className="space-y-2">
            {devices.map((device) => {
              const checked = selectedDeviceIds.includes(device.id)
              return (
                <li key={device.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        updateDeviceSelection(
                          event.target.checked
                            ? [...selectedDeviceIds, device.id]
                            : selectedDeviceIds.filter(
                                (id) => id !== device.id
                              )
                        )
                      }}
                    />
                    <span>
                      {device.name}
                      {device.profileName ? ` · ${device.profileName}` : ""}
                    </span>
                  </label>
                </li>
              )
            })}
            {devices.length === 0 ? (
              <li className="text-sm text-brand-text-muted">
                No devices enrolled yet.
              </li>
            ) : null}
          </ul>
        )}

        {overrideWarnings.map((warning) => (
          <WarningAlert key={warning} message={warning} />
        ))}

        {assignMutation.isError ? (
          <ErrorAlert
            message={
              assignMutation.error instanceof Error
                ? assignMutation.error.message
                : "Assignment failed"
            }
          />
        ) : null}

        {failedAssignments.map((row) => (
          <ErrorAlert
            key={row.id}
            message={
              row.syncError ??
              `Previous assignment to ${row.targetName} failed Cloudflare sync`
            }
          />
        ))}

        <DialogFooter>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => assignMutation.mutate()}
          >
            {assignMutation.isPending ? <CustomSpinner /> : null}
            Save assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
