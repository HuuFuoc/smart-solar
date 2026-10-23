export type SystemSettingValueRequest = {
  key: string
  value: number
  unit?: string
}

export type UpdateSchedulingSettingsRequest = {
  settings: SystemSettingValueRequest[]
  expectedVersion?: number
  reason: string
}
