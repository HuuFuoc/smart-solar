import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ROUTES } from '@/routes/paths'
import { type NavItem, type Portal } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { ROLE_LABELS } from '@/common/role'
import { canChangeOwnPassword } from '@/config/roles'
import { cx } from '@/utils/cx'
import { THEME_OPTIONS, useTheme } from '@/hooks/useTheme'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Avatar } from '@/components/common/ui/avatar'
import { Count } from '@/components/common/ui/badge'
import { WithTooltip } from '@/components/common/ui/tooltip'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { changePasswordContent } from '@/data/auth'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { PageCrumbContext, isNavItemActive, isNavItemPage, type PageCrumb } from '@/components/layout/page-crumb'

/*
  The shell is a margin, not a frame: the rail on the left, on its own faintly brand-tinted surface so navigation
  reads as a zone apart from the page, and the page as a document on the right. Context and tools for the portal
  live in the rail. Main padding is px-4 below md and px-6 from md, no max width (dense layout, 05/10/2026);
  ActionBar and Table bleed by the same amounts.
  Desktop: "Thu gọn menu" shrinks the rail to a 64px column of icons (mục menu kèm số đếm, thao tác tài khoản, tooltip
  bằng title), so the page gains the width and navigation stays one click away. Below lg the rail is a drawer opened
  from the slim top bar.
  Keyboard: collapse and expand are one button that keeps its place in the tree, so focus stays on it; opening the
  drawer moves focus to "Đóng", closing returns it to "Menu"; Esc closes the drawer; a closed drawer is invisible,
  so its links leave the Tab order.
  "Bạn đang ở đâu" (08/10/2026): mục đang mở trên rail có nền màu + vạch nhấn + icon tô đặc, nhóm chứa nó đậm lên, và
  một thanh định vị dính trên cùng nội dung ghi đường đi: portal / nhóm / mục / trang chi tiết (usePageCrumb).
*/
/** Số đếm cạnh mục menu. `attention`: việc đang chờ người dùng xử lý, tô đỏ như số thông báo. */
export type RailCount = { value?: number; attention?: boolean }

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
  /** Nội dung ngắn trên thanh trên cùng (dưới lg, khi menu nằm trong drawer), ví dụ "3 yêu cầu chờ nhận". */
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
  /* Nút cần nhận focus sau lần mở / đóng drawer do người dùng bấm (null: không đụng tới focus). */
  const focusNext = useRef<RefObject<HTMLButtonElement | null> | null>(null)

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
    // Esc của một hộp thoại mở từ drawer (Đổi mật khẩu) chỉ đóng hộp thoại đó, không đóng luôn drawer.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open], [role=dialog]')) return
      closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Drawer đang mở mà cửa sổ rộng qua lg (xoay máy tính bảng): đóng lại, nếu không trang bị khoá cuộn mà không thấy nút đóng.
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
          <BrandImage className="size-6" />
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

      <div className={collapsed ? 'lg:pl-16' : 'lg:pl-52'}>
        {/* Dưới thanh trên (h-12) khi thanh đó hiện (dưới lg); từ lg dính sát mép trên. */}
        <div className="sticky top-12 z-10 border-b border-line bg-canvas px-4 md:px-6 lg:top-0">
          <LocationBar portal={portal} crumb={crumb?.pathname === location.pathname ? crumb.label : null} />
        </div>
        <PageCrumbContext value={setCrumb}>
          <main id="main" className="w-full px-4 py-6 md:px-6">
            {children}
          </main>
        </PageCrumbContext>
      </div>
    </div>
  )
}

/*
  Biểu tượng thương hiệu (mặt trời, mái nhà, tấm pin), thu từ public/images/Logo.png về 96px nền trong suốt
  (public/images/mark-96.png): đủ nét cho màn 2x/3x ở cỡ 24–32px. Không dùng apple-touch-icon.png vì ảnh đó nền trắng đặc.
*/
function BrandImage({ className }: { className?: string }) {
  return <img src="/images/mark-96.png" width={32} height={32} alt="" className={cx('shrink-0', className)} />
}

/* Hàng thao tác trên rail (thu gọn, tài khoản): icon + nhãn đủ bề ngang, rê chuột hiện nền. 44px trong drawer, 36px từ lg. */
const railRow = 'press flex h-11 w-full items-center gap-3 rounded-control px-3 text-left text-body lg:h-9'
/* Nút vuông của rail thu gọn, căn giữa cột 64px (rail px-3 còn đúng 40px). */
const railIcon = 'press relative mx-auto flex size-10 items-center justify-center rounded-control'
const railQuiet = 'text-fg-2 hover:bg-hover hover:text-fg'
/* Đăng xuất: dễ thấy nhờ icon, chỉ chuyển đỏ khi rê chuột để không giành chú ý lúc bình thường. */
const railDanger = 'text-fg-2 hover:bg-danger-soft hover:text-danger'

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
  const { pathname } = useLocation()
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-scrim lg:hidden" aria-hidden onClick={onClose} />}
      {/*
        Ba phần: đầu (thương hiệu), menu (flex-1, tự cuộn), chân (thu gọn + tài khoản, không dính đè). Nhóm Tài khoản mở
        hết trên màn thấp chỉ làm menu ngắn lại và cuộn được, không phủ lên mục menu. Cả rail chỉ cuộn khi màn quá thấp.
      */}
      <aside
        id="rail"
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-y-auto overscroll-contain [scrollbar-width:thin] border-r border-line bg-rail pt-5 pb-4 duration-200',
          // Drawer điện thoại rộng 288px (nằm đè nội dung, cần chỗ cho tên portal và nút Đóng); rail desktop giữ 208px.
          compact ? 'w-16 px-3' : 'w-72 px-6 lg:w-52',
          // Đóng: ẩn hẳn (invisible gỡ khỏi thứ tự Tab và cây trợ năng), không chỉ đẩy ra ngoài màn hình.
          // Transition lấy theo trạng thái MỚI: lúc ẩn có visibility trong transition nên trượt ra hết rồi mới ẩn;
          // lúc hiện thì không, để rail hiện ngay và nhận được focus ở khung hình đầu. Từ lg rail luôn hiện.
          open ? 'visible translate-x-0 transition-[translate]' : 'invisible -translate-x-full transition-[translate,visibility]',
          'lg:visible lg:translate-x-0',
        )}
        aria-label="Điều hướng chính"
      >
        {compact ? (
          <div className="flex shrink-0 justify-center">
            <BrandImage className="size-8" />
            <span className="sr-only">Smart Solar, {portal.name}</span>
          </div>
        ) : (
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <BrandImage className="mt-0.5 size-8" />
              <div className="min-w-0">
                <p className="text-body font-semibold">Smart Solar</p>
                {/* text-balance: tên dài ngắt thành hai dòng cân ("Kinh doanh & / vận hành"), không bỏ một chữ lẻ xuống dòng. */}
                <p className="text-meta text-balance text-fg-2">{portal.name}</p>
              </div>
            </div>
            {/* Chỉ icon ✕ (tên đọc + tooltip "Đóng menu") để tên portal đủ chỗ trên một dòng. */}
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Đóng menu"
              title="Đóng menu"
              className="press -mt-1.5 -mr-3 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg-2 hover:bg-hover hover:text-fg lg:hidden"
              onClick={onClose}
            >
              <Icon name="close" className="text-[24px]" />
            </button>
          </div>
        )}
        {context && !compact && <div className="mt-4 shrink-0 text-meta text-fg-2">{context}</div>}

        {/* -mx-3 px-3: khung cuộn rộng bằng các hàng (hàng lấn 12px mỗi bên), để hàng không bị cắt hay sinh cuộn ngang. */}
        <nav className={cx('-mx-3 mt-6 min-h-28 flex-1 overflow-y-auto overscroll-contain px-3 [scrollbar-width:thin]', compact && 'pt-1.5')}>
          {portal.groups.map((group, gi) => {
            const groupActive = group.items.some((item) => isNavItemActive(item, pathname))
            return (
              <div key={gi} className={cx(gi > 0 && (compact ? 'mt-3 border-t border-line pt-3' : 'mt-5'))}>
                {group.label && !compact && (
                  <p className={cx('mb-1 text-meta font-medium', groupActive ? 'text-fg' : 'text-fg-2')}>{group.label}</p>
                )}
                <ul aria-label={compact ? group.label : undefined} className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {compact ? <RailIconLink item={item} count={badges?.[item.to]} /> : <RailLink item={item} count={badges?.[item.to]} />}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {tools && !compact && <div className="mt-6 space-y-3">{tools}</div>}
        </nav>

        <div className="mt-4 shrink-0">
          {/* Thu gọn / mở rộng chỉ có từ lg; cùng một nút ở cả hai trạng thái để focus không bị mất. */}
          <div className={cx('hidden lg:block', !compact && '-mx-3')}>
            <WithTooltip side="right" label={compact ? 'Mở rộng menu' : null}>
              {(tip) => (
                <button
                  type="button"
                  aria-controls="rail"
                  aria-expanded={!compact}
                  aria-label={compact ? 'Mở rộng menu' : undefined}
                  onClick={onToggleCollapsed}
                  className={cx(compact ? railIcon : railRow, railQuiet)}
                  {...tip}
                >
                  <Icon name={compact ? 'left_panel_open' : 'left_panel_close'} className="text-[20px]" />
                  {!compact && 'Thu gọn menu'}
                </button>
              )}
            </WithTooltip>
          </div>
          <SessionBlock compact={compact} onExpandRail={onToggleCollapsed} />
        </div>
      </aside>
    </>
  )
}

/*
  Rail rows are 44px tall in the drawer and 36px on the desktop rail, bo đủ bốn góc và thẳng mép với mọi hàng khác của
  rail (thu gọn, tài khoản). The open item sits on the accent tint with a 3px accent bar inside its left edge and a filled
  icon in the accent colour, so "where am I" reads at a glance; other rows show a neutral field on hover.
  Viền focus vẽ vào trong (outline-offset âm): khung cuộn của menu cắt mất phần viền vẽ ra ngoài.
*/
const railActiveBar = 'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-control before:bg-accent'

function RailLink({ item, count }: { item: NavItem; count?: RailCount }) {
  const { pathname } = useLocation()
  const active = isNavItemActive(item, pathname)
  const isPlaceholder = item.to === '#'
  const className = (on: boolean) =>
    cx(
      'group press relative -mx-3 flex items-center gap-3 rounded-control px-3 py-3 text-body focus-visible:-outline-offset-2 lg:py-2',
      on ? cx('bg-accent-muted font-semibold text-fg', railActiveBar) : 'text-fg-2 hover:bg-hover hover:text-fg',
    )
  const inner = (on: boolean) => (
    <>
      <Icon name={item.icon} className={cx('shrink-0 text-[20px]', on ? 'icon-fill text-accent-fg' : 'text-fg-3 group-hover:text-fg-2')} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && <span className="text-meta text-accent-fg">{item.badge}</span>}
      {!item.badge && count?.value ? <Count value={count.value} attention={count.attention} /> : null}
    </>
  )
  if (isPlaceholder) {
    return (
      <button type="button" className={cx(className(false), 'w-[calc(100%+1.5rem)] text-left')} aria-disabled title="Chưa có trong bản này">
        {inner(false)}
      </button>
    )
  }
  return (
    // Link thường thay NavLink: NavLink bỏ aria-current khi đường dẫn không khớp hẳn, kể cả lúc đang ở trang con.
    // Đúng trang của mục: "page"; trang con (chi tiết…): "location".
    <Link
      to={item.to}
      aria-current={active ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
      className={className(active)}
    >
      {inner(active)}
    </Link>
  )
}

/* Mục menu khi rail thu gọn: chỉ còn icon (tên đọc qua aria-label, tooltip khi rê chuột hoặc focus), số đếm ở góc. */
function RailIconLink({ item, count }: { item: NavItem; count?: RailCount }) {
  const { pathname } = useLocation()
  const active = isNavItemActive(item, pathname)
  const label = count?.value ? `${item.label} (${count.value})` : item.label
  const className = cx(railIcon, 'focus-visible:-outline-offset-2', active ? cx('bg-accent-muted text-accent-fg', railActiveBar) : railQuiet)
  const inner = (
    <>
      <Icon name={item.icon} className={cx('text-[20px]', active && 'icon-fill')} />
      {count?.value ? <Count value={count.value} attention={count.attention} className="absolute -top-1.5 -right-1.5" /> : null}
    </>
  )
  if (item.to === '#') {
    return (
      <WithTooltip side="right" label={`${item.label} (chưa có trong bản này)`}>
        {(tip) => (
          <button type="button" className={className} aria-disabled aria-label={item.label} {...tip}>
            {inner}
          </button>
        )}
      </WithTooltip>
    )
  }
  return (
    <WithTooltip side="right" label={item.label}>
      {(tip) => (
        <Link
          to={item.to}
          aria-label={label}
          aria-current={active ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
          className={className}
          {...tip}
        >
          {inner}
        </Link>
      )}
    </WithTooltip>
  )
}

/*
  Thanh định vị: portal / nhóm menu / mục đang mở / trang chi tiết (hoặc bước wizard).
  - Mắt xích cuối là trang đang xem (aria-current, không phải link); mục menu là link về danh sách khi đang ở trang
    con, kể cả lúc trang con còn đang tải hoặc báo lỗi (404/403), để không thành đường cụt.
  - Điện thoại: ẩn tên portal và nhóm, nhường chỗ cho tên trang hiện tại; tên quá dài thì cắt "…" và có tooltip.
  - Tiêu đề tab trình duyệt đi theo vị trí: "<trang> – <portal> – Smart Solar".
*/
function LocationBar({ portal, crumb }: { portal: Portal; crumb: string | null }) {
  const { pathname } = useLocation()
  const group = portal.groups.find((g) => g.items.some((item) => isNavItemActive(item, pathname)))
  const item = group?.items.find((i) => isNavItemActive(i, pathname))
  const onItemPage = item ? isNavItemPage(item, pathname) : false

  type Step = { label: string; to?: string; wide?: boolean }
  const trail: Step[] = [{ label: portal.name, wide: true }]
  if (group?.label) trail.push({ label: group.label, to: group.items[0]?.to, wide: true })
  // Mục menu là link khi đang ở trang con của nó, hoặc khi còn mắt xích sau nó (bước wizard: không link về chính trang).
  if (item) trail.push({ label: item.label, to: onItemPage ? undefined : item.to })
  if (crumb) trail.push({ label: crumb })

  const title = [trail[trail.length - 1]?.label, portal.name, 'Smart Solar'].filter(Boolean).join(' – ')
  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <nav aria-label="Vị trí hiện tại" className="flex h-10 items-center">
      {/* flex-1: giới hạn 45% của các mắt xích trước tính theo cả bề ngang thanh, không theo bề rộng đã co lại. */}
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
                <span aria-hidden className={cx('text-fg-3', trail.slice(0, i).every((prev) => prev.wide) && 'hidden sm:inline')}>
                  /
                </span>
              )}
              {/* Mắt xích có `to` luôn là link, kể cả khi đứng cuối (trang chi tiết đang tải hoặc lỗi). */}
              {last && !step.to ? (
                <span aria-current="page" title={step.label} className="truncate font-semibold text-fg">
                  {step.label}
                </span>
              ) : step.to ? (
                <Link to={step.to} className="tap min-w-0 text-fg-2 underline-offset-4 hover:text-accent-fg hover:underline">
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

const THEMES = THEME_OPTIONS

/* Hàng trong tầng con của nhóm Tài khoản: cùng chiều cao với mọi hàng của rail, đệm ngang hẹp hơn vì đã thụt vào. */
const subRow = 'press flex h-11 w-full items-center gap-3 rounded-control px-2 text-left text-body lg:h-9'

/*
  Tài khoản ở đáy rail, phân tầng như nhóm menu (08/10/2026, góp ý "không bày tài khoản ra, phân tầng các chức năng nhỏ"):
  mặc định chỉ một hàng "Tài khoản" cùng kiểu với mục menu. Bấm vào mới mở tầng con thụt vào, nối bằng đường dọc:
  ai đang đăng nhập (chỉ đọc), Đổi mật khẩu, Giao diện (mở thêm một tầng: Tự động / Sáng / Tối, lựa chọn đang dùng có
  nền "đang chọn" và dấu tích), Đăng xuất (đỏ khi rê chuột). Mọi hàng cùng chiều cao nên nhịp đều.
  Rail thu gọn: chỉ một nút icon Tài khoản; bấm thì rail mở rộng và nhóm mở sẵn. Đó là cùng một nút nên focus không mất.
  Tài khoản thật lấy từ AuthProvider; Đổi mật khẩu gọi POST /api/auth/change-password.
  Chỉ khách hàng thấy "Đổi mật khẩu" (canChangeOwnPassword, config/roles.ts). Khách hàng có khung riêng (customer-shell),
  nên ở rail nhân viên mục này thực tế không hiện; giữ điều kiện để quy định nằm một chỗ.
*/
const canChangePassword = canChangeOwnPassword
/* Nhóm Tài khoản đang mở hay đóng, nhớ theo trình duyệt: ai hay dùng thì để mở, Đăng xuất còn một lần bấm. */
const ACCOUNT_OPEN_KEY = 'smartsolar.rail-account-open'

function useAccountGroupOpen() {
  const [open, setOpenState] = useState(() => {
    try {
      return localStorage.getItem(ACCOUNT_OPEN_KEY) === '1'
    } catch {
      return false
    }
  })
  const setOpen = (next: boolean) => {
    setOpenState(next)
    try {
      if (next) localStorage.setItem(ACCOUNT_OPEN_KEY, '1')
      else localStorage.removeItem(ACCOUNT_OPEN_KEY)
    } catch {
      /* Trình duyệt chặn storage: vẫn mở / đóng được, chỉ không nhớ sau khi tải lại. */
    }
  }
  return [open, setOpen] as const
}

function SessionBlock({ compact, onExpandRail }: { compact: boolean; onExpandRail: () => void }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()
  const [open, setOpen] = useAccountGroupOpen()
  const [themeOpen, setThemeOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const groupId = useId()
  const themeId = useId()
  const name = user?.name ?? ''
  // Rail chỉ rộng 208px: khi chưa có họ tên (tên = email) thì ghi phần trước "@", email đầy đủ nằm trong tầng con.
  const shortName = user?.email && name === user.email ? name.split('@')[0]! : name
  const role = user ? ROLE_LABELS[user.role] : ''
  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0]!
  const expanded = open && !compact

  async function handleSignOut() {
    await signOut()
    navigate(ROUTES.login, { replace: true })
  }

  function onAccountClick() {
    if (compact) {
      setOpen(true)
      onExpandRail()
    } else {
      setOpen(!open)
    }
  }

  return (
    <div className="mt-2 border-t border-line pt-2">
      <div className={cx(!compact && '-mx-3')}>
        {/* Hàng nhóm ghi tên người đang đăng nhập (chữ cái đầu + tên; backend chưa trả họ tên nên tạm là email). */}
        <WithTooltip side="right" label={compact ? name || 'Tài khoản' : null}>
          {(tip) => (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? groupId : undefined}
              aria-label={`Tài khoản: ${name}`}
              onClick={onAccountClick}
              className={cx(compact ? railIcon : railRow, 'font-medium text-fg hover:bg-hover')}
              {...tip}
            >
              <Avatar name={name} size="sm" tone="accent" className={cx(!compact && '-ml-1')} />
              {!compact && (
                <>
                  <span className="min-w-0 flex-1 truncate">{shortName || 'Tài khoản'}</span>
                  <Icon name={expanded ? 'expand_less' : 'expand_more'} className="shrink-0 text-[20px] text-fg-3" />
                </>
              )}
            </button>
          )}
        </WithTooltip>
      </div>

      {expanded && (
        <ul id={groupId} className="mt-0.5 -mr-3 ml-[9px] space-y-0.5 border-l border-line pl-2">
          {/* Hàng nhóm đã ghi tên (rút gọn): tầng con ghi email đầy đủ và vai trò. */}
          <li className="px-2 py-1.5">
            {user?.email && (
              <p className="truncate text-meta text-fg-2" title={user.email}>
                {user.email}
              </p>
            )}
            <p className="text-meta text-fg-2">{role}</p>
          </li>
          {user && (
            <>
              {canChangePassword(user.role) && (
                <li>
                  <button type="button" onClick={() => setChangingPassword(true)} className={cx(subRow, railQuiet)}>
                    <Icon name="key" className="text-[20px]" />
                    {changePasswordContent.menuLabel}
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  aria-expanded={themeOpen}
                  aria-controls={themeOpen ? themeId : undefined}
                  onClick={() => setThemeOpen((value) => !value)}
                  className={cx(subRow, railQuiet)}
                >
                  <Icon name={current.icon} className="text-[20px]" />
                  <span className="min-w-0 flex-1">Giao diện</span>
                  <Icon name={themeOpen ? 'expand_less' : 'expand_more'} className="text-[20px] text-fg-3" />
                </button>
                {themeOpen && (
                  <div id={themeId} role="radiogroup" aria-label="Giao diện" className="mt-0.5 ml-[17px] space-y-0.5 border-l border-line pl-2">
                    {THEMES.map((t) => {
                      const on = theme === t.value
                      return (
                        <label
                          key={t.value}
                          className={cx(
                            subRow,
                            'cursor-pointer gap-2 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring',
                            on ? 'bg-accent-soft font-semibold text-accent-fg' : railQuiet,
                          )}
                        >
                          <input type="radio" name={themeId} value={t.value} checked={on} onChange={() => setTheme(t.value)} className="sr-only" />
                          {/* Không icon riêng cho từng lựa chọn: tầng ba chỉ còn ~125px, icon làm "Tự động" bẻ dòng. */}
                          <span className="min-w-0 flex-1 whitespace-nowrap">{t.label}</span>
                          {on && <Icon name="check" className="text-[20px]" />}
                        </label>
                      )
                    })}
                  </div>
                )}
              </li>
              <li>
                <button type="button" onClick={handleSignOut} className={cx(subRow, railDanger)}>
                  <Icon name="logout" className="text-[20px]" />
                  Đăng xuất
                </button>
              </li>
            </>
          )}
        </ul>
      )}
      {canChangePassword(user?.role) && <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />}
    </div>
  )
}
