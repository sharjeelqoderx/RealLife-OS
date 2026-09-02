"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { ErrorAlert } from "@/components/feedback"
import { CustomSpinner } from "@/components/feedback/custom-spinner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
import type { DeviceProfileListItem } from "@/lib/services/devices/device-profiles"
import type { PolicyListItem } from "@/schemas/content-policies/policy"
import type { ConnectedDevice } from "@/schemas/devices/device"
import {
  deviceProfileCreateSchema,
  type DeviceProfileCreateInput,
} from "@/schemas/devices/profiles"

export function DeviceProfilesPanel({
  devices,
}: {
  devices: ConnectedDevice[]
}) {
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] =
    useState<DeviceProfileListItem | null>(null)
  const [editingProfile, setEditingProfile] =
    useState<DeviceProfileListItem | null>(null)
  const form = useForm<DeviceProfileCreateInput>({
    resolver: zodResolver(deviceProfileCreateSchema),
    defaultValues: {
      name: "",
      deviceId: "",
      policyId: "",
    },
  })

  const profilesQuery = useQuery({
    queryKey: queryKeys.devices.profiles(),
    queryFn: () => apiClient<DeviceProfileListItem[]>("/api/device-profiles"),
  })

  const policiesQuery = useQuery({
    queryKey: queryKeys.gatewayPolicies.list(),
    queryFn: () => apiClient<PolicyListItem[]>("/api/gateway-policies"),
  })

  const createMutation = useMutation({
    mutationFn: (values: DeviceProfileCreateInput) =>
      apiClient<{ data: DeviceProfileListItem }>("/api/device-profiles", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (response, values) => {
      form.reset()
      const created = response.data
      queryClient.setQueryData<DeviceProfileListItem[]>(
        queryKeys.devices.profiles(),
        (current) => {
          const list = (current ?? []).map((profile) => ({
            ...profile,
            deviceIds: profile.deviceIds.filter(
              (deviceId) => deviceId !== values.deviceId
            ),
          }))
          if (list.some((profile) => profile.id === created.id)) {
            return list
          }
          return [created, ...list]
        }
      )
      queryClient.setQueryData<ConnectedDevice[]>(
        queryKeys.devices.list(),
        (current) =>
          (current ?? []).map((device) =>
            device.id === values.deviceId
              ? {
                  ...device,
                  profileId: created.id,
                  profileName: created.name,
                  ...(device.effectivePolicySource === "device"
                    ? {}
                    : {
                        effectivePolicyId: created.policyId,
                        effectivePolicyName: created.policyName,
                        effectivePolicySource: created.policyId
                          ? ("profile" as const)
                          : ("none" as const),
                      }),
                }
              : device
          )
      )
    },
    onError: (error) => {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to create profile",
      })
    },
  })

  function resetForm() {
    form.reset({
      name: "",
      deviceId: "",
      policyId: "",
    })
    setEditingProfile(null)
  }

  function startEdit(profile: DeviceProfileListItem) {
    form.clearErrors()
    form.reset({
      name: profile.name,
      deviceId: profile.deviceIds[0] ?? "",
      policyId: profile.policyId ?? "",
    })
    setEditingProfile(profile)
  }

  const updateMutation = useMutation({
    mutationFn: (values: DeviceProfileCreateInput) => {
      if (!editingProfile) {
        throw new Error("No profile selected to update")
      }
      return apiClient<{ data: DeviceProfileListItem }>(
        `/api/device-profiles/${encodeURIComponent(editingProfile.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(values),
        }
      )
    },
    onSuccess: (response, values) => {
      const updated = response.data
      resetForm()
      queryClient.setQueryData<DeviceProfileListItem[]>(
        queryKeys.devices.profiles(),
        (current) => {
          const list = (current ?? []).map((profile) => ({
            ...profile,
            deviceIds:
              profile.id === updated.id
                ? updated.deviceIds
                : profile.deviceIds.filter(
                    (deviceId) => deviceId !== values.deviceId
                  ),
          }))
          const index = list.findIndex((profile) => profile.id === updated.id)
          if (index === -1) {
            return [updated, ...list]
          }
          const next = [...list]
          next[index] = updated
          return next
        }
      )
      queryClient.setQueryData<ConnectedDevice[]>(
        queryKeys.devices.list(),
        (current) =>
          (current ?? []).map((device) => {
            const attached = updated.deviceIds.includes(device.id)
            if (attached) {
              return {
                ...device,
                profileId: updated.id,
                profileName: updated.name,
                ...(device.effectivePolicySource === "device"
                  ? {}
                  : {
                      effectivePolicyId: updated.policyId,
                      effectivePolicyName: updated.policyName,
                      effectivePolicySource: updated.policyId
                        ? ("profile" as const)
                        : ("none" as const),
                    }),
              }
            }
            if (device.profileId !== updated.id) return device
            return {
              ...device,
              profileId: null,
              profileName: null,
              ...(device.effectivePolicySource === "profile"
                ? {
                    effectivePolicyId: null,
                    effectivePolicyName: null,
                    effectivePolicySource: "none" as const,
                  }
                : {}),
            }
          })
      )
    },
    onError: (error) => {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save profile",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) =>
      apiClient<{ data: { id: string; deviceIds: string[] } }>(
        `/api/device-profiles/${encodeURIComponent(profileId)}`,
        { method: "DELETE" }
      ),
    onSuccess: (response) => {
      const deleted = response.data
      setPendingDelete(null)
      if (editingProfile?.id === deleted.id) {
        resetForm()
      }
      queryClient.setQueryData<DeviceProfileListItem[]>(
        queryKeys.devices.profiles(),
        (current) =>
          (current ?? []).filter((profile) => profile.id !== deleted.id)
      )
      const removedDeviceIds = new Set(deleted.deviceIds)
      queryClient.setQueryData<ConnectedDevice[]>(
        queryKeys.devices.list(),
        (current) =>
          (current ?? []).map((device) => {
            if (!removedDeviceIds.has(device.id)) return device
            return {
              ...device,
              profileId: null,
              profileName: null,
              ...(device.effectivePolicySource === "profile"
                ? {
                    effectivePolicyId: null,
                    effectivePolicyName: null,
                    effectivePolicySource: "none" as const,
                  }
                : {}),
            }
          })
      )
    },
  })

  const profiles = [...(profilesQuery.data ?? [])].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  )
  const policies = policiesQuery.data ?? []
  const hasDevices = devices.length > 0
  const hasPolicies = policies.length > 0
  const canSubmitProfile = hasDevices && hasPolicies
  const deviceNameById = new Map(
    devices.map((device) => [device.id, device.name])
  )

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

      <form
        className="flex flex-col gap-3"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          form.clearErrors("root")
          if (editingProfile) {
            updateMutation.mutate(values)
            return
          }
          createMutation.mutate(values)
        })}
      >
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
          <Field
            className="min-w-0 xl:flex-1"
            data-invalid={!!form.formState.errors.name}
          >
            <FieldLabel
              htmlFor="profile-name"
              className="truncate text-xs font-medium"
            >
              Name
            </FieldLabel>
            <Input
              id="profile-name"
              placeholder="Profile name"
              className="h-11 min-w-0 w-full truncate px-3 py-0"
              aria-invalid={!!form.formState.errors.name}
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Controller
            control={form.control}
            name="deviceId"
            render={({ field, fieldState }) => (
              <Field className="min-w-0 xl:flex-1" data-invalid={!!fieldState.error}>
                <FieldLabel
                  htmlFor="profile-device"
                  className="truncate text-xs font-medium"
                >
                  Device
                </FieldLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!hasDevices}
                >
                  <SelectTrigger
                    id="profile-device"
                    className="h-11 min-h-11 max-h-11 w-full min-w-0 data-[size=default]:h-11 data-[size=default]:py-0 data-[size=default]:ps-3 data-[size=default]:pe-10"
                    aria-invalid={!!fieldState.error}
                  >
                    <SelectValue
                      placeholder={
                        hasDevices ? "Select device" : "No devices"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        <span className="line-clamp-1 truncate">
                          {device.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="policyId"
            render={({ field, fieldState }) => (
              <Field className="min-w-0 xl:flex-1" data-invalid={!!fieldState.error}>
                <FieldLabel
                  htmlFor="profile-policy"
                  className="truncate text-xs font-medium"
                >
                  Policy
                </FieldLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!hasPolicies}
                >
                  <SelectTrigger
                    id="profile-policy"
                    className="h-11 min-h-11 max-h-11 w-full min-w-0 data-[size=default]:h-11 data-[size=default]:py-0 data-[size=default]:ps-3 data-[size=default]:pe-10"
                    aria-invalid={!!fieldState.error}
                  >
                    <SelectValue
                      placeholder={
                        hasPolicies ? "Select policy" : "No policies"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        <span className="line-clamp-1 truncate">
                          {policy.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div
            className={
              editingProfile
                ? "flex w-full min-w-0 items-center gap-2 xl:basis-full"
                : "flex w-full min-w-0 items-center gap-2 xl:ml-auto xl:w-auto"
            }
          >
            {editingProfile ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 min-w-0 flex-1 px-3 xl:flex-none"
                disabled={updateMutation.isPending}
                onClick={() => resetForm()}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="h-11 min-w-0 flex-1 px-3 xl:flex-none"
              disabled={
                !canSubmitProfile ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <CustomSpinner />
              ) : editingProfile ? null : (
                <Plus />
              )}
              {editingProfile ? "Save changes" : "Create"}
            </Button>
          </div>
        </div>
      </form>

      {form.formState.errors.root ? (
        <ErrorAlert
          message={
            form.formState.errors.root.message ?? "Failed to create profile"
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

      {policiesQuery.isError ? (
        <ErrorAlert
          message={
            policiesQuery.error instanceof Error
              ? policiesQuery.error.message
              : "Failed to load policies"
          }
        />
      ) : null}

      {profiles.length === 0 && !profilesQuery.isLoading ? (
        <p className="text-sm text-brand-text-muted">No profiles yet.</p>
      ) : null}

      {profiles.length > 0 ? (
        <Accordion type="multiple" className="gap-2">
          {profiles.map((profile) => {
            const attachedDevices = profile.deviceIds.map((deviceId) => ({
              id: deviceId,
              name: deviceNameById.get(deviceId) ?? "Device",
            }))

            return (
              <AccordionItem
                key={profile.id}
                value={profile.id}
                className="overflow-hidden rounded-lg border border-border last:border-b not-last:border-b"
              >
                <div className="flex min-w-0 items-center gap-1 px-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="relative z-20 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setPendingDelete(profile)
                    }}
                    aria-label={`Delete ${profile.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="relative z-20 shrink-0 text-brand-text-heading hover:bg-brand-primary/5 hover:text-brand-primary"
                    disabled={updateMutation.isPending}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      startEdit(profile)
                    }}
                    aria-label={`Edit ${profile.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <AccordionTrigger className="min-w-0 w-full justify-start py-2 pe-1 text-left hover:no-underline">
                      <span className="min-w-0 truncate text-sm font-medium capitalize text-brand-text-heading">
                        {profile.name}
                      </span>
                    </AccordionTrigger>
                  </div>
                </div>
                <AccordionContent className="pb-0 pt-0 text-left text-brand-text-muted">
                  <div className="space-y-3 border-t border-border/50 px-3 pb-4 pt-3">
                    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-brand-text-muted">
                        Policy
                      </p>
                      {profile.policyId && profile.policyName ? (
                        <Link
                          href={`/content-policies/${profile.policyId}`}
                          className="min-w-0 truncate text-sm font-medium text-brand-text-heading underline-offset-4 hover:underline"
                        >
                          {profile.policyName}
                        </Link>
                      ) : (
                        <p className="min-w-0 truncate text-sm text-brand-text-heading">
                          None attached
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1">
                      <p className="pt-0.5 text-xs font-medium uppercase tracking-wide text-brand-text-muted">
                        Devices
                      </p>
                      {attachedDevices.length === 0 ? (
                        <p className="min-w-0 truncate text-sm text-brand-text-heading">
                          None attached
                        </p>
                      ) : (
                        <ul className="min-w-0 space-y-1">
                          {attachedDevices.map((device) => (
                            <li
                              key={device.id}
                              className="truncate text-sm text-brand-text-heading"
                            >
                              {device.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setPendingDelete(null)
          }
        }}
      >
        <DialogContent showCloseButton={!deleteMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Delete profile?</DialogTitle>
            <DialogDescription>
              This permanently deletes{" "}
              <span className="font-medium text-brand-text-heading">
                {pendingDelete?.name ?? "this profile"}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError ? (
            <ErrorAlert
              message={
                deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : "Failed to delete profile"
              }
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || !pendingDelete}
              onClick={() => {
                if (!pendingDelete) return
                deleteMutation.mutate(pendingDelete.id)
              }}
            >
              {deleteMutation.isPending ? <CustomSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
