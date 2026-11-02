export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new AppError(400, "BAD_REQUEST", message, fields);
export const validationError = (fields: Record<string, string>, message = "Please check the highlighted fields") =>
  new AppError(400, "VALIDATION_ERROR", message, fields);
export const unauthorized = (message = "Please sign in to continue") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have access to this resource") => new AppError(403, "FORBIDDEN", message);
/** Used for records that do not exist OR belong to another user — never reveal which. */
export const notFound = (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found`);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);
