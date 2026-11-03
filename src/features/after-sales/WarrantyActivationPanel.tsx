import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Textarea } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Progress } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import {
  assetTypeLabel,
  formatDateOnly,
  formatFileSize,
  formatWarrantyMonths,
} from '@/features/installations/installationDisplay'
import { todayVn, vnDate, vnTimestamp } from '@/features/scheduling/schedulingDisplay'
import { useFileUpload } from '@/hooks/useFiles'
import { useRecordWarrantyActivationMutation } from '@/hooks/useManagerAfterSales'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'
import type { AssetView } from '@/types/res/managerInstallationsRes'

// Bảo hành của hãng cho thiết bị trong yêu cầu. Hạn chỉ tính được khi quản lý ghi ngày kích hoạt kèm tài liệu
// (phiếu bảo hành, hoá đơn); ghi một lần, không sửa. Xem chi tiết công trình chưa trả ngày đã ghi,
// nên trình duyệt này nhớ thiết bị đã ghi (cả khi ghi lại mới biết là đã có) để tải lại trang không hiện nút nữa

const DOCUMENT = 'PROJECT_DOCUMENT'
const REASON_MAX = 500
const RECORDED_KEY = 'smartsolar.warrantyActivation'

/** Ngày đã ghi; null khi chỉ biết là đã ghi ở nơi khác */
type Recorded = { warrantyStartsAt: string | null; warrantyEndsAt: string | null }

function readRecorded(): Record<string, Recorded> {
  try {
    return JSON.parse(localStorage.getItem(RECORDED_KEY) ?? '{}') as Record<string, Recorded>
  } catch {
    return {}
  }
}

function rememberRecorded(assetId: string, value: Recorded) {
  try {
    localStorage.setItem(RECORDED_KEY, JSON.stringify({ ...readRecorded(), [assetId]: value }))
  } catch {
    // Trình duyệt không cho lưu thì chỉ nhớ đến khi tải lại trang
  }
}

const assetLabel = (a: AssetView) => `${assetTypeLabel(a.assetType)} ${a.manufacturer} ${a.model}`

/** Thiết bị khách nghi lỗi và thiết bị của các hạng mục kỹ thuật viên ghi */
function linkedAssets(request: ServiceRequestView, assets: AssetView[]) {
  const ids = new Set([request.suspectedAssetId, ...request.items.map((item) => item.assetId)].filter(Boolean))
  return assets.filter((a) => ids.has(a.assetId))
}

function ActivationDialog({
  asset,
  open,
  onOpenChange,
  onRecorded,
}: {
  asset: AssetView
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecorded: (assetId: string, value: Recorded) => void
}) {
  const today = todayVn()
  const [date, setDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const upload = useFileUpload(DOCUMENT)
  const record = useRecordWarrantyActivationMutation()
  const busy = upload.uploading || record.isPending

  function pick(files: File[]) {
    const picked = files[0]!
    setFile(picked)
    setFileId(null)
    setFileError(fileProblem(picked, DOCUMENT))
  }

  async function submit() {
    setError(null)
    if (!date) return setDateError('Chọn ngày kích hoạt.')
    if (!file) return setFileError('Chọn phiếu bảo hành hoặc hoá đơn ghi ngày kích hoạt.')
    if (fileError) return
    if (!reason.trim()) return setError('Ghi lý do, ví dụ ngày lấy từ tài liệu nào.')
    try {
      // Tải xong mà ghi lỗi thì lần sau dùng lại tệp đã tải
      const evidenceFileId = fileId ?? (await upload.upload(file)).fileId
      setFileId(evidenceFileId)
      const result = await record.mutateAsync({
        assetId: asset.assetId,
        body: { activatedAt: vnTimestamp(date, '00:00'), evidenceFileId, reason: reason.trim() },
      })
      toast.success(
        `Đã ghi ngày kích hoạt. Bảo hành của hãng đến ${formatDateOnly(vnDate(result.warrantyEndsAt ?? ''))}.`,
      )
      onRecorded(asset.assetId, { warrantyStartsAt: result.warrantyStartsAt, warrantyEndsAt: result.warrantyEndsAt })
      onOpenChange(false)
    } catch (e) {
      if (isApiError(e) && e.code === 'AFTER_SALES_WARRANTY_ACTIVATION_RECORDED') {
        toast.info('Thiết bị này đã ghi ngày kích hoạt trước đó, không cần ghi lại.')
        onRecorded(asset.assetId, { warrantyStartsAt: null, warrantyEndsAt: null })
        onOpenChange(false)
        return
      }
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!busy}
      className="max-w-lg"
      aria-label="Ghi ngày kích hoạt bảo hành của hãng"
    >
      <DialogTitle>Ngày kích hoạt bảo hành: {assetLabel(asset)}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Serial {asset.serialNumber}. Hạn bảo hành tính từ ngày này cộng {formatWarrantyMonths(asset.warrantyMonths)}.
        Ghi một lần, không sửa được.
      </p>
      <div className="mt-4 space-y-4">
        <Field
          label="Ngày kích hoạt"
          htmlFor="activation-date"
          required
          error={dateError ?? undefined}
          className="w-full sm:w-48"
        >
          <DateField
            id="activation-date"
            max={today}
            value={date}
            onChange={(value) => {
              setDate(value)
              setDateError(null)
            }}
            disabled={busy}
          />
        </Field>
        <section aria-labelledby="activation-document" className="space-y-2">
          <h3 id="activation-document" className="text-body font-medium text-fg">
            Tài liệu
            <span aria-hidden className="text-danger">
              {' *'}
            </span>
          </h3>
          <p className="text-body text-fg-2">
            {file ? (
              <>
                <span className="font-medium text-fg">{file.name}</span>
                <span className="tnum">, {formatFileSize(file.size)}</span>
              </>
            ) : (
              'Phiếu bảo hành, hoá đơn hoặc biên bản có ghi ngày kích hoạt.'
            )}
          </p>
          <FileButton size="sm" icon="upload_file" accept={acceptFor(DOCUMENT)} disabled={busy} onFiles={pick}>
            {file ? 'Chọn tệp khác' : 'Chọn tệp'}
          </FileButton>
          {upload.progress !== null && (
            <Progress value={Math.round(upload.progress * 100)} label="Đang tải tài liệu lên" />
          )}
          {fileError ? (
            <p className="text-meta text-danger" role="alert">
              {fileError}
            </p>
          ) : (
            <p className="text-meta text-fg-3">
              {fileTypesText(DOCUMENT)}, tối đa {maxSizeText(DOCUMENT)}.
            </p>
          )}
        </section>
        <Field
          label="Lý do"
          htmlFor="activation-reason"
          required
          hint={`Bắt buộc, tối đa ${REASON_MAX} ký tự.`}
          error={error ?? undefined}
        >
          <Textarea
            id="activation-reason"
            rows={2}
            maxLength={REASON_MAX}
            value={reason}
            disabled={busy}
            onChange={(e) => {
              setReason(e.target.value)
              setError(null)
            }}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
          Huỷ
        </Button>
        <Button icon="event_available" variant="primary" disabled={busy} onClick={() => void submit()}>
          {upload.uploading ? 'Đang tải tài liệu…' : record.isPending ? 'Đang ghi…' : 'Ghi ngày kích hoạt'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function WarrantyActivationPanel({ request, assets }: { request: ServiceRequestView; assets: AssetView[] }) {
  const linked = linkedAssets(request, assets)
  const [editing, setEditing] = useState<AssetView | null>(null)
  // Đổi key mỗi lần mở để form bắt đầu trống
  const [session, setSession] = useState(0)
  const [recorded, setRecorded] = useState<Record<string, Recorded>>(readRecorded)
  if (linked.length === 0) return null

  return (
    <Panel>
      <PanelHeader title="Bảo hành của hãng" />
      <PanelBody>
        <ul className="divide-y divide-line">
          {linked.map((a) => {
            const done = recorded[a.assetId]
            // Thiết bị không gắn sản phẩm trong danh mục thì không có thời hạn đã kiểm chứng
            const activatable = a.productId !== null && a.warrantyMonths !== null
            return (
              <li key={a.assetId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-fg">{assetLabel(a)}</p>
                  <p className="text-meta text-fg-2">
                    Serial <span className="tnum">{a.serialNumber}</span>
                    {activatable ? `, bảo hành ${formatWarrantyMonths(a.warrantyMonths)}` : ''}
                    {done?.warrantyStartsAt
                      ? `, từ ${formatDateOnly(vnDate(done.warrantyStartsAt))} đến ${formatDateOnly(vnDate(done.warrantyEndsAt ?? ''))}`
                      : done
                        ? ', đã ghi ngày kích hoạt'
                        : ''}
                  </p>
                </div>
                {!activatable ? (
                  <p className="text-meta text-fg-2">Chưa gắn sản phẩm trong danh mục nên chưa ghi được</p>
                ) : (
                  !done && (
                    <Button
                      size="sm"
                      variant="soft"
                      icon="event_available"
                      onClick={() => {
                        setSession((n) => n + 1)
                        setEditing(a)
                      }}
                    >
                      Ghi ngày kích hoạt
                    </Button>
                  )
                )}
              </li>
            )
          })}
        </ul>
        {editing && (
          <ActivationDialog
            key={session}
            asset={editing}
            open
            onOpenChange={(open) => !open && setEditing(null)}
            onRecorded={(assetId, value) => {
              rememberRecorded(assetId, value)
              setRecorded((all) => ({ ...all, [assetId]: value }))
            }}
          />
        )}
      </PanelBody>
    </Panel>
  )
}
