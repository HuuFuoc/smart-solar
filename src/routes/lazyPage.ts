import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'

// Nạp trang khi vào route lần đầu, mỗi trang một chunk. Trang không route nào dùng sẽ bị bỏ khỏi bundle
/* @__NO_SIDE_EFFECTS__ */
export function page<K extends string, M extends Record<K, ComponentType>>(
  load: () => Promise<M>,
  name: K,
): RouteObject['lazy'] {
  return async () => ({ Component: (await load())[name] })
}
