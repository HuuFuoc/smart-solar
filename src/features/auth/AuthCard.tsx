import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type AuthCardProps = {
  className?: string
  children: ReactNode
}

/*
 * Khung nội dung của cột form trong AuthLayout. Không còn nền, bóng hay padding riêng: cột phải
 * đã là nền, bọc thêm một thẻ chỉ tốn 96px chiều cao và làm các màn tràn khỏi một màn hình.
 */
export function AuthCard({ className, children }: AuthCardProps) {
  return <div className={cn('flex flex-col', className)}>{children}</div>
}

/** Dấu * đỏ sau nhãn trường bắt buộc. */
export function RequiredMark() {
  return <span className="text-error">*</span>
}
