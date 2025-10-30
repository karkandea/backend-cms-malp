export type ValidationIssue = {
  field: string;
  message: string;
  code?: string;
};

export type ApiErrorOptions = {
  code: string;
  message: string;
  status?: number;
  field?: string;
  issues?: ValidationIssue[];
};

export class ApiErrorResponse extends Error {
  readonly code: string;
  readonly status: number;
  readonly field?: string;
  readonly issues?: ValidationIssue[];

  constructor({ code, message, status = 400, field, issues }: ApiErrorOptions) {
    super(message);
    this.code = code;
    this.status = status;
    this.field = field;
    this.issues = issues;
  }
}

export class ValidationErrorResponse extends ApiErrorResponse {
  constructor(options: Omit<ApiErrorOptions, "status">) {
    super({ ...options, status: 400 });
  }
}
