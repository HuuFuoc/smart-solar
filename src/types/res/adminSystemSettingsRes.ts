export type SystemSettingView = {
  key: string
  type: string
  unit: string
  value: number
  defaultValue: number
  min: number
  max: number
  source: string
  adminEditable: boolean
  description: string
  version: number
  updatedAt: string | null
  updatedByUserId: string | null
}

export type SchedulingSettingsView = {
  version: number
  bootstrap: boolean
  updatedAt: string | null
  updatedByUserId: string | null
  cacheTtlSeconds: number
  settings: SystemSettingView[]
  rules: string[]
}

export type SystemSettingRevisionView = {
  id: string
  key: string
  version: number
  oldValue: number
  newValue: number
  unit: string
  changedByUserId: string
  changedAt: string
  reason: string | null
}

export type PagedResult<T> = {
  items: T[]
  totalItems: number
  totalPages: number
  page: number
  pageSize: number
  total?: number
}
