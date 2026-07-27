import { PolicyDetail } from "@/app/(protected)/content-policies/(editor)/_components/policy-detail"

type PageProps = {
  params: Promise<{ policyId: string }>
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const { policyId } = await params
  return <PolicyDetail mode="edit" policyId={policyId} />
}
