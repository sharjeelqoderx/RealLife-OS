import { CustomSpinner } from "@/components/feedback/custom-spinner"

export default function BlockedLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-background">
      <CustomSpinner />
    </div>
  )
}
