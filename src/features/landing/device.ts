// Khả năng của thiết bị, chỉ đọc khi cần để không tạo context WebGL thừa

/** Bật tiết kiệm dữ liệu thì không tải trước ảnh hero còn lại và không tải mô hình 3D */
export function saveData() {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
}

/** three r186 chỉ dùng WebGL2, máy chỉ có WebGL1 coi như không vẽ được 3D */
export function supportsWebGL2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

/** Điện thoại, máy cảm ứng hoặc màn hẹp thì cảnh 3D chạy bản nhẹ */
export function liteDevice() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
