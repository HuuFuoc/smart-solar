import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { QUOTATION_LIMITS } from '@/common/quotation'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState } from '@/components/common/ui/states'
import { QuotationLines, QuotationTerms, QuotationTotals } from '@/features/quotations/QuotationContent'
import { QuotationHeaderDialog } from '@/features/quotations/QuotationHeaderDialog'
import { QuotationLineDialog } from '@/features/quotations/QuotationLineDialog'
import {
  byVersionDesc,
  currentQuotation,
  defaultValidUntil,
  formatDateVn,
  formatQuotationMoney,
  isLive,
  quotationStatusMeta,
  quotationTitle,
  sendBlockers,
} from '@/features/quotations/quotationDisplay'
import { SendQuotationDialog } from '@/features/quotations/SendQuotationDialog'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  salesQuotationKeys,
  useAddQuotationLineMutation,
  useCreateQuotationMutation,
  useQuotationsQuery,
  useRemoveQuotationLineMutation,
  useReviseQuotationMutation,
} from '@/hooks/useSalesQuotations'
import { errorMessage } from '@/services/api/errors'
import type { QuotationLineView, QuotationView } from '@/types/res/quotationsRes'

// Báo giá lắp đặt trên trang yêu cầu khảo sát của kinh doanh. Chỉ hiện khi khảo sát tại công trình đã hoàn thành
// Bản nháp sửa trực tiếp (mỗi thao tác lưu ngay, backend tính lại tổng); bản đã gửi chỉ xem, muốn đổi thì lập bản sửa
// Việc tiếp theo tô đỏ ở khối Tình hình, ở đây không tô đỏ lại

type Props = {
  surveyRequestId: string
  enabled: boolean
  /** Kết luận của kỹ thuật viên (installationFeasibility) */
  feasibility?: string | null
}

export function SalesQuotationPanel({ surveyRequestId, enabled, feasibility }: Props) {
  const query = useQuotationsQuery(surveyRequestId, { enabled })
  if (!enabled || query.isPending) return null
  if (query.isError)
    return (
      <Panel>
        <PanelHeader title="Báo giá" />
        <PanelBody>
          <ErrorState
            title="Không tải được báo giá."
            message={errorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        </PanelBody>
      </Panel>
    )
  const list = query.data
  if (list.length === 0) return <FirstQuotation surveyRequestId={surveyRequestId} feasibility={feasibility} />
  return <QuotationWork list={list} />
}

function FirstQuotation({ surveyRequestId, feasibility }: Omit<Props, 'enabled'>) {
  const create = useCreateQuotationMutation()
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setError(null)
    try {
      // Chi phí để 0, thuế mặc định của hệ thống, hạn 30 ngày; sửa tiếp ở bản nháp
      await create.mutateAsync({
        surveyRequestId,
        body: {
          laborCost: 0,
          transportCost: 0,
          otherServiceCost: 0,
          discountAmount: 0,
          taxRatePercent: null,
          validUntil: defaultValidUntil(),
          terms: null,
          notes: null,
        },
      })
      toast.success('Đã lập bản nháp báo giá.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Panel>
      <PanelHeader title="Báo giá" />
      <PanelBody className="space-y-4">
        {feasibility === 'NOT_FEASIBLE' && (
          <Notice tone="warn" title="Kỹ thuật viên ghi công trình không lắp được">
            Xem lý do ở kết quả khảo sát và trao đổi với khách trước khi lập báo giá.
          </Notice>
        )}
        <EmptyState
          title="Chưa có báo giá"
          description="Lập báo giá theo số đo của kỹ thuật viên. Bản nháp chỉ bạn thấy; gửi rồi khách mới xem được."
          action={
            <Button icon="add" variant="soft" disabled={create.isPending} onClick={() => void start()}>
              {create.isPending ? 'Đang lập…' : 'Lập báo giá'}
            </Button>
          }
        />
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

function QuotationWork({ list }: { list: QuotationView[] }) {
  const revise = useReviseQuotationMutation()
  const [error, setError] = useState<string | null>(null)
  const sorted = [...list].sort(byVersionDesc)
  const current = currentQuotation(list)!
  // Bản khách đang có khi kinh doanh đang soạn bản sửa
  const live = current.status === 'DRAFT' ? (sorted.find(isLive) ?? null) : null
  const older = sorted.filter((q) => q.quotationId !== current.quotationId)
  const status = quotationStatusMeta(current, 'sales')
  const canRevise = current.status === 'ISSUED' || current.status === 'REVISION_REQUESTED'

  async function startRevision() {
    setError(null)
    try {
      await revise.mutateAsync(current.quotationId)
      toast.success('Đã lập bản sửa. Sửa xong thì gửi lại cho khách.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Báo giá <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
        description={<span className="tnum">{quotationTitle(current)}</span>}
        action={
          canRevise ? (
            <Button
              size="sm"
              variant="soft"
              icon="edit_note"
              disabled={revise.isPending}
              onClick={() => void startRevision()}
            >
              {revise.isPending ? 'Đang lập…' : 'Lập bản sửa'}
            </Button>
          ) : undefined
        }
      />
      <PanelBody className="space-y-6">
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
        {current.status === 'DRAFT' ? (
          <DraftEditor draft={current} live={live} />
        ) : (
          <>
            <IssuedSummary quotation={current} />
            <QuotationLines quotation={current} showCatalogPrice />
            <div className="flex justify-end">
              <QuotationTotals quotation={current} />
            </div>
            <QuotationTerms quotation={current} />
          </>
        )}
        {older.length > 0 && <OlderVersions items={older} />}
      </PanelBody>
    </Panel>
  )
}

/** Một câu cho biết bản đã gửi đang ở đâu */
function IssuedSummary({ quotation: q }: { quotation: QuotationView }) {
  if (q.status === 'ACCEPTED')
    return (
      <Notice tone="ok" title={`Khách đồng ý lúc ${formatMoment(q.acceptedAt)}`}>
        Bước tiếp theo là lập hợp đồng theo đúng báo giá này.
      </Notice>
    )
  if (q.status === 'REVISION_REQUESTED')
    return (
      <Notice title="Lý do khách yêu cầu sửa">
        <span className="whitespace-pre-line">{q.revisionReason || 'Khách không ghi lý do.'}</span>
      </Notice>
    )
  if (q.status === 'ISSUED')
    return (
      <p className="tnum text-body text-fg-2">
        Gửi khách lúc {formatMoment(q.issuedAt)}.{' '}
        {q.isExpired
          ? `Đã hết hạn ngày ${formatDateVn(q.validUntil)} mà khách chưa trả lời; lập bản sửa với hạn mới.`
          : `Hiệu lực đến hết ngày ${formatDateVn(q.validUntil)}.`}
      </p>
    )
  return null
}

function DraftEditor({ draft, live }: { draft: QuotationView; live: QuotationView | null }) {
  const queryClient = useQueryClient()
  const add = useAddQuotationLineMutation()
  const remove = useRemoveQuotationLineMutation()
  // undefined: đóng; null: thêm dòng; dòng: sửa dòng đó
  const [lineDialog, setLineDialog] = useState<QuotationLineView | null | undefined>(undefined)
  const [editingHeader, setEditingHeader] = useState(false)
  const [sending, setSending] = useState(false)
  const blockers = sendBlockers(draft)
  const full = draft.lines.length >= QUOTATION_LIMITS.maxLines

  async function removeLine(line: QuotationLineView) {
    try {
      await remove.mutateAsync({ quotationId: draft.quotationId, lineId: line.lineId, revision: draft.revision })
    } catch (e) {
      toast.error(errorMessage(e))
      return
    }
    toast(`Đã xoá dòng ${line.name}.`, {
      action: {
        label: 'Hoàn tác',
        // Thêm lại vào cuối với đúng giá đã ghi; revision lấy từ bản mới nhất trong cache vì toast sống qua nhiều lần vẽ
        onClick: () => {
          const latest = queryClient
            .getQueryData<QuotationView[]>(salesQuotationKeys.list(draft.surveyRequestId))
            ?.find((q) => q.quotationId === draft.quotationId)
          if (!latest) return
          add
            .mutateAsync({
              quotationId: draft.quotationId,
              body: {
                revision: latest.revision,
                productId: line.productId,
                name: line.productId ? null : line.name,
                unit: line.productId ? null : line.unit,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                description: line.description,
              },
            })
            .catch((e: unknown) => toast.error(errorMessage(e)))
        },
      },
    })
  }

  return (
    <div className="space-y-6">
      {live?.status === 'REVISION_REQUESTED' && (
        <Notice title={`Khách yêu cầu sửa bản ${live.version}`}>
          <span className="whitespace-pre-line">{live.revisionReason || 'Khách không ghi lý do.'}</span>
        </Notice>
      )}
      {live?.status === 'ISSUED' && (
        <Notice tone="info">
          Khách vẫn đang có bản {live.version}. Khi bạn gửi bản này, bản {live.version} hết hiệu lực.
        </Notice>
      )}

      <div className="flex flex-wrap gap-3">
        <Button icon="add" variant="soft" disabled={full} onClick={() => setLineDialog(null)}>
          Thêm dòng
        </Button>
        <Button icon="edit" variant="secondary" onClick={() => setEditingHeader(true)}>
          Chi phí, điều khoản
        </Button>
      </div>
      {full && (
        <p className="text-meta text-fg-2">Báo giá đã đủ {QUOTATION_LIMITS.maxLines} dòng, không thêm được nữa.</p>
      )}

      {draft.lines.length === 0 ? (
        <EmptyState
          title="Chưa có dòng hàng"
          description="Thêm thiết bị từ danh mục (tấm pin, inverter, khung…) hoặc ghi dòng tự ghi cho vật tư khác."
        />
      ) : (
        <QuotationLines
          quotation={draft}
          showCatalogPrice
          actions={(line) => (
            <>
              <Button size="sm" variant="secondary" icon="edit" onClick={() => setLineDialog(line)}>
                Sửa
              </Button>
              <Button
                size="sm"
                variant="danger-quiet"
                icon="delete"
                disabled={remove.isPending}
                onClick={() => void removeLine(line)}
              >
                Xoá
              </Button>
            </>
          )}
        />
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <div className="min-w-0 space-y-4">
          <p className="tnum text-body text-fg-2">
            {draft.validUntil ? `Hiệu lực đến hết ngày ${formatDateVn(draft.validUntil)}.` : 'Chưa đặt hạn hiệu lực.'}
          </p>
          <QuotationTerms quotation={draft} />
        </div>
        <QuotationTotals quotation={draft} />
      </div>

      <div className="space-y-3 border-t border-line pt-4">
        {blockers.length > 0 && (
          <div className="text-body text-fg-2">
            <p>Chưa gửi được cho khách:</p>
            <ul className="mt-1 list-disc pl-5">
              {blockers.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        <Button icon="send" variant="primary" disabled={blockers.length > 0} onClick={() => setSending(true)}>
          Gửi cho khách ({formatQuotationMoney(draft.totalAmount, draft.currency)})
        </Button>
      </div>

      <QuotationLineDialog
        open={lineDialog !== undefined}
        quotation={draft}
        line={lineDialog ?? null}
        onClose={() => setLineDialog(undefined)}
      />
      <QuotationHeaderDialog open={editingHeader} quotation={draft} onClose={() => setEditingHeader(false)} />
      <SendQuotationDialog open={sending} quotation={draft} replacing={live} onClose={() => setSending(false)} />
    </div>
  )
}

/** Các bản đã gửi trước đó, mở từng bản để xem dòng hàng */
function OlderVersions({ items }: { items: QuotationView[] }) {
  return (
    <details className="group border-t border-line pt-4">
      <summary className="tap cursor-pointer text-body font-medium text-fg">Các bản trước ({items.length})</summary>
      <ul className="mt-3 divide-y divide-line">
        {items.map((q) => {
          const status = quotationStatusMeta(q, 'sales')
          return (
            <li key={q.quotationId} className="py-3">
              <details>
                <summary className="tap flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-body">
                  <span className="font-medium text-fg">Bản {q.version}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="tnum text-fg">{formatQuotationMoney(q.totalAmount, q.currency)}</span>
                  {q.issuedAt && <span className="tnum text-fg-2">gửi {formatMoment(q.issuedAt)}</span>}
                </summary>
                <div className="mt-4 space-y-4">
                  {q.revisionReason && (
                    <Notice title="Lý do khách yêu cầu sửa">
                      <span className="whitespace-pre-line">{q.revisionReason}</span>
                    </Notice>
                  )}
                  <QuotationLines quotation={q} showCatalogPrice />
                  <div className="flex justify-end">
                    <QuotationTotals quotation={q} />
                  </div>
                </div>
              </details>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
