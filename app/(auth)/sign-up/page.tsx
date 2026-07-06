import { SignUpForm } from "./_components/sign-up-form"
import { getEmailFromSearchParam } from "@/lib/auth/email-search-param"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  const params = await searchParams
  const defaultEmail = getEmailFromSearchParam(params.email)

  return <SignUpForm defaultEmail={defaultEmail} />
}
