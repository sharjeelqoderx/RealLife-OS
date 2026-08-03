import { DashboardContent } from "@/app/(protected)/dashboard/_components/dashboard-content"
import { createClient } from "@/lib/supabase/server"

function getDisplayName(
  fullName: unknown,
  email: string | undefined
): string {
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim().split(/\s+/)[0] ?? "Alex"
  }

  if (email) {
    const localPart = email.split("@")[0]
    if (localPart) {
      return localPart.charAt(0).toUpperCase() + localPart.slice(1)
    }
  }

  return "Alex"
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userName = getDisplayName(user?.user_metadata?.full_name, user?.email)

  return <DashboardContent userName={userName} />
}
