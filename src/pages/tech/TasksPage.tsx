import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { NoticeBar } from '@/features/tasks/NoticeBar'
import { QuickStatusDrawer } from '@/features/tasks/QuickStatusDrawer'
import { TaskFilterBar, type TaskFilterValue } from '@/features/tasks/TaskFilterBar'
import { ViewToggle } from '@/features/tasks/ViewToggle'
import { Button, DataTable, Icon, IconButton, PageHeader, StatusBadge, TaskCard, Toast } from '@/components/common/stitch-ui'
import type { DataTableColumn } from '@/components/common/stitch-ui/DataTable'
import { techTaskPath } from '@/routes/paths'
import { cn } from '@/utils/cn'
import {
  quickStatusDrawer,
  taskBuckets,
  taskFilterCopy,
  taskPriorities,
  taskSyncNotice,
  taskTableHeaders,
  taskTypes,
  taskViewOptions,
  tasksHeader,
  workOrders,
  type TaskView,
  type WorkOrder,
} from '@/data/tasks'

/* Dựng từ my_tasks_1/code.html + screen.png (biến thể bảng "List Matrix"). */

const initialFilter: TaskFilterValue = { bucket: 'today', priority: 'all', type: 'all', search: '' }

const columns: DataTableColumn<WorkOrder>[] = [
  {
    key: 'workOrder',
    header: taskTableHeaders.workOrder,
    render: (row) => (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-space-xs">
          <Link
            to={techTaskPath(row.id)}
            className="text-headline-md font-bold text-on-surface transition-colors hover:text-primary"
          >
            {row.code}
          </Link>
          {row.highPriority && (
            <StatusBadge variant="error" size="sm" dot={false} className="font-bold">
              HIGH
            </StatusBadge>
          )}
        </div>
        <div className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <Icon name={row.work.icon} className={cn('text-[16px]', row.work.iconClassName)} />
          <span>{row.work.label}</span>
        </div>
        <span className="text-label-sm text-outline">{row.reference}</span>
      </div>
    ),
  },
  {
    key: 'customer',
    header: taskTableHeaders.customer,
    render: (row) => (
      <div className="flex flex-col">
        <span className="text-label-lg font-bold text-on-surface">{row.customer.name}</span>
        <span className="text-label-sm text-on-surface-variant">{row.customer.phone}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-label-sm text-primary">
          <Icon name={row.customer.propertyIcon} className="text-[14px]" />
          <span>{row.customer.property}</span>
        </span>
      </div>
    ),
  },
  {
    key: 'address',
    header: taskTableHeaders.address,
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-semibold text-on-surface">{row.site.street}</span>
        <span className="text-label-sm text-on-surface-variant">{row.site.zone}</span>
        <div className="mt-1 flex items-center gap-1 text-label-sm text-secondary">
          <Icon name="near_me" className="text-[14px]" />
          <span>{row.site.distance}</span>
        </div>
      </div>
    ),
  },
  {
    key: 'time',
    header: taskTableHeaders.time,
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-bold text-on-surface">{row.schedule.time}</span>
        <span className="text-label-sm text-on-surface-variant">{row.schedule.duration}</span>
        <span
          className={cn(
            'mt-1 text-label-sm',
            row.schedule.noteTone === 'primary' ? 'font-semibold text-primary' : 'text-outline',
          )}
        >
          {row.schedule.note}
        </span>
      </div>
    ),
  },
  {
    key: 'status',
    header: taskTableHeaders.status,
    render: (row) => (
      <StatusBadge variant={row.status.variant} pulse={row.status.pulse} className="font-bold">
        {row.status.label}
      </StatusBadge>
    ),
  },
]

export function TasksPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<TaskView>('list')
  const [filter, setFilter] = useState<TaskFilterValue>(initialFilter)
  /* openDrawer(...) trong code.html: nút Rapid Action của dòng, nút thẻ Bento và "Quick Dispatch Action". */
  const [drawerOrder, setDrawerOrder] = useState<WorkOrder | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState(false)

  /* Giữ lại drawerOrder khi đóng để drawer chạy hết animation trượt ra. */
  const openDrawer = (row: WorkOrder | null) => {
    if (!row) return
    setDrawerOrder(row)
    setDrawerOpen(true)
  }

  const commitDrawer = () => {
    setDrawerOpen(false)
    setToast(true)
    window.setTimeout(() => setToast(false), 2600)
  }

  /* Chip "Today / Upcoming / Completed" chỉ đổi lựa chọn: mock chỉ có hàng đợi hôm nay. */
  const rows = useMemo(() => {
    const keyword = filter.search.trim().toLowerCase()
    return workOrders.filter((row) => {
      if (filter.priority === 'high' && !row.highPriority) return false
      if (filter.priority === 'normal' && row.highPriority) return false
      if (filter.type !== 'all' && row.typeKey !== filter.type) return false
      if (!keyword) return true
      return [row.code, row.customer.name, row.reference, row.work.label, row.site.street]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
  }, [filter])

  return (
    <div className="flex w-full flex-col">
      <div className="mb-space-2xl flex flex-col gap-space-lg">
        <PageHeader
          bottomSpacing="none"
          title={tasksHeader.title}
          actions={
            <>
              <ViewToggle options={taskViewOptions} value={view} onChange={setView} label="Kiểu hiển thị" />
              <Button iconLeft="bolt" onClick={() => openDrawer(rows[0] ?? null)}>
                {tasksHeader.quickAction}
              </Button>
            </>
          }
        />

        <TaskFilterBar
          buckets={taskBuckets}
          priorities={taskPriorities}
          types={taskTypes}
          value={filter}
          onChange={setFilter}
          {...taskFilterCopy}
        />
      </div>

      <div className="flex w-full flex-col gap-space-sm">
        <NoticeBar icon={taskSyncNotice.icon} meta={taskSyncNotice.meta}>
          {taskSyncNotice.prefix}
          <strong className="font-bold">{taskSyncNotice.strong}</strong>
          {taskSyncNotice.suffix}
        </NoticeBar>

        {view === 'list' ? (
          <DataTable
            size="matrix"
            divided
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(techTaskPath(row.id))}
            actionsHeader={taskTableHeaders.actions}
            emptyMessage="Không có phiếu việc nào khớp bộ lọc"
            actions={(row) => (
              <>
                <Button
                  size="sm"
                  variant={row.action.variant}
                  className="rounded-xl"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDrawer(row)
                  }}
                >
                  {row.action.label}
                </Button>
                <IconButton
                  size="md"
                  icon="add_a_photo"
                  label="Tải nhanh ảnh"
                  className="bg-surface-container"
                />
                <IconButton size="md" icon="directions" label="Chỉ đường" className="bg-surface-container" />
              </>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => (
              <TaskCard
                key={row.id}
                accent={row.accent}
                type={{ label: row.code, variant: row.typeVariant }}
                priority={{ label: row.status.label, variant: row.status.variant }}
                meta={{ icon: 'schedule', text: row.schedule.time }}
                title={row.customer.name}
                address={row.site.street}
                phoneHref={`tel:${row.customer.phone.replace(/[^\d+]/g, '')}`}
                specs={[
                  { label: 'Công việc', value: row.work.label },
                  { label: 'Thời lượng', value: row.schedule.duration },
                  { label: 'Khoảng cách', value: row.site.distance },
                ]}
                primaryAction={{ ...row.action, onClick: () => openDrawer(row) }}
                onTitleClick={() => navigate(techTaskPath(row.id))}
              />
            ))}
          </div>
        )}
      </div>

      <QuickStatusDrawer
        key={drawerOrder?.id ?? 'none'}
        order={drawerOrder}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCommit={commitDrawer}
      />
      <Toast open={toast} message={quickStatusDrawer.toast} />
    </div>
  )
}
