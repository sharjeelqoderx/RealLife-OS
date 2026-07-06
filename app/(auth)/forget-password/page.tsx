import { ForgetPasswordForm } from "./_components/forget-password-form"
import { getEmailFromSearchParam } from "@/lib/auth/email-search-param"

export default async function ForgetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  const params = await searchParams
  const defaultEmail = getEmailFromSearchParam(params.email)

  return <ForgetPasswordForm defaultEmail={defaultEmail} />
}
