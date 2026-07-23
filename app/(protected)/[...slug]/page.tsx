import { UnderDevelopment } from "@/components/feedback/under-development"
import {
  getProtectedPageTitle,
  pathnameFromSlug,
} from "@/lib/navigation/ready-routes"

interface UnderDevelopmentCatchAllPageProps {
  params: Promise<{ slug: string[] }>
}

export default async function UnderDevelopmentCatchAllPage({
  params,
}: UnderDevelopmentCatchAllPageProps) {
  const { slug } = await params
  const pathname = pathnameFromSlug(slug)
  const title = getProtectedPageTitle(pathname)

  return <UnderDevelopment title={title} />
}
