import { getStripePriceBasicMonthly } from "@/lib/env"
import type { BillingPlanId } from "@/lib/stripe/plans"

export function getPlanPriceId(planId: BillingPlanId): string {
  switch (planId) {
    case "basic_monthly":
      return getStripePriceBasicMonthly()
    default: {
      const _exhaustive: never = planId
      return _exhaustive
    }
  }
}
