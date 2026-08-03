import type { ReactNode } from "react"

export default function ContentPolicyEditorLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col">{children}</div>
  )
}
