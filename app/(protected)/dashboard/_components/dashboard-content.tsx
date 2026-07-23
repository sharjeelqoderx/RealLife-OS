"use client"

import { useState } from "react"
import {
  ChevronRight,
  Link2,
  Lock,
  Megaphone,
  MonitorSmartphone,
  Plus,
  Shield,
  ShieldCheck,
  Smartphone,
  Tablet,
  Zap,
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { cn } from "@/lib/utils"

export interface DashboardContentProps {
  userName: string
}

const cardClassName = "rounded-xl bg-brand-surface ring-0 shadow-none"

const trafficChartConfig = {
  allowed: {
    label: "Allowed",
    color: "#014bc6",
  },
  blocked: {
    label: "Blocked",
    color: "#ef4444",
  },
  safeSearch: {
    label: "SafeSearch",
    color: "#14b8a6",
  },
} satisfies ChartConfig

const trafficData = [
  { time: "00:00", allowed: 420, blocked: 28, safeSearch: 12 },
  { time: "04:00", allowed: 180, blocked: 14, safeSearch: 6 },
  { time: "08:00", allowed: 890, blocked: 52, safeSearch: 34 },
  { time: "12:00", allowed: 1240, blocked: 68, safeSearch: 48 },
  { time: "16:00", allowed: 980, blocked: 45, safeSearch: 38 },
  { time: "20:00", allowed: 760, blocked: 36, safeSearch: 22 },
  { time: "23:59", allowed: 540, blocked: 24, safeSearch: 16 },
]

const connectedDevices = [
  {
    name: "My iPhone 13",
    status: "Active",
    lastSeen: "2 min ago",
    icon: Smartphone,
  },
  {
    name: "Office Android",
    status: "Active",
    lastSeen: "5 min ago",
    icon: Smartphone,
  },
  {
    name: "Kids iPad",
    status: "Active",
    lastSeen: "12 min ago",
    icon: Tablet,
  },
  {
    name: "Living Room TV",
    status: "Idle",
    lastSeen: "1 hr ago",
    icon: MonitorSmartphone,
  },
]

const setupTasks = [
  {
    id: "dns",
    icon: Link2,
    title: "Configure DNS settings",
    description: "Point your router to our secure DNS servers.",
  },
  {
    id: "profiles",
    icon: Shield,
    title: "Create device profiles",
    description: "Set age-appropriate filtering rules per device.",
  },
  {
    id: "device",
    icon: Smartphone,
    title: "Add your first device",
    description: "Install the protection profile on a phone or tablet.",
  },
  {
    id: "security",
    icon: Lock,
    title: "Enable advanced security",
    description: "Turn on malware and phishing protection.",
  },
  {
    id: "performance",
    icon: Zap,
    title: "Optimize network performance",
    description: "Review latency and caching recommendations.",
  },
]

const recentBlocked = [
  {
    time: "14:22:15",
    device: "Android (Office)",
    domain: "tracking-pixel.adtech.net",
    category: "Tracking",
    categoryClass: "bg-amber-100 text-amber-800",
  },
  {
    time: "14:18:03",
    device: "iPhone 13",
    domain: "malware-drop.example.net",
    category: "Malware",
    categoryClass: "bg-red-100 text-red-800",
  },
  {
    time: "14:11:47",
    device: "Kids iPad",
    domain: "free-games-hub.io",
    category: "Gaming",
    categoryClass: "bg-violet-100 text-violet-800",
  },
  {
    time: "13:58:22",
    device: "Android (Office)",
    domain: "ads.tracker-network.com",
    category: "Tracking",
    categoryClass: "bg-amber-100 text-amber-800",
  },
  {
    time: "13:45:09",
    device: "Living Room TV",
    domain: "phish-login.fake-bank.org",
    category: "Malware",
    categoryClass: "bg-red-100 text-red-800",
  },
]

const metricCards = [
  { label: "Total Requests", value: "1.2M" },
  { label: "Blocked", value: "45k" },
  { label: "SafeSearch", value: "12k" },
  { label: "Protected Devices", value: "8" },
]

const chartLegend = [
  { key: "allowed" as const, label: "Allowed", color: "bg-[#014bc6]" },
  { key: "blocked" as const, label: "Blocked", color: "bg-red-500" },
  { key: "safeSearch" as const, label: "SafeSearch", color: "bg-teal-500" },
]

export function DashboardContent({ userName }: DashboardContentProps) {
  const [seriesVisibility, setSeriesVisibility] = useState({
    allowed: true,
    blocked: true,
    safeSearch: true,
  })

  return (
    <div className="space-y-6">
      {/* Announcement banner */}
      <div className="flex flex-col gap-3 rounded-lg bg-brand-primary px-4 py-3 text-brand-primary-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Megaphone className="size-4 shrink-0" />
          <span>New: YouTube Restricted Mode support is now live.</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto self-start px-0 text-brand-primary-foreground hover:bg-white/10 hover:text-brand-primary-foreground sm:self-auto sm:px-2"
        >
          Learn more
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
            Welcome back, {userName}.
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-brand-text-muted">
            <Badge className="rounded-lg border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              <ShieldCheck className="size-3" />
              Status: Protected
            </Badge>
            <span>Your network is 100% protected.</span>
          </div>
        </div>
        <Button
          size="lg"
          className="h-11 shrink-0 gap-2 px-5 text-sm font-semibold bg-brand-primary text-brand-primary-foreground shadow-md shadow-brand-primary/20 hover:bg-brand-primary/90"
        >
          <Plus />
          Add New Device
        </Button>
      </div>

      {/* Device summary row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Protected Devices
            </CardTitle>
            <CardAction>
              <span className="text-2xl font-bold text-brand-text-heading">
                7
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-1">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-brand-text-muted">Android Devices</p>
                <p className="mt-1 text-3xl font-bold text-brand-text-heading">
                  4
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-brand-text-muted">iPhone Devices</p>
                <p className="mt-1 text-3xl font-bold text-brand-text-heading">
                  3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Connected Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectedDevices.map((device) => (
              <div
                key={device.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <device.icon className="size-4 text-brand-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-brand-text-heading">
                      {device.name}
                    </p>
                    <p className="text-xs text-brand-text-muted">
                      {device.status}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-brand-text-muted">
                  Last seen {device.lastSeen}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label} className={cardClassName}>
            <CardContent className="pt-6">
              <p className="text-sm text-brand-text-muted">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold text-brand-text-heading">
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics + setup progress */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Card className={cardClassName}>
          <CardHeader className="items-center">
            <CardTitle className="text-base font-semibold">
              Traffic Analytics
            </CardTitle>
            <CardAction className="self-center row-span-1">
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
                      "flex cursor-pointer items-center gap-1.5 transition-opacity hover:opacity-80",
                      !seriesVisibility[item.key] && "opacity-40"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", item.color)} />
                    <span className="text-brand-text-muted">{item.label}</span>
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
              <LineChart data={trafficData} margin={{ left: 0, right: 8 }}>
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
                <p className="text-2xl font-bold text-brand-primary">0</p>
                <p className="text-xs text-brand-text-muted">
                  Total Online Traffic
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">0</p>
                <p className="text-xs text-brand-text-muted">
                  Blocked Requests
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-600">0</p>
                <p className="text-xs text-brand-text-muted">
                  Searches that used SafeSearch
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardHeader className="items-center">
            <CardTitle className="text-base font-semibold">
              Setup Progress
            </CardTitle>
            <CardAction className="self-center row-span-1">
              <span className="cursor-pointer text-sm font-semibold text-brand-primary">
                60%
              </span>
            </CardAction>
            <CardDescription>
              Complete these steps to fully secure your network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-brand-text-muted">Overall Progress</p>
              <Progress
                value={60}
                className="h-2 bg-brand-primary/10 [&_[data-slot=progress-indicator]]:bg-brand-primary"
              />
            </div>

            <Accordion type="single" collapsible defaultValue="dns">
              {setupTasks.map((task) => (
                <AccordionItem key={task.id} value={task.id}>
                  <AccordionTrigger className="py-3 hover:no-underline **:data-[slot=accordion-trigger-icon]:text-brand-text-heading">
                    <span className="flex items-center gap-2.5">
                      <task.icon className="size-4 shrink-0 text-brand-text-heading" />
                      {task.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="ps-6 text-brand-text-muted">
                    {task.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Recent blocked activity */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle className="text-xs font-semibold tracking-widest text-brand-text-muted uppercase">
            Recent Blocked Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase">Timestamp</TableHead>
                <TableHead className="text-xs uppercase">Device</TableHead>
                <TableHead className="text-xs uppercase">
                  Target Domain
                </TableHead>
                <TableHead className="text-xs uppercase">Category</TableHead>
                <TableHead className="text-xs uppercase">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBlocked.map((row) => (
                <TableRow key={`${row.time}-${row.domain}`}>
                  <TableCell className="font-mono text-xs">{row.time}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Smartphone className="size-3.5 text-brand-text-muted" />
                      {row.device}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-brand-text-muted">
                    {row.domain}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-lg border-0 font-medium",
                        row.categoryClass
                      )}
                    >
                      {row.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-red-600">
                    Blocked
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
