import Image from "next/image"
import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-linear-to-br from-brand-background-gradient-start via-brand-background to-brand-background-gradient-end">
      <header className="flex shrink-0 justify-center px-4 pt-10 pb-6">
        <Image
          src="/logo.png"
          alt="RealLife OS — Control Your Media, Own Your Life"
          width={1224}
          height={296}
          priority
          className="h-auto w-full max-w-[310px] object-contain"
        />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  )
}
