"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
  type UseFormReturn,
} from "react-hook-form"

import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import { cn } from "@/lib/utils"
import {
  ACCESS_POLICY_DECISION_OPTIONS,
  ACCESS_POLICY_SELECTOR_OPTIONS,
  createAccessPolicySchema,
  type AccessPolicyDecision,
  type AccessPolicySelector,
  type CreateAccessPolicyInput,
} from "@/schemas/content-policies/access-policy"

type RuleSection = "include" | "require" | "exclude"

const RULE_SECTIONS: {
  key: RuleSection
  title: string
  logic: string
  description: string
  required?: boolean
}[] = [
  {
    key: "include",
    title: "Include",
    logic: "OR",
    description:
      "Users matching any Include rule become candidates for this policy.",
    required: true,
  },
  {
    key: "require",
    title: "Require",
    logic: "AND",
    description:
      "Users must match every Require rule in addition to an Include rule.",
  },
  {
    key: "exclude",
    title: "Exclude",
    logic: "NOT",
    description:
      "Users matching any Exclude rule are denied, even if they match Include.",
  },
]

const fieldLabelClassName =
  "text-xs font-bold tracking-wider text-brand-text-label uppercase"

function selectorNeedsValue(selector: AccessPolicySelector) {
  return (
    ACCESS_POLICY_SELECTOR_OPTIONS.find((option) => option.value === selector)
      ?.needsValue ?? true
  )
}

function selectorPlaceholder(selector: AccessPolicySelector) {
  return (
    ACCESS_POLICY_SELECTOR_OPTIONS.find((option) => option.value === selector)
      ?.placeholder ?? "Value"
  )
}

function useAccessPolicyForm() {
  return useFormContext<CreateAccessPolicyInput>()
}

function PolicySelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  id: string
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  placeholder: string
  error?: { message?: string }
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id} className={fieldLabelClassName}>
        {label}
      </FieldLabel>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger id={id} aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="start" className="w-[var(--radix-select-trigger-width)]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={[error]} />
    </Field>
  )
}

function RuleRows({ section }: { section: (typeof RULE_SECTIONS)[number] }) {
  const { control, register, formState, setValue } = useAccessPolicyForm()
  const { fields, append, remove } = useFieldArray({
    control,
    name: section.key,
  })

  const rules = useWatch({ control, name: section.key }) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <FieldDescription className="text-brand-text-muted">
          {section.description}
        </FieldDescription>
        <Button
          type="button"
          variant="brandOutline"
          size="sm"
          className="h-8 shrink-0 gap-1.5"
          onClick={() => append({ selector: "email", value: "" })}
        >
          <Plus className="size-3.5" />
          Add rule
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-brand-surface px-4 py-10 text-center">
          <p className="text-sm font-semibold text-brand-text-heading">
            No {section.title.toLowerCase()} rules yet
          </p>
          <FieldDescription className="mt-1.5 text-brand-text-muted">
            {section.required
              ? "Add at least one include rule to continue."
              : "Add a rule when you need to narrow access."}
          </FieldDescription>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const selector = (rules[index]?.selector ??
              "email") as AccessPolicySelector
            const needsValue = selectorNeedsValue(selector)
            const selectorError = formState.errors[section.key]?.[index]?.selector
            const valueError = formState.errors[section.key]?.[index]?.value

            return (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border border-border/70 bg-brand-surface p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-start"
              >
                <Controller
                  control={control}
                  name={`${section.key}.${index}.selector`}
                  render={({ field: selectorField, fieldState }) => (
                    <PolicySelectField
                      id={`${section.key}-${index}-selector`}
                      label="Selector"
                      value={selectorField.value}
                      onChange={(next) => {
                        selectorField.onChange(next)
                        if (!selectorNeedsValue(next)) {
                          setValue(`${section.key}.${index}.value`, "")
                        }
                      }}
                      options={ACCESS_POLICY_SELECTOR_OPTIONS}
                      placeholder="Select selector"
                      error={fieldState.error ?? selectorError}
                    />
                  )}
                />

                <Field data-invalid={!!valueError}>
                  <FieldLabel
                    htmlFor={`${section.key}-${index}-value`}
                    className={fieldLabelClassName}
                  >
                    Value
                  </FieldLabel>
                  <Input
                    id={`${section.key}-${index}-value`}
                    disabled={!needsValue}
                    placeholder={
                      needsValue
                        ? selectorPlaceholder(selector)
                        : "No value needed"
                    }
                    aria-invalid={!!valueError}
                    {...register(`${section.key}.${index}.value`)}
                  />
                  <FieldError errors={[valueError]} />
                </Field>

                <div className="flex md:pt-7">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-brand-text-muted hover:text-destructive"
                    disabled={section.required && fields.length === 1}
                    aria-label={`Remove ${section.title.toLowerCase()} rule`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AccessPolicyForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<RuleSection>("include")

  const form = useForm<CreateAccessPolicyInput>({
    resolver: zodResolver(createAccessPolicySchema),
    defaultValues: {
      name: "",
      decision: "allow",
      include: [{ selector: "everyone", value: "" }],
      require: [],
      exclude: [],
    },
  })

  const decision = useWatch({ control: form.control, name: "decision" })
  const includeRules = useWatch({ control: form.control, name: "include" }) ?? []
  const requireRules = useWatch({ control: form.control, name: "require" }) ?? []
  const excludeRules = useWatch({ control: form.control, name: "exclude" }) ?? []

  const decisionMeta = ACCESS_POLICY_DECISION_OPTIONS.find(
    (option) => option.value === decision
  )

  const sectionCounts: Record<RuleSection, number> = {
    include: includeRules.length,
    require: requireRules.length,
    exclude: excludeRules.length,
  }

  const activeSectionMeta =
    RULE_SECTIONS.find((section) => section.key === activeSection) ??
    RULE_SECTIONS[0]

  const includeSectionError =
    typeof form.formState.errors.include?.message === "string"
      ? { message: form.formState.errors.include.message }
      : form.formState.errors.include?.root

  const createMutation = useMutation({
    mutationFn: (data: CreateAccessPolicyInput) =>
      apiClient<{ data: unknown }>("/api/access-policies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: async () => {
      form.clearErrors("root")
      await queryClient.invalidateQueries({
        queryKey: queryKeys.accessPolicies.all,
      })
      router.push("/content-policies")
      router.refresh()
    },
    onError: (error) => {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to create policy",
      })
    },
  })

  function onSubmit(values: CreateAccessPolicyInput) {
    createMutation.mutate(values)
  }

  return (
    <FormProvider {...(form as UseFormReturn<CreateAccessPolicyInput>)}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col gap-4"
        noValidate
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-brand-text-muted hover:text-brand-primary"
            asChild
          >
            <Link href="/content-policies" aria-label="Back to content policies">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
              New Policy
            </h1>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-border/60 lg:sticky lg:top-20 lg:z-10 lg:max-h-[calc(100svh-7rem)] lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-border/60">
            <div className="border-b border-border/60 px-5 py-4">
              <span className="text-sm font-semibold uppercase tracking-wider text-brand-text-muted">
                Rules
              </span>
            </div>
            <div className="flex lg:flex-col">
              {RULE_SECTIONS.map((section) => {
                const isSelected = activeSection === section.key
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                      isSelected ? "bg-brand-primary/5" : "hover:bg-muted/40"
                    )}
                  >
                    {isSelected ? (
                      <span className="absolute left-0 top-0 h-full w-[3px] rounded-r bg-brand-primary" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isSelected
                            ? "font-semibold text-brand-primary"
                            : "text-brand-text-heading"
                        )}
                      >
                        {section.title}
                      </p>
                      <p className="text-xs text-brand-text-muted">
                        {section.logic} · {sectionCounts[section.key]} rule
                        {sectionCounts[section.key] === 1 ? "" : "s"}
                      </p>
                    </div>
                    {section.required ? (
                      <span className="shrink-0 text-[10px] font-bold tracking-wide text-destructive uppercase">
                        Required
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="border-b border-border/60 px-5 py-4">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="policy-name" className={fieldLabelClassName}>
                    Policy name
                  </FieldLabel>
                  <Input
                    id="policy-name"
                    placeholder="e.g. Allow company emails"
                    aria-invalid={!!form.formState.errors.name}
                    {...form.register("name")}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>

                <Controller
                  control={form.control}
                  name="decision"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-2">
                      <PolicySelectField
                        id="policy-decision"
                        label="Action"
                        value={field.value as AccessPolicyDecision}
                        onChange={field.onChange}
                        options={ACCESS_POLICY_DECISION_OPTIONS}
                        placeholder="Select action"
                        error={fieldState.error}
                      />
                      {decisionMeta ? (
                        <FieldDescription className="text-brand-text-muted">
                          {decisionMeta.description}
                        </FieldDescription>
                      ) : null}
                    </div>
                  )}
                />
              </FieldGroup>
            </div>

            <div className="space-y-6 px-5 py-6">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-brand-text-heading">
                  {activeSectionMeta.title}
                </h2>
                <span className="rounded bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-primary uppercase">
                  {activeSectionMeta.logic}
                </span>
              </div>

              <FieldError errors={[includeSectionError]} />

              <RuleRows section={activeSectionMeta} />

              <FieldError errors={[form.formState.errors.root]} />

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" size="lg" asChild>
                  <Link href="/content-policies">Cancel</Link>
                </Button>
                <Button type="submit" size="lg" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <CustomSpinner /> : null}
                  Save policy
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
