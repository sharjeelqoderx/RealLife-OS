import { z } from "zod"

export const personNameField = z
  .string()
  .trim()
  .min(1, "Full name is required")
  .min(2, "Full name must be at least 2 characters")
