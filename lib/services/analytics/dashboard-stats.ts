import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Dashboard statistics from real database data
 */
export async function getDashboardStats(userId: string) {
  const admin = createAdminClient()

  // Get recent audit log entries for this user (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: auditEntries, error: auditError } = await admin
    .from("audit_log")
    .select("action, resource_type, resource_id, created_at, metadata")
    .eq("user_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000)

  if (auditError) {
    console.warn("Failed to fetch audit log:", auditError)
  }

  const entries = auditEntries || []

  // Count different action types
  const policyActions = entries.filter(
    (e) => e.resource_type === "gateway_policy" || e.resource_type === "access_policy"
  ).length

  const deviceActions = entries.filter(
    (e) => e.resource_type === "device" || e.resource_type === "device_enrollment"
  ).length

  // Generate hourly activity for last 24 hours from audit log
  const now = new Date()
  const hourlyActivity: Record<string, { actions: number; hour: string }> = {}

  // Initialize all 24 hours
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hourKey = hour.getHours().toString().padStart(2, "0") + ":00"
    hourlyActivity[hourKey] = { actions: 0, hour: hourKey }
  }

  // Count actions per hour
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  entries
    .filter((e) => new Date(e.created_at) >= oneDayAgo)
    .forEach((entry) => {
      const entryDate = new Date(entry.created_at)
      const hourKey = entryDate.getHours().toString().padStart(2, "0") + ":00"
      if (hourlyActivity[hourKey]) {
        hourlyActivity[hourKey].actions++
      }
    })

  const activityTimeline = Object.values(hourlyActivity)

  // Get REAL counts from actual database tables (lifetime, not just audit log)
  // Gateway policies total count
  const { count: totalPolicies } = await admin
    .from("tenant_gateway_policies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  // Connected devices total count
  const { count: totalDevices } = await admin
    .from("tenant_device_metadata")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  // Get recent activity details for the activity table (last 10 entries)
  const recentActivityDetails = entries.slice(0, 10).map((entry) => {
    const timestamp = new Date(entry.created_at)
    const timeStr = timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    })

    // Extract meaningful info from metadata
    let description = entry.action
    let category = entry.resource_type
    let resourceName = entry.resource_id || "Unknown"

    // Try to get more details from metadata
    if (entry.metadata) {
      const meta = entry.metadata as Record<string, any>
      if (meta.name) resourceName = meta.name
      if (meta.policy_name) resourceName = meta.policy_name
      if (meta.device_name) resourceName = meta.device_name
      if (meta.type) category = meta.type
    }

    return {
      time: timeStr,
      action: entry.action,
      resourceType: entry.resource_type,
      resourceName,
      category,
      timestamp: entry.created_at,
    }
  })

  return {
    recentActivity: {
      totalActions: entries.length,
      policyActions,
      deviceActions,
      activityTimeline,
      recentDetails: recentActivityDetails,
    },
    insights: {
      // Use REAL counts instead of audit log counts
      totalPolicies: totalPolicies || 0,
      totalDevices: totalDevices || 0,
      lastActivityAt: entries[0]?.created_at || null,
    },
  }
}

/**
 * Get setup completion status based on actual data
 */
export function getSetupProgress(data: {
  devicesCount: number
  policiesCount: number
  hasPaymentMethod: boolean
}): {
  completed: number
  total: number
  percentage: number
  tasks: Array<{ id: string; title: string; completed: boolean }>
} {
  const tasks = [
    {
      id: "device",
      title: "Add your first device",
      completed: data.devicesCount > 0,
    },
    {
      id: "policy",
      title: "Create a content policy",
      completed: data.policiesCount > 0,
    },
    {
      id: "multiple-devices",
      title: "Connect multiple devices",
      completed: data.devicesCount >= 2,
    },
    {
      id: "payment",
      title: "Add payment method",
      completed: data.hasPaymentMethod,
    },
    {
      id: "active-protection",
      title: "Activate policy protection",
      completed: data.devicesCount > 0 && data.policiesCount > 0,
    },
  ]

  const completed = tasks.filter((t) => t.completed).length
  const total = tasks.length
  const percentage = Math.round((completed / total) * 100)

  return { completed, total, percentage, tasks }
}
