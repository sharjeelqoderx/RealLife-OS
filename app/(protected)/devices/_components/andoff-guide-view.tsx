"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ANDOFF_GUIDE_SECTIONS = [
  {
    id: "backup",
    step: "Step 1: Backup your Device",
    tag: "BEFORE GETTING STARTED",
    title: "Backup your Smartphone",
    description:
      "Before applying supervision settings, create a full backup of your iPhone.",
    href: "https://support.apple.com/guide/iphone/back-up-iphone-iph3ecf67d29/ios",
  },
  {
    id: "connect",
    step: "Step 2: Connect Smartphone to Andoff",
    tag: "ANDOFF",
    title: "Configuring Andoff and Restoring Files",
    description:
      "Install Andoff on a Mac or PC and follow the guided setup to enable supervised mode.",
    href: "#",
  },
  {
    id: "settings",
    step: "Step 3: Apply Recommended Settings",
    tag: "ANDOFF",
    title: "Recommended Andoff Settings",
    description:
      "Apply the recommended restrictions to prevent bypass and keep Cloudflare One enforced.",
    href: "#",
  },
] as const

export function AndoffGuideView() {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-8 lg:flex-row lg:gap-12">
      <div className="min-w-0 flex-1">
        <Button variant="ghost" size="sm" asChild className="-ms-2 mb-4">
          <Link href="/devices/setup?platform=iphone">
            <ArrowLeft aria-hidden className="size-4" />
            Back to device setup
          </Link>
        </Button>

        <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
          Get Started with Andoff
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
          Andoff helps you enable supervised mode on iOS devices so content policies
          stay enforced.
        </p>

        <div className="mt-10 space-y-10">
          {ANDOFF_GUIDE_SECTIONS.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-lg font-bold text-brand-text-heading">
                {section.step}
              </h2>
              <GuideCard
                tag={section.tag}
                title={section.title}
                description={section.description}
                href={section.href}
                className="mt-4"
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

interface GuideCardProps {
  tag: string
  title: string
  description: string
  href: string
  external?: boolean
  className?: string
}

function GuideCard({
  tag,
  title,
  description,
  href,
  external = true,
  className,
}: GuideCardProps) {
  const content = (
    <>
      <p className="text-xs font-bold tracking-wide text-brand-primary uppercase">
        {tag}
      </p>
      <p className="mt-2 text-base font-semibold text-brand-text-heading">{title}</p>
      <p className="mt-1 text-sm text-brand-text-muted">{description}</p>
      <ExternalLink
        aria-hidden
        className="absolute top-4 right-4 size-4 text-brand-text-muted"
      />
    </>
  )

  const classNames = cn(
    "relative block rounded-xl border border-border bg-white p-5 transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/5",
    className
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classNames}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={classNames}>
      {content}
    </Link>
  )
}
