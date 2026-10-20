import { useState, type ComponentProps, type ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

export type AuthInputProps = Omit<ComponentProps<'input'>, 'size'> & {
  /** Icon Material Symbols ở mép trái trong ô */
  leadingIcon?: string
  /** Nội dung ở mép phải (icon check, nút hiện/ẩn mật khẩu) */
  trailing?: ReactNode
  /** h-12 (login, forgot) hoặc h-11 (register, reset) như code.html */
  size?: 'md' | 'lg'
}

/*
  Ô nhập của màn xác thực, cùng kiểu với ô nhập portal kit (08/10/2026, thống nhất): nền trắng có viền, rê chuột viền đậm
  lên, focus là một vòng liền 2px màu thương hiệu, lỗi (aria-invalid) viền đỏ. Giữ icon ở đầu ô của thiết kế xác thực.
*/
export function AuthInput({ leadingIcon, trailing, size = 'lg', className, ...rest }: AuthInputProps) {
  return (
    <div className="relative flex items-center">
      {leadingIcon && (
        <Icon
          name={leadingIcon}
          className="pointer-events-none absolute left-3.5 text-[20px] text-on-surface-variant"
        />
      )}
      <input
        className={cn(
          'w-full rounded-control border border-line-2 bg-canvas text-body-md text-on-surface transition-colors placeholder:text-outline',
          'hover:border-fg-3 focus:border-accent focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
          'aria-invalid:border-danger aria-invalid:outline-danger',
          size === 'lg' ? 'h-12' : 'h-11',
          leadingIcon ? 'pl-11' : 'pl-3.5',
          trailing ? 'pr-11' : 'pr-4',
          className,
        )}
        {...rest}
      />
      {trailing && <span className="absolute right-3.5 flex items-center">{trailing}</span>}
    </div>
  )
}

export type PasswordInputProps = Omit<AuthInputProps, 'type' | 'trailing'>

/** AuthInput kèm nút hiện/ẩn mật khẩu (visibility / visibility_off). */
export function PasswordInput({ leadingIcon, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <AuthInput
      {...rest}
      leadingIcon={leadingIcon}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          onClick={() => setVisible((value) => !value)}
          className="p-1 text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name={visible ? 'visibility' : 'visibility_off'} className="text-[20px]" />
        </button>
      }
    />
  )
}
