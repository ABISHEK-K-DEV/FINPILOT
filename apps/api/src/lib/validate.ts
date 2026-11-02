import type { z } from "zod";
import { fieldErrors } from "@finpilot/shared";
import { validationError } from "./errors.js";

/** Parse untrusted input with a zod schema; throws a 400 with per-field messages on failure. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw validationError(fieldErrors(result.error));
  return result.data;
}
