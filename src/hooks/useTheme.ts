import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

export type Theme = 'system' | 'light' | 'dark'
/** Giao diện đang hiện thật sự (đã chọn, hoặc theo hệ thống khi chưa chọn) */
export type ResolvedTheme = 'light' | 'dark'
// index.html đọc cùng khoá này để áp giao diện trước khi vẽ
const KEY = 'solar-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Ba lựa chọn giao diện, dùng chung cho rail nhân viên và menu tài khoản của khách hàng */
export const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'system', label: 'Tự động', icon: 'contrast' },
  { value: 'light', label: 'Sáng', icon: 'light_mode' },
  { value: 'dark', label: 'Tối', icon: 'dark_mode' },
]

/** Lựa chọn đã lưu. Chưa chọn hoặc trình duyệt chặn storage thì theo hệ thống */
export function savedTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.dataset.theme = theme
}

function readResolvedTheme(): ResolvedTheme {
  const pinned = document.documentElement.dataset.theme
  if (pinned === 'light' || pinned === 'dark') return pinned
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function subscribeResolvedTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => {
    media.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

/** Giao diện đang hiện, đọc từ data-theme trên <html>. Chưa đặt thì theo hệ thống */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeResolvedTheme, readResolvedTheme)
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(savedTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try {
      if (t === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, t)
    } catch {
      // Trình duyệt chặn storage: giao diện vẫn áp cho phiên này
    }
  }, [])

  return [theme, setTheme]
}
