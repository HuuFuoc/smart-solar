import { cx } from '@/utils/cx'

// Kích thước và khung của sidebar mọi cổng; tách khỏi sidebar-parts.tsx để file đó chỉ export component

/** Sidebar rộng 288px (cũng là bề rộng drawer), thu gọn còn 72px từ lg */
export const sidebarOffset = (compact: boolean) => (compact ? 'lg:pl-18' : 'lg:pl-72')

/** Khung `<aside>`: cố định bên trái, trượt ra vào như drawer dưới lg, đổi bề rộng mượt khi thu gọn */
export function sidebarAsideClass(compact: boolean, drawerOpen: boolean) {
  return cx(
    'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-rail transition-[width,translate,visibility] duration-200 motion-reduce:transition-none',
    compact ? 'w-18' : 'w-72',
    // Khi đóng thì ẩn hẳn (invisible) để link bên trong không nhận Tab
    drawerOpen ? 'visible translate-x-0' : 'invisible -translate-x-full',
    'lg:visible lg:translate-x-0',
  )
}
