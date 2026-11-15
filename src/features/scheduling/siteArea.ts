import { HCM_PROVINCE } from '@/services/administrativeUnitService'

/** Phường / quận của công trình; dự án chỉ nhận công trình ở TP.HCM nên chỉ ghi tỉnh khi khác */
export function siteArea(parts: (string | null | undefined)[], province?: string | null) {
  const text = [...parts, province === HCM_PROVINCE.name ? null : province].filter(Boolean).join(', ')
  return text || null
}
