import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PRICING_APPROVAL_STATUSES, QUOTATION_LIMITS } from '@/common/quotation'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState } from '@/components/common/ui/states'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { QuotationLines, QuotationTerms, QuotationTotals } from '@/features/quotations/QuotationContent'
import { QuotationDocument } from '@/features/quotations/QuotationDocument'
import { QuotationHeaderDialog } from '@/features/quotations/QuotationHeaderDialog'
import { QuotationLineDialog } from '@/features/quotations/QuotationLineDialog'
import {
  adjustmentText,
  automaticOutcomeText,
  byVersionDesc,
  currentQuotation,
  defaultValidUntil,
  formatDateVn,
  formatQuotationMoney,
  isLive,
  pricingIssueText,
  quotationErrorMessage,
  quotationStatusMeta,
  quotationTitle,
  sendBlockers,
} from '@/features/quotations/quotationDisplay'
import {
  REVIEW_REASON_MAX,
  canConfirmSurveyVersion,
  canRequestPricingApproval,
  canReviseQuotation,
} from '@/features/quotations/quotationRules'
import { SendQuotationDialog } from '@/features/quotations/SendQuotationDialog'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  salesQuotationKeys,
  useAddQuotationLineMutation,
  useConfirmSurveyVersionMutation,
  useCreateQuotationMutation,
  useGenerateQuotationMutation,
  useQuotationsQuery,
  useRemoveQuotationLineMutation,
  useRequestPricingApprovalMutation,
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
  const generate = useGenerateQuotationMutation()
  const [error, setError] = useState<string | null>(null)
  // Kết quả tạo từ biên bản mà không ra báo giá nào, vd. biên bản chưa có danh sách thiết bị
  const [note, setNote] = useState<string | null>(null)
  const busy = create.isPending || generate.isPending

  async function fromSurvey() {
    setError(null)
    setNote(null)
    try {
      const result = await generate.mutateAsync(surveyRequestId)
      const text = automaticOutcomeText(result.outcome)
      if (!result.quotation) setNote(text)
      else if (result.outcome === 'AUTO_ISSUED') toast.success(text)
      else toast(text)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function start() {
    setError(null)
    setNote(null)
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
        {feasibility === 'NOT_FEASIBLE' ? (
          <Notice tone="warn" title="Kỹ thuật viên kết luận công trình không lắp được">
            Không lập báo giá cho công trình này. Kết luận chưa đúng thì nhờ kỹ thuật viên bổ sung biên bản khảo sát.
          </Notice>
        ) : (
          <EmptyState
            title="Chưa có báo giá"
            description="Tạo từ biên bản khảo sát lấy thiết bị và giá danh mục. Lập báo giá để tự thêm từng dòng."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button icon="calculate" variant="soft" disabled={busy} onClick={() => void fromSurvey()}>
                  {generate.isPending ? 'Đang tạo…' : 'Tạo từ biên bản khảo sát'}
                </Button>
                <Button icon="add" variant="soft" disabled={busy} onClick={() => void start()}>
                  {create.isPending ? 'Đang lập…' : 'Lập báo giá'}
                </Button>
              </div>
            }
          />
        )}
        {note && <Notice tone="warn">{note}</Notice>}
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
  const canRevise = canReviseQuotation(current)

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
            {current.surveyChanged && (
              <Notice tone="warn" title="Biên bản khảo sát đã được bổ sung sau khi lập bản này">
                Khách không đồng ý được và không lập hợp đồng được từ bản này nữa. Lập bản sửa, chỉnh dòng hàng theo
                biên bản mới rồi gửi lại.
              </Notice>
            )}
            <IssuedSummary quotation={current} />
            <QuotationLines quotation={current} showCatalogPrice />
            <div className="flex justify-end">
              <QuotationTotals quotation={current} />
            </div>
            <QuotationTerms quotation={current} />
          </>
        )}
        <QuotationDocument key={current.quotationId} quotation={current} />
        {older.length > 0 && <OlderVersions items={older} />}
      </PanelBody>
    </Panel>
  )
}

/** Một câu cho biết bản đã gửi đang ở đâu */
function IssuedSummary({ quotation: q }: { quotation: QuotationView }) {
  // Biên bản đổi sau khi khách đồng ý thì bản này không lập hợp đồng được nữa (khối cảnh báo ở trên đã nói)
  if (q.status === 'ACCEPTED')
    return (
      <Notice tone="ok" title={`Khách đồng ý lúc ${formatMoment(q.acceptedAt)}`}>
        {q.surveyChanged ? null : 'Bước tiếp theo là lập hợp đồng theo đúng báo giá này.'}
      </Notice>
    )
  if (q.status === 'REVISION_REQUESTED')
    return (
      <Notice title="Lý do khách yêu cầu sửa">
        <span className="whitespace-pre-line">{q.revisionReason || 'Khách không ghi lý do.'}</span>
      </Notice>
    )
  if (q.status === 'REJECTED')
    return (
      <Notice title={`Khách từ chối lúc ${formatMoment(q.closedAt)}`}>
        <span className="whitespace-pre-line">{q.closeReason || 'Khách không ghi lý do.'}</span>
      </Notice>
    )
  if (q.status === 'CANCELLED')
    return (
      <p className="tnum text-body text-fg-2">
        Báo giá đóng lúc {formatMoment(q.closedAt)} vì yêu cầu khảo sát đã đóng hoặc khách đã rút.
      </p>
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

/** Vấn đề về giá còn lại của bản nháp tạo tự động từ biên bản khảo sát */
function PricingIssues({ draft }: { draft: QuotationView }) {
  const issues = draft.pricingReview?.outstanding ?? []
  if (issues.length === 0) return null
  return (
    <Notice tone="warn" title={`Bản tạo từ biên bản khảo sát còn ${issues.length} vấn đề về giá`}>
      <ul className="list-disc pl-5">
        {issues.map((issue, i) => (
          <li key={i}>{pricingIssueText(issue, draft.pricingBasis)}</li>
        ))}
      </ul>
    </Notice>
  )
}

/** Giá thấp hơn danh mục: các chỗ giảm, lời xin duyệt và trả lời của quản lý */
function PricingApproval({ draft, onRequest }: { draft: QuotationView; onRequest: () => void }) {
  const approval = draft.pricingApproval
  const meta = approval && PRICING_APPROVAL_STATUSES[approval.status]
  if (!approval || !meta) return null
  return (
    <Notice tone={meta.tone} title={meta.label}>
      <ul className="list-disc pl-5">
        {approval.adjustments.map((a, i) => (
          <li key={i} className="tnum">
            {adjustmentText(a, draft)}
          </li>
        ))}
      </ul>
      {approval.request && (
        <p className="mt-2 whitespace-pre-line">
          Xin duyệt lúc <span className="tnum">{formatMoment(approval.request.at)}</span>: {approval.request.reason}
        </p>
      )}
      {approval.decision && (
        <p className="mt-2 whitespace-pre-line">
          Quản lý trả lời lúc <span className="tnum">{formatMoment(approval.decision.at)}</span>:{' '}
          {approval.decision.reason}
        </p>
      )}
      {approval.status !== 'REQUIRED' && <p className="mt-2">Sửa giá thì phải xin duyệt lại.</p>}
      {canRequestPricingApproval(draft) && (
        <span className="mt-3 flex">
          <Button size="sm" icon="approval" variant="soft" onClick={onRequest}>
            {approval.status === 'REJECTED' ? 'Xin duyệt lại' : 'Xin duyệt giá'}
          </Button>
        </span>
      )}
    </Notice>
  )
}

function DraftEditor({ draft, live }: { draft: QuotationView; live: QuotationView | null }) {
  const queryClient = useQueryClient()
  const add = useAddQuotationLineMutation()
  const remove = useRemoveQuotationLineMutation()
  const confirmVersion = useConfirmSurveyVersionMutation()
  const requestApproval = useRequestPricingApprovalMutation()
  const [confirming, setConfirming] = useState(false)
  const [requesting, setRequesting] = useState(false)
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
      {canConfirmSurveyVersion(draft) && (
        <Notice
          tone="warn"
          title={`Biên bản khảo sát đã được bổ sung (bản ${draft.onSiteSurveyVersion} lên bản ${draft.currentSurveyVersion})`}
        >
          Chỉnh dòng hàng theo biên bản mới rồi xác nhận. Chưa xác nhận thì chưa gửi khách được.
          <span className="mt-3 flex">
            <Button size="sm" icon="fact_check" variant="soft" onClick={() => setConfirming(true)}>
              Xác nhận theo biên bản mới
            </Button>
          </span>
        </Notice>
      )}
      <PricingIssues draft={draft} />
      <PricingApproval draft={draft} onRequest={() => setRequesting(true)} />

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
      <ReasonDialog
        open={confirming}
        title="Xác nhận theo biên bản khảo sát mới?"
        description="Dòng thiết bị phải khớp danh sách thiết bị của biên bản mới. Ghi bạn đã xem lại và chỉnh những gì."
        label="Nội dung đã xem lại"
        maxLength={REVIEW_REASON_MAX}
        submitLabel="Xác nhận"
        icon="fact_check"
        onSubmit={async (reason) => {
          try {
            await confirmVersion.mutateAsync({ quotationId: draft.quotationId, revision: draft.revision, reason })
          } catch (e) {
            throw new Error(quotationErrorMessage(e))
          }
          toast.success('Đã xác nhận bản nháp theo biên bản khảo sát mới.')
        }}
        onClose={() => setConfirming(false)}
      />
      <ReasonDialog
        open={requesting}
        title="Xin quản lý duyệt giá?"
        description="Quản lý duyệt đúng bộ giá đang có. Sửa giá sau khi xin thì phải xin lại."
        label="Lý do giảm giá"
        maxLength={REVIEW_REASON_MAX}
        submitLabel="Gửi xin duyệt"
        onSubmit={async (reason) => {
          await requestApproval.mutateAsync({ quotationId: draft.quotationId, revision: draft.revision, reason })
          toast.success('Đã gửi xin duyệt giá. Quản lý duyệt xong thì gửi cho khách được.')
        }}
        onClose={() => setRequesting(false)}
      />
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
