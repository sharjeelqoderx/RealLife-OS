export type PaidBillingPlanId = "focus" | "family"

export type BillingPlanId = "free_trial" | PaidBillingPlanId | "enterprise"

export type BillingPlanKind = "trial" | "paid" | "custom"

interface BillingPlanBase {
  id: BillingPlanId
  tier: string
  features: string[]
  cta: string
  highlighted: boolean
}

/** Self-serve tiers always carry a positive device cap in config. */
export type SelfServeBillingPlan = BillingPlanBase & {
  id: "free_trial" | PaidBillingPlanId
  kind: "trial" | "paid"
  price: "free" | number
  deviceLimit: number
}

/** Enterprise: device cap is per-account (`user_subscriptions.device_limit`), not catalog. */
export type EnterpriseBillingPlan = BillingPlanBase & {
  id: "enterprise"
  kind: "custom"
  price: "custom"
}

export type BillingPlan = SelfServeBillingPlan | EnterpriseBillingPlan

/** Self-serve + enterprise catalog. Same source for marketing + paywall. */
export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "free_trial",
    tier: "Free Trial",
    price: "free",
    deviceLimit: 1,
    features: [
      "1 Device",
      "7-day free trial",
      "Basic DNS Filtering",
      "Ad Blocking",
    ],
    cta: "Start Trial",
    highlighted: false,
    kind: "trial",
  },
  {
    id: "focus",
    tier: "Focus",
    price: 9,
    deviceLimit: 5,
    features: [
      "5 Devices",
      "Willpower Analytics",
      "Custom Block Lists",
      "Scheduling & Timers",
    ],
    cta: "Get Focus",
    highlighted: true,
    kind: "paid",
  },
  {
    id: "family",
    tier: "Family",
    price: 19,
    deviceLimit: 20,
    features: [
      "20 Devices",
      "Parental Control Dashboard",
      "Priority Support",
      "Per-device policies",
    ],
    cta: "Get Family",
    highlighted: false,
    kind: "paid",
  },
  {
    id: "enterprise",
    tier: "Enterprise",
    price: "custom",
    features: [
      "Custom device count",
      "Dedicated support",
      "Custom SLA & onboarding",
      "Per-device policies & analytics",
    ],
    cta: "Contact Sales",
    highlighted: false,
    kind: "custom",
  },
]

export const PAID_BILLING_PLAN_IDS: PaidBillingPlanId[] = ["focus", "family"]

export const FREE_TRIAL_DAYS = 7

/** Stored `stripe_price_id` value while on the card-required free trial. */
export const FREE_TRIAL_PRICE_ID = "free_trial"

/** Legacy trial id still present in older subscription rows. */
const LEGACY_FREE_TRIAL_PRICE_IDS = new Set([
  FREE_TRIAL_PRICE_ID,
  "personal_trial",
  "personal",
])

export const ENTERPRISE_CONTACT_HREF = "mailto:sales@reallifeos.com"

export function getBillingPlan(planId: BillingPlanId): BillingPlan {
  const plan = BILLING_PLANS.find((entry) => entry.id === planId)
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`)
  }
  return plan
}

export function isPaidBillingPlanId(planId: string): planId is PaidBillingPlanId {
  return PAID_BILLING_PLAN_IDS.includes(planId as PaidBillingPlanId)
}

export function isSelfServeBillingPlan(
  plan: BillingPlan
): plan is SelfServeBillingPlan {
  return plan.kind === "trial" || plan.kind === "paid"
}

/** Positive device cap for self-serve plan ids. Throws for Enterprise. */
export function getSelfServePlanDeviceLimit(
  planId: Exclude<BillingPlanId, "enterprise">
): number {
  const plan = getBillingPlan(planId)
  if (!isSelfServeBillingPlan(plan)) {
    throw new Error(`Plan ${planId} has no fixed catalog device limit`)
  }
  return plan.deviceLimit
}

/**
 * Catalog device cap for a stored plan / legacy id.
 * Returns `undefined` when the tier is Enterprise/custom (use account override).
 */
export function getDeviceLimitFromPlanId(
  storedPlanOrPriceId: string | undefined
): number | undefined {
  if (!storedPlanOrPriceId || LEGACY_FREE_TRIAL_PRICE_IDS.has(storedPlanOrPriceId)) {
    return getSelfServePlanDeviceLimit("free_trial")
  }

  if (isPaidBillingPlanId(storedPlanOrPriceId)) {
    return getSelfServePlanDeviceLimit(storedPlanOrPriceId)
  }

  if (storedPlanOrPriceId === "enterprise") {
    return undefined
  }

  if (
    storedPlanOrPriceId === "willpower_pro" ||
    storedPlanOrPriceId === "personal"
  ) {
    return getSelfServePlanDeviceLimit("focus")
  }

  if (storedPlanOrPriceId === "family_pack") {
    return getSelfServePlanDeviceLimit("family")
  }

  return undefined
}

/** Display name for a stored plan / Stripe price id. */
export function getPlanDisplayName(planId: string | undefined): string {
  if (!planId || LEGACY_FREE_TRIAL_PRICE_IDS.has(planId)) {
    return "Free Trial"
  }

  if (planId === "willpower_pro") return "Focus"
  if (planId === "family_pack") return "Family"

  const plan = BILLING_PLANS.find((entry) => entry.id === planId)
  return plan?.tier ?? "Subscription"
}
