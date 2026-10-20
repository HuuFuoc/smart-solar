/** Cuộn riêng khung `container` (không cuộn cả trang) để `element` hiện trọn */
export function keepInView(container: HTMLElement, element: HTMLElement) {
  const box = container.getBoundingClientRect()
  const item = element.getBoundingClientRect()
  if (item.top < box.top) container.scrollTop -= box.top - item.top
  else if (item.bottom > box.bottom) container.scrollTop += item.bottom - box.bottom
}
