import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'

/**
 * Nạp trang khi vào route lần đầu (tách chunk riêng):
 * `{ path: ROUTES.login, lazy: page(() => import('@/pages/auth/LoginPage'), 'LoginPage') }`.
 * Tên export sai thì typecheck báo lỗi. Trang khai báo mà không route nào dùng (vd. /styleguide ở bản build) bị bỏ
 * khỏi bundle nhờ chú thích @__NO_SIDE_EFFECTS__.
 */
/* @__NO_SIDE_EFFECTS__ */
export function page<K extends string, M extends Record<K, ComponentType>>(
  load: () => Promise<M>,
  name: K,
): RouteObject['lazy'] {
  return async () => ({ Component: (await load())[name] })
}
