import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DocumentPreviewButtons } from '@/components/common/ui/document-preview'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Input, Select, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice, Progress } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { paymentPlanErrorMessage, signatureSetMeta } from '@/features/payment-plan/paymentPlanDisplay'
import {
  SIGNATURE_NOTE_MAX,
  SIGNED_PAGES_MAX,
  assignToPages,
  canFinalizeSignature,
  canReplacePage,
  canStartSignature,
  currentPages,
  pageCountError,
  signatureNoteError,
  signedOnError,
} from '@/features/payment-plan/paymentPlanRules'
import { formatMoment, todayVn } from '@/features/scheduling/schedulingDisplay'
import { useUploadQueue, type UploadItem } from '@/hooks/useFiles'
import {
  useFinalizeSignatureSetMutation,
  usePutSignedPageMutation,
  useSignatureSetsQuery,
  useSignedPageUrlMutation,
  useStartSignatureSetMutation,
} from '@/hooks/usePaymentPlan'
import type { SignatureWriter } from '@/services/signatureSetService'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { AttachedFileUrlView, ContractPaymentPlanView, SignatureSetView } from '@/types/res/paymentPlanRes'

// Hợp đồng giấy 30/70: khách ký bản in tại công trình sau khi khoản 30% được xác minh, kỹ thuật viên chụp từng trang 1..N rồi chốt
// (quản lý / quản trị hỗ trợ cùng luật). Mỗi trang một tệp SIGNED_CONTRACT_PAGE đã xác minh; thay được trước khi chốt, chốt xong là
// khoá và hợp đồng thành SIGNED. Không phải chữ ký điện tử. Xem trang bằng link ký sẵn xin lúc bấm, không lưu link

const PURPOSE = 'SIGNED_CONTRACT_PAGE'

/** Xem trong hộp thoại hoặc tải một trang đã ký bằng link ký sẵn xin lúc bấm */
function PageLinks({
  name,
  request,
}: {
  name: string
  request: (disposition: 'inline' | 'attachment') => Promise<AttachedFileUrlView>
}) {
  return <DocumentPreviewButtons name={name} request={request} errorText={paymentPlanErrorMessage} />
}

function StartForm({
  writer,
  contractId,
  current,
  onDone,
}: {
  writer: SignatureWriter
  contractId: string
  current: SignatureSetView | null
  onDone: () => void
}) {
  const start = useStartSignatureSetMutation(writer)
  const [count, setCount] = useState(current ? String(current.expectedPageCount) : '')
  const [signedOn, setSignedOn] = useState(todayVn())
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ count?: string; signedOn?: string; note?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const today = todayVn()
  const restarting = current !== null && current.uploadedPageCount > 0 && Number(count) !== current.expectedPageCount

  async function submit() {
    setError(null)
    const next = {
      count: pageCountError(count) ?? undefined,
      signedOn: signedOnError(signedOn, today) ?? undefined,
      note: signatureNoteError(note) ?? undefined,
    }
    setErrors(next)
    if (next.count || next.signedOn || next.note) return
    if (restarting && !confirmRestart) return setConfirmRestart(true)
    try {
      await start.mutateAsync({
        contractId,
        body: { expectedPageCount: Number(count), signedOn: signedOn || null, note: note.trim() || null },
      })
      toast.success('Đã ghi số trang. Chụp và tải từng trang.')
      setConfirmRestart(false)
      onDone()
    } catch (e) {
      setConfirmRestart(false)
      setError(paymentPlanErrorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số trang của hợp đồng giấy" htmlFor="sig-pages" required error={errors.count}>
          <Input
            id="sig-pages"
            inputMode="numeric"
            className="tnum"
            value={count}
            disabled={start.isPending}
            aria-required
            aria-invalid={Boolean(errors.count) || undefined}
            aria-describedby={fieldMessageId('sig-pages')}
            placeholder={`1–${SIGNED_PAGES_MAX}`}
            onChange={(e) => setCount(e.target.value)}
          />
        </Field>
        <Field label="Ngày ký trên giấy" htmlFor="sig-date" optional error={errors.signedOn}>
          <DateField id="sig-date" value={signedOn} max={today} disabled={start.isPending} onChange={setSignedOn} />
        </Field>
      </div>
      <Field label="Ghi chú" htmlFor="sig-note" optional error={errors.note}>
        <Textarea
          id="sig-note"
          rows={2}
          maxLength={SIGNATURE_NOTE_MAX}
          value={note}
          disabled={start.isPending}
          aria-describedby={fieldMessageId('sig-note')}
          placeholder="Ví dụ: Ký tại nhà khách, có mặt chủ nhà."
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <Button icon="photo_camera" variant="soft" disabled={start.isPending} onClick={() => void submit()}>
        {start.isPending ? 'Đang ghi…' : current ? 'Đổi số trang' : 'Bắt đầu tải các trang'}
      </Button>

      {confirmRestart && current && (
        <ModalDialog open onOpenChange={(o) => !o && setConfirmRestart(false)} aria-label="Đổi số trang?">
          <DialogTitle>
            Đổi số trang từ {current.expectedPageCount} thành {count}?
          </DialogTitle>
          <p className="mt-2 text-body text-fg-2">
            {current.uploadedPageCount} trang đã tải sẽ chuyển vào lịch sử và không thuộc bộ trang mới. Bạn phải tải lại
            đủ {count} trang.
          </p>
          <DialogFooter>
            <Button icon="close" variant="secondary" onClick={() => setConfirmRestart(false)}>
              Giữ số trang cũ
            </Button>
            <Button icon="restart_alt" variant="warn" disabled={start.isPending} onClick={() => void submit()}>
              Đổi số trang
            </Button>
          </DialogFooter>
        </ModalDialog>
      )}
    </div>
  )
}

function QueueRow({
  item,
  expected,
  onPage,
  onRemove,
  disabled,
}: {
  item: UploadItem
  expected: number
  onPage: (page: string) => void
  onRemove: () => void
  disabled: boolean
}) {
  // Ảnh xem trước tạo từ tệp trên máy, thu hồi khi bỏ khỏi danh sách
  const preview = useMemo(() => URL.createObjectURL(item.file), [item.file])
  useEffect(() => () => URL.revokeObjectURL(preview), [preview])
  const editable = item.status === 'queued' || item.status === 'failed' || item.status === 'invalid'
  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <img src={preview} alt="" className="size-16 shrink-0 rounded-control border border-line object-cover" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-body break-all text-fg">
          {item.file.name} <span className="tnum text-fg-2">({formatFileSize(item.file.size)})</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-meta text-fg-2" htmlFor={`page-of-${item.key}`}>
            Trang
          </label>
          <Select
            id={`page-of-${item.key}`}
            size="sm"
            value={item.caption}
            disabled={disabled || !editable}
            onChange={(e) => onPage(e.target.value)}
          >
            {Array.from({ length: expected }, (_, i) => String(i + 1)).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          {editable && (
            <Button size="sm" variant="danger-quiet" icon="close" disabled={disabled} onClick={onRemove}>
              Bỏ
            </Button>
          )}
        </div>
        {item.status === 'uploading' && (
          <Progress value={Math.round(item.progress * 100)} label={`Đang tải trang ${item.caption}`} />
        )}
        {item.status === 'attaching' && <p className="text-meta text-fg-2">Đang gắn vào trang {item.caption}…</p>}
        {item.error && (
          <p role="alert" className="text-meta text-danger">
            {item.error}
          </p>
        )}
      </div>
    </li>
  )
}

function UploadingSet({
  writer,
  reader,
  contract,
  set,
}: {
  writer: SignatureWriter
  reader: 'staff' | 'customer'
  contract: ContractView
  set: SignatureSetView
}) {
  const put = usePutSignedPageMutation(writer)
  const pageUrl = useSignedPageUrlMutation(reader)
  const finalize = useFinalizeSignatureSetMutation(writer)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extra, setExtra] = useState(0)
  const pages = currentPages(set.pages)
  const byPage = new Map(pages.map((p) => [p.pageNumber, p]))
  const queue = useUploadQueue({
    purpose: PURPOSE,
    check: (file) => fileProblem(file, PURPOSE),
    attach: (fileId, caption) =>
      put.mutateAsync({ contractId: contract.contractId, pageNumber: Number(caption), fileId }),
    onComplete: ({ added, failed }) => {
      if (added > 0) toast.success(`Đã gắn ${added} trang.`)
      if (failed > 0) toast.error(`${failed} trang chưa tải được. Xem lỗi ở từng ảnh rồi thử lại.`)
    },
  })
  const queuedPages = new Set(queue.items.map((i) => Number(i.caption)))
  const duplicate = queue.items.length !== queuedPages.size

  function add(files: File[], startPage?: number) {
    setError(null)
    const filled = [...pages.map((p) => p.pageNumber), ...queuedPages]
    const { assigned, extra: rest } = assignToPages(files, { expected: set.expectedPageCount, filled, startPage })
    queue.add(
      assigned.map((a) => a.item),
      assigned.map((a) => String(a.pageNumber)),
    )
    setExtra(rest.length)
  }

  async function lock() {
    setError(null)
    try {
      await finalize.mutateAsync({ contractId: contract.contractId, expectedRevision: set.revision })
      toast.success('Đã chốt hợp đồng giấy. Hợp đồng sẵn sàng thi công.')
      setConfirming(false)
    } catch (e) {
      setConfirming(false)
      setError(paymentPlanErrorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-body text-fg-2">
        Đã tải <span className="tnum font-medium text-fg">{set.uploadedPageCount}</span> /{' '}
        <span className="tnum">{set.expectedPageCount}</span> trang
        {set.missingPages.length > 0 && <>; còn thiếu trang {set.missingPages.join(', ')}</>}.
      </p>

      <ol className="divide-y divide-line rounded-control border border-line px-3">
        {Array.from({ length: set.expectedPageCount }, (_, i) => i + 1).map((n) => {
          const page = byPage.get(n)
          return (
            <li key={n} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-body text-fg">
                Trang <span className="tnum">{n}</span>{' '}
                {page ? (
                  <span className="tnum text-meta text-fg-2">tải lúc {formatMoment(page.uploadedAt)}</span>
                ) : (
                  <Badge tone="warn">Chưa có</Badge>
                )}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {page && (
                  <PageLinks
                    name={`Trang ${n}`}
                    request={(disposition) =>
                      pageUrl.mutateAsync({ contractId: contract.contractId, fileId: page.fileId, disposition })
                    }
                  />
                )}
                {canReplacePage(set) && (
                  <FileButton
                    size="sm"
                    variant="soft"
                    icon={page ? 'swap_horiz' : 'add_a_photo'}
                    accept={acceptFor(PURPOSE)}
                    disabled={queue.busy}
                    onFiles={(files) => add(files.slice(0, 1), n)}
                  >
                    {page ? 'Thay' : 'Chọn ảnh'}
                  </FileButton>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="space-y-2">
        <FileButton
          variant="soft"
          icon="add_photo_alternate"
          multiple
          accept={acceptFor(PURPOSE)}
          disabled={queue.busy}
          onFiles={(files) => add(files)}
        >
          Chọn nhiều ảnh (xếp vào trang còn thiếu)
        </FileButton>
        <p className="text-meta text-fg-3">
          {fileTypesText(PURPOSE)}, tối đa {maxSizeText(PURPOSE)} mỗi trang. Chụp thẳng, đủ sáng, thấy rõ chữ ký.
        </p>
        {extra > 0 && (
          <p role="status" className="text-meta text-fg-2">
            {extra} ảnh thừa so với số trang nên không được thêm.
          </p>
        )}
      </div>

      {queue.items.length > 0 && (
        <div className="space-y-3">
          <ul className="divide-y divide-line">
            {queue.items.map((item) => (
              <QueueRow
                key={item.key}
                item={item}
                expected={set.expectedPageCount}
                disabled={queue.busy}
                onPage={(p) => queue.setCaption(item.key, p)}
                onRemove={() => queue.remove(item.key)}
              />
            ))}
          </ul>
          {duplicate && (
            <p role="alert" className="text-meta text-danger">
              Hai ảnh đang cùng một số trang. Đổi số trang trước khi tải.
            </p>
          )}
          <Button icon="upload" variant="soft" disabled={queue.busy || duplicate} onClick={queue.start}>
            {queue.waitSeconds > 0
              ? `Chờ ${queue.waitSeconds} giây rồi tải tiếp`
              : queue.busy
                ? 'Đang tải…'
                : `Tải lên ${queue.items.filter((i) => i.status !== 'invalid').length} ảnh`}
          </Button>
        </div>
      )}

      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button
          icon="lock"
          variant="primary"
          disabled={!canFinalizeSignature(set) || queue.items.length > 0 || finalize.isPending}
          onClick={() => setConfirming(true)}
        >
          Chốt hợp đồng giấy
        </Button>
        {!canFinalizeSignature(set) && <p className="text-meta text-fg-2">Tải đủ mọi trang rồi mới chốt được.</p>}
      </div>

      {confirming && (
        <ModalDialog
          open
          onOpenChange={(o) => !o && !finalize.isPending && setConfirming(false)}
          dismissible={!finalize.isPending}
          aria-label="Chốt hợp đồng giấy?"
        >
          <DialogTitle>Chốt {set.expectedPageCount} trang hợp đồng giấy?</DialogTitle>
          <div className="mt-2 space-y-2 text-body text-fg-2">
            <p>Đã kiểm tra từng trang rõ chữ, đúng thứ tự, có chữ ký của khách. Chốt xong không thay trang được nữa.</p>
            <p>Hợp đồng chuyển sang đã ký, sẵn sàng thi công. Khoản 70% vẫn chỉ mở khi khách nghiệm thu.</p>
          </div>
          <DialogFooter>
            <Button icon="close" variant="secondary" disabled={finalize.isPending} onClick={() => setConfirming(false)}>
              Đóng
            </Button>
            <Button icon="lock" variant="primary" disabled={finalize.isPending} onClick={() => void lock()}>
              {finalize.isPending ? 'Đang chốt…' : 'Chốt'}
            </Button>
          </DialogFooter>
        </ModalDialog>
      )}
    </div>
  )
}

function SetHistory({
  sets,
  reader,
  contractId,
}: {
  sets: SignatureSetView[]
  reader: 'staff' | 'customer'
  contractId: string
}) {
  const pageUrl = useSignedPageUrlMutation(reader)
  if (sets.length === 0) return null
  return (
    <ol className="divide-y divide-line">
      {[...sets]
        .sort((a, b) => b.version - a.version)
        .map((s) => {
          const status = signatureSetMeta(s.status)
          return (
            <li key={s.signatureSetId} className="space-y-2 py-3">
              <p className="flex flex-wrap items-center gap-2 text-body text-fg">
                <span className="font-medium">Lần {s.version}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
                <span className="tnum text-meta text-fg-2">
                  {s.expectedPageCount} trang, lập lúc {formatMoment(s.createdAt)}
                  {s.finalizedAt && `, chốt lúc ${formatMoment(s.finalizedAt)}`}
                  {s.signedOn && `, ký ngày ${s.signedOn.split('-').reverse().join('/')}`}
                </span>
              </p>
              {s.note && <p className="text-body whitespace-pre-line text-fg-2">{s.note}</p>}
              {s.status !== 'UPLOADING' && (
                <ul className="space-y-1">
                  {s.pages
                    .slice()
                    .sort((a, b) => a.pageNumber - b.pageNumber || a.uploadedAt.localeCompare(b.uploadedAt))
                    .map((p) => (
                      <li key={`${p.pageNumber}-${p.fileId}`} className="flex flex-wrap items-center gap-2">
                        <span className="text-body text-fg">
                          Trang <span className="tnum">{p.pageNumber}</span>
                        </span>
                        <span className="tnum text-meta text-fg-2">
                          {p.replacedAt ? `bị thay lúc ${formatMoment(p.replacedAt)}` : formatMoment(p.uploadedAt)}, mã{' '}
                          <code className="font-mono">{p.sha256.slice(0, 12)}</code>
                        </span>
                        <PageLinks
                          name={`Trang ${p.pageNumber}, lần ${s.version}`}
                          request={(disposition) => pageUrl.mutateAsync({ contractId, fileId: p.fileId, disposition })}
                        />
                      </li>
                    ))}
                </ul>
              )}
            </li>
          )
        })}
    </ol>
  )
}

/**
 * `writer`: technician (kỹ thuật viên đã khảo sát) hoặc support (quản lý / quản trị) thì ghi được; null là chỉ đọc. `reader`
 * quyết định đường đọc (khách chỉ đọc hợp đồng của mình)
 */
export function SignatureSetPanel({
  contract: c,
  writer,
  reader,
}: {
  contract: ContractView & { paymentPlan: ContractPaymentPlanView }
  writer: SignatureWriter | null
  reader: 'staff' | 'customer'
}) {
  const sets = useSignatureSetsQuery(reader, c.contractId)
  const [changingCount, setChangingCount] = useState(false)
  const list = sets.data ?? []
  const current = list.find((s) => s.status !== 'SUPERSEDED') ?? c.paymentPlan.signature ?? null
  const startable = writer !== null && canStartSignature(c)
  const waitingDeposit = !c.paymentPlan.depositPaid
  const history = list.filter((s) => s.signatureSetId !== current?.signatureSetId || s.status !== 'UPLOADING')

  return (
    <Panel id="paper-signature" className="scroll-mt-6">
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Hợp đồng giấy đã ký
            {current && (
              <Badge tone={signatureSetMeta(current.status).tone}>{signatureSetMeta(current.status).label}</Badge>
            )}
          </span>
        }
        description="Ảnh chụp từng trang bản in khách đã ký. Không phải chữ ký điện tử."
      />
      <PanelBody className="space-y-4">
        {waitingDeposit ? (
          <p className="text-body text-fg-2">
            {writer
              ? 'Chỗ tải ảnh các trang hiện ở đây khi khoản 30% đã được xác minh (PayOS báo đã nhận, hoặc quản lý xác nhận tiền mặt). Lúc đó in hợp đồng cho khách ký rồi chụp từng trang.'
              : 'Khách ký bản giấy sau khi khoản 30% được xác minh. Trước đó khách đọc đầy đủ điều khoản ở mục Nội dung.'}
          </p>
        ) : current?.status === 'FINALIZED' ? (
          <Notice
            tone="ok"
            title={`Đã chốt ${current.expectedPageCount} trang lúc ${formatMoment(current.finalizedAt)}`}
          >
            Bộ trang đã khoá; hợp đồng sẵn sàng thi công.
          </Notice>
        ) : !writer ? (
          <p className="text-body text-fg-2">
            {current
              ? `Đang tải các trang: ${current.uploadedPageCount} / ${current.expectedPageCount} trang.`
              : 'Kỹ thuật viên chưa tải trang nào của hợp đồng giấy.'}
          </p>
        ) : null}

        {startable && (!current || changingCount) && (
          <StartForm
            writer={writer!}
            contractId={c.contractId}
            current={current?.status === 'UPLOADING' ? current : null}
            onDone={() => setChangingCount(false)}
          />
        )}
        {writer && current?.status === 'UPLOADING' && !changingCount && (
          <>
            <UploadingSet writer={writer} reader={reader} contract={c} set={current} />
            <Button size="sm" variant="ghost" icon="edit" bleed={false} onClick={() => setChangingCount(true)}>
              Đổi số trang
            </Button>
          </>
        )}

        {sets.isPending ? (
          <Skeleton className="h-16" />
        ) : sets.isError ? (
          <ErrorState
            title="Không tải được các trang đã ký."
            message={paymentPlanErrorMessage(sets.error)}
            onRetry={() => void sets.refetch()}
          />
        ) : (
          history.length > 0 && (
            <section className="space-y-2 border-t border-line pt-4">
              <h3 className="text-body font-medium text-fg">Các lần tải</h3>
              <SetHistory sets={history} reader={reader} contractId={c.contractId} />
            </section>
          )
        )}
      </PanelBody>
    </Panel>
  )
}
