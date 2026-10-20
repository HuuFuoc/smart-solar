import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'
import { passwordRules, registerContent } from '@/data/auth'

export type PasswordRulesProps = {
  /** Giá trị mật khẩu đang gõ – checklist đổi màu theo thời gian thực */
  value: string
  className?: string
}

/** Checklist 4 quy chuẩn mật khẩu (auth_portal: view Đăng ký và Đặt lại mật khẩu). */
export function PasswordRules({ value, className }: PasswordRulesProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-xl bg-surface-container-low p-space-sm', className)}>
      <span className="text-label-sm font-semibold text-on-surface-variant">{registerContent.rulesTitle}</span>
      <ul className="grid grid-cols-1 gap-1 text-body-sm sm:grid-cols-2">
        {passwordRules.map((rule) => {
          const passed = rule.test(value)
          return (
            <li
              key={rule.id}
              className={cn('flex items-center gap-1.5', passed ? 'text-ok' : 'text-on-surface-variant')}
            >
              <Icon
                name={passed ? 'check_circle' : 'radio_button_unchecked'}
                className={cn('text-[16px]', passed ? 'text-ok' : 'text-outline')}
              />
              <span>{rule.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
