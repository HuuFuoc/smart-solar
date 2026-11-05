import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { managerActionError } from '@/features/after-sales/managerAfterSalesDisplay'
import {
  ASSET_FIELD_MAX,
  ASSET_REASON_MAX,
  assetCorrectionBody,
  assetCorrectionErrors,
  assetDraftOf,
  changedAssetFields,
  type AssetDraft,
  type AssetField,
} from '@/features/after-sales/managerAfterSalesRules'
import { assetTypeLabel } from '@/features/installations/installationDisplay'
import { useCorrectAssetMutation } from '@/hooks/useManagerAfterSales'
import type { InstalledAssetView, ServiceRequestView } from '@/types/res/customerAfterSalesRes'
import type { AssetView } from '@/types/res/managerInstallationsRes'

// Sửa thông tin thiết bị đã lắp (sai hãng, model, serial, vị trí, thông số) sau khi bàn giao. Lý do bắt buộc; backend ghi giá
// trị cũ và mới vào lịch sử của thiết bị (chưa có API đọc lịch sử đó). Khách không nghiệm thu lại. Không phải thay thiết bị.
// Chi tiết công trình không trả thông số đang lưu, nên ô thông số chỉ ghi mới: bỏ trống là giữ nguyên

const LABELS: Record<AssetField, string> = {
  manufacturer: 'Hãng',
  model: 'Model',
  serialNumber: 'Số serial',
  positionCode: 'Vị trí',
  specifications: 'Thông số',
}

function CorrectionDialog({
  asset,
  onClose,
  onDone,
}: {
  asset: AssetView
  onClose: () => void
  onDone: (result: InstalledAssetView) => void
}) {
  const correct = useCorrectAssetMutation()
  const [draft, setDraft] = useState<AssetDraft>(() => assetDraftOf(asset))
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errors = checked ? assetCorrectionErrors(asset, draft) : {}
  const changed = new Set(changedAssetFields(asset, draft))
  const set = (field: keyof AssetDraft, value: string) => setDraft((d) => ({ ...d, [field]: value }))

  async function submit() {
    if (correct.isPending) return
    setChecked(true)
    setError(null)
    if (Object.keys(assetCorrectionErrors(asset, draft)).length > 0) return
    try {
      const result = await correct.mutateAsync({ assetId: asset.assetId, body: assetCorrectionBody(asset, draft) })
      toast.success(`Đã sửa thông tin ${assetTypeLabel(result.assetType).toLowerCase()} serial ${result.serialNumber}.`)
      onDone(result)
      onClose()
    } catch (e) {
      setError(managerActionError(e))
    }
  }

  const field = (f: AssetField, required: boolean, current: string | null | undefined) => (
    <Field
      key={f}
      label={LABELS[f]}
      htmlFor={`asset-${f}`}
      required={required}
      hint={
        f === 'specifications'
          ? `Bỏ trống là giữ thông số đang lưu. Tối đa ${ASSET_FIELD_MAX[f]} ký tự.`
          : changed.has(f)
            ? `Đang lưu: ${current || '(trống)'}`
            : undefined
      }
      error={errors[f]}
      className={f === 'specifications' ? 'sm:col-span-2' : undefined}
    >
      {f === 'specifications' ? (
        <Textarea
          id={`asset-${f}`}
          rows={2}
          maxLength={ASSET_FIELD_MAX[f]}
          value={draft[f]}
          disabled={correct.isPending}
          onChange={(e) => set(f, e.target.value)}
        />
      ) : (
        <Input
          id={`asset-${f}`}
          maxLength={ASSET_FIELD_MAX[f]}
          value={draft[f]}
          aria-required={required || undefined}
          aria-invalid={errors[f] ? true : undefined}
          disabled={correct.isPending}
          onChange={(e) => set(f, e.target.value)}
        />
      )}
    </Field>
  )

  return (
    <>
      <DialogTitle>Sửa thông tin {assetTypeLabel(asset.assetType).toLowerCase()}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Chỉ sửa thông tin ghi sai của thiết bị đang lắp. Ô không đổi giữ nguyên; hệ thống lưu giá trị cũ, giá trị mới và
        lý do.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {field('manufacturer', true, asset.manufacturer)}
        {field('model', true, asset.model)}
        {field('serialNumber', true, asset.serialNumber)}
        {field('positionCode', false, asset.positionCode)}
        {field('specifications', false, null)}
        <Field
          label="Lý do sửa"
          htmlFor="asset-reason"
          required
          hint={`Bắt buộc, tối đa ${ASSET_REASON_MAX} ký tự.`}
          error={errors.reason}
          className="sm:col-span-2"
        >
          <Textarea
            id="asset-reason"
            rows={2}
            maxLength={ASSET_REASON_MAX}
            value={draft.reason}
            aria-required
            aria-invalid={errors.reason ? true : undefined}
            disabled={correct.isPending}
            onChange={(e) => set('reason', e.target.value)}
          />
        </Field>
      </div>
      {errors.form && (
        <p className="mt-4 text-meta text-danger" role="alert">
          {errors.form}
        </p>
      )}
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={correct.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button icon="save" variant="primary" disabled={correct.isPending} onClick={() => void submit()}>
          {correct.isPending ? 'Đang lưu…' : 'Lưu thông tin'}
        </Button>
      </DialogFooter>
    </>
  )
}

/** Thiết bị khách nghi lỗi và thiết bị của các hạng mục kỹ thuật viên ghi lên đầu */
function relatedIds(request: ServiceRequestView) {
  return new Set([request.suspectedAssetId, ...request.items.map((i) => i.assetId)].filter(Boolean) as string[])
}

export function AssetCorrectionPanel({ request, assets }: { request: ServiceRequestView; assets: AssetView[] }) {
  const [editing, setEditing] = useState<AssetView | null>(null)
  const [showAll, setShowAll] = useState(false)
  // Thông số vừa sửa trong phiên này (chi tiết công trình không trả thông số)
  const [specs, setSpecs] = useState<Record<string, string | null>>({})
  if (assets.length === 0) return null
  const related = relatedIds(request)
  const sorted = [...assets].sort((a, b) => Number(related.has(b.assetId)) - Number(related.has(a.assetId)))
  const visible = showAll || related.size === 0 ? sorted : sorted.filter((a) => related.has(a.assetId))
  const hidden = sorted.length - visible.length

  return (
    <Panel>
      <PanelHeader
        title="Thiết bị của công trình"
        description={`${assets.length} thiết bị`}
        action={
          hidden > 0 || showAll ? (
            <Button
              icon={showAll ? 'unfold_less' : 'unfold_more'}
              size="sm"
              variant="ghost"
              onClick={() => setShowAll((s) => !s)}
            >
              {showAll ? 'Chỉ thiết bị liên quan' : `Xem cả ${hidden} thiết bị khác`}
            </Button>
          ) : undefined
        }
      />
      <PanelBody>
        <ul className="divide-y divide-line">
          {visible.map((a) => (
            <li key={a.assetId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-body font-medium text-fg">
                  {assetTypeLabel(a.assetType)} {a.manufacturer} {a.model}
                  {related.has(a.assetId) && <Badge tone="neutral">Liên quan yêu cầu này</Badge>}
                </p>
                <p className="text-meta text-fg-2">
                  Serial <span className="tnum">{a.serialNumber}</span>
                  {a.positionCode ? `, vị trí ${a.positionCode}` : ''}
                  {a.assetId in specs ? `, thông số: ${specs[a.assetId] ?? '(trống)'}` : ''}
                </p>
              </div>
              <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(a)}>
                Sửa
              </Button>
            </li>
          ))}
        </ul>
        <ModalDialog
          open={Boolean(editing)}
          onOpenChange={(next) => !next && setEditing(null)}
          className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
          aria-label="Sửa thông tin thiết bị"
        >
          {editing && (
            <CorrectionDialog
              key={editing.assetId}
              asset={editing}
              onClose={() => setEditing(null)}
              onDone={(result) => setSpecs((all) => ({ ...all, [result.assetId]: result.specifications }))}
            />
          )}
        </ModalDialog>
      </PanelBody>
    </Panel>
  )
}
