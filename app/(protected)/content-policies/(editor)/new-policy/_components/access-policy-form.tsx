"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { FieldError as HookFormFieldError } from "react-hook-form"
import {
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
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import { cn } from "@/lib/utils"
import {
  ACCESS_POLICY_DECISION_OPTIONS,
  ACCESS_POLICY_SELECTOR_OPTIONS,
  createAccessPolicySchema,
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

const selectClassName = cn(
  "h-11 w-full min-w-0 rounded-sm border border-brand-input-border bg-brand-input px-3 text-sm text-brand-text-heading outline-none transition-colors",
  "focus-visible:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive"
)

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

function RuleRows({
  section,
}: {
  section: (typeof RULE_SECTIONS)[number]
}) {
  const { control, register, formState, setValue } = useAccessPolicyForm()
  const { fields, append, remove } = useFieldArray({
    control,
    name: section.key,
  })

  const rules = useWatch({ control, name: section.key }) ?? []

  return (
    <section className="rounded-lg border border-brand-input-border bg-brand-surface">
      <div className="flex flex-col gap-1 border-b border-brand-input-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-brand-text-heading">
              {section.title}
            </h2>
            <span className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-primary uppercase">
              {section.logic}
            </span>
            {section.required ? (
              <span className="text-xs text-destructive">Required</span>
            ) : null}
          </div>
          <p className="text-xs text-brand-text-muted">{section.description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => append({ selector: "email", value: "" })}
        >
          <Plus />
          Add {section.title.toLowerCase()} rule
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {fields.length === 0 ? (
          <p className="text-sm text-brand-text-muted">
            No {section.title.toLowerCase()} rules yet
            {section.required ? " — add at least one." : "."}
          </p>
        ) : (
          fields.map((field, index) => {
            const selector = (rules[index]?.selector ??
              "email") as AccessPolicySelector
            const needsValue = selectorNeedsValue(selector)
            const rowErrors = formState.errors[section.key] as
              | Array<
                  | {
                      selector?: HookFormFieldError
                      value?: HookFormFieldError
                    }
                  | undefined
                >
              | undefined
            const selectorError = rowErrors?.[index]?.selector
            const valueError = rowErrors?.[index]?.value

            return (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border border-brand-input-border/80 bg-background/40 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-start"
              >
                <Field data-invalid={!!selectorError}>
                  <FieldLabel
                    htmlFor={`${section.key}-${index}-selector`}
                    className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
                  >
                    Selector
                  </FieldLabel>
                  <select
                    id={`${section.key}-${index}-selector`}
                    className={selectClassName}
                    aria-invalid={!!selectorError}
                    {...register(`${section.key}.${index}.selector`, {
                      onChange: (event) => {
                        const next = event.target
                          .value as AccessPolicySelector
                        if (!selectorNeedsValue(next)) {
                          setValue(`${section.key}.${index}.value`, "")
                        }
                      },
                    })}
                  >
                    {ACCESS_POLICY_SELECTOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={[selectorError]} />
                </Field>

                <Field data-invalid={!!valueError}>
                  <FieldLabel
                    htmlFor={`${section.key}-${index}-value`}
                    className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
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
                    size="icon"
                    className="text-brand-text-muted hover:text-destructive"
                    disabled={section.required && fields.length === 1}
                    aria-label={`Remove ${section.title.toLowerCase()} rule`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export function AccessPolicyForm() {
  const router = useRouter()
  const queryClient = useQueryClient()

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
  const decisionMeta = ACCESS_POLICY_DECISION_OPTIONS.find(
    (option) => option.value === decision
  )

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
        className="mx-auto flex w-full max-w-3xl flex-col gap-6"
        noValidate
      >
        <div className="space-y-2">
          <Link
            href="/content-policies"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-link hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to policies
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
            Add a policy
          </h1>
          <p className="text-sm text-brand-text-muted">
            Define an Access action and the Include / Require / Exclude rules
            that decide who matches — same model as Cloudflare Zero Trust.
          </p>
        </div>

        <section className="flex flex-col gap-5 rounded-lg border border-brand-input-border bg-brand-surface p-4 sm:p-6">
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel
              htmlFor="policy-name"
              className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
            >
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

          <Field data-invalid={!!form.formState.errors.decision}>
            <FieldLabel
              htmlFor="policy-decision"
              className="text-xs font-bold tracking-wider text-brand-text-label uppercase"
            >
              Action
            </FieldLabel>
            <select
              id="policy-decision"
              className={selectClassName}
              aria-invalid={!!form.formState.errors.decision}
              {...form.register("decision")}
            >
              {ACCESS_POLICY_DECISION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {decisionMeta ? (
              <FieldDescription className="text-brand-text-muted">
                {decisionMeta.description}
              </FieldDescription>
            ) : null}
            <FieldError errors={[form.formState.errors.decision]} />
          </Field>
        </section>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-brand-text-heading">
            Configure rules
          </h2>
          <p className="text-sm text-brand-text-muted">
            Every policy needs at least one Include rule. Require and Exclude
            narrow who can actually reach the app.
          </p>
        </div>

        {typeof form.formState.errors.include?.message === "string" ||
        typeof form.formState.errors.include?.root?.message === "string" ? (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.include.root?.message ??
              form.formState.errors.include.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-4">
          {RULE_SECTIONS.map((section) => (
            <RuleRows key={section.key} section={section} />
          ))}
        </div>

        {form.formState.errors.root?.message ? (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <Separator />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/content-policies">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? <CustomSpinner /> : null}
            Save policy
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
