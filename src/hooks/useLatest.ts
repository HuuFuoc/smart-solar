import { useLayoutEffect, useRef } from 'react'

/** Ref luôn giữ giá trị của lần render mới nhất: đọc trong callback bất đồng bộ mà không phải đưa vào deps */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
