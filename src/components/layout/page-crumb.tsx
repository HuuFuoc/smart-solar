import { createContext, useContext, useEffect } from 'react'
import { matchPath, useLocation } from 'react-router'
import type { NavItem } from '@/config/portals'

// Mắt xích cuối của thanh định vị: tên trang chi tiết hoặc bước wizard
// Lưu kèm pathname để không loé tên của trang trước khi chuyển trang
export type PageCrumb = { pathname: string; label: string }

export const PageCrumbContext = createContext<(crumb: PageCrumb | null) => void>(() => {})

export function usePageCrumb(label: string | null | undefined) {
  const setCrumb = useContext(PageCrumbContext)
  const { pathname } = useLocation()
  useEffect(() => {
    setCrumb(label ? { pathname, label } : null)
    return () => setCrumb(null)
  }, [label, pathname, setCrumb])
}

/** Mục menu đang mở: khớp `to` hoặc một trong `alsoActiveOn` */
export function isNavItemActive(item: NavItem, pathname: string) {
  if (item.to === '#') return false
  if (matchPath({ path: item.to, end: item.end ?? false }, pathname)) return true
  return item.alsoActiveOn?.some((pattern) => matchPath(pattern, pathname)) ?? false
}

/** Đang ở đúng trang của mục (không phải trang con). */
export function isNavItemPage(item: NavItem, pathname: string) {
  return item.to !== '#' && matchPath({ path: item.to, end: true }, pathname) !== null
}
