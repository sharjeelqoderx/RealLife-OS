import { BillingContent } from "@/app/(protected)/billing/_components/billing-content"
import { getBillingDetails } from "@/lib/services/billing/details"
import { createClient } from "@/lib/supabase/server"

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const initialData = user
    ? await getBillingDetails(user.id).catch(() => ({
        hasAccess: false,
        status: "none",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        planId: null,
        planName: "Personal",
        paymentMethod: null,
        canManagePayment: false,
        needsPaymentMethod: false,
      }))
    : {
        hasAccess: false,
        status: "none",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        planId: null,
        planName: "Personal",
        paymentMethod: null,
        canManagePayment: false,
        needsPaymentMethod: false,
      }

  return <BillingContent initialData={initialData} />
}
