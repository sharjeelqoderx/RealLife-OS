import { z } from "zod"

export const accessPolicyDecisionSchema = z.enum(["allow", "deny", "bypass"])

export const accessPolicySelectorSchema = z.enum([
  "everyone",
  "email",
  "email_domain",
  "ip",
  "group",
])

export const accessPolicyRuleSchema = z
  .object({
    selector: accessPolicySelectorSchema,
    value: z.string().trim(),
  })
  .superRefine((rule, ctx) => {
    if (rule.selector === "everyone") {
      return
    }

    if (!rule.value) {
      ctx.addIssue({
        code: "custom",
        message: "Value is required for this selector",
        path: ["value"],
      })
      return
    }

    if (rule.selector === "email") {
      const emailCheck = z
        .string()
        .email("Enter a valid email")
        .safeParse(rule.value)
      if (!emailCheck.success) {
        ctx.addIssue({
          code: "custom",
          message:
            emailCheck.error.issues[0]?.message ?? "Enter a valid email",
          path: ["value"],
        })
      }
    }

    if (rule.selector === "email_domain" && !rule.value.includes(".")) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid domain (e.g. company.com)",
        path: ["value"],
      })
    }
  })

export const createAccessPolicySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Policy name is required")
    .max(100, "Policy name is too long"),
  decision: accessPolicyDecisionSchema,
  include: z
    .array(accessPolicyRuleSchema)
    .min(1, "At least one Include rule is required"),
  require: z.array(accessPolicyRuleSchema),
  exclude: z.array(accessPolicyRuleSchema),
})

export type AccessPolicyDecision = z.infer<typeof accessPolicyDecisionSchema>
export type AccessPolicySelector = z.infer<typeof accessPolicySelectorSchema>
export type AccessPolicyRuleInput = z.infer<typeof accessPolicyRuleSchema>
export type CreateAccessPolicyInput = z.infer<typeof createAccessPolicySchema>

export const ACCESS_POLICY_DECISION_OPTIONS: {
  value: AccessPolicyDecision
  label: string
  description: string
}[] = [
  {
    value: "allow",
    label: "Allow",
    description: "Allow access for users who match this policy.",
  },
  {
    value: "deny",
    label: "Block",
    description: "Block access for users who match this policy.",
  },
  {
    value: "bypass",
    label: "Bypass",
    description: "Skip Access authentication for matching traffic.",
  },
]

export const ACCESS_POLICY_SELECTOR_OPTIONS: {
  value: AccessPolicySelector
  label: string
  needsValue: boolean
  placeholder?: string
}[] = [
  { value: "everyone", label: "Everyone", needsValue: false },
  {
    value: "email",
    label: "Emails",
    needsValue: true,
    placeholder: "user@company.com",
  },
  {
    value: "email_domain",
    label: "Emails ending in",
    needsValue: true,
    placeholder: "company.com",
  },
  {
    value: "ip",
    label: "IP ranges",
    needsValue: true,
    placeholder: "192.168.1.0/24",
  },
  {
    value: "group",
    label: "Access group",
    needsValue: true,
    placeholder: "Group ID",
  },
]
