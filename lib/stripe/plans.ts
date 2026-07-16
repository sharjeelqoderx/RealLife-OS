export type BillingPlanId = "basic_monthly"

export interface BillingPlan {
  id: BillingPlanId
  name: string
  description: string
  priceLabel: string
  features: string[]
  highlighted: boolean
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "basic_monthly",
    name: "Willpower Pro",
    description: "Full protection for your devices and focus.",
    priceLabel: "$9/mo",
    features: [
      "10 Devices",
      "Willpower Analytics",
      "Custom Block Lists",
      "Scheduling & Timers",
    ],
    highlighted: true,
  },
]

export function getPlanById(planId: BillingPlanId): BillingPlan {
  const plan = BILLING_PLANS.find((entry) => entry.id === planId)
  if (!plan) {
    throw new Error(`Unknown billing plan: ${planId}`)
  }
  return plan
}
