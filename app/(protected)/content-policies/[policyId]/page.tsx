import { PolicyDetail } from "@/app/(protected)/content-policies/[policyId]/_components/policy-detail"

type PageProps = {
  params: Promise<{ policyId: string }>
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const { policyId } = await params
  return <PolicyDetail policyId={policyId} />
}
