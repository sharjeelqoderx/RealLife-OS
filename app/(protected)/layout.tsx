import type { ReactNode } from "react"
import { Suspense } from "react"
import { PaywallGate } from "@/components/billing/paywall-gate"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getBillingStatus } from "@/lib/services/billing/subscriptions"
import { createClient } from "@/lib/supabase/server"

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const billingStatus = user
    ? await getBillingStatus(user.id).catch(() => ({
        hasAccess: false,
        status: "none",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        planId: null,
      }))
    : {
        hasAccess: false,
        status: "none",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        planId: null,
      }

  return (
    <DashboardShell>
      <Suspense fallback={null}>
        <PaywallGate initialBillingStatus={billingStatus} />
      </Suspense>
      {children}
    </DashboardShell>
  )
}
