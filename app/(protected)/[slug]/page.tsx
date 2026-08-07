import { UnderDevelopment } from "@/app/(protected)/[slug]/_components/under-development"

type PageProps = {
  params: Promise<{ slug: string }>
}

/**
 * Catch-all for unknown single-segment protected routes
 * (e.g. /devices, /settings) — shows under-development UI.
 * Known routes (dashboard, billing, content-policies) take precedence.
 */
export default async function UnknownProtectedRoutePage({ params }: PageProps) {
  const { slug } = await params
  return <UnderDevelopment segments={[slug]} />
}
