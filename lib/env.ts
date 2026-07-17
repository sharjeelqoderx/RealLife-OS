function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getSupabaseUrl(): string {
  return requireEnv("SUPABASE_URL")
}

export function getSupabaseAnonKey(): string {
  return requireEnv("SUPABASE_PUBLISHABLE_KEY")
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SECRET_KEY")
}

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return "http://localhost:3000"
}

export function getAuthConfirmUrl(next: string): string {
  const params = new URLSearchParams({ next })
  return `${getSiteUrl()}/api/auth/confirm?${params.toString()}`
}

export function getPasswordRecoveryConfirmUrl(): string {
  return `${getSiteUrl()}/change-password`
}

export function getStripeSecretKey(): string {
  return requireEnv("STRIPE_SECRET_KEY")
}

export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET")
}

export function getStripePriceBasicMonthly(): string {
  return requireEnv("STRIPE_PRICE_BASIC_MONTHLY")
}

export function getStripePriceFamilyMonthly(): string {
  return requireEnv("STRIPE_PRICE_FAMILY_MONTHLY")
}

export function getStripePriceForPlan(
  planId: "willpower_pro" | "family_pack"
): string {
  return planId === "family_pack"
    ? getStripePriceFamilyMonthly()
    : getStripePriceBasicMonthly()
}

