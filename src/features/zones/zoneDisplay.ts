import type { Tone } from '@/components/common/ui/badge'
import { zoneState, type ZoneFlags } from '@/features/zones/zoneRules'
import { isApiError } from '@/services/api/errors'
import type {
  CommuneCodeProblemDetails,
  CommuneInUseDetails,
  CommuneMappedDetails,
  ZoneInUseDetails,
} from '@/types/res/operationalZonesRes'

// Nhãn của khu vực phục vụ và đọc `details` của các lỗi 409 / 422 khi sửa khu

const STATE_META: Record<ReturnType<typeof zoneState>, { label: string; tone: Tone }> = {
  open: { label: 'Đang nhận lịch', tone: 'ok' },
  paused: { label: 'Tạm ngừng nhận lịch', tone: 'warn' },
  inactive: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

export function zoneStateMeta(z: ZoneFlags) {
  return STATE_META[zoneState(z)]
}

const UNIT_TYPES: Record<string, string> = { WARD: 'Phường', COMMUNE: 'Xã', SPECIAL_ZONE: 'Đặc khu' }

export function unitTypeLabel(unitType: string) {
  return UNIT_TYPES[unitType] ?? unitType
}

function detailsOf<T>(error: unknown, code: string): T | null {
  return isApiError(error) && error.code === code && error.details && typeof error.details === 'object'
    ? (error.details as T)
    : null
}

export function mappedCommunesOf(error: unknown) {
  return detailsOf<CommuneMappedDetails>(error, 'COMMUNE_ALREADY_MAPPED')?.communes ?? []
}

export function communesInUseOf(error: unknown) {
  return detailsOf<CommuneInUseDetails>(error, 'COMMUNE_IN_USE')?.communes ?? []
}

export function zoneInUseOf(error: unknown) {
  return detailsOf<ZoneInUseDetails>(error, 'ZONE_IN_USE')
}

/** Mã phường, xã backend không nhận (không có trong danh mục, hoặc đã sáp nhập) */
export function communeCodeProblemsOf(error: unknown) {
  const d =
    detailsOf<CommuneCodeProblemDetails>(error, 'ADMINISTRATIVE_LOCATION_UNKNOWN') ??
    detailsOf<CommuneCodeProblemDetails>(error, 'ADMINISTRATIVE_LOCATION_SUPERSEDED')
  return d ? [...(d.unknownCommuneCodes ?? []), ...(d.supersededCommuneCodes ?? [])] : []
}

/** "2 lịch khảo sát, 1 công trình" */
export function blockingWorkText(appointments: number, projects: number) {
  return [appointments ? `${appointments} lịch khảo sát` : null, projects ? `${projects} công trình` : null]
    .filter(Boolean)
    .join(', ')
}
