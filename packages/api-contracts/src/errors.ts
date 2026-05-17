import { z } from "zod";

/**
 * Error shape returned by the API.
 * Loosely models RFC 7807 problem details but pragmatic for an internal API.
 */
export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export class ApiResponseError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;
  public readonly details: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
