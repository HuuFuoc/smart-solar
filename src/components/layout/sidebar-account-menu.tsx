import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { ROLE_LABELS } from '@/common/role'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Avatar } from '@/components/common/ui/avatar'
import { Segmented } from '@/components/common/ui/segmented'
import { WithTooltip } from '@/components/common/ui/tooltip'
import { useAuth } from '@/context/AuthProvider'
import { changePasswordContent } from '@/data/auth'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { useTheme, THEME_OPTIONS } from '@/hooks/useTheme'
import { canChangeOwnPassword } from '@/config/roles'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

const accountRow = 'press flex h-11 w-full items-center gap-3 rounded-control px-2 text-left text-body lg:h-9'

export function SidebarAccountMenu({ compact, showRole = true }: { compact: boolean; showRole?: boolean }) {
  const { user } = useAuth()
  const { name, email } = accountName(user)
  const label = name || email
  const role = user ? ROLE_LABELS[user.role] : ''
  const [open, setOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const position = anchor ? accountPanelPosition(anchor, compact) : null

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
        setAnchor(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      setAnchor(null)
      buttonRef.current?.focus()
    }
    const updateAnchor = () => {
      const bounds = buttonRef.current?.getBoundingClientRect()
      if (bounds) {
        setAnchor((current) =>
          current &&
          current.left === bounds.left &&
          current.top === bounds.top &&
          current.width === bounds.width &&
          current.height === bounds.height
            ? current
            : bounds,
        )
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updateAnchor)
    window.addEventListener('scroll', updateAnchor, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updateAnchor)
      window.removeEventListener('scroll', updateAnchor, true)
    }
  }, [open])

  return (
    <>
      <div ref={rootRef} className="relative">
        <WithTooltip side="right" label={compact && !open ? label : null}>
          {(tip) => (
            <button
              ref={buttonRef}
              type="button"
              aria-expanded={open}
              aria-controls={open ? panelId : undefined}
              aria-label={`Tài khoản: ${label}`}
              onClick={() => {
                if (open) {
                  setOpen(false)
                  setAnchor(null)
                } else {
                  setAnchor(buttonRef.current?.getBoundingClientRect() ?? null)
                  setOpen(true)
                }
              }}
              className={cx(
                compact
                  ? 'press relative mx-auto flex size-10 items-center justify-center rounded-control'
                  : 'press flex min-h-11 w-full items-center gap-3 rounded-control px-2 py-1.5 text-left',
                'text-fg hover:bg-hover',
                open && 'bg-hover',
              )}
              {...tip}
            >
              <Avatar name={label} size="sm" tone="accent" />
              {!compact && (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    {name ? (
                      <span className="block truncate text-body leading-tight font-medium">{name}</span>
                    ) : (
                      // Chưa có họ tên thì ghi đủ email, xuống dòng ở bất kỳ ký tự nào
                      <span className="block text-meta leading-tight font-medium break-all">{email}</span>
                    )}
                    {showRole && role && <span className="block truncate text-meta text-fg-2">{role}</span>}
                  </span>
                  <Icon name={open ? 'expand_more' : 'expand_less'} className="shrink-0 text-[20px] text-fg-3" />
                </>
              )}
            </button>
          )}
        </WithTooltip>
        {open &&
          position &&
          createPortal(
            <div
              ref={panelRef}
              id={panelId}
              className="fixed z-50 max-h-[calc(100dvh-1rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-container border border-line bg-panel p-2 shadow-pop"
              style={{ left: position.left, top: position.top, transform: 'translateY(-100%)' }}
            >
              <AccountActions
                onChangePassword={() => {
                  setOpen(false)
                  setAnchor(null)
                  setChangingPassword(true)
                }}
              />
            </div>,
            document.body,
          )}
      </div>
      {canChangeOwnPassword(user?.role) && (
        <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
      )}
    </>
  )
}

function accountPanelPosition(anchor: DOMRect, compact: boolean) {
  const width = Math.min(256, window.innerWidth - 16)
  const preferredLeft = compact ? anchor.right + 12 : anchor.left
  return {
    left: Math.max(8, Math.min(preferredLeft, window.innerWidth - width - 8)),
    top: compact ? anchor.bottom : anchor.top - 8,
  }
}

function accountName(user: { name: string; email: string } | null) {
  if (!user) return { name: '', email: '' }
  const hasName = user.name.trim() !== '' && user.name !== user.email
  return { name: hasName ? user.name : '', email: user.email }
}

function AccountActions({ onChangePassword }: { onChangePassword: () => void }) {
  const { user, signOut } = useAuth()
  const { name, email } = accountName(user)
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()
  const current = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0]!

  async function handleSignOut() {
    await signOut()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <>
      <div className="px-2 py-2">
        {name && <p className="text-body font-medium text-fg [overflow-wrap:anywhere]">{name}</p>}
        <p className={cx('[overflow-wrap:anywhere]', name ? 'text-meta text-fg-2' : 'text-body font-medium text-fg')}>
          {email}
        </p>
        <p className="text-meta text-fg-2">{user ? ROLE_LABELS[user.role] : ''}</p>
      </div>
      <div className="my-1 border-t border-line" />
      {canChangeOwnPassword(user?.role) && (
        <button
          type="button"
          onClick={onChangePassword}
          className={cx(accountRow, 'text-fg-2 hover:bg-hover hover:text-fg')}
        >
          <Icon name="key" className="text-[20px]" />
          {changePasswordContent.menuLabel}
        </button>
      )}
      <div className="px-2 pt-2 pb-1">
        <p aria-hidden className="mb-2 flex items-center gap-3 text-body text-fg-2">
          <Icon name={current.icon} className="text-[20px]" />
          Giao diện
        </p>
        <Segmented
          label="Giao diện"
          size="sm"
          options={THEME_OPTIONS.map(({ value, label }) => ({ value, label }))}
          value={theme}
          onChange={setTheme}
        />
      </div>
      <div className="my-1 border-t border-line" />
      <button
        type="button"
        onClick={handleSignOut}
        className={cx(accountRow, 'text-fg-2 hover:bg-danger-soft hover:text-danger')}
      >
        <Icon name="logout" className="text-[20px]" />
        Đăng xuất
      </button>
    </>
  )
}
