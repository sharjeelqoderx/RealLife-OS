"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { ErrorAlert } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import type { ConnectedDevice } from "@/schemas/devices/device"
import type { DeviceProfileListItem } from "@/lib/services/devices/device-profiles"

export function DeviceProfilesPanel({
  devices,
}: {
  devices: ConnectedDevice[]
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [assignDeviceId, setAssignDeviceId] = useState<string>("")
  const [assignProfileId, setAssignProfileId] = useState<string>("")

  const profilesQuery = useQuery({
    queryKey: queryKeys.devices.profiles(),
    queryFn: () => apiClient<DeviceProfileListItem[]>("/api/device-profiles"),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient<{ data: DeviceProfileListItem }>("/api/device-profiles", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setName("")
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.profiles(),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) =>
      apiClient<{ ok: boolean }>(
        `/api/device-profiles/${encodeURIComponent(profileId)}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.profiles(),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.list(),
      })
    },
  })

  const addDeviceMutation = useMutation({
    mutationFn: () =>
      apiClient<{ ok: boolean }>(
        `/api/device-profiles/${encodeURIComponent(assignProfileId)}/devices`,
        {
          method: "POST",
          body: JSON.stringify({ deviceId: assignDeviceId }),
        }
      ),
    onSuccess: () => {
      setAssignDeviceId("")
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.profiles(),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.devices.list(),
      })
    },
  })

  const profiles = profilesQuery.data ?? []

  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-brand-text-heading">
          Device profiles
        </h2>
        <p className="mt-1 text-sm text-brand-text-muted">
          Application profiles (Kids, Parents, Work). These are not Cloudflare
          Device Settings Profiles. Gateway enforcement uses each device&apos;s
          DNS location.
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Profile name"
          className="h-11 w-full max-w-md px-3 py-0"
        />
        <Button
          type="button"
          size="lg"
          className="h-11 w-fit shrink-0 px-3"
          disabled={!name.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? <CustomSpinner /> : <Plus />}
          Create
        </Button>
      </div>

      {createMutation.isError ? (
        <ErrorAlert
          message={
            createMutation.error instanceof Error
              ? createMutation.error.message
              : "Failed to create profile"
          }
        />
      ) : null}

      {profilesQuery.isError ? (
        <ErrorAlert
          message={
            profilesQuery.error instanceof Error
              ? profilesQuery.error.message
              : "Failed to load profiles"
          }
        />
      ) : null}

      <ul className="space-y-2">
        {profiles.map((profile) => (
          <li
            key={profile.id}
            className="flex flex-col gap-2 rounded-lg border border-border/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-brand-text-heading">
                {profile.name}
              </p>
              <p className="text-xs text-brand-text-muted">
                {profile.deviceIds.length} device
                {profile.deviceIds.length === 1 ? "" : "s"}
                {profile.policyName
                  ? ` · Policy: ${profile.policyName}`
                  : " · No policy"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(profile.id)}
              aria-label={`Delete ${profile.name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
        {profiles.length === 0 && !profilesQuery.isLoading ? (
          <li className="text-sm text-brand-text-muted">No profiles yet.</li>
        ) : null}
      </ul>

      {profiles.length > 0 && devices.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-brand-text-muted">
              Add device to profile
            </p>
            <Select value={assignProfileId} onValueChange={setAssignProfileId}>
              <SelectTrigger className="h-11 min-h-11 max-h-11 data-[size=default]:h-11 data-[size=default]:py-0 data-[size=default]:ps-3 data-[size=default]:pe-10">
                <SelectValue placeholder="Profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-brand-text-muted">Device</p>
            <Select value={assignDeviceId} onValueChange={setAssignDeviceId}>
              <SelectTrigger className="h-11 min-h-11 max-h-11 data-[size=default]:h-11 data-[size=default]:py-0 data-[size=default]:ps-3 data-[size=default]:pe-10">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-11 min-h-11 max-h-11 w-fit shrink-0 px-3"
            disabled={
              !assignDeviceId ||
              !assignProfileId ||
              addDeviceMutation.isPending
            }
            onClick={() => addDeviceMutation.mutate()}
          >
            {addDeviceMutation.isPending ? <CustomSpinner /> : null}
            Assign
          </Button>
        </div>
      ) : null}

      {addDeviceMutation.isError ? (
        <ErrorAlert
          message={
            addDeviceMutation.error instanceof Error
              ? addDeviceMutation.error.message
              : "Failed to assign device"
          }
        />
      ) : null}
    </section>
  )
}
