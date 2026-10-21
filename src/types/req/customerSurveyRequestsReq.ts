/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type BookSurveyAppointmentRequest = {
  startsAt?: string | null
  note?: string | null
}

export type CancelSurveyAppointmentRequest = {
  reason?: string | null
}
