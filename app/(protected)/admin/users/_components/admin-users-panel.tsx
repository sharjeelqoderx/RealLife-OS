"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

import { ErrorAlert } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { apiClient } from "@/lib/api/client"
import { AUTH_ROLES, type AuthRole } from "@/lib/auth/roles"
import type { AdminListedUser } from "@/lib/services/admin/users"

type UsersResponse = { success: true; data: AdminListedUser[] }
type UpdateResponse = { success: true; data: AdminListedUser }

export interface AdminUsersPanelProps {
  initialUsers: AdminListedUser[]
  currentUserId: string
}

function formatLastLogin(value: string | null): string {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  return date.toLocaleString()
}

export function AdminUsersPanel({
  initialUsers,
  currentUserId,
}: AdminUsersPanelProps) {
  const queryClient = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiClient<UsersResponse>("/api/admin/users"),
    initialData: { success: true, data: initialUsers },
  })

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: AuthRole }) =>
      apiClient<UpdateResponse>(
        `/api/admin/users/${encodeURIComponent(input.userId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ role: input.role }),
        }
      ),
    onSuccess: (response) => {
      queryClient.setQueryData<UsersResponse>(["admin", "users"], (prev) => {
        const current = prev?.data ?? initialUsers
        return {
          success: true,
          data: current.map((user) =>
            user.id === response.data.id ? response.data : user
          ),
        }
      })
    },
  })

  const users = usersQuery.data?.data ?? initialUsers

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-heading">Users</h1>
          <p className="mt-2 text-sm text-brand-text-muted">
            Toggle ADMIN for an existing account. Sign-up always creates USER.
          </p>
        </div>
        <Button asChild variant="brandOutline">
          <Link href="/admin/cloudflare">Cloudflare admin</Link>
        </Button>
      </div>

      {usersQuery.isError ? (
        <ErrorAlert
          message={
            usersQuery.error instanceof Error
              ? usersQuery.error.message
              : "Failed to load users"
          }
        />
      ) : null}

      {roleMutation.isError ? (
        <ErrorAlert
          message={
            roleMutation.error instanceof Error
              ? roleMutation.error.message
              : "Failed to update role"
          }
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-brand-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isAdmin = user.role === AUTH_ROLES.ADMIN
              const isSelf = user.id === currentUserId
              const pending =
                roleMutation.isPending &&
                roleMutation.variables?.userId === user.id
              const switchId = `admin-role-${user.id}`
              return (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-text-heading capitalize">
                      {user.fullName || user.email}
                      {isSelf ? (
                        <span className="ms-2 text-xs font-normal text-brand-text-muted">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    {user.fullName ? (
                      <p className="text-xs text-brand-text-muted">
                        {user.email}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-brand-text-muted">
                    {formatLastLogin(user.lastSignInAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={switchId}
                        checked={isAdmin}
                        disabled={
                          isSelf || pending || roleMutation.isPending
                        }
                        onCheckedChange={(checked) => {
                          if (isSelf) return
                          roleMutation.mutate({
                            userId: user.id,
                            role: checked
                              ? AUTH_ROLES.ADMIN
                              : AUTH_ROLES.USER,
                          })
                        }}
                      />
                      <Label
                        htmlFor={isSelf ? undefined : switchId}
                        className="text-xs text-brand-text-muted"
                      >
                        {isAdmin ? "ADMIN" : "USER"}
                      </Label>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="px-4 py-8 text-sm text-brand-text-muted">
            No users yet.
          </p>
        ) : null}
      </div>
    </div>
  )
}
