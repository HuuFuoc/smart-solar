import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type AuthCardProps = {
  className?: string
  children: ReactNode
}

// Khung nội dung của cột form trong AuthLayout, không có nền hay bóng riêng
export function AuthCard({ className, children }: AuthCardProps) {
  return <div className={cn('flex flex-col', className)}>{children}</div>
}

/** Dấu * đỏ sau nhãn trường bắt buộc. */
export function RequiredMark() {
  return <span className="text-error">*</span>
}
