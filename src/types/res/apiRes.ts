/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

/** Phần `error` trong wrapper *ApiResponse (schema ApiError). */
export type ApiErrorBody = {
  code?: string | null
  message?: string | null
  details?: unknown
  fieldErrors?: FieldError[] | null
}

export type FieldError = {
  field?: string | null
  code?: string | null
  message?: string | null
}

/** Dạng chung của mọi wrapper *ApiResponse; client.ts mở wrapper và trả `data`. */
export type ApiResponse<T> = {
  isSuccess?: boolean
  traceId?: string | null
  data?: T
  error?: ApiErrorBody
}
