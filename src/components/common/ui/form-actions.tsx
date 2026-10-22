import type { ReactNode } from 'react'

// Hàng nút gửi của form dài: dính đáy khung nhìn nên đang ở ô nào cũng thấy nút
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-canvas/95 py-3 backdrop-blur">
      {children}
    </div>
  )
}
