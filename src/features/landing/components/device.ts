/* Khả năng của thiết bị, đọc lúc cần (không đọc khi import) để trang chủ không tạo context WebGL thừa. */

/** Người dùng bật tiết kiệm dữ liệu: không tải trước ảnh hero của giao diện kia, không tải mô hình 3D. */
export function saveData() {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
}

/** three r186 chỉ tạo context WebGL2, nên máy chỉ có WebGL1 cũng coi như không vẽ được 3D. */
export function supportsWebGL2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

/** Điện thoại / máy cảm ứng hoặc màn hẹp: cảnh 3D chạy bản nhẹ. */
export function liteDevice() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
