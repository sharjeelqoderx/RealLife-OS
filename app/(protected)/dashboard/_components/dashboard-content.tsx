"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ChevronRight,
  KeyRound,
  Layers,
  Lock,
  Megaphone,
  Plus,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BillingDetailsResponse } from "@/schemas/billing/details"
import type { PolicyListResponse } from "@/schemas/content-policies/policy"
import type { ConnectedDevice } from "@/schemas/devices/device"
import { formatLastSeen } from "@/schemas/devices/device"
import { cn } from "@/lib/utils"

export interface DashboardContentProps {
  userName: string
  devices: ConnectedDevice[]
  policies: PolicyListResponse
  billingDetails: BillingDetailsResponse | null
  dashboardStats: {
    recentActivity: {
      totalActions: number
      policyActions: number
      deviceActions: number
      activityTimeline: Array<{ hour: string; actions: number }>
      recentDetails: Array<{
        time: string
        action: string
        resourceType: string
        resourceName: string
        category: string
        timestamp: string
      }>
    }
    insights: {
      totalPolicies: number
      totalDevices: number
      lastActivityAt: string | null
    }
  } | null
  setupProgress: {
    completed: number
    total: number
    percentage: number
    tasks: Array<{ id: string; title: string; completed: boolean }>
  }
}

const cardClassName =
  "rounded-xl border border-border/70 bg-white shadow-none ring-0"

const trafficChartConfig = {
  allowed: { label: "Allowed", color: "#1d4ed8" },
  blocked: { label: "Blocked", color: "#ef4444" },
  safeSearch: { label: "SafeSearch", color: "#14b8a6" },
} satisfies ChartConfig

const chartLegend = [
  { key: "allowed" as const, label: "Allowed", color: "bg-[#1d4ed8]" },
  { key: "blocked" as const, label: "Blocked", color: "bg-red-500" },
  { key: "safeSearch" as const, label: "SafeSearch", color: "bg-teal-500" },
]

const trafficSample = [
  { time: "00:00", allowed: 420, blocked: 28, safeSearch: 12 },
  { time: "04:00", allowed: 180, blocked: 14, safeSearch: 6 },
  { time: "08:00", allowed: 890, blocked: 52, safeSearch: 34 },
  { time: "12:00", allowed: 1240, blocked: 68, safeSearch: 48 },
  { time: "16:00", allowed: 980, blocked: 45, safeSearch: 38 },
  { time: "20:00", allowed: 760, blocked: 36, safeSearch: 22 },
  { time: "23:59", allowed: 540, blocked: 24, safeSearch: 16 },
]

function categoryBadgeClass(category: string) {
  const value = category.toLowerCase()
  if (value.includes("malware") || value.includes("phish")) {
    return "bg-red-100 text-red-800"
  }
  if (value.includes("game")) {
    return "bg-violet-100 text-violet-800"
  }
  if (value.includes("track") || value.includes("ad")) {
    return "bg-amber-100 text-amber-800"
  }
  return "bg-slate-100 text-slate-800"
}

export function DashboardContent({
  userName,
  devices,
  policies,
  dashboardStats,
  setupProgress,
}: DashboardContentProps) {
  const [seriesVisibility, setSeriesVisibility] = useState({
    allowed: true,
    blocked: true,
    safeSearch: true,
  })

  const androidCount = devices.filter((device) => device.platform === "android").length
  const iphoneCount = devices.filter((device) => device.platform === "iphone").length
  const isProtected = devices.length > 0 && policies.length > 0
  const hasPolicy = policies.length > 0
  const hasDevice = devices.length > 0
  const setupSteps = [
    {
      id: "cloudflare",
      title: "Link Cloudflare Account",
      icon: KeyRound,
      done: hasDevice || hasPolicy,
    },
    {
      id: "policy",
      title: "Create Content Policy",
      icon: Layers,
      done: hasPolicy,
    },
    {
      id: "devices",
      title: "Connect Devices to your Content Policy",
      icon: Smartphone,
      done: hasDevice,
    },
    {
      id: "locking",
      title: "Customize Profile Locking",
      icon: Lock,
      done: false,
    },
    {
      id: "blocking",
      title: "Improve Blocking & Bypass Prevention",
      icon: Zap,
      done: false,
    },
  ]
  const setupPercent = Math.round(
    (setupSteps.filter((step) => step.done).length / setupSteps.length) * 100
  )
  const recentRows = dashboardStats?.recentActivity.recentDetails ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-[#1d4ed8] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Megaphone className="size-4 shrink-0" />
          <span>New: YouTube Restricted Mode support is now live.</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto self-start px-0 text-white hover:bg-white/10 hover:text-white sm:self-auto sm:px-2"
          asChild
        >
          <Link href="/content-policies">Learn more</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Welcome back, {userName}.
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            {isProtected ? (
              <Badge className="rounded-full border-0 bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-600">
                <ShieldCheck className="size-3.5" />
                Status: Protected
              </Badge>
            ) : (
              <Badge className="rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-800 hover:bg-amber-100">
                Status: Setup needed
              </Badge>
            )}
            <span>
              {isProtected
                ? "Your network is 100% protected."
                : "Enroll a device and assign a policy to turn protection on."}
            </span>
          </div>
        </div>
        <Button
          size="lg"
          className="h-11 shrink-0 gap-2 bg-[#1d4ed8] px-5 text-sm font-semibold text-white hover:bg-[#1d4ed8]/90"
          asChild
        >
          <Link href="/devices/setup">
            <Plus className="size-4" />
            Add New Device
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={cardClassName}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-neutral-900">
              Protected Devices
            </CardTitle>
            <CardAction className="static justify-self-auto">
              <span className="text-2xl font-bold text-[#1d4ed8]">
                {devices.length}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-[#eef2ff] px-4 py-4">
              <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                Android Devices
              </p>
              <p className="mt-1 text-3xl font-bold text-neutral-900">
                {androidCount}
              </p>
            </div>
            <div className="rounded-lg bg-[#eef2ff] px-4 py-4">
              <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                iPhone Devices
              </p>
              <p className="mt-1 text-3xl font-bold text-neutral-900">
                {iphoneCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-neutral-900">
              Connected Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.length > 0 ? (
              devices.slice(0, 3).map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                    <Smartphone className="size-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">
                      {device.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {device.status === "active" ? "Active" : "Idle"} • Last
                      seen {formatLastSeen(device.lastSeenMinutes)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">No devices enrolled yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Requests",
            value: dashboardStats?.recentActivity.totalActions ?? 0,
          },
          {
            label: "Blocked",
            value: dashboardStats?.recentActivity.policyActions ?? 0,
          },
          {
            label: "SafeSearch",
            value: policies.filter((policy) => policy.type === "safesearch").length,
          },
          {
            label: "Protected Devices",
            value: devices.length,
          },
        ].map((metric) => (
          <Card key={metric.label} className={cardClassName}>
            <CardContent>
              <p className="text-sm text-neutral-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-neutral-900">
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className={cardClassName}>
          <CardHeader className="items-start">
            <CardTitle className="text-base font-semibold text-neutral-900">
              Traffic Analytics
            </CardTitle>
            <CardAction className="self-start">
              <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
                {chartLegend.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setSeriesVisibility((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key],
                      }))
                    }
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5",
                      !seriesVisibility[item.key] && "opacity-40"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", item.color)} />
                    <span className="text-neutral-500">{item.label}</span>
                  </button>
                ))}
              </div>
            </CardAction>
            <CardDescription>
              Network activity over the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer
              config={trafficChartConfig}
              className="aspect-[2.4/1] w-full"
            >
              <LineChart data={trafficSample} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="allowed"
                  stroke="var(--color-allowed)"
                  strokeWidth={2}
                  dot={false}
                  hide={!seriesVisibility.allowed}
                />
                <Line
                  type="monotone"
                  dataKey="blocked"
                  stroke="var(--color-blocked)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  hide={!seriesVisibility.blocked}
                />
                <Line
                  type="monotone"
                  dataKey="safeSearch"
                  stroke="var(--color-safeSearch)"
                  strokeWidth={2}
                  dot={false}
                  hide={!seriesVisibility.safeSearch}
                />
              </LineChart>
            </ChartContainer>

            <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-bold text-[#1d4ed8]">0</p>
                <p className="text-xs text-neutral-500">Total Online Traffic</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">0</p>
                <p className="text-xs text-neutral-500">Blocked Requests</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-600">0</p>
                <p className="text-xs text-neutral-500">
                  Searches that used SafeSearch
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-neutral-900">
              Setup Progress
            </CardTitle>
            <CardDescription>
              Complete these steps to maximize security.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Overall Progress</span>
                <span className="font-semibold text-[#1d4ed8]">
                  {setupPercent}%
                </span>
              </div>
              <Progress
                value={setupPercent}
                className="h-2 bg-[#1d4ed8]/10 [&_[data-slot=progress-indicator]]:bg-[#1d4ed8]"
              />
            </div>

            <div className="divide-y">
              {setupSteps.map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-3 py-3",
                      !step.done && "opacity-40"
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-neutral-800" />
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">
                      {step.title}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-neutral-400" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle className="text-xs font-bold tracking-widest text-neutral-500 uppercase">
            Recent Blocked Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#eef2ff] hover:bg-[#eef2ff]">
                <TableHead className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                  Timestamp
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                  Device
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                  Target Domain
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                  Category
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRows.length > 0 ? (
                recentRows.map((row, index) => (
                  <TableRow key={`${row.timestamp}-${index}`}>
                    <TableCell className="font-mono text-xs">{row.time}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Smartphone className="size-3.5 text-neutral-500" />
                        {row.resourceType.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate font-mono text-xs text-neutral-500">
                      {row.resourceName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-md border-0 font-medium",
                          categoryBadgeClass(row.category)
                        )}
                      >
                        {row.category.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      Blocked
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-neutral-500"
                  >
                    No blocked activity for this account yet.
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
