export type AppErrorCode =
  | 'validation_error'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'external_service_error'
  | 'internal_error'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[]

export type AppError = {
  code: AppErrorCode
  message: string
  status: number
  details?: JsonValue
}

export type AppResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: AppError
    }

const statusByCode: Record<AppErrorCode, number> = {
  validation_error: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  external_service_error: 502,
  internal_error: 500,
}

export function appError(
  code: AppErrorCode,
  message: string,
  details?: JsonValue,
): AppError {
  return {
    code,
    message,
    status: statusByCode[code],
    ...(details === undefined ? {} : { details }),
  }
}

export function ok<T>(data: T): AppResult<T> {
  return { ok: true, data }
}

export function err<T = never>(error: AppError): AppResult<T> {
  return { ok: false, error }
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  )
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  return appError('internal_error', 'Something went wrong.')
}

export function notImplemented(feature: string): AppError {
  return appError(
    'internal_error',
    `${feature} is not implemented in this rebuild slice yet.`,
  )
}
