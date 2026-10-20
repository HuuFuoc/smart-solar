import { cx } from '@/utils/cx'

/** Container của các trang công khai: 1200px, lề 16 / 32, tự canh giữa từ 1280. */
export const LANDING_CONTAINER = 'mx-auto w-full max-w-landing px-4 md:px-8 xl:px-0'

/** Lưới 4 cột trên mobile, 12 cột từ lg (cột 78px, gutter 24px ở 1200). */
export const PAGE_GRID = 'grid grid-cols-4 gap-x-4 lg:grid-cols-12 lg:gap-x-6'

// Nút chính của trang công khai: 48px trong nội dung, 40px trên header
// `display` là tham số riêng vì ghép thêm "hidden" từ ngoài sẽ không ẩn được nút
export function ctaClass(size: 'lg' | 'md' = 'lg', display = 'inline-flex') {
  return cx(
    display,
    'press items-center justify-center rounded-control bg-accent text-on-accent ld-action whitespace-nowrap hover:bg-accent-hover',
    size === 'lg' ? 'h-12 px-6' : 'h-11 px-4 lg:h-10',
  )
}

// Nút phụ cạnh nút chính ở hero, cùng cỡ với ctaClass('lg')
export function secondaryCtaClass(display = 'inline-flex') {
  return cx(
    display,
    'press h-12 items-center justify-center rounded-control border border-line-2 bg-canvas px-6 text-fg ld-action whitespace-nowrap hover:border-fg-3 hover:bg-surface-2',
  )
}

/** Link chữ trong nội dung: gạch chân để nhận ra là link khi không nhìn được màu. */
export const TEXT_LINK = 'text-accent-fg underline decoration-1 underline-offset-4 hover:decoration-2'
