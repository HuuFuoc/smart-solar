import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useLocation } from 'react-router'
import { type Portal } from '@/config/portals'
import { cx } from '@/utils/cx'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Count } from '@/components/common/ui/badge'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { sidebarAsideClass, sidebarOffset } from '@/components/layout/sidebar-style'
import { BrandMark, SidebarBrand, SidebarFooter, SidebarNav, type RailCount } from '@/components/layout/sidebar-parts'
import { PageCrumbContext, isNavItemActive, isNavItemPage, type PageCrumb } from '@/components/layout/page-crumb'

// Rail bên trái (288px), nội dung bên phải. Desktop có thể thu gọn rail còn 72px, dưới lg rail thành drawer
// Mở drawer thì focus vào nút "Đóng", đóng thì trả focus về "Menu", Esc để đóng
export type { RailCount }

const DESKTOP = '(min-width: 64rem)'

export function AppShell({
  portal,
  context,
  tools,
  badges,
  collapsedHint,
  children,
}: {
  portal: Portal
  context?: ReactNode
  tools?: ReactNode
  /** Số đếm thật cạnh mục menu, theo `to` của mục; 0 hoặc chưa có thì không hiện. */
  badges?: Record<string, RailCount | undefined>
  /** Nội dung ngắn trên thanh trên cùng khi menu nằm trong drawer, vd. "3 yêu cầu chờ nhận" */
  collapsedHint?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const desktop = useMediaQuery(DESKTOP)
  // Thu gọn chỉ có nghĩa từ lg; dưới lg rail luôn là drawer đầy đủ.
  const compact = collapsed && desktop
  const location = useLocation()
  const [crumb, setCrumb] = useState<PageCrumb | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // Nút cần nhận focus sau khi mở / đóng drawer (null: không đổi focus)
  const focusNext = useRef<RefObject<HTMLButtonElement | null> | null>(null)
  // Điện thoại không thấy menu: không có dòng nhắc riêng thì nút Menu mang tổng số đỏ
  const waiting = Object.values(badges ?? {}).reduce((sum, c) => sum + (c?.attention ? (c.value ?? 0) : 0), 0)

  function openDrawer() {
    focusNext.current = closeButtonRef
    setOpen(true)
  }

  function closeDrawer() {
    focusNext.current = menuButtonRef
    setOpen(false)
  }

  // Focus chuyển sau khi DOM đã đổi (nút vừa bấm có thể đã bị ẩn).
  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    target.current?.focus()
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    // Esc của dialog mở từ drawer chỉ đóng dialog đó
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open], [role=dialog]')) return
      closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Màn hình rộng ra quá lg thì đóng drawer, nếu không trang bị khoá cuộn
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP)
    const onChange = () => {
      if (desktop.matches) setOpen(false)
    }
    desktop.addEventListener('change', onChange)
    return () => desktop.removeEventListener('change', onChange)
  }, [])

  /* The page behind the drawer must not scroll while it is open. */
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-canvas focus:px-3 focus:py-2 focus:text-meta"
      >
        Bỏ qua, tới nội dung chính
      </a>

      <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-4 border-b border-line bg-rail px-4 md:px-6 lg:hidden">
        <span className="flex items-center gap-2 text-body font-semibold">
          <BrandMark className="size-6" />
          Smart Solar
        </span>
        <div className="flex min-w-0 items-center gap-3">
          {collapsedHint && <div className="flex min-w-0 items-center text-meta text-fg-2">{collapsedHint}</div>}
          <button
            ref={menuButtonRef}
            type="button"
            aria-controls="rail"
            aria-expanded={open}
            className="press -mr-2 inline-flex h-11 items-center gap-2 rounded-control px-2 text-body font-medium text-fg hover:bg-hover"
            onClick={openDrawer}
          >
            <Icon name="menu" className="text-[24px]" />
            Menu
            {!collapsedHint && waiting > 0 && (
              <>
                <Count value={waiting} attention />
                <span className="sr-only">việc chờ bạn</span>
              </>
            )}
          </button>
        </div>
      </header>

      <Rail
        portal={portal}
        context={context}
        tools={tools}
        badges={badges}
        open={open}
        compact={compact}
        onClose={closeDrawer}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        closeButtonRef={closeButtonRef}
      />

      <div className={cx('transition-[padding] duration-200 motion-reduce:transition-none', sidebarOffset(compact))}>
        {/* Dưới thanh trên (h-12) khi thanh đó hiện (dưới lg); từ lg dính sát mép trên. */}
        <div className="sticky top-12 z-10 border-b border-line bg-canvas px-4 md:px-6 lg:top-0">
          <LocationBar portal={portal} crumb={crumb?.pathname === location.pathname ? crumb.label : null} />
        </div>
        <PageCrumbContext value={setCrumb}>
          <main id="main" className="w-full p-4">
            {children}
          </main>
        </PageCrumbContext>
      </div>
    </div>
  )
}

function Rail({
  portal,
  context,
  tools,
  badges,
  open,
  compact,
  onClose,
  onToggleCollapsed,
  closeButtonRef,
}: {
  portal: Portal
  context?: ReactNode
  tools?: ReactNode
  badges?: Record<string, RailCount | undefined>
  open: boolean
  compact: boolean
  onClose: () => void
  onToggleCollapsed: () => void
  closeButtonRef: RefObject<HTMLButtonElement | null>
}) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-scrim lg:hidden" aria-hidden onClick={onClose} />}
      {/* Ba phần: đầu (thương hiệu + cổng), menu (tự cuộn), chân (thu gọn + tài khoản) */}
      <aside id="rail" className={sidebarAsideClass(compact, open)} aria-label="Điều hướng chính">
        <SidebarBrand
          compact={compact}
          portalName={portal.name}
          to={portal.home}
          onClose={onClose}
          closeButtonRef={closeButtonRef}
        />
        {context && !compact && <div className="shrink-0 px-4 pt-3 text-meta text-fg-2">{context}</div>}
        <SidebarNav
          label={portal.name}
          groups={portal.groups}
          badges={badges}
          compact={compact}
          onNavigate={open ? onClose : undefined}
          tools={tools}
        />
        <SidebarFooter compact={compact} controlsId="rail" onToggleCollapsed={onToggleCollapsed} />
      </aside>
    </>
  )
}

// Thanh định vị: portal / nhóm / mục / trang chi tiết. Mắt xích cuối là trang đang xem, không phải link
// Trên điện thoại chỉ hiện tên trang hiện tại
function LocationBar({ portal, crumb }: { portal: Portal; crumb: string | null }) {
  const { pathname } = useLocation()
  const group = portal.groups.find((g) => g.items.some((item) => isNavItemActive(item, pathname)))
  const item = group?.items.find((i) => isNavItemActive(i, pathname))
  const onItemPage = item ? isNavItemPage(item, pathname) : false

  type Step = { label: string; to?: string; wide?: boolean }
  const trail: Step[] = [{ label: portal.name, wide: true }]
  if (group?.label) trail.push({ label: group.label, to: group.items[0]?.to, wide: true })
  // Mục menu là link khi đang ở trang con của nó
  if (item) trail.push({ label: item.label, to: onItemPage ? undefined : item.to })
  if (crumb) trail.push({ label: crumb })

  const title = [trail[trail.length - 1]?.label, portal.name, 'Smart Solar'].filter(Boolean).join(' – ')
  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <nav aria-label="Vị trí hiện tại" className="flex h-10 items-center">
      <ol className="flex min-w-0 flex-1 items-center gap-2 text-meta">
        {trail.map((step, i) => {
          const last = i === trail.length - 1
          return (
            <li
              key={i}
              className={cx(
                'items-center gap-2',
                step.wide && !last ? 'hidden sm:flex' : 'flex',
                last ? 'min-w-0' : 'max-w-[45%] shrink-0 sm:max-w-none',
              )}
            >
              {i > 0 && (
                // Trên điện thoại các mắt xích "wide" phía trước bị ẩn: bỏ luôn dấu "/" đứng đầu.
                <span
                  aria-hidden
                  className={cx('text-fg-3', trail.slice(0, i).every((prev) => prev.wide) && 'hidden sm:inline')}
                >
                  /
                </span>
              )}
              {/* Mắt xích có `to` luôn là link, kể cả khi đứng cuối (trang chi tiết đang tải hoặc lỗi). */}
              {last && !step.to ? (
                <span aria-current="page" title={step.label} className="truncate font-semibold text-fg">
                  {step.label}
                </span>
              ) : step.to ? (
                <Link
                  to={step.to}
                  className="tap min-w-0 text-fg-2 underline-offset-4 hover:text-accent-fg hover:underline"
                >
                  <span className="min-w-0 truncate">{step.label}</span>
                </Link>
              ) : (
                <span className="truncate text-fg-2">{step.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
