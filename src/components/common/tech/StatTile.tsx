import { cn } from '@/utils/cn'

// Ô số liệu nhỏ: nhãn, số lớn, chú thích
export type StatTileProps = {
  label: string
  value: string
  /** Đơn vị in nhạt, cỡ body-md, ngay sau số */
  unit?: string
  caption?: string
  /** Màu giá trị: secondary cho số liệu cảnh báo ("-4% Soiling") */
  valueTone?: 'default' | 'primary' | 'secondary'
  className?: string
}

const valueToneClasses = {
  default: 'text-on-surface',
  primary: 'text-primary',
  secondary: 'text-secondary-container',
} as const

export function StatTile({ label, value, unit, caption, valueTone = 'default', className }: StatTileProps) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-xl bg-surface-container-low p-space-sm', className)}>
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <span className={cn('text-headline-lg font-bold', valueToneClasses[valueTone])}>
        {value}
        {unit && <span className="text-body-md font-normal text-on-surface-variant"> {unit}</span>}
      </span>
      {caption && <span className="text-body-sm text-on-surface-variant">{caption}</span>}
    </div>
  )
}
