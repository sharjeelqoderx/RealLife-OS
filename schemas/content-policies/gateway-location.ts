import { z } from "zod"

/** Create a Gateway DNS location (Audience / device scope). */
export const createGatewayLocationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Location name is required")
    .max(100, "Location name must be at most 100 characters"),
  /**
   * Ignored by the API. Customer creates always use `client_default: false`
   * so shared-account default DNS location cannot be changed.
   */
  clientDefault: z.literal(false).optional().default(false),
})

export type CreateGatewayLocationBody = z.infer<
  typeof createGatewayLocationSchema
>
