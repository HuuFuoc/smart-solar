import { useState } from 'react'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PagedList } from '@/components/common/ui/pagination'
import { TODO_KINDS, type TodoItem, type TodoKind } from '@/features/customer-dashboard/customerTodos'

/** Mỗi việc một dòng: việc gì, của cái gì, một nút gọi đúng việc đó. Có từ hai nhóm việc thì lọc bằng tab */
export function CustomerTodoList({ items }: { items: TodoItem[] }) {
  const [picked, setPicked] = useState<TodoKind | 'all'>('all')
  const kinds = TODO_KINDS.filter((k) => items.some((item) => item.kind === k.kind))
  // Nhóm đang chọn hết việc (vừa làm xong) thì về "Tất cả"
  const tab = picked !== 'all' && kinds.some((k) => k.kind === picked) ? picked : 'all'
  const shown = tab === 'all' ? items : items.filter((item) => item.kind === tab)

  return (
    <>
      {kinds.length > 1 && (
        <FilterChips
          label="Lọc việc cần làm"
          className="mb-1"
          value={tab}
          onChange={setPicked}
          chips={[
            { value: 'all', label: 'Tất cả', count: items.length },
            ...kinds.map((k) => ({
              value: k.kind,
              label: k.label,
              count: items.filter((item) => item.kind === k.kind).length,
            })),
          ]}
        />
      )}
      <PagedList key={tab} items={shown} noun="việc" keepScroll>
        {(page) => (
          <ul className="divide-y divide-line">
            {page.map((item) => (
              <li key={item.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{item.label}</p>
                  <p className="text-meta text-fg-2">{item.detail}</p>
                </div>
                <ButtonLink to={item.to} size="sm" variant="info" icon={item.action.icon}>
                  {item.action.label}
                  <span className="sr-only"> {item.detail}</span>
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </PagedList>
    </>
  )
}
