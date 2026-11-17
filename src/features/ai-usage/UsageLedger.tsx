import { useState } from 'react'
import { toast } from 'sonner'
import { AI_USAGE_OPERATIONS, AI_USAGE_OUTCOMES, AI_USAGE_STATUSES } from '@/common/aiUsage'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Select, Textarea, WithUnit } from '@/components/common/ui/field'
import { KeyValueList } from '@/components/common/ui/lists'
import { ListPager } from '@/components/common/ui/pagination'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { formatLatency, outcomeLabel, roleLabel, rowTokens, statusMeta } from '@/features/ai-usage/aiUsageDisplay'
import {
  AI_USAGE_PAGE_SIZE,
  REVIEW_NOTE_MAX,
  formatUsd,
  parseUsd,
  reviewProblems,
} from '@/features/ai-usage/aiUsageRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useReviewUsageMutation, useUsageRequestsQuery } from '@/hooks/useAdminRagUsage'
import type { UsageRange } from '@/services/adminRagUsageService'
import { errorMessage, isApiError, rateLimitedMessage } from '@/services/api/errors'
import type { AiUsageRow } from '@/types/res/adminRagUsageRes'
import { cx } from '@/utils/cx'

// Sổ chi phí: từng lượt gọi trả phí, lọc và phân trang ở server. Dòng "Chờ đối soát" (timeout, mất kết nối, nhà cung cấp không
// báo số token) giữ số tiền đã đặt trước tới khi quản trị nhập chi phí thật từ hoá đơn của nhà cung cấp

type Filter = { operation: string; status: string; outcome: string }
const EMPTY_FILTER: Filter = { operation: '', status: '', outcome: '' }

function ReviewForm({ row, onClose }: { row: AiUsageRow; onClose: () => void }) {
  const [cost, setCost] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const review = useReviewUsageMutation()
  const problems = reviewProblems(cost, note)

  async function submit() {
    setSubmitted(true)
    if (problems.cost || problems.note) return
    try {
      await review.mutateAsync({ ledgerId: row.id, body: { costUsd: parseUsd(cost, 6), note: note.trim() } })
      toast.success('Đã đối soát chi phí.')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      // Dòng đã được đối soát ở nơi khác: danh sách đã tải lại
      if (isApiError(e) && e.status === 404) onClose()
    }
  }

  return (
    <>
      <DialogTitle>Đối soát chi phí</DialogTitle>
      <KeyValueList
        className="mt-4"
        items={[
          { k: 'Lúc', v: formatMoment(row.createdAt) },
          { k: 'Việc', v: `${AI_USAGE_OPERATIONS[row.operation] ?? row.operation}, ${outcomeLabel(row.outcome)}` },
          { k: 'Model', v: row.generationModel ?? row.embeddingModel ?? '—' },
          { k: 'Đang giữ', v: formatUsd(row.reservedUsd) },
        ]}
      />
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Field
          label="Chi phí thật"
          htmlFor="review-cost"
          required
          hint="Theo hoá đơn của nhà cung cấp; không bị tính thì nhập 0. Tối đa 6 chữ số lẻ."
          error={submitted ? problems.cost : undefined}
        >
          <WithUnit unit="USD">
            <Input
              id="review-cost"
              inputMode="decimal"
              className="w-40"
              value={cost}
              disabled={review.isPending}
              aria-required
              aria-invalid={(submitted && Boolean(problems.cost)) || undefined}
              aria-describedby="review-cost-msg"
              onChange={(e) => setCost(e.target.value)}
            />
          </WithUnit>
        </Field>
        <Field
          label="Ghi chú"
          htmlFor="review-note"
          required
          hint={`Nguồn đối chiếu. Tối đa ${REVIEW_NOTE_MAX} ký tự.`}
          error={submitted ? problems.note : undefined}
        >
          <Textarea
            id="review-note"
            rows={2}
            value={note}
            disabled={review.isPending}
            aria-required
            aria-describedby="review-note-msg"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={review.isPending} onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" icon="fact_check" variant="primary" disabled={review.isPending}>
            {review.isPending ? 'Đang lưu…' : 'Lưu đối soát'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export function UsageLedger({ range, enabled }: { range: UsageRange; enabled: boolean }) {
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER)
  const [page, setPage] = useState(1)
  const [reviewing, setReviewing] = useState<AiUsageRow | null>(null)
  const query = useUsageRequestsQuery({ ...range, ...filter, page, pageSize: AI_USAGE_PAGE_SIZE }, enabled)
  const data = query.data
  const filtered = filter.operation !== '' || filter.status !== '' || filter.outcome !== ''

  const set = (patch: Partial<Filter>) => {
    setFilter((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  return (
    <Panel>
      <PanelHeader title="Sổ chi phí" />
      <PanelBody>
        <div className="mb-4 grid gap-4 sm:grid-cols-3 xl:max-w-4xl">
          <Field label="Việc" htmlFor="ledger-operation">
            <Select
              id="ledger-operation"
              active={filter.operation !== ''}
              value={filter.operation}
              onChange={(e) => set({ operation: e.target.value })}
            >
              <option value="">Mọi việc</option>
              {Object.entries(AI_USAGE_OPERATIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Trạng thái tiền" htmlFor="ledger-status">
            <Select
              id="ledger-status"
              active={filter.status !== ''}
              value={filter.status}
              onChange={(e) => set({ status: e.target.value })}
            >
              <option value="">Mọi trạng thái</option>
              {Object.entries(AI_USAGE_STATUSES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kết quả" htmlFor="ledger-outcome">
            <Select
              id="ledger-outcome"
              active={filter.outcome !== ''}
              value={filter.outcome}
              onChange={(e) => set({ outcome: e.target.value })}
            >
              <option value="">Mọi kết quả</option>
              {Object.entries(AI_USAGE_OUTCOMES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {filtered && (
          <Button variant="ghost" icon="filter_alt_off" className="mb-2" onClick={() => set(EMPTY_FILTER)}>
            Xoá lọc
          </Button>
        )}

        {!enabled ? null : query.isPending ? (
          <Skeleton className="h-48" />
        ) : query.isError && !data ? (
          <ErrorState message={rateLimitedMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={filtered ? 'Không có dòng nào khớp bộ lọc.' : 'Chưa có lượt nào trong khoảng này.'} />
        ) : (
          <div aria-busy={query.isFetching} className={cx(query.isPlaceholderData && 'opacity-70')}>
            <Table stack="xl">
              <thead>
                <tr>
                  <Th>Lúc</Th>
                  <Th>Việc</Th>
                  <Th>Kết quả</Th>
                  <Th>Model, token</Th>
                  <Th className="text-right">Chi phí</Th>
                  <Th className="text-right">Thời gian</Th>
                  <Th>
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => {
                  const status = statusMeta(row.status)
                  return (
                    <Tr key={row.id}>
                      <Td label="Lúc" className="tnum whitespace-nowrap">
                        {formatMoment(row.createdAt)}
                      </Td>
                      <Td label="Việc">
                        <p className="text-fg">{AI_USAGE_OPERATIONS[row.operation] ?? row.operation}</p>
                        <p className="text-meta text-fg-3">{roleLabel(row.userRole)}</p>
                      </Td>
                      <Td label="Kết quả">
                        <p className="text-fg">{outcomeLabel(row.outcome)}</p>
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {row.reviewNote && <p className="text-meta text-fg-3">{row.reviewNote}</p>}
                      </Td>
                      <Td label="Model, token">
                        <p className="wrap-anywhere text-fg">{row.generationModel ?? row.embeddingModel ?? '—'}</p>
                        <p className="text-meta text-fg-3">{rowTokens(row)}</p>
                      </Td>
                      <Td label="Chi phí" className="tnum lg:text-right">
                        {formatUsd(row.costUsd)}
                        {row.reservedUsd > 0 && (
                          <p className="text-meta text-fg-3">đặt trước {formatUsd(row.reservedUsd)}</p>
                        )}
                      </Td>
                      <Td label="Thời gian" className="tnum lg:text-right">
                        {formatLatency(row.latencyMs)}
                      </Td>
                      <Td>
                        {row.status === 'UNCERTAIN' && (
                          <Button size="sm" variant="info" icon="fact_check" onClick={() => setReviewing(row)}>
                            Đối soát
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <ListPager
              page={data.page}
              pages={Math.ceil(data.total / data.pageSize)}
              from={(data.page - 1) * data.pageSize + 1}
              to={(data.page - 1) * data.pageSize + data.items.length}
              total={data.total}
              noun="lượt"
              keepScroll
              onChange={setPage}
            />
          </div>
        )}
        <ModalDialog
          open={reviewing !== null}
          onOpenChange={(open) => !open && setReviewing(null)}
          className="max-w-lg"
          aria-label="Đối soát chi phí"
        >
          {reviewing && <ReviewForm row={reviewing} onClose={() => setReviewing(null)} />}
        </ModalDialog>
      </PanelBody>
    </Panel>
  )
}
