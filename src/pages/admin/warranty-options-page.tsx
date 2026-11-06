import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { WARRANTY_OPTION_KINDS, WARRANTY_OPTION_KIND_LABELS } from '@/common/afterSales'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Input, WithUnit } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Segmented } from '@/components/common/ui/segmented'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { formatDurationMonths } from '@/features/after-sales/afterSalesDisplay'
import {
  WARRANTY_MONTHS,
  activeDefault,
  installationWarrantyGap,
  parseWarrantyMonths,
  sortWarrantyOptions,
  warrantyMonthsError,
} from '@/features/after-sales/adminAfterSalesRules'
import { useSaveWarrantyOptionMutation, useWarrantyOptionsQuery } from '@/hooks/useAdminAfterSales'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { WarrantyOptionView } from '@/types/res/adminAfterSalesRes'
import { cx } from '@/utils/cx'

// Thời hạn bảo hành quản trị cho kinh doanh chọn: lắp đặt (khi lập hợp đồng) và sửa chữa có thu tiền (khi báo giá).
// Backend nhận diện mỗi tuỳ chọn theo (loại, số tháng), không có xoá: tắt là kinh doanh không chọn được nữa.
// Hợp đồng chỉ phát hành được khi có thời hạn lắp đặt, bỏ trống thì backend lấy tuỳ chọn mặc định

const { installation: INSTALLATION, repair: REPAIR } = WARRANTY_OPTION_KINDS
type Kind = typeof INSTALLATION | typeof REPAIR

const KIND_OPTIONS = [INSTALLATION, REPAIR].map((value) => ({ value, label: WARRANTY_OPTION_KIND_LABELS[value]! }))

const KIND_HINTS: Record<Kind, string> = {
  INSTALLATION:
    'Kinh doanh chọn một thời hạn khi lập hợp đồng lắp đặt; bỏ trống thì dùng thời hạn mặc định. Thời hạn được chép vào hợp đồng lúc lập, đổi ở đây không ảnh hưởng hợp đồng đã lập.',
  REPAIR: 'Kinh doanh chọn một thời hạn khi lập báo giá sửa chữa có thu tiền. Thời hạn được chép vào báo giá lúc lập.',
}

type Pending = { option: WarrantyOptionView; change: 'default' | 'off' | 'on' }

function OptionDialog({
  open,
  kind,
  options,
  onOpenChange,
}: {
  open: boolean
  kind: Kind
  options: WarrantyOptionView[]
  onOpenChange: (open: boolean) => void
}) {
  const save = useSaveWarrantyOptionMutation()
  const [months, setMonths] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const monthsError = checked ? warrantyMonthsError(months) : undefined
  const value = parseWarrantyMonths(months)
  const existing = value === null ? undefined : options.find((o) => o.kind === kind && o.months === value)
  const currentDefault = activeDefault(options, kind)

  async function submit() {
    if (save.isPending) return
    setChecked(true)
    setError(null)
    if (value === null) {
      document.getElementById('warranty-months')?.focus()
      return
    }
    try {
      const view = await save.mutateAsync({ kind, months: value, isActive, isDefault: isActive && isDefault })
      toast.success(`Đã lưu thời hạn ${formatDurationMonths(view.months)}`)
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} dismissible={!save.isPending} aria-label="Thêm thời hạn">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <DialogTitle>Thêm thời hạn bảo hành</DialogTitle>
        <p className="mt-1 text-body text-fg-2">{WARRANTY_OPTION_KIND_LABELS[kind]}</p>
        <div className="mt-4 space-y-4">
          <Field
            label="Số tháng"
            required
            htmlFor="warranty-months"
            error={monthsError}
            hint={
              value !== null && value >= 12 && value % 12 === 0
                ? `= ${formatDurationMonths(value)}`
                : `Số nguyên từ ${WARRANTY_MONTHS.min} đến ${WARRANTY_MONTHS.max}.`
            }
          >
            <WithUnit unit="tháng">
              <Input
                id="warranty-months"
                inputMode="numeric"
                className="tnum w-32"
                value={months}
                aria-required
                aria-invalid={monthsError ? true : undefined}
                onChange={(e) => {
                  setMonths(e.target.value)
                  setError(null)
                }}
              />
            </WithUnit>
          </Field>

          {existing && (
            <Notice tone="info">
              Đã có thời hạn {formatDurationMonths(existing.months)}. Lưu sẽ cập nhật trạng thái của thời hạn đó.
            </Notice>
          )}

          <Checkbox
            label="Đang dùng"
            description="Bỏ chọn thì kinh doanh không chọn được thời hạn này cho hợp đồng, báo giá mới."
            checked={isActive}
            onChange={(e) => {
              setIsActive(e.target.checked)
              if (!e.target.checked) setIsDefault(false)
            }}
          />

          <Checkbox
            label="Đặt làm mặc định"
            description={
              currentDefault && currentDefault.months !== value
                ? `Thay cho mặc định hiện tại (${formatDurationMonths(currentDefault.months)}).`
                : 'Dùng khi kinh doanh không chọn thời hạn. Chỉ thời hạn đang dùng mới làm mặc định được.'
            }
            checked={isDefault}
            disabled={!isActive}
            onChange={(e) => setIsDefault(e.target.checked)}
          />

          {error && (
            <div role="alert">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={save.isPending} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button icon="save" type="submit" variant="primary" disabled={save.isPending}>
            {save.isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </form>
    </ModalDialog>
  )
}

export function AdminWarrantyOptionsPage() {
  const [params, setParams] = useSearchParams()
  const kind: Kind = params.get('loai') === 'sua-chua' ? REPAIR : INSTALLATION
  const query = useWarrantyOptionsQuery()
  const save = useSaveWarrantyOptionMutation()
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const all = query.data ?? []
  const items = sortWarrantyOptions(all.filter((o) => o.kind === kind))
  const gap = query.data ? installationWarrantyGap(all) : null

  const setKind = (next: Kind) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === REPAIR) p.set('loai', 'sua-chua')
        else p.delete('loai')
        return p
      },
      { replace: true },
    )

  async function apply({ option, change }: Pending) {
    setBusyId(option.optionId)
    try {
      const body =
        change === 'default'
          ? { kind: option.kind, months: option.months, isActive: true, isDefault: true }
          : change === 'off'
            ? { kind: option.kind, months: option.months, isActive: false, isDefault: false }
            : { kind: option.kind, months: option.months, isActive: true, isDefault: option.isDefault }
      const view = await save.mutateAsync(body)
      const label = formatDurationMonths(view.months)
      toast.success(
        change === 'default'
          ? `${label} là thời hạn mặc định`
          : change === 'off'
            ? `Đã tắt ${label}`
            : `Đã bật ${label}`,
      )
      setPending(null)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  // Tắt mặc định của bảo hành lắp đặt làm kinh doanh phải tự chọn thời hạn: hỏi lại trước
  const turnOff = (option: WarrantyOptionView) =>
    option.isDefault ? setPending({ option, change: 'off' }) : void apply({ option, change: 'off' })

  const unavailable = query.isError && isFeatureUnavailable(query.error)
  const pendingBusy = Boolean(pending && busyId === pending.option.optionId)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thời hạn bảo hành"
        description={
          gap === 'none' ? (
            <Badge tone="danger">
              Chưa có thời hạn bảo hành lắp đặt nào đang dùng, kinh doanh chưa phát hành được hợp đồng
            </Badge>
          ) : gap === 'no-default' ? (
            <Badge tone="danger">Chưa có thời hạn lắp đặt mặc định, kinh doanh phải tự chọn khi lập hợp đồng</Badge>
          ) : undefined
        }
        actions={
          !unavailable && (
            <Button variant="primary" icon="add" disabled={!query.data} onClick={() => setAdding(true)}>
              Thêm thời hạn
            </Button>
          )
        }
      />

      <Segmented label="Loại bảo hành" options={KIND_OPTIONS} value={kind} onChange={setKind} className="sm:w-fit" />
      <p className="max-w-prose text-meta text-fg-2">{KIND_HINTS[kind]}</p>

      {/* Chú thích trạng thái cấu hình thời hạn */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-2 p-3 sm:px-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-meta">
          <span className="font-semibold text-fg flex items-center gap-1.5 pr-2.5 border-r border-line/70">
            <Icon name="palette" className="text-primary text-[18px]" />
            Chú thích trạng thái:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ok-soft text-ok border border-ok/20">
            <span className="size-1.5 rounded-full bg-ok" />
            Đang dùng
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-soft text-accent-fg border border-accent/20">
            <Icon name="star" className="text-[13px]" />
            Mặc định hệ thống
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-3 text-fg-2 border border-line">
            <span className="size-1.5 rounded-full bg-fg-muted" />
            Đã tắt
          </span>
        </div>
        <div className="text-meta text-fg-2">
          Tổng cộng: <strong className="font-semibold text-fg">{items.length}</strong> thời hạn
        </div>
      </div>

      <section aria-label={WARRANTY_OPTION_KIND_LABELS[kind]} aria-busy={query.isFetching}>
        {query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : unavailable ? (
          <UnavailableState
            title="Cấu hình bảo hành chưa sẵn sàng."
            message={errorMessage(query.error)}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, 'Không tải được thời hạn bảo hành.')}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={`Chưa có thời hạn ${WARRANTY_OPTION_KIND_LABELS[kind]!.toLowerCase()} nào`}
            description='Bấm "Thêm thời hạn" để tạo thời hạn đầu tiên.'
          />
        ) : (
          <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-meta border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-fg-2 font-medium">
                    <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                      Thời hạn bảo hành
                    </th>
                    <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                      Trạng thái áp dụng
                    </th>
                    <th className="py-3 px-3.5 text-right text-meta font-semibold">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {items.map((o) => {
                    const busy = busyId === o.optionId
                    const label = formatDurationMonths(o.months)
                    return (
                      <tr key={o.optionId} className="group hover:bg-surface-2/60 transition-colors">
                        {/* Cột 1: Thời hạn */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top">
                          <span className="tnum font-semibold text-fg text-sm">{label}</span>
                          {o.months >= 12 && o.months % 12 === 0 && (
                            <span className="tnum ml-2 text-meta text-fg-muted font-normal">({o.months} tháng)</span>
                          )}
                        </td>

                        {/* Cột 2: Trạng thái */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cx(
                                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                                o.isActive ? 'bg-ok-soft text-ok border-ok/20' : 'bg-surface-3 text-fg-2 border-line',
                              )}
                            >
                              <span className={cx('size-1.5 rounded-full', o.isActive ? 'bg-ok' : 'bg-fg-muted')} />
                              {o.isActive ? 'Đang dùng' : 'Đã tắt'}
                            </span>
                            {o.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-soft text-accent-fg border border-accent/20">
                                <Icon name="star" className="text-[13px]" />
                                Mặc định
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cột 3: Thao tác */}
                        <td className="py-3.5 px-3.5 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {o.isActive && !o.isDefault && (
                              <Button
                                size="sm"
                                variant="soft"
                                icon="star"
                                aria-label={`Đặt ${label} làm mặc định`}
                                disabled={busy}
                                onClick={() => void apply({ option: o, change: 'default' })}
                              >
                                Đặt làm mặc định
                              </Button>
                            )}
                            {o.isActive ? (
                              <Button
                                size="sm"
                                variant="warn"
                                icon="pause_circle"
                                aria-label={`Tắt ${label}`}
                                disabled={busy}
                                onClick={() => turnOff(o)}
                              >
                                {busy ? 'Đang lưu…' : 'Tắt'}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="soft"
                                icon="play_circle"
                                aria-label={`Bật ${label}`}
                                disabled={busy}
                                onClick={() => void apply({ option: o, change: 'on' })}
                              >
                                {busy ? 'Đang lưu…' : 'Bật lại'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <OptionDialog key={adding ? 'open' : 'closed'} open={adding} kind={kind} options={all} onOpenChange={setAdding} />

      <ModalDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        dismissible={!pendingBusy}
        aria-label="Tắt thời hạn mặc định"
      >
        <DialogTitle>Tắt thời hạn mặc định?</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          {pending && formatDurationMonths(pending.option.months)} đang là mặc định của{' '}
          {pending && WARRANTY_OPTION_KIND_LABELS[pending.option.kind]?.toLowerCase()}. Sau khi tắt sẽ chưa có mặc định:
          {pending?.option.kind === INSTALLATION
            ? ' hợp đồng lập mới phải được kinh doanh chọn thời hạn thì mới phát hành được.'
            : ' kinh doanh phải tự chọn thời hạn khi báo giá sửa chữa.'}
        </p>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={pendingBusy} onClick={() => setPending(null)}>
            Giữ nguyên
          </Button>
          <Button
            icon="pause_circle"
            variant="warn"
            disabled={pendingBusy}
            onClick={() => pending && void apply({ option: pending.option, change: 'off' })}
          >
            {pendingBusy ? 'Đang tắt…' : 'Vẫn tắt'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </div>
  )
}

export default AdminWarrantyOptionsPage
