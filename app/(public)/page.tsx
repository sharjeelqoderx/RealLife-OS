import Link from "next/link";
import {
  Ban,
  BarChart3,
  Check,
  Download,
  Globe,
  Lock,
  Menu,
  Play,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import Image from "next/image";

import { BILLING_PLANS } from "@/lib/stripe/plans";

const pageMaxWidthClass = "mx-auto w-full max-w-7xl";
const pagePaddingClass = "px-4 sm:px-6 lg:px-8";
const pageContainerClass = `${pageMaxWidthClass} ${pagePaddingClass}`;

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#features", label: "Solutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
] as const;

function NavLogo() {
  return (
    <Image
      src="/logo.png"
      alt="RealLife OS — Control Your Media, Own Your Life"
      width={1224}
      height={296}
      priority
      className="h-auto max-h-8 w-auto max-w-[140px] object-contain object-left sm:max-h-10 sm:max-w-[200px] md:max-w-[220px]"
    />
  );
}

function FooterLogo() {
  return (
    <Image
      src="/logo-light.png"
      alt="RealLife OS — Control Your Media, Own Your Life"
      width={1224}
      height={296}
      className="h-auto max-h-8 w-auto max-w-[160px] object-contain object-left sm:max-h-10 sm:max-w-[200px]"
    />
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-slate-600">
      <Check className="mt-0.5 size-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
      <span>{children}</span>
    </li>
  );
}

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="size-4 fill-emerald-400 text-emerald-400"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const glowSizeClass = "h-[clamp(9rem,42vw,22rem)] w-[clamp(9rem,42vw,22rem)]";
const glowBlurClass = "blur-[clamp(2rem,6vw,4rem)]";

function SectionGlow({
  side = "right",
  tone = "light",
  align = "bottom",
}: {
  side?: "left" | "right" | "center";
  tone?: "light" | "dark";
  align?: "bottom" | "top";
}) {
  const glowClass =
    tone === "dark"
      ? "bg-gradient-to-br from-cyan-400/10 via-cyan-400/10 to-brand-primary/15"
      : "bg-gradient-to-br from-cyan-400/25 via-cyan-300/20 to-brand-primary/10";

  const horizontal =
    side === "left"
      ? "left-[clamp(-4rem,1vw,2.5rem)]"
      : side === "right"
        ? "right-[clamp(-4rem,1vw,2.5rem)]"
        : "left-1/2 -translate-x-1/2";

  const vertical =
    align === "top"
      ? "top-[clamp(0.25rem,3vw,2.5rem)]"
      : side === "center"
        ? "bottom-[clamp(1rem,8vw,6rem)]"
        : "bottom-[clamp(0.25rem,3vw,2.5rem)]";

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full opacity-90 sm:opacity-100 ${glowSizeClass} ${glowBlurClass} ${glowClass} ${horizontal} ${vertical}`}
    />
  );
}

function GlowBackdrop({
  side = "right",
  tone = "light",
  align = "bottom",
}: {
  side?: "left" | "right" | "center";
  tone?: "light" | "dark";
  align?: "bottom" | "top";
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <SectionGlow side={side} tone={tone} align={align} />
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-5xl sm:mt-12">
      <Image
        src="/mock-hero.png"
        alt="RealLife OS dashboard on laptop and mobile"
        width={1024}
        height={573}
        className="h-auto w-full max-w-full"
        priority
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1024px"
      />
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 font-sans text-slate-900">
      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-md">
          <div className={`${pageContainerClass} flex items-center justify-between gap-3 py-3 sm:gap-4 sm:py-4`}>
            <Link href="/" className="min-w-0 shrink" aria-label="RealLife OS home">
              <NavLogo />
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/sign-up"
                className="rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-brand-primary-foreground transition-all hover:bg-brand-primary/90 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Start Free
              </Link>
              <details className="relative md:hidden">
                <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 [&::-webkit-details-marker]:hidden">
                  <Menu className="size-5" aria-hidden />
                  <span className="sr-only">Open menu</span>
                </summary>
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <nav className="flex flex-col">
                    {navLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        {link.label}
                      </a>
                    ))}
                  </nav>
                </div>
              </details>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <div className={`${pageMaxWidthClass} relative z-10 text-center`}>
            <div className="mb-6 inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 sm:px-4 sm:text-sm">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span className="text-center">DNS Security + Willpower Tracking</span>
            </div>
            <h1 className="mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Control your network.
              <span className="mt-1 block text-brand-primary">Own your life.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              High-performance security minimalism designed to enforce your digital
              intentions. Block distractions, secure your traffic, and reclaim your
              attention at the network level.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/sign-up"
                className="w-full rounded-lg bg-brand-primary px-6 py-3.5 text-sm font-semibold text-brand-primary-foreground transition-all hover:bg-brand-primary/90 sm:w-auto"
              >
                Start 7-Day Free Trial
              </Link>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-6 py-3.5 text-sm font-semibold text-brand-primary transition-all hover:bg-cyan-100 sm:w-auto"
              >
                <Play className="size-4 fill-brand-primary text-brand-primary" />
                Watch Demo
              </button>
            </div>
            <GlowBackdrop side="center" />
            <HeroMockup />
          </div>
        </section>


        {/* Problem Section */}
        <section id="about" className="relative z-10 bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className={pageMaxWidthClass}>
            <div className="text-center flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Your devices have gotten away from you
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500 sm:text-lg">
                Modern devices are designed to capture attention. RealLife OS puts
                you back in the driver&apos;s seat with precision controls.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  icon: Smartphone,
                  title: "Social Media Traps",
                  description:
                    "Endless scrolling steals hours of your day. Block apps and sites at the network level.",
                },
                {
                  icon: Users,
                  title: "Family Boundaries",
                  description:
                    "Set age-appropriate rules for every family member without installing software on each device.",
                },
                {
                  icon: Ban,
                  title: "NSFW Content",
                  description:
                    "Protect your household from adult content with DNS-level filtering that can't be bypassed.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-brand-primary">
                    <card.icon className="size-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Precision Enforcement */}
        <section
          id="features"
          className="relative overflow-hidden bg-slate-50 px-4 py-20 sm:px-6 lg:px-8"
        >
          <GlowBackdrop side="right" />
          <div className={`${pageMaxWidthClass} relative z-10`}>
            <div className="mb-12 max-w-4xl">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Precision Enforcement
              </h2>
              <p className="mt-4 text-base text-slate-500 sm:text-lg">
                Network-level protection that works across every device without
                installing software.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Globe,
                  title: "DNS-Level Blocking",
                  description:
                    "Block unwanted content at the DNS level before it reaches any device on your network.",
                },
                {
                  icon: Shield,
                  title: "Content Policies",
                  description:
                    "Create custom rules for social media, gaming, adult content, and more with granular control.",
                },
                {
                  icon: BarChart3,
                  title: "Deep-power analytics",
                  description:
                    "Understand your network usage with detailed insights and real-time monitoring dashboards.",
                },
                {
                  icon: Wifi,
                  title: "Multi-device Protection",
                  description:
                    "Protect phones, tablets, laptops, smart TVs, and IoT devices with a single configuration.",
                },
                {
                  icon: Lock,
                  title: "Anti-Bypass Security",
                  description:
                    "Prevent VPN and DNS bypass attempts with advanced detection and automatic blocking.",
                },
                {
                  icon: Users,
                  title: "Family Management",
                  description:
                    "Assign different policies to family members and manage everything from one dashboard.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl bg-slate-900 p-6 transition-colors hover:bg-slate-800"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg">
                    <card.icon className="size-5 text-brand-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Setup Steps */}
        <section className="relative z-10 bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className={`${pageMaxWidthClass} text-center`}>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Setup in minutes. Protected indefinitely.
            </h2>

            {(() => {
              const steps = [
                {
                  icon: Download,
                  step: "1. Download Profile",
                  description:
                    "Install the DNS profile on your router or device in one click.",
                },
                {
                  icon: Zap,
                  step: "2. Create Rules",
                  description:
                    "Choose from presets or build custom policies tailored to your needs.",
                },
                {
                  icon: ShieldCheck,
                  step: "3. Instant Protection",
                  description:
                    "Your entire network is protected immediately. No reboot required.",
                },
              ] as const;

              const renderIcon = (
                item: (typeof steps)[number],
                index: number,
                size: "sm" | "lg",
              ) => {
                const isFilled = index === steps.length - 1;
                const dim = size === "sm" ? "size-14" : "size-16";
                const iconDim = size === "sm" ? "size-6" : "size-7";

                return (
                  <div
                    className={`relative z-10 flex ${dim} shrink-0 items-center justify-center rounded-full ${isFilled
                      ? "bg-brand-primary text-brand-primary-foreground shadow-lg shadow-brand-primary/30"
                      : "border-2 border-brand-primary bg-slate-50 text-brand-primary"
                      }`}
                  >
                    <item.icon className={iconDim} strokeWidth={2} />
                  </div>
                );
              };

              return (
                <>
                  {/* Mobile: icon left, content centered, vertical lines flush to icons */}
                  <div className="mt-12 flex flex-col md:hidden">
                    {steps.map((item, index) => {
                      const isLast = index === steps.length - 1;

                      return (
                        <div key={item.step} className="flex items-stretch gap-4">
                          <div className="relative flex w-14 shrink-0 flex-col items-center justify-center">
                            {index > 0 && (
                              <div className="absolute top-0 left-1/2 h-[calc(50%-1.75rem)] w-0.5 -translate-x-1/2 bg-brand-primary/20" />
                            )}
                            {renderIcon(item, index, "sm")}
                            {!isLast && (
                              <div className="absolute bottom-0 left-1/2 h-[calc(50%-1.75rem)] w-0.5 -translate-x-1/2 bg-brand-primary/20" />
                            )}
                          </div>
                          <div className="flex flex-1 items-center py-6 text-left">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">
                                {item.step}
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: 3-col grid — lines touch icons, text centered below */}
                  <div className="mx-auto mt-16 hidden max-w-5xl md:grid md:grid-cols-3">
                    {steps.map((item, index) => {
                      const isLast = index === steps.length - 1;

                      return (
                        <div
                          key={item.step}
                          className="flex flex-col items-center text-center"
                        >
                          <div className="relative flex w-full justify-center">
                            {index > 0 && (
                              <div className="absolute top-1/2 right-1/2 left-0 mr-8 h-0.5 -translate-y-1/2 bg-brand-primary/20" />
                            )}
                            {renderIcon(item, index, "lg")}
                            {!isLast && (
                              <div className="absolute top-1/2 left-1/2 right-0 ml-8 h-0.5 -translate-y-1/2 bg-brand-primary/20" />
                            )}
                          </div>
                          <h3 className="mt-6 text-lg font-semibold text-slate-900">
                            {item.step}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-slate-500 px-4">
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="relative z-10 bg-slate-50 px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className={`relative z-10 ${pageMaxWidthClass}`}>
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Choose your level of protection.
              </h2>
              <p className="mt-4 text-base text-slate-500">
                Add a card to start your 7-day free trial.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
              {BILLING_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 sm:p-8 ${plan.highlighted
                    ? "border-2 border-cyan-400 shadow-lg shadow-cyan-400/25"
                    : "border-slate-200 shadow-sm"
                    }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-md bg-cyan-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {plan.tier}
                  </p>

                  <div className="mt-3">
                    {plan.price === "free" ? (
                      <span className="text-4xl font-bold text-brand-primary">Free</span>
                    ) : (
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-4xl font-bold text-brand-primary">
                          ${plan.price}
                        </span>
                        <span className="text-base text-slate-500">/mo</span>
                      </div>
                    )}
                  </div>

                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <CheckItem key={feature}>{feature}</CheckItem>
                    ))}
                  </ul>

                  <Link
                    href="/sign-up"
                    className={`mt-8 flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-all ${plan.highlighted
                      ? "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
                      : "border border-brand-primary bg-white text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats & Testimonials */}
        <section className="relative z-10 bg-[#020617] px-4 py-20 sm:px-6 lg:px-8">
          <div className={`${pageMaxWidthClass} relative z-10`}>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
              {[
                { value: "10k+", label: "Active Users", highlight: false },
                { value: "100k+", label: "Domains Blocked", highlight: true },
                { value: "99.9%", label: "Uptime Guarantee", highlight: false },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p
                    className={`text-4xl font-bold sm:text-5xl ${stat.highlight ? "text-emerald-400" : "text-white"
                      }`}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-12 flex w-full max-w-full flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-xl bg-slate-900/40 px-4 py-4 sm:gap-x-14 sm:px-10 sm:py-5">
              <span className="text-sm font-semibold tracking-wide text-slate-500">
                Cloudflare
              </span>
              <span className="text-sm font-medium lowercase text-slate-500">
                stripe
              </span>
              <span className="text-sm font-bold tracking-widest text-slate-500">
                AWS
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                Supabase
              </span>
            </div>

            <div className="relative mt-12 pt-6">
              <GlowBackdrop tone="dark" side="right" align="top" />
              <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                {[
                  {
                    quote:
                      "Guardian completely changed my relationship with my phone. No more midnight doomscrolling. It's invisible but life-changing.",
                    name: "Sarah Jenkins",
                    role: "Product Designer",
                    avatar: "S",
                    avatarClass: "bg-brand-primary",
                  },
                  {
                    quote:
                      "Finally, a parental control system that doesn't feel like a constant battle. Set the rules once and let the network do the work.",
                    name: "David Chen",
                    role: "Father of three",
                    avatar: "D",
                    avatarClass: "bg-emerald-500",
                  },
                ].map((testimonial) => (
                  <div
                    key={testimonial.name}
                    className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8"
                  >
                    <StarRating />
                    <p className="mt-4 text-sm italic leading-relaxed text-white sm:text-base">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${testimonial.avatarClass}`}
                      >
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-slate-400">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative z-10 bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className={pageMaxWidthClass}>
            <div className="relative overflow-hidden rounded-2xl px-4 py-12 text-center sm:rounded-[2rem] sm:px-12 sm:py-20">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-cyan-400 to-teal-300" />
              <div className="pointer-events-none absolute top-1/2 -left-[clamp(2rem,12vw,5rem)] h-[clamp(7rem,32vw,18rem)] w-[clamp(7rem,32vw,18rem)] -translate-y-1/2 rounded-full bg-brand-primary/45 blur-[clamp(1.75rem,5vw,4rem)]" />
              <div className="pointer-events-none absolute top-0 -right-[clamp(1.5rem,10vw,4rem)] h-[clamp(6rem,26vw,14rem)] w-[clamp(6rem,26vw,14rem)] rounded-full bg-white/35 blur-[clamp(1.5rem,4vw,3rem)]" />

              <div className="relative z-10">
                <h2 className="text-2xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                  Protect your devices
                  <br />
                  protect your attention
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
                  Join thousands of high-performers who have eliminated digital
                  distractions and secured their network.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                  <Link
                    href="/sign-up"
                    className="w-full rounded-xl bg-brand-primary px-8 py-3.5 text-sm font-semibold text-brand-primary-foreground transition-all hover:bg-brand-primary/90 sm:w-auto"
                  >
                    Get Started for Free
                  </Link>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/60 bg-transparent px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:w-auto"
                  >
                    Talk to Sales
                  </button>
                </div>
                <p className="mt-8 text-sm text-white/90">
                  No setup fee. No hardware required. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="docs" className="relative z-10 bg-[#020617] py-16">
          <div className={pageContainerClass}>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
              {/* Brand */}
              <div className="sm:col-span-2 lg:col-span-1">
                <FooterLogo />
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
                  Security and privacy at the core. Enterprise-grade DNS filtering
                  for individuals and families.
                </p>
                <p className="mt-10 text-sm text-slate-500">
                  &copy; 2026 RealLifeOS. All rights reserved.
                </p>
              </div>

              {/* Product */}
              <div>
                <h4 className="text-sm font-semibold text-white">Product</h4>
                <ul className="mt-4 space-y-3">
                  {["Features", "Solutions", "Pricing"].map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-sm font-semibold text-white">Company</h4>
                <ul className="mt-4 space-y-3">
                  {["About", "Privacy Policy", "Terms of Service"].map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust */}
              <div>
                <h4 className="text-sm font-semibold text-white">Trust</h4>
                <ul className="mt-4 space-y-3">
                  {["ISO 27001", "Cloudflare Partner"].map((item) => (
                    <li key={item} className="text-sm text-slate-400">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
