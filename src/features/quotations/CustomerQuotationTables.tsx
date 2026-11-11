import { useMemo, useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import type { Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { SearchInput, Select } from '@/components/common/ui/field'
import { EmptyState } from '@/components/common/ui/states'
import { StatusBadge } from '@/features/pre-surveys/components/StatusBadge'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import {
  formatDateVn,
  formatQuotationMoney,
  quotationStatusMeta,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import { addDays, todayVn, vnDate } from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { QuotationView } from '@/types/res/quotationsRes'
import { cx } from '@/utils/cx'

type QuotationGroupKey = 'awaiting' | 'followup' | 'accepted'
type DateFilter = 'all' | 'today' | 'yesterday' | 'day_before' | 'last_3_days' | 'last_7_days' | 'last_30_days'

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả ngày' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'day_before', label: 'Hôm kia' },
  { value: 'last_3_days', label: '3 ngày gần đây' },
  { value: 'last_7_days', label: '7 ngày gần đây' },
  { value: 'last_30_days', label: '30 ngày gần đây' },
]

const STATUS_GROUPS: { key: QuotationGroupKey; title: string; emptyText: string }[] = [
  {
    key: 'awaiting',
    title: 'Chờ bạn trả lời',
    emptyText: 'Không có báo giá nào đang chờ bạn trả lời.',
  },
  {
    key: 'followup',
    title: 'Đã yêu cầu sửa / Hết hạn',
    emptyText: 'Không có báo giá nào ở trạng thái này.',
  },
  {
    key: 'accepted',
    title: 'Đã đồng ý',
    emptyText: 'Chưa có báo giá nào đã đồng ý.',
  },
]

function classifyQuotation(q: QuotationView): QuotationGroupKey {
  if (q.status === 'ACCEPTED') return 'accepted'
  if (q.status === 'ISSUED' && !q.isExpired) return 'awaiting'
  return 'followup'
}

function statusBadgeConfig(q: QuotationView): { label: string; tone: Tone; icon: string } {
  const meta = quotationStatusMeta(q, 'customer')
  if (q.status === 'ACCEPTED') return { label: meta.label, tone: 'ok', icon: 'check_circle' }
  if (q.status === 'ISSUED' && q.isExpired) return { label: meta.label, tone: 'warn', icon: 'event_busy' }
  if (q.status === 'REVISION_REQUESTED') return { label: meta.label, tone: 'warn', icon: 'edit_note' }
  if (q.status === 'ISSUED') return { label: meta.label, tone: 'accent', icon: 'schedule' }
  return { label: meta.label, tone: meta.tone === 'info' ? 'neutral' : meta.tone, icon: 'description' }
}

function matchesDate(itemDate: string, filter: DateFilter, today: string): boolean {
  if (filter === 'all' || !itemDate) return true
  if (filter === 'today') return itemDate === today
  if (filter === 'yesterday') return itemDate === addDays(today, -1)
  if (filter === 'day_before') return itemDate === addDays(today, -2)
  if (filter === 'last_3_days') return itemDate >= addDays(today, -3) && itemDate <= today
  if (filter === 'last_7_days') return itemDate >= addDays(today, -7) && itemDate <= today
  if (filter === 'last_30_days') return itemDate >= addDays(today, -30) && itemDate <= today
  return true
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .trim()
    .toLowerCase()
}

type EnrichedQuotation = {
  quotation: QuotationView
  propertyName: string
  group: QuotationGroupKey
}

function QuotationStatusTable({
  title,
  emptyText,
  highlight,
  rows,
}: {
  title: string
  emptyText: string
  highlight: boolean
  rows: EnrichedQuotation[]
}) {
  const [open, setOpen] = useState(true)

  return (
    <section
      className={cx(
        'overflow-hidden rounded-container border bg-canvas transition-colors',
        highlight ? 'border-accent-line/50 border-l-[3px] border-l-accent' : 'border-line',
      )}
    >
      <div
        className={cx(
          'flex items-center justify-between gap-3 px-4 py-3 sm:px-5',
          highlight ? 'bg-accent-soft/55' : 'bg-surface-2/60',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="group flex min-w-0 items-center gap-2.5 rounded-control py-0.5 text-left"
        >
          <h2 className="flex items-center gap-2 text-body font-semibold text-fg transition-colors group-hover:text-accent-fg">
            <span>{title}</span>
            <span
              className={cx(
                'tnum inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold',
                rows.length === 0
                  ? 'bg-surface-3 text-fg-2'
                  : highlight
                    ? 'bg-accent text-on-accent'
                    : 'bg-surface-3 text-fg',
              )}
            >
              {rows.length}
            </span>
          </h2>
          <Icon
            name={open ? 'expand_less' : 'expand_more'}
            className="text-[20px] text-fg-2 transition-transform group-hover:text-fg"
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div className="p-4 pt-2 sm:px-5 sm:pb-4">
          {rows.length === 0 ? (
            <p className="py-5 text-center text-meta text-fg-2">{emptyText}</p>
          ) : (
            <Table stack>
              <thead>
                <tr>
                  <Th>Công trình</Th>
                  <Th>Số báo giá</Th>
                  <Th>Ngày gửi</Th>
                  <Th>Tổng cộng</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Thao tác</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ quotation: q, propertyName }) => {
                  const badge = statusBadgeConfig(q)
                  return (
                    <Tr key={q.quotationId} className="transition-colors">
                      <Td label="Công trình" className="py-3 font-semibold text-fg">
                        {propertyName}
                      </Td>
                      <Td label="Số báo giá" className="tnum py-3 text-fg-2">
                        {quotationTitle(q)}
                      </Td>
                      <Td label="Ngày gửi" className="tnum py-3">
                        <span className="block text-fg">{formatDateVn(q.issuedAt)}</span>
                        {q.status === 'ISSUED' && q.validUntil && (
                          <span className="mt-0.5 block text-meta text-fg-2">
                            {q.isExpired ? 'Hết hạn' : 'Hạn'} {formatDateVn(q.validUntil)}
                          </span>
                        )}
                        {q.status === 'ACCEPTED' && q.acceptedAt && (
                          <span className="mt-0.5 block text-meta text-fg-2">Đồng ý {formatDateVn(q.acceptedAt)}</span>
                        )}
                      </Td>
                      <Td label="Tổng cộng" className="tnum py-3 font-semibold text-fg whitespace-nowrap">
                        {formatQuotationMoney(q.totalAmount, q.currency)}
                      </Td>
                      <Td label="Trạng thái" className="py-3">
                        <StatusBadge label={badge.label} tone={badge.tone} icon={badge.icon} size="sm" />
                      </Td>
                      <Td className="py-3 lg:text-right whitespace-nowrap">
                        <ButtonLink
                          icon="visibility"
                          to={withId(ROUTES.customer.quotation, q.quotationId)}
                          size="sm"
                          variant="secondary"
                        >
                          Xem báo giá
                        </ButtonLink>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </section>
  )
}

/** Bảng theo dõi báo giá chia theo trạng thái, kèm thanh tìm kiếm và lọc theo ngày. */
export function CustomerQuotationTables({
  quotations,
  propertyNames,
}: {
  quotations: QuotationView[]
  propertyNames: Map<string, string>
}) {
  const today = todayVn()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [activeGroup, setActiveGroup] = useState<'all' | QuotationGroupKey>('all')

  const enriched = useMemo<EnrichedQuotation[]>(
    () =>
      quotations.map((q) => ({
        quotation: q,
        propertyName: propertyNames.get(q.surveyRequestId) || `Báo giá ${q.quoteNumber}`,
        group: classifyQuotation(q),
      })),
    [quotations, propertyNames],
  )

  const filtered = useMemo(() => {
    const keyword = normalizeSearch(search)
    return enriched.filter(({ quotation: q, propertyName }) => {
      const dateIso = q.issuedAt ?? q.acceptedAt
      if (dateFilter !== 'all' && (!dateIso || !matchesDate(vnDate(dateIso), dateFilter, today))) {
        return false
      }
      if (!keyword) return true
      const haystack = normalizeSearch(`${propertyName} ${quotationTitle(q)}`)
      return haystack.includes(keyword)
    })
  }, [enriched, search, dateFilter, today])

  const grouped = useMemo(() => {
    const map: Record<QuotationGroupKey, EnrichedQuotation[]> = {
      awaiting: [],
      followup: [],
      accepted: [],
    }
    for (const item of filtered) {
      map[item.group].push(item)
    }
    return STATUS_GROUPS.map((cfg) => ({
      ...cfg,
      rows: map[cfg.key],
      highlight: cfg.key === 'awaiting' && map[cfg.key].length > 0,
    }))
  }, [filtered])

  const visibleTables = activeGroup === 'all' ? grouped : grouped.filter((g) => g.key === activeGroup)
  const hasFilter = search.trim() !== '' || dateFilter !== 'all' || activeGroup !== 'all'
  const resetFilters = () => {
    setSearch('')
    setDateFilter('all')
    setActiveGroup('all')
  }

  return (
    <div className="space-y-5">
      {/* Thanh tìm kiếm, lọc theo ngày và nút đặt lại */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Tìm báo giá</span>
            <SearchInput
              name="quotation-search"
              placeholder="Tìm theo tên công trình, số báo giá..."
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <label className="w-full sm:w-44">
              <span className="sr-only">Lọc theo ngày gửi</span>
              <Select
                aria-label="Lọc theo ngày gửi"
                active={dateFilter !== 'all'}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              >
                {DATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </label>

            {hasFilter && (
              <Button size="md" variant="secondary" icon="close" onClick={resetFilters}>
                Xoá lọc
              </Button>
            )}
          </div>
        </div>

        {/* Tab chọn nhanh bảng trạng thái */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo bảng trạng thái">
          <button
            type="button"
            onClick={() => setActiveGroup('all')}
            aria-pressed={activeGroup === 'all'}
            className={cx(
              'tnum inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors',
              activeGroup === 'all'
                ? 'bg-accent text-on-accent'
                : 'border border-line bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
            )}
          >
            Tất cả ({filtered.length})
          </button>

          {grouped.map((g) => {
            const selected = activeGroup === g.key
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setActiveGroup(selected ? 'all' : g.key)}
                aria-pressed={selected}
                className={cx(
                  'tnum inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors',
                  selected
                    ? 'bg-accent text-on-accent'
                    : 'border border-line bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
                )}
              >
                <span>{g.title}</span>
                <span
                  className={cx(
                    'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-semibold',
                    selected ? 'bg-canvas/20 text-on-accent' : 'bg-surface-3 text-fg-2',
                  )}
                >
                  {g.rows.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Hiển thị các bảng trạng thái */}
      {filtered.length === 0 && hasFilter ? (
        <EmptyState
          title="Không tìm thấy báo giá phù hợp"
          description="Thử đổi từ khoá tìm kiếm hoặc chọn lại khoảng thời gian."
          action={
            <Button size="sm" variant="secondary" icon="refresh" onClick={resetFilters}>
              Xem tất cả báo giá
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {visibleTables.map((table) => (
            <QuotationStatusTable
              key={table.key}
              title={table.title}
              emptyText={table.emptyText}
              highlight={table.highlight}
              rows={table.rows}
            />
          ))}
        </div>
      )}
    </div>
  )
}
