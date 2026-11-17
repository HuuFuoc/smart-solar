import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, IconButton } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, UnavailableState } from '@/components/common/ui/states'
import { ContractConfirmDialog } from '@/features/contracts/ContractConfirmDialog'
import { CartLineDialog } from '@/features/quotations/CartLineDialog'
import { QuotationLines, QuotationTerms, QuotationTotals } from '@/features/quotations/QuotationContent'
import {
  formatDateVn,
  formatQuotationMoney,
  lineTypeLabel,
  quotationErrorMessage,
  quotationOriginLabel,
  quotationStatusMeta,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import {
  CART_MAX_LINES,
  canCreateCart,
  canReviseCart,
  cartIssueBlockers,
  isTechnicianDraft,
  missingCartTypes,
  priceProblemLineIds,
  workingQuotation,
} from '@/features/quotations/quotationRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useAddCartLineMutation,
  useCreateCartMutation,
  useIssueCartMutation,
  useRemoveCartLineMutation,
  useReviseCartMutation,
  useTechnicianQuotationsQuery,
} from '@/hooks/useTechnicianQuotations'
import { isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { QuotationLineView, QuotationView } from '@/types/res/quotationsRes'

// Báo giá lắp đặt do kỹ thuật viên đã khảo sát lập, như một giỏ hàng: chọn sản phẩm danh mục và số lượng, backend tính giá, thuế,
// tổng. Chỉ hiện khi biên bản khảo sát đã hoàn thành. Khách trả lời (đồng ý / yêu cầu sửa / từ chối) trên cổng khách hàng;
// đồng ý thì backend tự lập bản nháp hợp đồng cho quản lý

type Props = {
  surveyRequestId: string
  /** Kết luận lắp đặt của biên bản khảo sát (FEASIBLE, FEASIBLE_WITH_CONDITIONS, NOT_FEASIBLE) */
  feasibility: string | null | undefined
}

export function TechnicianQuotationPanel({ surveyRequestId, feasibility }: Props) {
  const query = useTechnicianQuotationsQuery(surveyRequestId)
  const create = useCreateCartMutation()
  const list = query.data ?? []
  const working = workingQuotation(list)
  const status = working && working.status !== 'DRAFT' ? quotationStatusMeta(working, 'staff') : null

  async function startCart() {
    try {
      await create.mutateAsync(surveyRequestId)
      toast.success('Đã lập báo giá nháp. Thêm sản phẩm rồi gửi cho khách.')
    } catch (e) {
      toast.error(quotationErrorMessage(e))
    }
  }

  return (
    <Panel id="quotation" className="scroll-mt-6">
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Báo giá {status && <Badge tone={status.tone}>{status.label}</Badge>}
          </span>
        }
        description={working ? quotationTitle(working) : undefined}
      />
      <PanelBody className="space-y-4">
        {query.isPending ? (
          <p className="text-body text-fg-2">Đang tải báo giá…</p>
        ) : query.data === undefined ? (
          isFeatureUnavailable(query.error) ? (
            <UnavailableState
              message="Chưa lập được báo giá trên web."
              pendingMigrations={pendingMigrationsOf(query.error)}
            />
          ) : (
            <ErrorState
              title="Không tải được báo giá."
              message={quotationErrorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          )
        ) : feasibility === 'NOT_FEASIBLE' && !working ? (
          <Notice tone="warn" title="Biên bản kết luận không lắp được">
            Không lập báo giá lắp đặt cho công trình này. Kết luận sai thì bổ sung biên bản khảo sát trước.
          </Notice>
        ) : working && isTechnicianDraft(working) ? (
          <CartEditor quotation={working} feasibility={feasibility} />
        ) : working &&
          working.status !== 'CANCELLED' &&
          working.status !== 'SUPERSEDED' &&
          working.status !== 'DRAFT' ? (
          <IssuedQuotation quotation={working} list={list} feasibility={feasibility} />
        ) : (
          <EmptyState
            title="Chưa có báo giá"
            description={
              working?.status === 'DRAFT'
                ? 'Có bản nháp cũ của kinh doanh chưa gửi khách; lập báo giá mới thì bản đó được đóng.'
                : 'Lập báo giá từ danh mục sản phẩm theo kết quả khảo sát.'
            }
            action={
              canCreateCart(list, feasibility) ? (
                <Button
                  icon="add_shopping_cart"
                  variant="primary"
                  disabled={create.isPending}
                  onClick={() => void startCart()}
                >
                  {create.isPending ? 'Đang lập…' : 'Lập báo giá'}
                </Button>
              ) : undefined
            }
          />
        )}
        {list.length > 1 && <VersionHistory list={list} currentId={working?.quotationId} />}
      </PanelBody>
    </Panel>
  )
}

function CartEditor({
  quotation: q,
  feasibility,
}: {
  quotation: QuotationView
  feasibility: string | null | undefined
}) {
  const remove = useRemoveCartLineMutation()
  const add = useAddCartLineMutation()
  const issue = useIssueCartMutation()
  const [dialog, setDialog] = useState<{ line: QuotationLineView | null } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [flagged, setFlagged] = useState<string[]>([])
  const blockers = cartIssueBlockers(q, feasibility)
  const missing = missingCartTypes(q)
  const busy = remove.isPending || add.isPending || issue.isPending
  const full = q.lines.length >= CART_MAX_LINES

  async function removeLine(line: QuotationLineView) {
    try {
      const view = await remove.mutateAsync({ quotationId: q.quotationId, lineId: line.lineId, revision: q.revision })
      setFlagged((ids) => ids.filter((id) => id !== line.lineId))
      const productId = line.productId
      toast.success(`Đã bỏ ${line.name}.`, {
        action: productId
          ? {
              label: 'Hoàn tác',
              onClick: () =>
                void add
                  .mutateAsync({
                    quotationId: q.quotationId,
                    revision: view.revision,
                    productId,
                    quantity: line.quantity,
                  })
                  .catch((e: unknown) => toast.error(quotationErrorMessage(e))),
            }
          : undefined,
      })
    } catch (e) {
      toast.error(quotationErrorMessage(e))
    }
  }

  return (
    <>
      {q.lines.length === 0 ? (
        <EmptyState title="Báo giá chưa có sản phẩm" description="Thêm tấm pin, inverter, vật tư và dịch vụ lắp đặt." />
      ) : (
        <>
          <QuotationLines
            quotation={q}
            flaggedLineIds={flagged}
            actions={(line) => (
              <>
                <IconButton
                  icon="edit"
                  label={`Đổi số lượng ${line.name}`}
                  tooltip="Đổi số lượng"
                  variant="soft"
                  size="sm"
                  disabled={busy}
                  onClick={() => setDialog({ line })}
                />
                <IconButton
                  icon="delete"
                  label={`Bỏ ${line.name}`}
                  tooltip="Bỏ dòng"
                  variant="danger-quiet"
                  size="sm"
                  disabled={busy}
                  onClick={() => void removeLine(line)}
                />
              </>
            )}
          />
          <QuotationTotals quotation={q} className="ml-auto" />
        </>
      )}
      {q.lines.length > 0 && missing.length > 0 && (
        <Notice tone="warn" title="Báo giá chưa có đủ hạng mục thường gặp">
          Chưa có: {missing.map((type) => lineTypeLabel({ description: type }) ?? type).join(', ')}. Vẫn gửi được nếu
          công trình không cần.
        </Notice>
      )}
      {blockers.length > 0 && <p className="text-meta text-fg-2">{blockers.join(' ')}</p>}
      {full && <p className="text-meta text-fg-2">Báo giá đã đủ {CART_MAX_LINES} dòng.</p>}
      <div className="flex flex-wrap gap-3">
        <Button icon="add" variant="soft" disabled={busy || full} onClick={() => setDialog({ line: null })}>
          Thêm sản phẩm
        </Button>
        <Button
          icon="send"
          variant="primary"
          disabled={busy || blockers.length > 0}
          onClick={() => setConfirming(true)}
        >
          Gửi cho khách
        </Button>
      </div>

      {dialog && <CartLineDialog open quotation={q} line={dialog.line} onClose={() => setDialog(null)} />}
      {confirming && (
        <ContractConfirmDialog
          title="Gửi báo giá cho khách?"
          confirmLabel="Gửi cho khách"
          icon="send"
          successText="Đã gửi báo giá cho khách."
          formatError={quotationErrorMessage}
          run={async () => {
            try {
              await issue.mutateAsync({ quotationId: q.quotationId, revision: q.revision })
              setFlagged([])
            } catch (e) {
              if (isApiError(e)) setFlagged(priceProblemLineIds(e.details))
              throw e
            }
          }}
          onClose={() => setConfirming(false)}
        >
          <p>
            {q.lines.length} dòng, tạm tính {formatQuotationMoney(q.totalAmount, q.currency)}. Hệ thống tính lại giá
            theo danh mục lúc gửi, cộng thuế và đặt hạn hiệu lực.
          </p>
          <p>Gửi rồi thì không sửa được; muốn đổi phải lập bản sửa.</p>
        </ContractConfirmDialog>
      )}
    </>
  )
}

function IssuedQuotation({
  quotation: q,
  list,
  feasibility,
}: {
  quotation: QuotationView
  list: QuotationView[]
  feasibility: string | null | undefined
}) {
  const revise = useReviseCartMutation()
  const revisable = canReviseCart(q, list, feasibility)

  async function startRevision() {
    try {
      await revise.mutateAsync(q.quotationId)
      toast.success('Đã lập bản sửa. Chỉnh sản phẩm rồi gửi lại cho khách.')
    } catch (e) {
      toast.error(quotationErrorMessage(e))
    }
  }

  const reviseButton = revisable && (
    <Button
      icon="edit_note"
      variant={q.status === 'ISSUED' ? 'soft' : 'primary'}
      disabled={revise.isPending}
      onClick={() => void startRevision()}
    >
      {revise.isPending ? 'Đang lập…' : 'Lập bản sửa'}
    </Button>
  )

  return (
    <>
      {q.status === 'REVISION_REQUESTED' && (
        <Notice tone="danger" title="Khách yêu cầu sửa báo giá">
          <span className="whitespace-pre-line">{q.revisionReason || 'Khách không ghi lý do.'}</span>
        </Notice>
      )}
      {q.status === 'REJECTED' && (
        <Notice tone="warn" title={`Khách từ chối lúc ${formatMoment(q.closedAt)}`}>
          {q.closeReason ? <span className="whitespace-pre-line">{q.closeReason}</span> : 'Khách không ghi lý do.'}
        </Notice>
      )}
      {q.status === 'ACCEPTED' && (
        <Notice tone="ok" title={`Khách đã đồng ý lúc ${formatMoment(q.acceptedAt)}`}>
          Hợp đồng được lập tự động; quản lý hoàn thiện và gửi khách ký. Khi hợp đồng đã ký, hẹn ngày thi công với khách
          ở mục Hẹn lịch thi công.
        </Notice>
      )}
      {q.status === 'ISSUED' && (
        <p className="text-body text-fg-2">
          Gửi khách lúc {formatMoment(q.issuedAt)}, hiệu lực đến hết ngày {formatDateVn(q.validUntil)}.
        </p>
      )}
      {q.origin !== 'TECHNICIAN' && <p className="text-meta text-fg-2">{quotationOriginLabel(q.origin)}.</p>}
      <QuotationLines quotation={q} />
      <QuotationTotals quotation={q} className="ml-auto" />
      <QuotationTerms quotation={q} />
      {reviseButton && <div className="flex flex-wrap gap-3">{reviseButton}</div>}
    </>
  )
}

function VersionHistory({ list, currentId }: { list: QuotationView[]; currentId: string | undefined }) {
  const others = [...list].sort((a, b) => b.version - a.version).filter((q) => q.quotationId !== currentId)
  if (others.length === 0) return null
  return (
    <details className="border-t border-line pt-4">
      <summary className="tap cursor-pointer text-body font-medium text-fg">Các bản trước ({others.length})</summary>
      <ul className="mt-3 space-y-2">
        {others.map((q) => {
          const status = quotationStatusMeta(q, 'staff')
          return (
            <li key={q.quotationId} className="flex flex-wrap items-baseline justify-between gap-x-4 text-body">
              <span className="tnum text-fg">
                Bản {q.version}, {formatQuotationMoney(q.totalAmount, q.currency)}
              </span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
