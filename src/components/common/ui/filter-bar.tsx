import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/common/ui/button'
import { cx } from '@/utils/cx'

// Bộ lọc phụ: điện thoại thu sau nút "Bộ lọc" để danh sách lên màn đầu; từ sm luôn hiện, xếp vào lưới của khung cha
export function FilterMore({ active = 0, children }: { active?: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <>
      <Button
        variant="secondary"
        icon="tune"
        className="justify-self-start sm:hidden"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {active > 0 ? `Bộ lọc (${active})` : 'Bộ lọc'}
      </Button>
      <div id={id} className={cx(open ? 'contents' : 'hidden', 'sm:contents')}>
        {children}
      </div>
    </>
  )
}

// Thanh lọc chung cho các trang danh sách: ô tìm và select, bên dưới là tab
export function FilterBar({
  children,
  tabs,
  className,
}: {
  children?: ReactNode
  tabs?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('mb-6 space-y-4', className)}>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      {tabs}
    </div>
  )
}
