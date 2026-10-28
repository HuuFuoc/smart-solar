import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SERVICE_PACKAGE_KINDS } from '@/common/afterSales'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { PageHeader } from '@/components/common/ui/page-header'
import { Segmented } from '@/components/common/ui/segmented'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { packageKindLabel } from '@/features/after-sales/afterSalesDisplay'
import { PackageFormDialog } from '@/features/after-sales/PackageFormDialog'
import { requestFromPackage } from '@/features/after-sales/packageForm'
import { PackageTable } from '@/features/after-sales/PackageTable'
import { useAdminPackagesQuery, useUpdatePackageMutation } from '@/hooks/useAdminAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { PackageView } from '@/types/res/customerAfterSalesRes'

// Gói dịch vụ sau lắp đặt (chỉ quản trị): bảo vệ thiên tai và bảo trì định kỳ. Loại gói nằm trên địa chỉ (?loai=bao-tri)
// để Back quay lại đúng tab. Không có API xoá: ngừng bán là ghi lại cả gói với isActive = false

const { disasterProtection: DISASTER, maintenance: MAINTENANCE } = SERVICE_PACKAGE_KINDS
type Kind = typeof DISASTER | typeof MAINTENANCE

const KIND_OPTIONS = [DISASTER, MAINTENANCE].map((value) => ({ value, label: packageKindLabel(value) }))

// Gói đang bán lên trước, rồi theo tên
const bySale = (a: PackageView, b: PackageView) =>
  Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'vi')

export function AdminPackagesPage() {
  const [params, setParams] = useSearchParams()
  const kind: Kind = params.get('loai') === 'bao-tri' ? MAINTENANCE : DISASTER
  const query = useAdminPackagesQuery()
  const update = useUpdatePackageMutation()
  const [form, setForm] = useState<{ open: boolean; pkg: PackageView | null }>({ open: false, pkg: null })
  const [stopping, setStopping] = useState<PackageView | null>(null)
  // Ngừng bán / mở bán / hoàn tác dùng chung một mutation nên tự giữ các gói đang chờ
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())

  const all = query.data ?? []
  const items = all.filter((p) => p.kind === kind).sort(bySale)
  const selling = items.filter((p) => p.isActive).length
  const noDisasterOnSale = query.data !== undefined && !all.some((p) => p.kind === DISASTER && p.isActive)

  const setKind = (next: Kind) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === MAINTENANCE) p.set('loai', 'bao-tri')
        else p.delete('loai')
        return p
      },
      { replace: true },
    )

  const markPending = (id: string, on: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  // Trả gói mới (revision mới) để Hoàn tác gửi đúng revision; lỗi thì báo và trả null
  async function changeSale(p: PackageView, isActive: boolean) {
    markPending(p.packageId, true)
    try {
      return await update.mutateAsync({ id: p.packageId, body: requestFromPackage(p, { isActive }) })
    } catch (error) {
      toast.error(errorMessage(error))
      return null
    } finally {
      markPending(p.packageId, false)
    }
  }

  async function reopen(p: PackageView) {
    const view = await changeSale(p, true)
    if (view) toast.success(`Đã mở bán lại ${view.name}`)
  }

  async function stop(p: PackageView) {
    const view = await changeSale(p, false)
    setStopping(null)
    if (view)
      toast.success(`Đã ngừng bán ${view.name}`, { action: { label: 'Hoàn tác', onClick: () => void reopen(view) } })
  }

  const stoppingBusy = Boolean(stopping && pendingIds.has(stopping.packageId))

  return (
    <>
      <PageHeader
        title="Gói dịch vụ"
        description={
          noDisasterOnSale ? (
            <Badge tone="danger" icon="warning">
              Chưa có gói bảo vệ thiên tai nào đang bán, khách chưa mua được
            </Badge>
          ) : undefined
        }
        actions={
          <Button variant="primary" icon="add" onClick={() => setForm({ open: true, pkg: null })}>
            Thêm gói
          </Button>
        }
      />

      <Segmented label="Loại gói" options={KIND_OPTIONS} value={kind} onChange={setKind} className="mb-6 sm:w-fit" />

      <section aria-label={`Gói ${packageKindLabel(kind).toLowerCase()}`} aria-busy={query.isFetching}>
        {query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, 'Không tải được danh sách gói.')}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={`Chưa có gói ${packageKindLabel(kind).toLowerCase()} nào`}
            description={'Bấm "Thêm gói" để tạo gói đầu tiên.'}
          />
        ) : (
          <>
            <PackageTable
              items={items}
              busyIds={pendingIds}
              onEdit={(pkg) => setForm({ open: true, pkg })}
              onStop={setStopping}
              onReopen={(pkg) => void reopen(pkg)}
            />
            <p className="tnum mt-6 text-meta text-fg-2">
              {items.length} gói, {selling} gói đang bán
            </p>
          </>
        )}
      </section>

      <PackageFormDialog
        open={form.open}
        pkg={form.pkg}
        kind={kind}
        onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))}
      />
      <ModalDialog
        open={Boolean(stopping)}
        onOpenChange={(open) => !open && setStopping(null)}
        dismissible={!stoppingBusy}
        aria-label="Ngừng bán gói"
      >
        <DialogTitle>Ngừng bán {stopping?.name}?</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          Khách không thấy và không mua mới được gói này. Gói khách đã mua vẫn giữ nguyên quyền lợi tới hết kỳ. Bạn mở
          bán lại được bất cứ lúc nào.
        </p>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={stoppingBusy} onClick={() => setStopping(null)}>
            Huỷ
          </Button>
          <Button
            icon="pause_circle"
            variant="warn"
            disabled={stoppingBusy}
            onClick={() => stopping && void stop(stopping)}
          >
            {stoppingBusy ? 'Đang ngừng bán…' : 'Ngừng bán'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </>
  )
}
