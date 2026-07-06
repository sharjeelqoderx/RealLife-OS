import Image from "next/image"
import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-linear-to-br from-brand-background-gradient-start via-brand-background to-brand-background-gradient-end">
      <header className="flex justify-center px-4 pt-10 pb-10">
        <Image
          src="/logo.png"
          alt="RealLife OS — Control Your Media, Own Your Life"
          width={1224}
          height={296}
          priority
          className="h-auto w-full max-w-[310px] object-contain"
        />
      </header>

      <main className="px-4 pb-10 mt-20">
        <div className="mx-auto w-full max-w-lg">{children}</div>
      </main>
    </div>
  )
}
