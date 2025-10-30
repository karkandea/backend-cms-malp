export type ValidationIssue = {
  field: string;
  message: string;
  code?: string;
};

export type ApiError = {
  code: string;
  message: string;
  field?: string;
  issues?: ValidationIssue[];
  details?: unknown;
};

export type ApiResponse<TData, TMeta = Record<string, unknown>> = {
  data: TData | null;
  error: ApiError | null;
  meta: TMeta | null;
};

export function success<TData, TMeta = Record<string, unknown>>(
  data: TData,
  meta: TMeta | null = null,
): ApiResponse<TData, TMeta> {
  return {
    data,
    error: null,
    meta,
  };
}

export function failure(
  code: string,
  message: string,
  options: { field?: string; issues?: ValidationIssue[]; details?: unknown } = {},
): ApiResponse<null> {
  return {
    data: null,
    error: {
      code,
      message,
      details: options.details,
      field: options.field,
      issues: options.issues,
    },
    meta: null,
  };
}
