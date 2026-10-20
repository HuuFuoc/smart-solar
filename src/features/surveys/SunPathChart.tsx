import { cn } from '@/utils/cn'

/*
 * Biểu đồ quỹ đạo mặt trời (GIS Solar Potential Model) – SVG nội tuyến lấy từ site_survey_task/code.html.
 * Mọi màu đổi sang biến token trong globals.css; riêng nét đứt của vòm trời dùng outline-variant
 * thay cho #cbd5e1 (màu slate mặc định của Tailwind, không có trong bảng token).
 */
export type SunPathChartProps = { className?: string }

export function SunPathChart({ className }: SunPathChartProps) {
  return (
    <svg
      viewBox="0 0 320 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Quỹ đạo mặt trời từ 08:00 đến 18:00, có vùng bóng che buổi sáng"
      className={cn('h-24 w-full', className)}
    >
      {/* Vòm trời */}
      <path
        d="M 20 80 Q 160 10 300 80"
        stroke="var(--color-outline-variant)"
        strokeDasharray="4 4"
        strokeWidth={2}
      />
      {/* Cung giờ nắng tối ưu */}
      <path d="M 50 80 Q 160 25 270 80" stroke="var(--color-primary-container)" strokeWidth={2.5} />
      {/* Vùng bị che buổi sáng */}
      <path d="M 40 80 Q 90 40 120 75 Z" fill="var(--color-secondary-fixed)" opacity={0.45} />
      <text x={75} y={68} fontSize={9} fill="var(--color-secondary)">
        Bóng sáng
      </text>
      {/* Mặt trời */}
      <circle cx={160} cy={25} r={7} fill="var(--color-secondary-container)" />
      <circle cx={160} cy={25} r={12} opacity={0.5} stroke="var(--color-secondary-container)" strokeWidth={1.5} />
      {/* Đường chân trời */}
      <line x1={10} x2={310} y1={80} y2={80} stroke="var(--color-outline)" strokeWidth={1} />
      <text x={20} y={88} fontSize={9} fill="var(--color-outline)">
        08:00 AM
      </text>
      <text x={145} y={88} fontSize={9} fontWeight="bold" fill="var(--color-primary)">
        13:00 (Zenith)
      </text>
      <text x={265} y={88} fontSize={9} fill="var(--color-outline)">
        18:00 PM
      </text>
    </svg>
  )
}
