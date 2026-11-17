import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useLocation } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Count } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { WithTooltip } from '@/components/common/ui/tooltip'
import { sidebarAsideClass, sidebarOffset } from '@/components/layout/sidebar-style'
import { SidebarBrand, SidebarFooter, SidebarNav, type RailCount } from '@/components/layout/sidebar-parts'
import { PageCrumbContext, isNavItemActive, isNavItemPage, type PageCrumb } from '@/components/layout/page-crumb'
import { PORTALS } from '@/config/portals'
import { ChatWidget } from '@/features/chat/ChatWidget'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

// Khung của cổng khách hàng: sidebar trái (logo, menu, tài khoản ở đáy), nội dung bên phải
// Từ lg sidebar rộng 288px như khung nhân viên (phần chung ở sidebar-parts), thu gọn được còn cột icon 72px. Nội dung không giới hạn bề rộng, lề 24px
// Dưới lg sidebar là drawer mở bằng nút Menu
// Mở drawer thì focus vào nút đóng và phần còn lại của trang bị khoá (inert), đóng thì trả focus về nút Menu
const DESKTOP = '(min-width: 64rem)'

export function CustomerShell({
  badges,
  children,
}: {
  /** Số đếm cạnh mục menu, theo `to` của mục; 0 hoặc chưa có thì không hiện */
  badges?: Record<string, RailCount | undefined>
  children: ReactNode
}) {
  const portal = PORTALS.customer
  // "Thông báo" là chuông ở trên cùng, không nằm trong menu; vẫn giữ trong PORTALS để tiêu đề tab và số đếm đọc được
  const groups = portal.groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.to !== ROUTES.customer.notifications) }))
    .filter((group) => group.items.length > 0)
  const items = groups.flatMap((group) => group.items)
  const unread = badges?.[ROUTES.customer.notifications]?.value ?? 0
  // Điện thoại không thấy menu nên nút Menu mang tổng số việc đang chờ
  const waiting = Object.values(badges ?? {}).reduce((sum, c) => sum + (c?.attention ? (c.value ?? 0) : 0), 0)
  const { pathname } = useLocation()
  const [crumb, setCrumb] = useState<PageCrumb | null>(null)
  // Đường dẫn lúc mở drawer (null: đóng). Chuyển trang hoặc rộng tới lg thì drawer tự đóng, không cần effect
  const [drawerPath, setDrawerPath] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const desktop = useMediaQuery(DESKTOP)
  const drawerOpen = drawerPath === pathname && !desktop
  // Thu gọn chỉ có từ lg; drawer luôn rộng đủ
  const compact = collapsed && desktop
  const current = items.find((item) => isNavItemActive(item, pathname))
  const onItemPage = current ? isNavItemPage(current, pathname) : false
  const crumbLabel = crumb?.pathname === pathname ? crumb.label : null
  const pastTitle = usePastPageTitle(pathname)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // Nút cần nhận focus sau khi mở / đóng drawer (null: không đổi focus)
  const focusNext = useRef<RefObject<HTMLButtonElement | null> | null>(null)

  // Tiêu đề tab trình duyệt theo vị trí: "<trang> – Cổng khách hàng – Smart Solar".
  const title = [crumbLabel ?? current?.label, portal.name, 'Smart Solar'].filter(Boolean).join(' – ')
  useEffect(() => {
    document.title = title
  }, [title])

  function openDrawer() {
    focusNext.current = closeButtonRef
    setDrawerPath(pathname)
  }

  function closeDrawer() {
    focusNext.current = menuButtonRef
    setDrawerPath(null)
  }

  // Focus chuyển sau khi DOM đã đổi (nút vừa bấm có thể đã bị ẩn hoặc khoá).
  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    target.current?.focus()
  }, [drawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    // Esc của hộp thoại hoặc bảng tài khoản mở từ drawer chỉ đóng chính nó
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key !== 'Escape' ||
        e.defaultPrevented ||
        document.querySelector('dialog[open], [role=dialog]:not([data-chat-panel])')
      )
        return
      closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // Trang phía sau drawer không cuộn theo
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  return (
    <div className="min-h-dvh bg-canvas font-vn text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-canvas focus:px-3 focus:py-2 focus:text-meta"
      >
        Bỏ qua, tới nội dung chính
      </a>

      {drawerOpen && <div className="fixed inset-0 z-30 bg-scrim lg:hidden" aria-hidden onClick={closeDrawer} />}

      <aside
        id="customer-sidebar"
        aria-label="Điều hướng cổng khách hàng"
        className={sidebarAsideClass(compact, drawerOpen)}
      >
        <SidebarBrand
          compact={compact}
          portalName={portal.name}
          to={ROUTES.home}
          onClose={closeDrawer}
          closeButtonRef={closeButtonRef}
        />
        <SidebarNav
          label={portal.name}
          groups={groups}
          badges={badges}
          compact={compact}
          onNavigate={drawerOpen ? closeDrawer : undefined}
        />
        <SidebarFooter
          compact={compact}
          controlsId="customer-sidebar"
          onToggleCollapsed={() => setCollapsed(!collapsed)}
        />
      </aside>

      {/* Drawer đang mở thì phần còn lại không nhận focus hay thao tác */}
      <div
        inert={drawerOpen || undefined}
        className={cx('transition-[padding] duration-200 motion-reduce:transition-none', sidebarOffset(compact))}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas px-4 md:px-6 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            aria-controls="customer-sidebar"
            aria-expanded={drawerOpen}
            onClick={openDrawer}
            className="press -ml-2 inline-flex h-11 shrink-0 items-center gap-2 rounded-control px-2 text-body font-medium text-fg hover:bg-hover"
          >
            <Icon name="menu" className="text-[24px]" />
            Menu
            {waiting > 0 && (
              <>
                <Count value={waiting} attention />
                <span className="sr-only">việc chờ bạn</span>
              </>
            )}
          </button>
          <span aria-hidden className="h-6 border-l border-line" />
          {/* Tiêu đề trang (h1) còn thấy thì thanh trên chỉ ghi thương hiệu, cuộn qua rồi mới ghi tên mục */}
          <p className="flex min-w-0 items-center gap-2 text-body font-semibold">
            <img src="/images/mark-96.png" width={24} height={24} alt="" className="size-6 shrink-0" />
            <span className="truncate">{pastTitle ? (current?.label ?? portal.name) : 'Smart Solar'}</span>
          </p>
          <NotificationBell unread={unread} pathname={pathname} className="ml-auto inline-flex" />
        </header>

        <PageCrumbContext value={setCrumb}>
          {/* Máy tính không có thanh trên: chuông ở góc phải, tiêu đề trang đứng đầu chừa chỗ cho nó */}
          <main id="main" className="relative w-full p-4 pb-20 lg:[&>[data-page-header]:first-child]:pr-28">
            {/* Trang chi tiết: nút quay về mục đang chọn trên menu, tên trang đã có ở tiêu đề ngay dưới */}
            {current && !onItemPage && (
              <nav aria-label="Quay lại" className="mb-4">
                <ButtonLink to={current.to} icon="arrow_back" size="sm">
                  {current.label}
                </ButtonLink>
              </nav>
            )}
            {children}
            {/* Đứng cuối để tiêu đề trang vẫn là phần tử đầu tiên của main */}
            <NotificationBell
              unread={unread}
              pathname={pathname}
              className="absolute top-4 right-4 hidden lg:inline-flex"
            />
          </main>
        </PageCrumbContext>
      </div>
      <ChatWidget />
    </div>
  )
}

/** Chuông thông báo dẫn sang trang Thông báo. Số là thông báo chưa đọc; xám vì việc cần làm đã đỏ ở menu */
function NotificationBell({ unread, pathname, className }: { unread: number; pathname: string; className: string }) {
  const here = pathname === ROUTES.customer.notifications
  return (
    <WithTooltip label="Thông báo">
      {(tip) => (
        <Link
          to={ROUTES.customer.notifications}
          aria-label={unread ? `Thông báo, ${unread} mới` : 'Thông báo'}
          aria-current={here ? 'page' : undefined}
          className={cx(
            'press h-11 shrink-0 items-center justify-center gap-1 rounded-control border px-3 text-fg lg:h-10',
            here ? 'border-accent-line bg-accent-muted' : 'border-line-2 bg-canvas hover:bg-surface-2',
            className,
          )}
          {...tip}
        >
          <Icon name="notifications" className={cx('text-[20px]', here && 'icon-fill')} />
          {unread > 0 && <Count value={unread} />}
        </Link>
      )}
    </WithTooltip>
  )
}

// Thanh trên của điện thoại cao 56px (h-14)
const TOP_BAR = 56

/** Đã cuộn qua tiêu đề trang (h1 trong #main) chưa. Chuyển trang thì tính lại từ lần cuộn sau */
function usePastPageTitle(pathname: string) {
  const [pastOn, setPastOn] = useState<string | null>(null)
  useEffect(() => {
    const update = () => {
      const heading = document.querySelector('#main h1')
      const past = heading ? heading.getBoundingClientRect().bottom < TOP_BAR : window.scrollY > 0
      setPastOn(past ? window.location.pathname : null)
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return pastOn === pathname
}
