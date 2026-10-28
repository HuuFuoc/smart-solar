import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import { isNavItemActive } from '@/components/layout/page-crumb'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'

// Số đỏ cạnh mục menu: việc đang chờ người dùng, cộng mục mới hoặc đổi trạng thái kể từ lần xem trước.
// Lần xem trước lưu trên trình duyệt này. Đang mở mục đó, hoặc thay đổi do chính người dùng vừa làm, thì coi như đã xem

type Seen = Record<string, string>

type Options<T> = {
  /** Mã của mục trong danh sách */
  key: (item: T) => string
  /** Những gì đổi thì đáng báo, vd. trạng thái + giờ hẹn */
  sig: (item: T) => string
  /** Mục đang chờ người dùng làm, luôn tính */
  todo?: (item: T) => boolean
}

// Thao tác của chính người dùng làm danh sách tải lại trong vài giây sau đó
const OWN_ACTION_MS = 15_000
let ownActionAt = 0

/** Gọi khi người dùng thao tác xong để thay đổi kéo theo không bị báo đỏ */
export function markOwnAction() {
  ownActionAt = Date.now()
}

const NAV_ITEMS = Object.values(PORTALS).flatMap((portal) => portal.groups.flatMap((group) => group.items))

function isOpen(section: string, pathname: string) {
  const item = NAV_ITEMS.find((i) => i.to === section)
  return item ? isNavItemActive(item, pathname) : pathname.startsWith(section)
}

const listeners = new Set<() => void>()

// Tab khác của cùng trình duyệt xem rồi thì tab này cũng tắt số đỏ
function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function read(storageKey: string | null) {
  if (!storageKey) return null
  try {
    return localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

function write(storageKey: string, raw: string) {
  try {
    localStorage.setItem(storageKey, raw)
  } catch {
    // Trình duyệt không cho lưu thì chỉ mất phần "đã xem", số việc chờ vẫn đúng
  }
  listeners.forEach((listener) => listener())
}

function parse(raw: string | null): Seen | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Seen
  } catch {
    return null
  }
}

export function useNavAlert<T>(section: string, items: T[] | undefined, { key, sig, todo }: Options<T>) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const owner = user?.userId ?? user?.email
  const storageKey = owner ? `smartsolar.seen.${owner}.${section}` : null
  const viewing = isOpen(section, pathname)
  const raw = useSyncExternalStore(subscribe, () => read(storageKey))
  const seen = useMemo(() => parse(raw), [raw])

  useEffect(() => {
    if (!items || !storageKey) return
    const stored = read(storageKey)
    // Lần đầu chỉ ghi nhận hiện trạng, không báo cả danh sách là mới
    if (stored !== null && !viewing && Date.now() - ownActionAt > OWN_ACTION_MS) return
    const current = JSON.stringify(Object.fromEntries(items.map((item) => [key(item), sig(item)])))
    if (current !== stored) write(storageKey, current)
  }, [items, storageKey, viewing, key, sig])

  if (!items) return 0
  const changed = (item: T) => !viewing && seen !== null && seen[key(item)] !== sig(item)
  return items.filter((item) => todo?.(item) || changed(item)).length
}
