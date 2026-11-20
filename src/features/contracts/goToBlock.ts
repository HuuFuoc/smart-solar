/** Cuộn tới khối có id `target` và đặt con trỏ vào ô / nút đầu tiên của khối (nút "việc tiếp theo") */
export function goToBlock(target: string) {
  const block = document.getElementById(target)
  if (!block) return
  block.scrollIntoView({ behavior: 'smooth', block: 'start' })
  block.querySelector<HTMLElement>('input, textarea, select, button')?.focus({ preventScroll: true })
}
