import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { WithTooltip } from '@/components/common/ui/tooltip'
import { cx } from '@/utils/cx'

// Màu theo loại việc, nút nào cũng có icon:
// primary: việc chính của màn (Gửi, Lưu, Đồng ý), mỗi màn một nút
// soft: thêm, sửa, đổi, nhận việc (Thêm ảnh, Sửa, Đổi lịch)
// info: xem, mở chi tiết (Xem, Xử lý, Lập báo giá)
// secondary: đóng hộp thoại, thử lại, tải về. ghost: thao tác kín đáo (Xoá bộ lọc)
// warn: tạm dừng, việc cần chú ý (Ngừng bán, Khách vắng, Trả lại việc)
// danger: từ chối, huỷ, xoá, báo lỗi. danger-quiet: nút xoá lặp lại trên từng dòng, chỉ đỏ khi rê chuột
// danger-solid: nút xác nhận trong hộp thoại xoá
type Variant = 'primary' | 'soft' | 'info' | 'secondary' | 'ghost' | 'warn' | 'danger' | 'danger-quiet' | 'danger-solid'
type Size = 'sm' | 'md'

/* Disabled is a colour, not an opacity, so borders and fills stay crisp. */
const base =
  'press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-body font-medium select-none disabled:text-fg-3'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent not-disabled:hover:bg-accent-hover disabled:bg-surface-3',
  soft: 'border border-accent-line/50 bg-accent-soft text-accent-fg not-disabled:hover:border-accent-line not-disabled:hover:bg-accent-muted disabled:border-line disabled:bg-surface-2',
  info: 'border border-info/45 bg-canvas text-info not-disabled:hover:border-info not-disabled:hover:bg-info-soft disabled:border-line',
  secondary:
    'border border-line-2 bg-canvas text-fg not-disabled:hover:border-fg-3 not-disabled:hover:bg-surface-2 disabled:border-line',
  ghost: 'text-fg-2 not-disabled:hover:bg-hover not-disabled:hover:text-fg not-disabled:active:bg-pressed',
  warn: 'border border-warn/75 bg-canvas text-warn not-disabled:hover:border-warn not-disabled:hover:bg-warn-soft disabled:border-line',
  danger:
    'border border-danger/45 bg-canvas text-danger not-disabled:hover:border-danger not-disabled:hover:bg-danger-soft disabled:border-line',
  'danger-quiet':
    'text-fg-2 not-disabled:hover:bg-danger-soft not-disabled:hover:text-danger focus-visible:text-danger',
  'danger-solid': 'bg-danger-fill text-on-danger not-disabled:hover:bg-danger-hover disabled:bg-surface-3',
}

/* Every button is a 44px touch target below the desktop breakpoint. */
const sizes: Record<Size, string> = {
  sm: 'h-11 px-3 lg:h-8',
  md: 'h-11 px-4 lg:h-10',
}

// Nút ghost giữ vùng bấm nhưng lấn lề để chữ thẳng mép nội dung
const ghostSizes: Record<Size, string> = {
  sm: 'h-11 -mx-3 px-3 lg:h-8',
  md: 'h-11 -mx-3 px-3 lg:h-10',
}

/* Nút chỉ có icon: vuông, cùng chiều cao với nút chữ cùng cỡ. */
const iconSizes: Record<Size, string> = {
  sm: 'size-11 lg:size-8',
  md: 'size-11 lg:size-10',
}

/** `bleed`: nút ghost lấn lề, tắt khi nút nằm trong một cụm nút */
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string, bleed = true) {
  return cx(base, variants[variant], variant === 'ghost' && bleed ? ghostSizes[size] : sizes[size], className)
}

// Icon trước nhãn: tên Material Symbols hoặc node
function ButtonIcon({ icon }: { icon?: ReactNode | string }) {
  if (!icon) return null
  return typeof icon === 'string' ? <Icon name={icon} className="-ml-0.5 text-[20px]" /> : <>{icon}</>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode | string
  bleed?: boolean
  /** React 19: ref là prop thường, đi qua `...rest` xuống <button> */
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  bleed,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className, bleed)} {...rest}>
      <ButtonIcon icon={icon} />
      {children}
    </button>
  )
}

type ButtonLinkProps = LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode | string; bleed?: boolean }

export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  icon,
  bleed,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className, bleed)} {...rest}>
      <ButtonIcon icon={icon} />
      {children}
    </Link>
  )
}

// Nút chỉ có icon. `label` dùng cho trình đọc màn hình và hiện thành tooltip
export function IconButton({
  icon,
  label,
  tooltip,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: string
  label: string
  /** Chữ ngắn trên tooltip khi `label` quá dài */
  tooltip?: string
  variant?: Variant
  size?: Size
}) {
  return (
    <WithTooltip label={tooltip ?? label}>
      {(tip) => (
        <button
          type={type}
          aria-label={label}
          className={cx(base, variants[variant], iconSizes[size], className)}
          {...rest}
          {...tip}
        >
          <Icon name={icon} className="text-[20px]" />
        </button>
      )}
    </WithTooltip>
  )
}
