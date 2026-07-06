import { ChangePasswordForm } from "./_components/change-password-form"
import { getResetTokenFromSearchParam } from "@/lib/auth/reset-token"

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>
}) {
  const params = await searchParams
  const resetId = getResetTokenFromSearchParam(params.id)

  return <ChangePasswordForm resetId={resetId} />
}
