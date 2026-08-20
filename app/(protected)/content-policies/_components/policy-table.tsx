"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Eye, Flame, Pencil, Trash2, UserPlus } from "lucide-react"

import { ErrorAlert } from "@/components/feedback"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AssignPolicyDialog } from "@/app/(protected)/content-policies/_components/assign-policy-dialog"
import {
  policyTableCardClassName,
  policyTableCellClassName,
  policyTableClassName,
  policyTableColgroup,
  policyTableHeadClassName,
} from "@/app/(protected)/content-policies/_components/policy-table-layout"
import { ApiError, apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import { cn } from "@/lib/utils"
import type { PolicyListItem, PolicyType } from "@/schemas/content-policies/policy"
import { CustomSpinner } from "@/components/feedback/custom-spinner"

export interface PolicyTableProps {
  policies: PolicyListItem[]
}

const badgeClassByType: Record<PolicyType, string> = {
  allow: "bg-green-700 text-white hover:bg-green-700",
  block: "bg-red-600 text-white hover:bg-red-600",
  ytrestricted: "bg-gray-800 text-white hover:bg-gray-800",
  safesearch: "bg-blue-800 text-white hover:bg-blue-800",
}

const cardClassName = policyTableCardClassName
const tableHeadClassName = policyTableHeadClassName
const tableCellClassName = policyTableCellClassName

type PendingDelete = {
  id: string
  name: string
}

function PolicyRowActions({
  policy,
  onRequestDelete,
}: {
  policy: PolicyListItem
  onRequestDelete: (policy: PendingDelete) => void
}) {
  const [assignOpen, setAssignOpen] = useState(false)

  return (
    <div
      className="flex items-center justify-end"
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-7 rounded-md text-brand-text-muted hover:bg-muted/60 hover:text-brand-text-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <Flame className="size-3.5" strokeWidth={2} />
            <span className="sr-only">Open policy actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-36 min-w-0 p-1"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem asChild className="gap-2 px-2 py-1.5 text-xs">
            <Link href={`/content-policies/${policy.id}`}>
              <Eye className="size-3.5" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="gap-2 px-2 py-1.5 text-xs">
            <Link href={`/content-policies/${policy.id}/edit`}>
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 px-2 py-1.5 text-xs"
            onSelect={(event) => {
              event.preventDefault()
              setAssignOpen(true)
            }}
          >
            <UserPlus className="size-3.5" />
            Assign
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            variant="destructive"
            className="gap-2 px-2 py-1.5 text-xs"
            onSelect={() => {
              onRequestDelete({ id: policy.id, name: policy.name })
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssignPolicyDialog
        policy={policy}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
    </div>
  )
}

export function PolicyTable({ policies }: PolicyTableProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleteError, setDeleteError] = useState("")

  const deleteMutation = useMutation({
    mutationFn: (policyId: string) =>
      apiClient<{ ok: boolean }>(`/api/gateway-policies/${policyId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, policyId) => {
      setPendingDelete(null)
      setDeleteError("")
      queryClient.setQueriesData<PolicyListItem[]>(
        { queryKey: queryKeys.gatewayPolicies.list() },
        (current) => (current ?? []).filter((policy) => policy.id !== policyId)
      )
    },
    onError: (error) => {
      setDeleteError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to delete policy"
      )
    },
  })

  return (
    <>
      {deleteError && !pendingDelete ? (
        <div className="mb-4">
          <ErrorAlert message={deleteError} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:hidden">
        {policies.map((policy) => (
          <Card
            key={policy.id}
            className={cn(cardClassName, "cursor-pointer gap-0 py-0")}
            onClick={() => {
              router.push(`/content-policies/${policy.id}`)
            }}
          >
            <CardHeader className="rounded-none border-b border-border/60 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <CardTitle className="text-base font-semibold text-brand-text-heading">
                    {policy.name}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "rounded text-[10px] font-bold tracking-wide",
                        badgeClassByType[policy.type]
                      )}
                    >
                      {policy.typeLabel}
                    </Badge>
                    <Badge
                      className={cn(
                        "rounded text-[10px] font-bold tracking-wide",
                        policy.status === "active"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {policy.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <PolicyRowActions
                  policy={policy}
                  onRequestDelete={(next) => {
                    setDeleteError("")
                    setPendingDelete(next)
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-xs text-brand-text-muted">
                <span>{policy.rulesCount} rules</span>
                <span>Updated {policy.updatedAt}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card
        className={cn(
          cardClassName,
          "hidden gap-0 overflow-hidden py-0 lg:block"
        )}
      >
        <CardContent className="p-0">
          <Table className={policyTableClassName}>
            <colgroup>
              {policyTableColgroup.map((col) => (
                <col key={col.key} style={{ width: col.width }} />
              ))}
            </colgroup>
            <TableHeader className="[&_tr]:border-0">
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className={tableHeadClassName}>Policy Name</TableHead>
                <TableHead className={tableHeadClassName}>Type</TableHead>
                <TableHead className={tableHeadClassName}>Rules</TableHead>
                <TableHead className={tableHeadClassName}>Status</TableHead>
                <TableHead className={tableHeadClassName}>Last Updated</TableHead>
                <TableHead
                  className={cn(tableHeadClassName, "text-right")}
                >
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow
                  key={policy.id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => {
                    router.push(`/content-policies/${policy.id}`)
                  }}
                >
                  <TableCell
                    className={cn(
                      tableCellClassName,
                      "font-medium text-brand-text-heading"
                    )}
                  >
                    {policy.name}
                  </TableCell>
                  <TableCell className={tableCellClassName}>
                    <Badge
                      className={cn(
                        "rounded text-[10px] font-bold tracking-wide",
                        badgeClassByType[policy.type]
                      )}
                    >
                      {policy.typeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(tableCellClassName, "text-brand-text-muted")}
                  >
                    {policy.rulesCount}
                  </TableCell>
                  <TableCell className={tableCellClassName}>
                    <Badge
                      className={cn(
                        "rounded text-[10px] font-bold tracking-wide",
                        policy.status === "active"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {policy.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(tableCellClassName, "text-brand-text-muted")}
                  >
                    {policy.updatedAt}
                  </TableCell>
                  <TableCell
                    className={cn(tableCellClassName, "text-right")}
                  >
                    <div className="flex justify-end">
                      <PolicyRowActions
                        policy={policy}
                        onRequestDelete={(next) => {
                          setDeleteError("")
                          setPendingDelete(next)
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {policies.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-xs text-brand-text-muted"
                  >
                    No policies found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setPendingDelete(null)
            setDeleteError("")
          }
        }}
      >
        <DialogContent showCloseButton={!deleteMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Delete policy?</DialogTitle>
            <DialogDescription>
              This permanently deletes{" "}
              <span className="font-medium text-brand-text-heading">
                {pendingDelete?.name ?? "this policy"}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <ErrorAlert message={deleteError} /> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => {
                setPendingDelete(null)
                setDeleteError("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || !pendingDelete}
              className="flex items-center gap-2"
              onClick={() => {
                if (!pendingDelete) return
                setDeleteError("")
                deleteMutation.mutate(pendingDelete.id)
              }}
            >
              {
                (deleteMutation.isPending || !pendingDelete) && <CustomSpinner />
              }
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
