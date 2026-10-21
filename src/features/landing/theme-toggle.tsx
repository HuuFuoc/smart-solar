import { Icon } from '@/components/common/stitch-ui/Icon'
import { WithTooltip } from '@/components/common/ui/tooltip'
import { useResolvedTheme, useTheme } from '@/hooks/useTheme'
import { cx } from '@/utils/cx'
import { themeToggle } from '@/data/landing'

// Nút sáng / tối: bấm thì chuyển sang giao diện ngược lại và lưu lựa chọn
// Icon là giao diện sẽ chuyển sang. Khung 40px nhưng vùng bấm 44px
export function ThemeToggle({ className }: { className?: string }) {
  const resolved = useResolvedTheme()
  const [, setTheme] = useTheme()
  const dark = resolved === 'dark'

  return (
    <WithTooltip label={dark ? themeToggle.toLight : themeToggle.toDark} side="bottom">
      {(tip) => (
        <button
          type="button"
          aria-label={themeToggle.label}
          aria-pressed={dark}
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          className={cx(
            'press relative inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-line text-fg-2',
            'after:absolute after:-inset-0.5 after:content-[""] hover:border-line-2 hover:bg-hover hover:text-fg active:bg-pressed',
            className,
          )}
          {...tip}
        >
          <ThemeIcon name="dark_mode" shown={!dark} />
          <ThemeIcon name="light_mode" shown={dark} />
        </button>
      )}
    </WithTooltip>
  )
}

// Hai icon chồng nhau, icon cũ xoay ra và icon mới xoay vào
function ThemeIcon({ name, shown }: { name: string; shown: boolean }) {
  return (
    <Icon
      name={name}
      className={cx(
        'absolute text-[20px] transition-[opacity,rotate,scale] duration-300 ease-ld',
        shown ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0',
      )}
    />
  )
}
