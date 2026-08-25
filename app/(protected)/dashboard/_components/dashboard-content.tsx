"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  Lock,
  Megaphone,
  MonitorSmartphone,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  TrendingDown,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import type { ConnectedDevice } from "@/schemas/devices/device"
import type { PolicyListResponse } from "@/schemas/content-policies/policy"

export interface DashboardContentProps {
  userName: string
  devices: ConnectedDevice[]
  policies: PolicyListResponse
  billingDetails: {
    hasAccess: boolean
    status: string
    planName: string
    deviceLimit: number
    currentPeriodEnd: string | null
    paymentMethod: {
      brand: string
      last4: string
      expMonth: number
      expYear: number
    } | null
    enrolledDeviceCount: number
    remainingDeviceSlots: number
    canAddDevice: boolean
  } | null
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

const cardClassName = "rounded-xl bg-brand-surface ring-0 shadow-none border border-border/40"

function formatLastSeen(minutes: number | null): string {
  if (minutes === null) return "Never"
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${Math.floor(minutes)} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function getDeviceIcon(platform: string) {
  switch (platform) {
    case "android":
      return Smartphone
    case "iphone":
      return Smartphone
    default:
      return MonitorSmartphone
  }
}

const trafficChartConfig = {
  actions: {
    label: "Actions",
    color: "#014bc6",
  },
} satisfies ChartConfig

export function DashboardContent({
  userName,
  devices,
  policies,
  billingDetails,
  dashboardStats,
  setupProgress,
}: DashboardContentProps) {
  const [seriesVisibility, setSeriesVisibility] = useState({
    actions: true,
  })

  // Calculate statistics from REAL data
  const activeDevices = devices.filter((d) => d.status === "active").length
  const androidDevices = devices.filter((d) => d.platform === "android").length
  const iphoneDevices = devices.filter((d) => d.platform === "iphone").length
  const activePolicies = policies.filter((p) => p.status === "active").length
  const totalPolicies = policies.length
  
  // Use REAL activity data from audit log
  const activityData = dashboardStats?.recentActivity.activityTimeline || []
  const totalActions = dashboardStats?.recentActivity.totalActions || 0
  const policyActions = dashboardStats?.recentActivity.policyActions || 0
  const deviceActions = dashboardStats?.recentActivity.deviceActions || 0
  
  // Calculate protection score from REAL data
  const protectionScore = devices.length > 0 && activePolicies > 0 ? 100 : devices.length > 0 ? 60 : 0
  
  // Policy distribution for pie chart - REAL data
  const policyTypeData = [
    { name: "Block", value: policies.filter(p => p.type === "block").length, fill: "#ef4444" },
    { name: "Allow", value: policies.filter(p => p.type === "allow").length, fill: "#10b981" },
    { name: "SafeSearch", value: policies.filter(p => p.type === "safesearch").length, fill: "#14b8a6" },
    { name: "YT Restricted", value: policies.filter(p => p.type === "ytrestricted").length, fill: "#f59e0b" },
  ].filter(item => item.value > 0)
  const chartLegend = [
    { key: "actions" as const, label: "User Actions", color: "bg-[#014bc6]" },
  ]

  return (
    <div className="space-y-6">
      {/* Header with quick actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-brand-text-heading">
            Welcome back, {userName} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {protectionScore === 100 ? (
              <Badge className="rounded-lg border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <ShieldCheck className="size-3" />
                Fully Protected
              </Badge>
            ) : protectionScore > 0 ? (
              <Badge className="rounded-lg border-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <ShieldAlert className="size-3" />
                Partially Protected
              </Badge>
            ) : (
              <Badge className="rounded-lg border-0 bg-red-100 text-red-800 hover:bg-red-100">
                <ShieldAlert className="size-3" />
                Not Protected
              </Badge>
            )}
            <span className="text-brand-text-muted">
              {billingDetails?.planName || "Free Trial"} Plan
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/devices/setup">
            <Button
              size="lg"
              className="h-11 gap-2 px-5 text-sm font-semibold bg-brand-primary text-brand-primary-foreground shadow-md shadow-brand-primary/20 hover:bg-brand-primary/90"
            >
              <Plus className="size-4" />
              Add Device
            </Button>
          </Link>
          <Link href="/content-policies/new-policy">
            <Button
              variant="outline"
              size="lg"
              className="h-11 gap-2 px-5 text-sm font-semibold"
            >
              <Shield className="size-4" />
              New Policy
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stats overview - ALL REAL DATA */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(cardClassName, "bg-gradient-to-br from-blue-50 to-brand-surface")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-text-muted">Protected Devices</p>
                <p className="mt-2 text-3xl font-bold text-brand-text-heading">
                  {activeDevices}/{billingDetails?.deviceLimit || 1}
                </p>
                <p className="mt-1 text-xs text-brand-text-muted">
                  {devices.length} total connected
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-primary/10">
                <Smartphone className="size-6 text-brand-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardClassName, "bg-gradient-to-br from-emerald-50 to-brand-surface")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-text-muted">Active Policies</p>
                <p className="mt-2 text-3xl font-bold text-brand-text-heading">
                  {activePolicies}/{totalPolicies}
                </p>
                <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  {activePolicies} running
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <Shield className="size-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardClassName, "bg-gradient-to-br from-violet-50 to-brand-surface")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-text-muted">Recent Activity</p>
                <p className="mt-2 text-3xl font-bold text-brand-text-heading">
                  {totalActions}
                </p>
                <p className="mt-1 text-xs text-violet-600 flex items-center gap-1">
                  <Activity className="size-3" />
                  Last 7 days
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-violet-500/10">
                <Activity className="size-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardClassName, "bg-gradient-to-br from-amber-50 to-brand-surface")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-text-muted">Setup Progress</p>
                <p className="mt-2 text-3xl font-bold text-brand-text-heading">
                  {setupProgress.percentage}%
                </p>
                <p className="mt-1 text-xs text-brand-text-muted">
                  {setupProgress.completed}/{setupProgress.total} tasks done
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/10">
                <CheckCircle2 className="size-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid - REAL ACTIVITY DATA */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity chart from audit log - spans 2 columns */}
        <Card className={cn(cardClassName, "lg:col-span-2")}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  User Activity
                </CardTitle>
                <CardDescription>
                  Your actions over the last 24 hours (from audit log)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <>
                <ChartContainer
                  config={trafficChartConfig}
                  className="aspect-[2.2/1] w-full"
                >
                  <LineChart data={activityData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="actions"
                      stroke="var(--color-actions)"
                      strokeWidth={2.5}
                      dot={false}
                      hide={!seriesVisibility.actions}
                    />
                  </LineChart>
                </ChartContainer>

                <div className="grid gap-4 border-t pt-4 mt-4 sm:grid-cols-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-brand-primary">{totalActions}</p>
                    <p className="text-xs text-brand-text-muted mt-1">Total Actions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{policyActions}</p>
                    <p className="text-xs text-brand-text-muted mt-1">Policy Changes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-600">{deviceActions}</p>
                    <p className="text-xs text-brand-text-muted mt-1">Device Actions</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="size-12 text-brand-text-muted/40 mb-3" />
                <p className="text-sm font-medium text-brand-text-heading">No activity yet</p>
                <p className="text-xs text-brand-text-muted mt-1">
                  Start using the platform to see your activity here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup progress - REAL tasks from actual data */}
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Setup Progress
            </CardTitle>
            <CardDescription>
              Complete these tasks to fully secure your network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-text-muted">Overall Progress</p>
                <span className="text-sm font-semibold text-brand-primary">
                  {setupProgress.percentage}%
                </span>
              </div>
              <Progress
                value={setupProgress.percentage}
                className="h-2 bg-brand-primary/10 [&_[data-slot=progress-indicator]]:bg-brand-primary"
              />
            </div>

            <div className="space-y-2">
              {setupProgress.tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                    task.completed
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-border/60 bg-brand-surface"
                  )}
                >
                  {task.completed ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  ) : (
                    <div className="size-5 shrink-0 rounded-full border-2 border-brand-text-muted/30" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      task.completed
                        ? "font-medium text-emerald-700"
                        : "text-brand-text-heading"
                    )}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
            </div>

            {dashboardStats?.insights && (dashboardStats.insights.totalPolicies > 0 || dashboardStats.insights.totalDevices > 0) && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-xs font-semibold text-brand-text-muted uppercase tracking-wide">
                  Your Stats
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-brand-text-muted">Total Policies</p>
                    <p className="text-2xl font-bold text-brand-text-heading mt-1">
                      {dashboardStats.insights.totalPolicies}
                    </p>
                  </div>
                  <div className="rounded-lg bg-violet-50 p-3">
                    <p className="text-xs text-brand-text-muted">Total Devices</p>
                    <p className="text-2xl font-bold text-brand-text-heading mt-1">
                      {dashboardStats.insights.totalDevices}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Devices, Policies and Account - REAL DATA */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Connected devices - REAL */}
        <Card className={cardClassName}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Connected Devices
              </CardTitle>
              <Link href="/devices">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  View All
                  <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              {activeDevices} of {devices.length} devices active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.length > 0 ? (
              <>
                {devices.slice(0, 3).map((device) => {
                  const Icon = getDeviceIcon(device.platform)
                  const isActive = device.status === "active"
                  
                  return (
                    <div
                      key={device.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-3 hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "flex size-10 items-center justify-center rounded-lg",
                          isActive ? "bg-emerald-100" : "bg-muted"
                        )}>
                          <Icon className={cn(
                            "size-5",
                            isActive ? "text-emerald-600" : "text-brand-text-muted"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-brand-text-heading truncate">
                            {device.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                            {isActive ? (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 border-0">
                                <Wifi className="size-2.5 mr-0.5" />
                                Online
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-600 border-0">
                                <WifiOff className="size-2.5 mr-0.5" />
                                Offline
                              </Badge>
                            )}
                            <span>{device.platform}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-brand-text-muted flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatLastSeen(device.lastSeenMinutes)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                
                {devices.length > 3 && (
                  <Link href="/devices">
                    <Button variant="outline" className="w-full mt-2" size="sm">
                      View {devices.length - 3} More
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Smartphone className="size-12 text-brand-text-muted/40 mb-3" />
                <p className="text-sm font-medium text-brand-text-heading">No devices connected</p>
                <p className="text-xs text-brand-text-muted mt-1 mb-4">
                  Add your first device to start protecting your network
                </p>
                <Link href="/devices/setup">
                  <Button size="sm">
                    <Plus className="size-3 mr-1" />
                    Add Device
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policy distribution - REAL */}
        <Card className={cardClassName}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Policy Types
              </CardTitle>
              <Link href="/content-policies">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  View All
                  <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              {activePolicies} active protection rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {policyTypeData.length > 0 ? (
              <>
                <ChartContainer
                  config={{
                    block: { label: "Block", color: "#ef4444" },
                    allow: { label: "Allow", color: "#10b981" },
                    safesearch: { label: "SafeSearch", color: "#14b8a6" },
                    ytrestricted: { label: "YT Restricted", color: "#f59e0b" },
                  }}
                  className="aspect-square w-full max-h-[160px] mx-auto"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={policyTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                    >
                      {policyTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="space-y-2">
                  {policyTypeData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-sm text-brand-text-muted">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="size-12 text-brand-text-muted/40 mb-3" />
                <p className="text-sm font-medium text-brand-text-heading">No policies yet</p>
                <p className="text-xs text-brand-text-muted mt-1 mb-4">
                  Create your first policy to start protecting your network
                </p>
                <Link href="/content-policies/new-policy">
                  <Button size="sm" variant="outline">
                    Create Policy
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account & billing summary - REAL */}
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Account Overview
            </CardTitle>
            <CardDescription>
              Subscription and usage summary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 p-4 border border-brand-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-brand-text-muted">Current Plan</p>
                  <p className="text-xl font-bold text-brand-text-heading mt-1">
                    {billingDetails?.planName || "Free Trial"}
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-full bg-brand-primary/10">
                  <Zap className="size-6 text-brand-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-text-muted">Status</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0">
                  {billingDetails?.hasAccess ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-brand-text-muted" />
                  <span className="text-sm text-brand-text-muted">Device Usage</span>
                </div>
                <span className="text-sm font-semibold">
                  {billingDetails?.enrolledDeviceCount || activeDevices} / {billingDetails?.deviceLimit || 1}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-brand-text-muted" />
                  <span className="text-sm text-brand-text-muted">Active Policies</span>
                </div>
                <span className="text-sm font-semibold">{activePolicies}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-brand-text-muted" />
                  <span className="text-sm text-brand-text-muted">Protection Level</span>
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "border-0",
                    protectionScore === 100 ? "bg-emerald-100 text-emerald-700" :
                    protectionScore > 0 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}
                >
                  {protectionScore}%
                </Badge>
              </div>

              {billingDetails?.paymentMethod && (
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-brand-text-muted" />
                    <span className="text-sm text-brand-text-muted">Payment Method</span>
                  </div>
                  <span className="text-sm font-semibold">
                    •••• {billingDetails.paymentMethod.last4}
                  </span>
                </div>
              )}
            </div>

            <Link href="/billing">
              <Button variant="outline" className="w-full mt-4">
                Manage Subscription
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Platform breakdown - REAL device distribution */}
      {devices.length > 0 && (
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Platform Breakdown
            </CardTitle>
            <CardDescription>
              Devices by operating system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {androidDevices > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-emerald-600" />
                      <span className="text-sm font-medium">Android</span>
                    </div>
                    <span className="text-sm font-semibold">{androidDevices}</span>
                  </div>
                  <Progress 
                    value={(androidDevices / devices.length) * 100} 
                    className="h-2 bg-gray-200 [&_[data-slot=progress-indicator]]:bg-emerald-500"
                  />
                </div>
              )}

              {iphoneDevices > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-blue-600" />
                      <span className="text-sm font-medium">iPhone</span>
                    </div>
                    <span className="text-sm font-semibold">{iphoneDevices}</span>
                  </div>
                  <Progress 
                    value={(iphoneDevices / devices.length) * 100} 
                    className="h-2 bg-gray-200 [&_[data-slot=progress-indicator]]:bg-blue-500"
                  />
                </div>
              )}

              {devices.length - androidDevices - iphoneDevices > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone className="size-4 text-violet-600" />
                      <span className="text-sm font-medium">Other</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {devices.length - androidDevices - iphoneDevices}
                    </span>
                  </div>
                  <Progress 
                    value={((devices.length - androidDevices - iphoneDevices) / devices.length) * 100} 
                    className="h-2 bg-gray-200 [&_[data-slot=progress-indicator]]:bg-violet-500"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Blocked Activity - Shows latest audit log entries */}
      {dashboardStats && dashboardStats.recentActivity.recentDetails && dashboardStats.recentActivity.recentDetails.length > 0 && (
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-xs font-semibold tracking-widest text-brand-text-muted uppercase">
              Recent Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase">Timestamp</TableHead>
                    <TableHead className="text-xs uppercase">Action</TableHead>
                    <TableHead className="text-xs uppercase">Resource Type</TableHead>
                    <TableHead className="text-xs uppercase">Resource Name</TableHead>
                    <TableHead className="text-xs uppercase">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardStats.recentActivity.recentDetails.map((row, idx) => {
                    // Determine badge color based on action
                    const getBadgeClass = (action: string) => {
                      if (action.includes('create')) return 'bg-emerald-100 text-emerald-800'
                      if (action.includes('update')) return 'bg-blue-100 text-blue-800'
                      if (action.includes('delete')) return 'bg-red-100 text-red-800'
                      if (action.includes('revoke')) return 'bg-amber-100 text-amber-800'
                      return 'bg-violet-100 text-violet-800'
                    }

                    const getResourceIcon = (type: string) => {
                      if (type.includes('policy')) return Shield
                      if (type.includes('device')) return Smartphone
                      return Activity
                    }

                    const ResourceIcon = getResourceIcon(row.resourceType)

                    return (
                      <TableRow key={`${row.timestamp}-${idx}`}>
                        <TableCell className="font-mono text-xs">{row.time}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-lg border-0 font-medium capitalize",
                              getBadgeClass(row.action)
                            )}
                          >
                            {row.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <ResourceIcon className="size-3.5 text-brand-text-muted" />
                            {row.resourceType.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-brand-text-muted max-w-[200px] truncate">
                          {row.resourceName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="rounded-lg border-0 font-medium capitalize bg-gray-100 text-gray-800"
                          >
                            {row.category.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
