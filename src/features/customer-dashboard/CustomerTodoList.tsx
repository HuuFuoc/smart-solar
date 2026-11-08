import { ButtonLink } from '@/components/common/ui/button'
import type { TodoItem } from '@/features/customer-dashboard/customerTodos'

/** Mỗi việc một dòng: việc gì, của cái gì, nút mở đúng trang để làm */
export function CustomerTodoList({ items }: { items: TodoItem[] }) {
  if (items.length === 0) return <p className="text-body text-fg-2">Không có việc nào đang chờ bạn.</p>
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="font-medium text-fg">{item.label}</p>
            <p className="text-meta text-fg-2">{item.detail}</p>
          </div>
          <ButtonLink to={item.to} size="sm" variant="info" icon="visibility">
            Mở
          </ButtonLink>
        </li>
      ))}
    </ul>
  )
}
