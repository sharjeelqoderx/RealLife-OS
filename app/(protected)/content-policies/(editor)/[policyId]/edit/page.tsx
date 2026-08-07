import Link from "next/link"

import { PolicyDetail } from "@/app/(protected)/content-policies/(editor)/_components/policy-detail"
import { Button } from "@/components/ui/button"
import { getGatewayPolicyForEditor } from "@/lib/services/content-policies/gateway-policies"

type PageProps = {
  params: Promise<{ policyId: string }>
}

export default async function PolicyEditPage({ params }: PageProps) {
  const { policyId } = await params

  let initialData = null
  try {
    initialData = await getGatewayPolicyForEditor(policyId)
  } catch (error) {
    console.error("Failed to load policy for edit:", error)
  }

  if (!initialData) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 text-center">
        <div>
          <p className="text-base font-semibold text-brand-text-heading">
            Policy not found
          </p>
          <p className="mt-2 text-sm text-brand-text-muted">
            This policy may have been deleted or is unavailable for editing.
          </p>
        </div>
        <Button variant="brandOutline" asChild>
          <Link href="/content-policies">Back to policies</Link>
        </Button>
      </div>
    )
  }

  return (
    <PolicyDetail
      key={initialData.id}
      mode="edit"
      policyId={policyId}
      initialData={initialData}
    />
  )
}
