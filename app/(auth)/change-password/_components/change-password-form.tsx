"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, apiClient } from "@/lib/api/client"
import { parseImplicitAuthHash } from "@/lib/auth/implicit-auth-hash"
import { queryKeys } from "@/lib/query/keys"
import {
  changePasswordSchema,
  type ChangePasswordInput,
  type ChangePasswordResponse,
  type ValidateResetTokenResponse,
} from "@/schemas/auth/change-password"
import type { RecoverySessionResponse } from "@/schemas/auth/recovery-session"

function AuthCardShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="relative gap-0 overflow-hidden rounded-xl border-0 border-brand-input-border bg-brand-surface shadow-[0_8px_30px_var(--brand-shadow)]">
      <div
        className="absolute top-0 left-1/2 h-[2px] w-[80%] -translate-x-1/2 rounded-full"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--brand-primary), transparent)",
          boxShadow: "0 0 8px rgba(37,99,235,.45)",
        }}
      />
      {children}
    </Card>
  )
}

function ChangePasswordHeader() {
  return (
    <CardHeader className="items-center gap-2 border-b-0 px-8 pt-8 pb-0 text-center">
      <CardTitle className="text-xl font-bold text-brand-text-heading">
        Change Password
      </CardTitle>
      <p className="text-sm text-brand-text-muted">
        Set a new password for your account to continue.
      </p>
    </CardHeader>
  )
}

function ValidationLoadingCard() {
  return (
    <AuthCardShell>
      <ChangePasswordHeader />
      <CardContent className="px-8 pt-6 pb-8">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </CardContent>
    </AuthCardShell>
  )
}

function ChangePasswordErrorCard({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <AuthCardShell>
      <ChangePasswordHeader />
      <CardContent className="px-8 pt-6 pb-8">
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4 text-center"
        >
          <p className="text-sm font-semibold text-destructive">{title}</p>
          <p className="mt-1 text-sm text-brand-text-muted">{message}</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center border-t-0 bg-transparent p-0 px-8 pb-5">
        <div className="w-full border-t border-brand-input-border" />
        <Link
          href="/login"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-input-border bg-brand-input/30 px-4 py-3 text-sm font-semibold text-brand-link transition-colors hover:bg-brand-input/50"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Login
        </Link>
      </CardFooter>
    </AuthCardShell>
  )
}

function getValidationError(error: unknown): { title: string; message: string } {
  if (error instanceof ApiError) {
    if (error.code === "EXPIRED_TOKEN") {
      return {
        title: "Link Expired",
        message: error.message,
      }
    }

    if (error.code === "INVALID_TOKEN") {
      return {
        title: "Invalid Link",
        message: error.message,
      }
    }

    return {
      title: "Validation Failed",
      message: error.message,
    }
  }

  return {
    title: "Validation Failed",
    message:
      "Unable to validate your reset session. Please use the link from your email.",
  }
}

export function ChangePasswordForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrapRecoverySession() {
      const parsed = parseImplicitAuthHash(window.location.hash)

      if (!parsed) {
        if (!cancelled) {
          setSessionReady(true)
        }
        return
      }

      if (parsed.type !== "recovery") {
        if (!cancelled) {
          setBootstrapError(
            "This link is invalid. Please request a new password reset."
          )
          setSessionReady(true)
        }
        return
      }

      try {
        await apiClient<RecoverySessionResponse>("/api/auth/recovery-session", {
          method: "POST",
          body: JSON.stringify({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          }),
        })
        window.history.replaceState(null, "", window.location.pathname)
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(
            error instanceof Error
              ? error.message
              : "Unable to verify your reset link. Please try again."
          )
        }
      }

      if (!cancelled) {
        setSessionReady(true)
      }
    }

    void bootstrapRecoverySession()

    return () => {
      cancelled = true
    }
  }, [])

  const validationQuery = useQuery({
    queryKey: queryKeys.auth.recoverySession(),
    queryFn: () =>
      apiClient<ValidateResetTokenResponse>(
        "/api/auth/change-password/validate"
      ),
    enabled: sessionReady && !bootstrapError,
    retry: false,
  })

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      apiClient<ChangePasswordResponse>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      form.clearErrors("root")
      router.push("/dashboard")
    },
    onError: (error) => {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Something went wrong",
      })
    },
  })

  function onSubmit(values: ChangePasswordInput) {
    changePasswordMutation.mutate(values)
  }

  if (!sessionReady || validationQuery.isPending) {
    return <ValidationLoadingCard />
  }

  if (bootstrapError) {
    return (
      <ChangePasswordErrorCard
        title="Invalid Link"
        message={bootstrapError}
      />
    )
  }

  if (validationQuery.isError) {
    const { title, message } = getValidationError(validationQuery.error)
    return <ChangePasswordErrorCard title={title} message={message} />
  }

  return (
    <AuthCardShell>
      <ChangePasswordHeader />
      <CardContent className="px-8 pt-6 pb-8">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <Field data-invalid={!!form.formState.errors.password}>
            <FieldLabel
              htmlFor="password"
              className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
            >
              New Password
            </FieldLabel>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter your password"
              startIcon={<Lock aria-hidden />}
              endIcon={
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-brand-text-muted transition-colors hover:text-brand-text-heading"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden />
                  ) : (
                    <Eye aria-hidden />
                  )}
                </button>
              }
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.confirmPassword}>
            <FieldLabel
              htmlFor="confirmPassword"
              className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
            >
              Confirm Password
            </FieldLabel>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm your password"
              startIcon={<Lock aria-hidden />}
              endIcon={
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  className="text-brand-text-muted transition-colors hover:text-brand-text-heading"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff aria-hidden />
                  ) : (
                    <Eye aria-hidden />
                  )}
                </button>
              }
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
            <FieldError errors={[form.formState.errors.confirmPassword]} />
          </Field>

          {form.formState.errors.root?.message && (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="h-11 w-full bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
          >
            Login and Continue
            <ArrowRight aria-hidden />
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-center border-t-0 bg-transparent p-0 px-8 pb-5">
        <div className="w-full border-t border-brand-input-border" />
        <Link
          href="/login"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-input-border bg-brand-input/30 px-4 py-3 text-sm font-semibold text-brand-link transition-colors hover:bg-brand-input/50"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Login
        </Link>
      </CardFooter>
    </AuthCardShell>
  )
}
