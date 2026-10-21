/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AddUnavailablePeriodRequest = {
  startsAt?: string | null
  endsAt?: string | null
  reason?: string | null
}

export type SetTechnicianZonesRequest = {
  zoneIds?: string[] | null
}

export type SetWorkingScheduleRequest = {
  useDefault?: boolean
  periods?: WorkingPeriodRequest[] | null
}

export type UpsertTechnicianProfileRequest = {
  isSchedulingActive?: boolean
  /** Format: int32 */
  maxAppointmentsPerDay?: number | null
}

export type WorkingPeriodRequest = {
  day?: string | null
  start?: string | null
  end?: string | null
}
