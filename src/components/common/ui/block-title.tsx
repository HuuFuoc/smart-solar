import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'

// Tiêu đề khối có icon thương hiệu đứng trước, dùng trong trang bọc `.sv-detail` (kiểu ở survey-detail.css)
export function BlockTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span className="sv-title">
      <Icon name={icon} className="text-[20px]" />
      {children}
    </span>
  )
}
