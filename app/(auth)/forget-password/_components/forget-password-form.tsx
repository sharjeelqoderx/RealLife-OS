"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, AtSign } from "lucide-react"
import Link from "next/link"
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
import { ApiError, apiClient } from "@/lib/api/client"
import { buildAuthHref } from "@/lib/auth/email-search-param"
import { getForgetPasswordErrorMessage } from "@/lib/auth/forget-password-errors"
import {
  forgetPasswordSchema,
  type ForgetPasswordInput,
  type ForgetPasswordResponse,
} from "@/schemas/auth/forget-password"

export interface ForgetPasswordFormProps {
  defaultEmail?: string
}

export function ForgetPasswordForm({
  defaultEmail = "",
}: ForgetPasswordFormProps) {
  const form = useForm<ForgetPasswordInput>({
    resolver: zodResolver(forgetPasswordSchema),
    defaultValues: {
      email: defaultEmail,
    },
  })

  const emailValue = form.watch("email")

  const resetMutation = useMutation({
    mutationFn: (data: ForgetPasswordInput) =>
      apiClient<ForgetPasswordResponse>("/api/auth/forget-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      form.clearErrors("root")
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "USER_NOT_FOUND") {
        form.setError("email", {
          message: getForgetPasswordErrorMessage(error),
        })
        return
      }

      form.setError("root", {
        message: getForgetPasswordErrorMessage(error),
      })
    },
  })

  function onSubmit(values: ForgetPasswordInput) {
    resetMutation.mutate(values)
  }

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

      <CardHeader className="items-center gap-2 border-b-0 px-8 pt-8 pb-0 text-center">
        <CardTitle className="text-xl font-bold text-brand-text-heading">
          Forgot Password
        </CardTitle>
        <p className="text-sm text-brand-text-muted">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </CardHeader>

      <CardContent className="px-8 pt-6 pb-8">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <Field data-invalid={!!form.formState.errors.email}>
            <FieldLabel
              htmlFor="email"
              className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
            >
              Email Address
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

          {form.formState.errors.root?.message && (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          {resetMutation.isSuccess && (
            <p
              role="status"
              className="rounded-lg bg-brand-primary/10 px-3 py-2 text-sm text-brand-primary"
            >
              {resetMutation.data.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={resetMutation.isPending}
            className="h-11 w-full bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
          >
            Send Reset Link
            <ArrowRight aria-hidden />
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-center border-t-0 bg-transparent p-0 px-8 pb-5">
        <div className="w-full border-t border-brand-input-border" />
        <Link
          href={buildAuthHref("/login", emailValue)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-input-border bg-brand-input/30 px-4 py-3 text-sm font-semibold text-brand-link transition-colors hover:bg-brand-input/50"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  )
}
