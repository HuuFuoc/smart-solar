// Vị trí mặt trời theo công thức gần đúng của NOAA (sai số dưới 1 độ), đủ để vẽ bóng nắng trong cảnh 3D.
// Phương vị tính từ hướng Bắc theo chiều kim đồng hồ: 90 là Đông, 180 là Nam, 270 là Tây.

const DEGREE = Math.PI / 180
const HOUR_MS = 3_600_000
/** Việt Nam dùng giờ UTC+7 quanh năm */
const VIETNAM_UTC_OFFSET = 7

export type SunPosition = {
  /** Độ cao so với đường chân trời (độ), âm là mặt trời đã lặn */
  elevation: number
  /** Phương vị (độ) */
  azimuth: number
}

export function sunPosition(date: Date, latitude: number, longitude: number): SunPosition {
  // Góc năm (radian), tính theo ngày và giờ UTC
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / (24 * HOUR_MS)) + 1
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60
  const yearAngle = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (utcHours - 12) / 24)

  // Độ lệch giờ mặt trời so với giờ đồng hồ (phút) và độ xích vĩ của mặt trời (radian)
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(yearAngle) -
      0.032077 * Math.sin(yearAngle) -
      0.014615 * Math.cos(2 * yearAngle) -
      0.040849 * Math.sin(2 * yearAngle))
  const declination =
    0.006918 -
    0.399912 * Math.cos(yearAngle) +
    0.070257 * Math.sin(yearAngle) -
    0.006758 * Math.cos(2 * yearAngle) +
    0.000907 * Math.sin(2 * yearAngle) -
    0.002697 * Math.cos(3 * yearAngle) +
    0.00148 * Math.sin(3 * yearAngle)

  // Góc giờ: 0 lúc giữa trưa theo mặt trời, âm buổi sáng, mỗi giờ 15 độ
  const solarMinutes = utcHours * 60 + equationOfTime + 4 * longitude
  const hourAngle = (solarMinutes / 4 - 180) * DEGREE
  const lat = latitude * DEGREE

  const cosZenith = Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith)))
  // Công thức cho phương vị tính từ hướng Nam; cộng 180 độ để tính từ hướng Bắc
  const fromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat),
  )

  return {
    elevation: 90 - zenith / DEGREE,
    azimuth: (fromSouth / DEGREE + 180 + 360) % 360,
  }
}

/** Thời điểm `hour` giờ hôm nay theo giờ Việt Nam, ví dụ 9.5 là 9:30 */
export function vietnamTimeToday(hour: number, now = new Date()) {
  const vietnamNow = new Date(now.getTime() + VIETNAM_UTC_OFFSET * HOUR_MS)
  const midnightUtc = Date.UTC(vietnamNow.getUTCFullYear(), vietnamNow.getUTCMonth(), vietnamNow.getUTCDate())
  return new Date(midnightUtc + (hour - VIETNAM_UTC_OFFSET) * HOUR_MS)
}

/** 9.25 thành "9:15" */
export function formatHour(hour: number) {
  const totalMinutes = Math.round(hour * 60)
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  return `${Math.floor(totalMinutes / 60)}:${minutes}`
}
