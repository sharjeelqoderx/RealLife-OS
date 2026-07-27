"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, Eye, Flame, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import type { PolicyListItem, PolicyType } from "@/schemas/content-policies/policy"

export interface PolicyTableProps {
  policies: PolicyListItem[]
}

const badgeClassByType: Record<PolicyType, string> = {
  allow: "bg-green-700 text-white hover:bg-green-700",
  block: "bg-red-600 text-white hover:bg-red-600",
  ytrestricted: "bg-gray-800 text-white hover:bg-gray-800",
  safesearch: "bg-blue-800 text-white hover:bg-blue-800",
}

const cardClassName = "rounded-md bg-brand-surface ring-0 shadow-none"

const tableHeadClassName =
  "h-8 border-b border-border/60 bg-muted/40 px-4 py-1.5 align-middle text-[11px] font-semibold tracking-wide text-brand-text-muted uppercase first:rounded-tl-xl last:rounded-tr-xl"

const tableCellClassName = "px-4 py-2 align-middle text-xs"

function PolicyRowActions({ policyId }: { policyId: string }) {
  return (
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
          <Link href={`/content-policies/${policyId}`}>
            <Eye className="size-3.5" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 px-2 py-1.5 text-xs">
          <Link href={`/content-policies/${policyId}`}>
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 px-2 py-1.5 text-xs">
          <Copy className="size-3.5" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          variant="destructive"
          className="gap-2 px-2 py-1.5 text-xs"
        >
          <Trash2 className="size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PolicyTable({ policies }: PolicyTableProps) {
  const router = useRouter()

  return (
    <>
      <div className="grid gap-4 lg:hidden">
        {policies.map((policy) => (
          <Card key={policy.id} className={cn(cardClassName, "gap-0 py-0")}>
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
                <PolicyRowActions policyId={policy.id} />
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
          <Table className="text-xs">
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
                      <PolicyRowActions policyId={policy.id} />
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
    </>
  )
}
