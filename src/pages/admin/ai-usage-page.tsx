import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/common/ui/button'
import { DateField } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { costKindLabel, formatCount, formatLatency, roleLabel } from '@/features/ai-usage/aiUsageDisplay'
import { defaultUsageRange, formatUsd, usageRangeError } from '@/features/ai-usage/aiUsageRules'
import { BudgetDialog } from '@/features/ai-usage/BudgetDialog'
import { BudgetPanel } from '@/features/ai-usage/BudgetPanel'
import { DailyCostChart } from '@/features/ai-usage/DailyCostChart'
import { UsageLedger } from '@/features/ai-usage/UsageLedger'
import { KNOWLEDGE_UNAVAILABLE } from '@/features/knowledge/knowledgeDisplay'
import { formatDay } from '@/features/scheduling/schedulingDisplay'
import {
  useBudgetQuery,
  useTopUsersQuery,
  useUsageBreakdownQuery,
  useUsageSummaryQuery,
  useUsageTimeseriesQuery,
} from '@/hooks/useAdminRagUsage'
import type { UsageBreakdownKind, UsageRange } from '@/services/adminRagUsageService'
import { isFeatureUnavailable, pendingMigrationsOf, rateLimitedMessage } from '@/services/api/errors'
import type { AiUsageBreakdownView } from '@/types/res/adminRagUsageRes'
import { cx } from '@/utils/cx'

// Chi phí của trợ lý (chỉ quản trị): ngân sách đang áp dụng, số liệu trong khoảng ngày, sổ chi phí. Ngày tính theo UTC như
// backend, mặc định từ ngày 1 của tháng tới hôm nay; khoảng ngày nằm trên địa chỉ để tải lại trang vẫn giữ

const PARAMS = { from: 'tu', to: 'den' } as const

const BREAKDOWNS: { kind: UsageBreakdownKind; title: string; label: (key: string) => string }[] = [
  { kind: 'byOperation', title: 'Theo loại chi phí', label: costKindLabel },
  { kind: 'byModel', title: 'Theo model', label: (key) => key },
  { kind: 'byRole', title: 'Theo vai trò người hỏi', label: roleLabel },
]

const tokens = (b: Pick<AiUsageBreakdownView, 'inputTokens' | 'outputTokens' | 'embeddingTokens'>) =>
  b.inputTokens + b.outputTokens + b.embeddingTokens

function Breakdown({
  range,
  enabled,
  kind,
  title,
  label,
}: (typeof BREAKDOWNS)[number] & { range: UsageRange; enabled: boolean }) {
  const query = useUsageBreakdownQuery(kind, range, enabled)
  return (
    <section aria-labelledby={`breakdown-${kind}`} className="min-w-0">
      <h3 id={`breakdown-${kind}`} className="mb-2 text-body font-semibold text-fg">
        {title}
      </h3>
      {query.isPending ? (
        <Skeleton className="h-24" />
      ) : query.isError && !query.data ? (
        <ErrorState message={rateLimitedMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <p className="text-body text-fg-2">Chưa phát sinh.</p>
      ) : (
        <Table stack>
          <thead>
            <tr>
              <Th>Nhóm</Th>
              <Th className="text-right">Lượt</Th>
              <Th className="text-right">Chi phí</Th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((b) => (
              <Tr key={b.key}>
                <Td label="Nhóm">
                  <p className="wrap-anywhere text-fg">{label(b.key)}</p>
                  <p className="tnum text-meta text-fg-3">{formatCount(tokens(b))} token</p>
                </Td>
                <Td label="Lượt" className="tnum lg:text-right">
                  {formatCount(b.requests)}
                </Td>
                <Td label="Chi phí" className="tnum lg:text-right">
                  {formatUsd(b.costUsd)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  )
}

function TopUsers({ range, enabled }: { range: UsageRange; enabled: boolean }) {
  const query = useTopUsersQuery(range, enabled)
  return (
    <Panel>
      <PanelHeader title="Người dùng tốn nhiều nhất" />
      {query.isPending ? (
        <Skeleton className="h-24" />
      ) : query.isError && !query.data ? (
        <ErrorState message={rateLimitedMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="Chưa có ai dùng trợ lý trong khoảng này." />
      ) : (
        <Table stack>
          <thead>
            <tr>
              <Th>Người dùng</Th>
              <Th>Vai trò</Th>
              <Th className="text-right">Lượt</Th>
              <Th className="text-right">Token</Th>
              <Th className="text-right">Chi phí</Th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((u) => (
              <Tr key={u.userId}>
                <Td label="Người dùng">{u.fullName || <span className="text-fg-3">Chưa có họ tên</span>}</Td>
                <Td label="Vai trò">{roleLabel(u.role)}</Td>
                <Td label="Lượt" className="tnum lg:text-right">
                  {formatCount(u.requests)}
                </Td>
                <Td label="Token" className="tnum lg:text-right">
                  {formatCount(u.tokens)}
                </Td>
                <Td label="Chi phí" className="tnum lg:text-right">
                  {formatUsd(u.costUsd)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  )
}

export function AdminAiUsagePage() {
  const [search, setSearch] = useSearchParams()
  const defaults = useMemo(() => defaultUsageRange(), [])
  const range: UsageRange = { from: search.get(PARAMS.from) ?? defaults.from, to: search.get(PARAMS.to) ?? defaults.to }
  const rangeProblem = usageRangeError(range.from, range.to)
  const valid = rangeProblem === null
  const isDefault = range.from === defaults.from && range.to === defaults.to

  const budget = useBudgetQuery()
  const summary = useUsageSummaryQuery(range, valid)
  const days = useUsageTimeseriesQuery(range, valid)
  const [editing, setEditing] = useState(false)

  const set = (patch: Partial<UsageRange>) =>
    setSearch(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch) as [keyof UsageRange, string][]) {
          if (value) p.set(PARAMS[key], value)
          else p.delete(PARAMS[key])
        }
        return p
      },
      { replace: true },
    )

  if (budget.isError && isFeatureUnavailable(budget.error))
    return (
      <>
        <PageHeader title="Chi phí AI" />
        <UnavailableState
          title="Trợ lý chưa sẵn sàng."
          message={KNOWLEDGE_UNAVAILABLE}
          pendingMigrations={pendingMigrationsOf(budget.error)}
        />
      </>
    )

  const s = summary.data
  return (
    <>
      <PageHeader title="Chi phí AI" />
      <div className="space-y-4">
        {budget.isPending ? (
          <Skeleton className="h-40" />
        ) : budget.isError && !budget.data ? (
          <ErrorState
            title="Không tải được ngân sách."
            message={rateLimitedMessage(budget.error)}
            onRetry={() => void budget.refetch()}
          />
        ) : (
          <BudgetPanel budget={budget.data} onEdit={() => setEditing(true)} />
        )}

        <Panel>
          <form aria-label="Khoảng ngày" onSubmit={(e) => e.preventDefault()}>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-fg">Khoảng ngày (giờ UTC)</legend>
              <div className="flex flex-wrap items-center gap-2">
                <DateField className="w-40" label="Từ ngày" value={range.from} onChange={(from) => set({ from })} />
                <span aria-hidden className="text-fg-3">
                  –
                </span>
                <DateField className="w-40" label="Đến ngày" value={range.to} onChange={(to) => set({ to })} />
                {!isDefault && (
                  <Button
                    variant="ghost"
                    icon="filter_alt_off"
                    bleed={false}
                    onClick={() => setSearch(new URLSearchParams(), { replace: true })}
                  >
                    Về tháng này
                  </Button>
                )}
              </div>
              {rangeProblem && (
                <p className="text-meta text-danger" role="alert">
                  {rangeProblem}
                </p>
              )}
            </fieldset>
          </form>
        </Panel>

        {valid && (
          <>
            <Panel aria-busy={summary.isFetching} className={cx(summary.isPlaceholderData && 'opacity-70')}>
              <PanelHeader
                title="Trong khoảng ngày"
                description={
                  s
                    ? `${formatDay(s.range.from, { year: true })} – ${formatDay(s.range.to, { year: true })}`
                    : undefined
                }
              />
              {summary.isPending ? (
                <Skeleton className="h-24" />
              ) : summary.isError && !s ? (
                <ErrorState message={rateLimitedMessage(summary.error)} onRetry={() => void summary.refetch()} />
              ) : s ? (
                <StatRow framed>
                  <Stat
                    label="Chi phí"
                    value={formatUsd(s.rangeCost.totalUsd)}
                    note={`Đã chốt ${formatUsd(s.rangeCost.settledUsd)}, chờ đối soát ${formatUsd(s.rangeCost.uncertainUsd)}, đang giữ ${formatUsd(s.rangeCost.reservedUsd)}`}
                  />
                  <Stat
                    label="Lượt hỏi"
                    value={formatCount(s.requests)}
                    note={`Trả lời ${formatCount(s.answered)}, không đủ tài liệu ${formatCount(s.insufficientContext)}, lỗi ${formatCount(s.failed)}`}
                  />
                  <Stat
                    label="Thời gian trả lời trung bình"
                    value={formatLatency(s.averageLatencyMs)}
                    note={s.p95LatencyMs != null ? `95% lượt dưới ${formatLatency(s.p95LatencyMs)}` : undefined}
                  />
                  <Stat
                    label="Token"
                    value={formatCount(s.inputTokens + s.outputTokens + s.reasoningTokens + s.embeddingTokens)}
                    note={`Vào ${formatCount(s.inputTokens)} (đọc lại ${formatCount(s.cachedInputTokens)}), ra ${formatCount(s.outputTokens)}, đọc câu hỏi ${formatCount(s.embeddingTokens)}`}
                  />
                </StatRow>
              ) : null}
            </Panel>

            <Panel aria-busy={days.isFetching} className={cx(days.isPlaceholderData && 'opacity-70')}>
              <PanelHeader title="Chi phí theo ngày (USD)" />
              {days.isPending ? (
                <Skeleton className="h-56" />
              ) : days.isError && !days.data ? (
                <ErrorState message={rateLimitedMessage(days.error)} onRetry={() => void days.refetch()} />
              ) : days.data.every((d) => d.costUsd === 0) ? (
                <EmptyState title="Chưa phát sinh chi phí trong khoảng này." />
              ) : (
                <DailyCostChart days={days.data} />
              )}
            </Panel>

            <Panel>
              <PanelHeader title="Chi phí theo nhóm" />
              <PanelBody className="grid gap-6 lg:grid-cols-3">
                {BREAKDOWNS.map((b) => (
                  <Breakdown key={b.kind} {...b} range={range} enabled={valid} />
                ))}
              </PanelBody>
            </Panel>

            <TopUsers range={range} enabled={valid} />
            <UsageLedger range={range} enabled={valid} />
          </>
        )}
      </div>
      {budget.data && <BudgetDialog budget={budget.data} open={editing} onOpenChange={setEditing} />}
    </>
  )
}
