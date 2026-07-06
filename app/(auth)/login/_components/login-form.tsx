"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { ArrowRight, AtSign, Eye, EyeOff, Lock } from "lucide-react"
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
import { buildAuthHref } from "@/lib/auth/email-search-param"
import { parseImplicitAuthHash } from "@/lib/auth/implicit-auth-hash"
import { apiClient } from "@/lib/api/client"
import {
  loginSchema,
  type LoginInput,
  type LoginResponse,
} from "@/schemas/auth/login"

export interface LoginFormProps {
  defaultEmail?: string
  authError?: string
}

export function LoginForm({ defaultEmail = "", authError }: LoginFormProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const parsed = parseImplicitAuthHash(window.location.hash)

    if (parsed?.type === "recovery") {
      router.replace(`/change-password${window.location.hash}`)
    }
  }, [router])

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail,
      password: "",
    },
  })

  const emailValue = form.watch("email")

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) =>
      apiClient<LoginResponse>("/api/auth/login", {
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

  function onSubmit(values: LoginInput) {
    loginMutation.mutate(values)
  }

  return (
    <Card className="relative overflow-hidden rounded-xl gap-0 border-0 border-brand-input-border bg-brand-surface shadow-[0_8px_30px_var(--brand-shadow)]">
      <div
        className="absolute top-0 left-1/2 h-[2px] w-[80%] -translate-x-1/2 rounded-full"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--brand-primary), transparent)",
          boxShadow: "0 0 8px rgba(37,99,235,.45)",
        }}
      />
      <CardHeader className="items-center gap-2 border-b-0 px-8 pt-8 pb-0 text-center">
        <CardTitle className="text-xl font-bold text-brand-text-heading">
          Login your account
        </CardTitle>
        <p className="text-sm text-brand-text-muted">
          Sign in to monitor, configure, and secure your network.
        </p>
      </CardHeader>

      <CardContent className="px-8 pt-6 pb-8">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          {authError && (
            <p role="alert" className="text-sm text-destructive">
              {authError}
            </p>
          )}

          <Field data-invalid={!!form.formState.errors.email}>
            <FieldLabel
              htmlFor="email"
              className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
            >
              Email
            </FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@enterprise.com"
              startIcon={<AtSign aria-hidden />}
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.password}>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel
                htmlFor="password"
                className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
              >
                Password
              </FieldLabel>
              <Link
                href={buildAuthHref("/forget-password", emailValue)}
                className="text-xs font-medium text-brand-link hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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

          {form.formState.errors.root?.message && (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {form.formState.errors.root.message}
            </p>
          )}

          {loginMutation.isSuccess && (
            <p
              role="status"
              className="rounded-lg bg-brand-primary/10 px-3 py-2 text-sm text-brand-primary"
            >
              {loginMutation.data.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="h-11 w-full bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
          >
            Login
            <ArrowRight aria-hidden />
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-center border-t-0 bg-transparent p-0 px-8 pb-5">
        <div className="w-full border-t border-brand-input-border" />
        <p className="pt-5 text-sm text-brand-text-muted">
          Create new account.{" "}
          <Link
            href={buildAuthHref("/sign-up", emailValue)}
            className="font-semibold tracking-wide text-brand-link uppercase hover:underline"
          >
            Signup
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
