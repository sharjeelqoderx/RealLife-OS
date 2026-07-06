import { LogoutButton } from "./_components/logout-button"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-background px-6 py-10">
      <main className="mx-auto w-full max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-text-heading">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-brand-text-muted">
              Welcome to RealLife OS.
            </p>
          </div>
          <LogoutButton />
        </div>
      </main>
    </div>
  )
}
