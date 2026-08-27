import { DashboardContent } from "@/app/(protected)/dashboard/_components/dashboard-content"
import { getDashboardStats, getSetupProgress } from "@/lib/services/analytics/dashboard-stats"
import { getBillingDetails } from "@/lib/services/billing/details"
import { listGatewayPolicies } from "@/lib/services/content-policies/gateway-policies"
import { listConnectedDevices } from "@/lib/services/devices/list-connected-devices"
import { createClient } from "@/lib/supabase/server"
import type { PolicyListResponse } from "@/schemas/content-policies/policy"
import type { ConnectedDevice } from "@/schemas/devices/device"

function getDisplayName(
  fullName: unknown,
  email: string | undefined
): string {
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim().split(/\s+/)[0] ?? "there"
  }

  if (email) {
    const localPart = email.split("@")[0]
    if (localPart) {
      return localPart.charAt(0).toUpperCase() + localPart.slice(1)
    }
  }

  return "there"
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const userName = getDisplayName(user.user_metadata?.full_name, user.email)

  let devices: ConnectedDevice[] = []
  let policies: PolicyListResponse = []
  let billingDetails: Awaited<ReturnType<typeof getBillingDetails>> | null = null
  let dashboardStats: Awaited<ReturnType<typeof getDashboardStats>> | null = null

  try {
    devices = await listConnectedDevices()
  } catch (error) {
    console.error("Failed to fetch devices:", error)
  }

  try {
    policies = await listGatewayPolicies()
  } catch (error) {
    console.error("Failed to fetch policies:", error)
  }

  try {
    billingDetails = await getBillingDetails(user.id)
  } catch (error) {
    console.error("Failed to fetch billing details:", error)
  }

  try {
    dashboardStats = await getDashboardStats(user.id)
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error)
  }

  const setupProgress = getSetupProgress({
    devicesCount: devices.length,
    policiesCount: policies.length,
    hasPaymentMethod: Boolean(billingDetails?.paymentMethod),
  })

  return (
    <DashboardContent
      userName={userName}
      devices={devices}
      policies={policies}
      billingDetails={billingDetails}
      dashboardStats={dashboardStats}
      setupProgress={setupProgress}
    />
  )
}
