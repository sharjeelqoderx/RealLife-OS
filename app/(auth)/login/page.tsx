import { LoginForm } from "./_components/login-form"
import { getAuthConfirmErrorMessage } from "@/lib/auth/confirmation-errors"
import { getEmailFromSearchParam } from "@/lib/auth/email-search-param"

function getErrorFromSearchParam(
  error: string | string[] | undefined
): string | undefined {
  if (typeof error === "string") {
    return getAuthConfirmErrorMessage(error) ?? undefined
  }

  if (Array.isArray(error) && error[0]) {
    return getAuthConfirmErrorMessage(error[0]) ?? undefined
  }

  return undefined
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[]
    error?: string | string[]
  }>
}) {
  const params = await searchParams
  const defaultEmail = getEmailFromSearchParam(params.email)
  const authError = getErrorFromSearchParam(params.error)

  return <LoginForm defaultEmail={defaultEmail} authError={authError} />
}
