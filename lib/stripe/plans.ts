export type BillingPlanId = "personal" | "willpower_pro" | "family_pack"

export type BillingPlanKind = "trial" | "paid"

export interface BillingPlan {
  id: BillingPlanId
  tier: string
  price: "free" | number
  features: string[]
  cta: string
  highlighted: boolean
  kind: BillingPlanKind
}

/** Same tiers as the marketing Pricing section. */
export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "personal",
    tier: "Personal",
    price: "free",
    features: ["1 Device", "Basic DNS Filtering", "Ad Blocking"],
    cta: "Start Trial",
    highlighted: false,
    kind: "trial",
  },
  {
    id: "willpower_pro",
    tier: "Willpower Pro",
    price: 9,
    features: [
      "10 Devices",
      "Willpower Analytics",
      "Custom Block Lists",
      "Scheduling & Timers",
    ],
    cta: "Get Pro",
    highlighted: true,
    kind: "paid",
  },
  {
    id: "family_pack",
    tier: "Family Pack",
    price: 19,
    features: [
      "Unlimited Devices",
      "Parental Control Dashboard",
      "5 Users",
      "Priority Support",
    ],
    cta: "Get Family",
    highlighted: false,
    kind: "paid",
  },
]

export const FREE_TRIAL_DAYS = 7

export function getBillingPlan(planId: BillingPlanId): BillingPlan {
  const plan = BILLING_PLANS.find((entry) => entry.id === planId)
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`)
  }
  return plan
}

/** Map stored plan id (e.g. `personal_trial`) to a display name. */
export function getPlanDisplayName(planId: string | null): string {
  if (!planId || planId === "personal_trial") {
    return "Personal"
  }

  const plan = BILLING_PLANS.find((entry) => entry.id === planId)
  return plan?.tier ?? "Subscription"
}
