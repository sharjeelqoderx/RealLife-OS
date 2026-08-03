import {
  PolicyView,
  PolicyViewNotFound,
} from "@/app/(protected)/content-policies/(editor)/_components/policy-view"
import { getDnsProfileSource } from "@/lib/services/content-policies/dns-profile"
import { getGatewayPolicyById } from "@/lib/services/content-policies/gateway-policies"
import { createClient } from "@/lib/supabase/server"

type PageProps = {
  params: Promise<{ policyId: string }>
}

export default async function PolicyViewPage({ params }: PageProps) {
  const { policyId } = await params

  let policy = null
  try {
    policy = await getGatewayPolicyById(policyId)
  } catch (error) {
    console.error("Failed to load policy view:", error)
  }

  if (!policy) {
    return <PolicyViewNotFound policyId={policyId} />
  }

  let dnsProfileAvailable = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const source = await getDnsProfileSource(user.id)
      dnsProfileAvailable = source.available
    }
  } catch (error) {
    console.warn("Failed to resolve DNS profile availability:", error)
  }

  return (
    <PolicyView policy={policy} dnsProfileAvailable={dnsProfileAvailable} />
  )
}
