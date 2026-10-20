import { useEffect, useId, useState } from 'react'
import { Button, Checkbox, Icon, IconButton } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'
import { quickStatusDrawer } from '@/data/tasks'
import type { WorkOrder } from '@/data/tasks'

/*
 * Slide-over "#quickStatusDrawer" của my_tasks_1/code.html.
 * Đóng: translate-x-full (giao diện trang giữ nguyên như screen.png);
 * mở: translate-x-0 kèm overlay "#drawerOverlay". Đóng bằng overlay, nút close hoặc Escape.
 */
export type QuickStatusDrawerProps = {
  /** Work order đang hiển thị; giữ lại khi đóng để chạy hết animation trượt ra. */
  order: WorkOrder | null
  open: boolean
  onClose: () => void
  /** Chỉ giả lập: đóng drawer và bắn toast, chưa gọi API. */
  onCommit: (order: WorkOrder) => void
}

const d = quickStatusDrawer

/*
 * TasksPage truyền `key={order.id}` nên đổi sang work order khác là remount:
 * state dưới đây khởi tạo thẳng từ props, không cần effect đồng bộ lại.
 */
export function QuickStatusDrawer({ order, open, onClose, onCommit }: QuickStatusDrawerProps) {
  const titleId = useId()
  const [stage, setStage] = useState<WorkOrder['lifecycleStage']>(order?.lifecycleStage ?? 3)
  const [checkedIds, setCheckedIds] = useState<string[]>(() =>
    d.checklist.items.filter((item) => item.defaultChecked).map((item) => item.id),
  )
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const toggleItem = (id: string, checked: boolean) =>
    setCheckedIds((current) => (checked ? [...current, id] : current.filter((value) => value !== id)))

  return (
    <>
      {/* #drawerOverlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col justify-between bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        )}
      >
        {order && (
          <>
            <div className="flex flex-col gap-space-md overflow-y-auto p-space-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span aria-hidden="true" className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-label-sm font-bold text-primary">
                    {d.sync.label}
                  </span>
                </div>
                <IconButton
                  size="md"
                  icon="close"
                  label={d.closeLabel}
                  onClick={onClose}
                  className="rounded-full bg-surface-container"
                />
              </div>

              <div className="flex flex-col">
                <span id={titleId} className="text-headline-xl font-bold leading-tight text-on-surface">
                  {order.code}
                </span>
                <span className="text-headline-md font-semibold text-primary">{order.work.label}</span>
                <span className="mt-1 text-body-md text-on-surface-variant">
                  {order.customer.name}
                  {d.customerSeparator}
                  {order.site.street}
                </span>
              </div>

              {/* Shift Job Lifecycle Stage */}
              <div className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-low p-space-md">
                <span className="text-label-sm font-bold text-on-surface">
                  {d.lifecycle.title}
                </span>
                <div className="grid grid-cols-2 gap-space-xs">
                  {d.lifecycle.stages.map((item) => {
                    const active = item.value === stage
                    return (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setStage(item.value)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl p-2.5 text-label-sm transition-all',
                          active
                            ? 'bg-primary-container font-bold text-on-primary-container'
                            : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container',
                        )}
                      >
                        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', item.dotClassName)} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mandatory Phase Checklist */}
              <div className="flex flex-col gap-space-xs">
                <span className="text-label-md font-bold text-on-surface">{d.checklist.title}</span>
                {d.checklist.items.map((item) => {
                  const checked = checkedIds.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-space-sm rounded-xl bg-surface-container-low p-3 transition-colors hover:bg-surface-container"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleItem(item.id, value === true)}
                      />
                      <span className="flex flex-col">
                        <span className="text-label-sm font-semibold text-on-surface">{item.label}</span>
                        <span className="text-body-sm text-on-surface-variant">{item.description}</span>
                      </span>
                    </label>
                  )
                })}
              </div>

              {/* Technician Site Observation */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-bold text-on-surface">{d.observation.title}</span>
                  <button type="button" className="flex items-center gap-1 text-label-sm text-primary">
                    <Icon name={d.observation.dictateIcon} className="text-[16px]" />
                    <span>{d.observation.dictateLabel}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={d.observation.placeholder}
                  aria-label={d.observation.title}
                  className="w-full rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface outline-none transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Job Site Photos */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-bold text-on-surface">
                    {d.photos.titleTemplate.replace('{count}', String(d.photos.uploadedCount))}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-label-sm font-bold text-primary hover:underline"
                  >
                    <Icon name={d.photos.captureIcon} className="text-[16px]" />
                    <span>{d.photos.captureLabel}</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-space-xs">
                  {d.photos.items.map((photo) => (
                    <div key={photo.id} className="relative h-20 overflow-hidden rounded-xl bg-surface-container">
                      <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="flex h-20 flex-col items-center justify-center rounded-xl bg-surface-container-low text-outline transition-colors hover:text-primary"
                  >
                    <Icon name={d.photos.addSlotIcon} className="text-[24px]" />
                    <span className="mt-0.5 text-label-sm">{d.photos.addSlotLabel}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-space-sm border-t border-surface-container bg-surface-container-low p-space-lg">
              <Button fullWidth iconLeft={d.footer.commitIcon} className="flex-1" onClick={() => onCommit(order)}>
                {d.footer.commitLabel}
              </Button>
              <Button variant="neutral" onClick={onClose}>
                {d.footer.cancelLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
