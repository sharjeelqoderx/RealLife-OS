import type { ReactNode } from "react"
import { Suspense } from "react"

import { PaywallGate } from "@/components/billing/paywall-gate"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getBillingStatusForUser } from "@/lib/services/billing/subscriptions"
import { createClient } from "@/lib/supabase/server"
import type { BillingStatusResponse } from "@/schemas/billing/checkout"

const fallbackBillingStatus: BillingStatusResponse = {
  hasAccess: false,
  status: "none",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  planId: null,
}

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let billingStatus = fallbackBillingStatus

  if (user) {
    try {
      billingStatus = await getBillingStatusForUser(user.id)
    } catch (error) {
      console.error(
        "[protected layout] billing status failed:",
        error instanceof Error ? error.message : error
      )
    }
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
