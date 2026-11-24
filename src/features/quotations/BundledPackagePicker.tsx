import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { Segmented } from '@/components/common/ui/segmented'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { PackageCover, PackageFacts } from '@/features/after-sales/PackageList'
import {
  BUNDLED_KIND_LABELS,
  BUNDLED_KINDS,
  packageChoice,
  type BundledKind,
  type BundledPackage,
  type PackageChoice,
} from '@/features/quotations/bundledPackageRules'
import type { PackageView } from '@/types/res/customerAfterSalesRes'

// Chọn gói bảo trì / bảo vệ thiên tai đang bán để đi kèm báo giá lắp đặt. Chỉ hiển thị và báo lựa chọn lên trên; nơi gọi gửi
// lệnh và lấy lại báo giá từ backend. Không có ô giá, ô số lượng: giá là bản chụp backend ghi lúc gắn, mỗi gói một suất

export type BundledChoice = Extract<PackageChoice, { action: 'add' | 'replace' }>

const KIND_TABS = BUNDLED_KINDS.map((kind) => ({ value: kind, label: BUNDLED_KIND_LABELS[kind] }))

type Props = {
  open: boolean
  /** Gói của danh mục; undefined khi chưa tải xong hoặc tải lỗi */
  packages: PackageView[] | undefined
  loading: boolean
  /** Lỗi tải danh mục, đã là câu cho người dùng */
  loadError: string | null
  onRetry: () => void
  /** Gói đang gắn vào báo giá (bản chụp của backend) */
  selected: BundledPackage[]
  editable: boolean
  /** Đang gửi lệnh thêm / đổi gói */
  pending: boolean
  /** Lỗi của lệnh thêm / đổi gần nhất, đã là câu cho người dùng */
  submitError: string | null
  initialKind?: BundledKind
  onChoose: (pkg: PackageView, choice: BundledChoice) => void
  onClose: () => void
}

export function BundledPackagePicker({ open, pending, onClose, ...rest }: Props) {
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      aria-label="Thêm gói dịch vụ"
      className="max-w-2xl"
    >
      <PickerBody pending={pending} onClose={onClose} {...rest} />
    </ModalDialog>
  )
}

function PickerBody({
  packages,
  loading,
  loadError,
  onRetry,
  selected,
  editable,
  pending,
  submitError,
  initialKind,
  onChoose,
  onClose,
}: Omit<Props, 'open'>) {
  const [kind, setKind] = useState<BundledKind>(initialKind ?? 'MAINTENANCE')
  const items = (packages ?? []).filter((p) => p.kind === kind)
  const current = selected.find((s) => s.kind === kind)

  return (
    <>
      <DialogTitle>Thêm gói dịch vụ</DialogTitle>
      <div className="mt-4 space-y-4">
        <Segmented label="Loại gói" options={KIND_TABS} value={kind} onChange={setKind} className="w-fit max-w-full" />
        {current && (
          <p className="text-body text-fg-2">
            Đang chọn <span className="font-medium text-fg">{current.name}</span>. Chọn gói khác cùng loại để đổi.
          </p>
        )}

        {loading ? (
          <div aria-busy="true" aria-label="Đang tải gói dịch vụ" className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : packages === undefined ? (
          <ErrorState title="Không tải được danh sách gói." message={loadError ?? undefined} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <EmptyState title={`Chưa có ${BUNDLED_KIND_LABELS[kind].toLowerCase()} đang bán`} />
        ) : (
          <ul className="max-h-[60dvh] divide-y divide-line overflow-y-auto">
            {items.map((p) => (
              <PackageOption
                key={p.packageId}
                pkg={p}
                choice={packageChoice(selected, p, editable)}
                pending={pending}
                onChoose={onChoose}
              />
            ))}
          </ul>
        )}

        <p className="text-meta text-fg-2">
          Tiền gói trả đủ 100% cùng khoản 70% của hợp đồng. Gói bắt đầu khi đã trả tiền và công trình đã bàn giao.
        </p>
        {submitError && (
          <div role="alert">
            <Notice tone="danger">{submitError}</Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={pending} onClick={onClose}>
          Đóng
        </Button>
      </DialogFooter>
    </>
  )
}

function PackageOption({
  pkg: p,
  choice,
  pending,
  onChoose,
}: {
  pkg: PackageView
  choice: PackageChoice
  pending: boolean
  onChoose: (pkg: PackageView, choice: BundledChoice) => void
}) {
  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <PackageCover key={p.imageUrl ?? p.kind} url={p.imageUrl} kind={p.kind} />
          <div className="min-w-0">
            <h3 className="text-body font-semibold text-fg">{p.name}</h3>
            {p.description && (
              <p className="mt-0.5 max-w-[60ch] text-meta whitespace-pre-line text-fg-2">{p.description}</p>
            )}
          </div>
        </div>
        <ChoiceButton pkg={p} choice={choice} pending={pending} onChoose={onChoose} />
      </div>
      <PackageFacts pkg={p} columns={2} />
    </li>
  )
}

function ChoiceButton({
  pkg,
  choice,
  pending,
  onChoose,
}: {
  pkg: PackageView
  choice: PackageChoice
  pending: boolean
  onChoose: (pkg: PackageView, choice: BundledChoice) => void
}) {
  const name = <span className="sr-only"> {pkg.name}</span>
  if (choice.action === 'none') {
    const label = choice.reason === 'selected' ? 'Đã chọn' : choice.reason === 'inactive' ? 'Ngừng bán' : 'Chọn gói'
    return (
      <Button icon={choice.reason === 'selected' ? 'check' : 'block'} variant="secondary" disabled>
        {label}
        {name}
      </Button>
    )
  }
  return (
    <Button
      icon={choice.action === 'replace' ? 'swap_horiz' : 'add'}
      variant="soft"
      disabled={pending}
      onClick={() => onChoose(pkg, choice)}
    >
      {choice.action === 'replace' ? 'Đổi sang gói này' : 'Chọn gói'}
      {name}
    </Button>
  )
}
