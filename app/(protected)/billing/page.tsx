import { BillingContent } from "@/app/(protected)/billing/_components/billing-content"
import { getBillingDetails } from "@/lib/services/billing/details"
import { createClient } from "@/lib/supabase/server"

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const emptyBilling = {
    hasAccess: false,
    status: "none",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    planId: undefined,
    planName: "Free Trial",
    deviceLimit: 0,
    enrolledDeviceCount: 0,
    remainingDeviceSlots: 0,
    canAddDevice: false,
    paymentMethod: null,
    canManagePayment: false,
    needsPaymentMethod: false,
  }

  const initialData = user
    ? await getBillingDetails(user.id).catch(() => emptyBilling)
    : emptyBilling

  return <BillingContent initialData={initialData} />
}
