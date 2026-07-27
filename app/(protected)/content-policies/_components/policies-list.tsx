"use client"

import Link from "next/link"
import {
  ChevronRight,
  Plus,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState } from "react"

type PolicyType = "allow" | "block" | "ytrestricted" | "safesearch"

type Policy = {
  id: string
  name: string
  type: PolicyType
  typeLabel: string
  rulesCount: number
  status: "active" | "inactive"
  updatedAt: string
}

const mockPolicies: Policy[] = [
  {
    id: "pol-001",
    name: "Whitelist",
    type: "allow",
    typeLabel: "ALLOW",
    rulesCount: 3,
    status: "active",
    updatedAt: "2 hours ago",
  },
  {
    id: "pol-002",
    name: "Blacklist",
    type: "block",
    typeLabel: "BLOCK",
    rulesCount: 5,
    status: "active",
    updatedAt: "1 day ago",
  },
  {
    id: "pol-003",
    name: "YouTube Restricted",
    type: "ytrestricted",
    typeLabel: "YT RESTRICTED",
    rulesCount: 1,
    status: "active",
    updatedAt: "3 days ago",
  },
  {
    id: "pol-004",
    name: "SafeSearch on Supported Search Engines",
    type: "safesearch",
    typeLabel: "SAFESEARCH",
    rulesCount: 1,
    status: "active",
    updatedAt: "1 week ago",
  },
  {
    id: "pol-005",
    name: "Social Media Block",
    type: "block",
    typeLabel: "BLOCK",
    rulesCount: 4,
    status: "inactive",
    updatedAt: "2 weeks ago",
  },
  {
    id: "pol-006",
    name: "Gaming Sites Allow",
    type: "allow",
    typeLabel: "ALLOW",
    rulesCount: 2,
    status: "active",
    updatedAt: "5 days ago",
  },
]

const badgeClassByType: Record<PolicyType, string> = {
  allow: "bg-green-700 text-white hover:bg-green-700",
  block: "bg-red-600 text-white hover:bg-red-600",
  ytrestricted: "bg-gray-800 text-white hover:bg-gray-800",
  safesearch: "bg-blue-800 text-white hover:bg-blue-800",
}

const cardClassName = "rounded-xl bg-brand-surface ring-0 shadow-none"

export function PoliciesList() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPolicies = mockPolicies.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.typeLabel.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
            Content Policies
          </h1>
          <p className="text-sm text-brand-text-muted">
            Manage allowlists, blocklists, and content filtering rules for your network.
          </p>
        </div>
        <Button
          size="lg"
          className="h-11 shrink-0 gap-2 px-5 text-sm font-semibold bg-brand-primary text-brand-primary-foreground shadow-md shadow-brand-primary/20 hover:bg-brand-primary/90"
        >
          <Plus />
          Add Rule
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-text-muted" />
          <Input
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge className="rounded-lg border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            {mockPolicies.filter((p) => p.status === "active").length} Active
          </Badge>
          <Badge className="rounded-lg border-0 bg-gray-100 text-gray-700 hover:bg-gray-100">
            {mockPolicies.length} Total
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:hidden">
        {filteredPolicies.map((policy) => (
          <Link
            key={policy.id}
            href={`/content-policies/${policy.id}`}
            className="block"
          >
            <Card className={cardClassName}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle className="text-base font-semibold text-brand-text-heading">
                      {policy.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
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
                  <ChevronRight className="size-5 shrink-0 text-brand-text-muted" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-brand-text-muted">
                  <span>{policy.rulesCount} rules</span>
                  <span>Updated {policy.updatedAt}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className={cn(cardClassName, "hidden lg:block")}>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase font-semibold">
                  Policy Name
                </TableHead>
                <TableHead className="text-xs uppercase font-semibold">
                  Type
                </TableHead>
                <TableHead className="text-xs uppercase font-semibold">
                  Rules
                </TableHead>
                <TableHead className="text-xs uppercase font-semibold">
                  Status
                </TableHead>
                <TableHead className="text-xs uppercase font-semibold">
                  Last Updated
                </TableHead>
                <TableHead className="text-xs uppercase font-semibold text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.map((policy) => (
                <TableRow
                  key={policy.id}
                  className="group cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => {
                    window.location.href = `/content-policies/${policy.id}`
                  }}
                >
                  <TableCell className="font-medium text-brand-text-heading">
                    {policy.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "rounded text-[10px] font-bold tracking-wide",
                        badgeClassByType[policy.type]
                      )}
                    >
                      {policy.typeLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-brand-text-muted">
                    {policy.rulesCount}
                  </TableCell>
                  <TableCell>
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
                  <TableCell className="text-brand-text-muted">
                    {policy.updatedAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-brand-primary opacity-0 transition-opacity group-hover:opacity-100"
                      asChild
                    >
                      <Link href={`/content-policies/${policy.id}`}>
                        View
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPolicies.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-brand-text-muted"
                  >
                    No policies found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ")
}
