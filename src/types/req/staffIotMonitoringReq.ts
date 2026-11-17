/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type BindIotDeviceRequest = {
  deviceId?: string | null
  note?: string | null
  replaceCurrent?: boolean | null
}

export type ReleaseIotBindingRequest = {
  reason?: string | null
}
