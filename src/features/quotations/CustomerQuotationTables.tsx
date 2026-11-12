import { useMemo, useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { normalizeSearch } from '@/components/common/ui/combobox'
import { EmptyState } from '@/components/common/ui/states'
import { StatusTableFilterBar, StatusTableSection } from '@/components/common/ui/status-tables'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { quotationStatusMeta, quotationTitle, formatQuotationMoney } from '@/features/quotations/quotationDisplay'
import {
  DATE_FILTER_OPTIONS,
  type DateFilter,
  formatDateVn,
  matchesVnDate,
  todayVn,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { QuotationView } from '@/types/res/quotationsRes'

type QuotationGroupKey = 'awaiting' | 'followup' | 'accepted'

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

type EnrichedQuotation = {
  quotation: QuotationView
  propertyName: string
  group: QuotationGroupKey
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
      if (dateFilter !== 'all' && (!dateIso || !matchesVnDate(vnDate(dateIso), dateFilter, today))) {
        return false
      }
      if (!keyword) return true
      return normalizeSearch(`${propertyName} ${quotationTitle(q)}`).includes(keyword)
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

  // Tab Tất cả bỏ nhóm trống; chọn đúng một nhóm thì vẫn hiện để thấy câu "không có"
  const visibleTables =
    activeGroup === 'all' ? grouped.filter((g) => g.rows.length > 0) : grouped.filter((g) => g.key === activeGroup)
  const hasFilter = search.trim() !== '' || dateFilter !== 'all' || activeGroup !== 'all'
  const resetFilters = () => {
    setSearch('')
    setDateFilter('all')
    setActiveGroup('all')
  }

  return (
    <div className="space-y-4">
      <StatusTableFilterBar
        searchName="quotation-search"
        searchLabel="Tìm báo giá"
        searchPlaceholder="Tìm theo tên công trình, số báo giá..."
        searchValue={search}
        onSearchChange={setSearch}
        dateLabel="Lọc theo ngày gửi"
        dateValue={dateFilter}
        dateOptions={DATE_FILTER_OPTIONS}
        defaultDateValue="all"
        onDateChange={setDateFilter}
        groups={grouped.map((g) => ({ key: g.key, title: g.title, count: g.rows.length, attention: g.highlight }))}
        totalCount={filtered.length}
        activeGroup={activeGroup}
        onGroupChange={setActiveGroup}
        hasFilter={hasFilter}
        onReset={resetFilters}
      />

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
            <StatusTableSection
              key={table.key}
              title={table.title}
              count={table.rows.length}
              emptyText={table.emptyText}
              highlight={table.highlight}
            >
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
                  {table.rows.map(({ quotation: q, propertyName }) => {
                    const status = quotationStatusMeta(q, 'customer')
                    return (
                      <Tr key={q.quotationId}>
                        <Td label="Công trình" className="font-semibold text-fg">
                          {propertyName}
                        </Td>
                        <Td label="Số báo giá" className="tnum text-fg-2">
                          {quotationTitle(q)}
                        </Td>
                        <Td label="Ngày gửi" className="tnum">
                          <div className="min-w-0">
                            <span className="block text-fg">{formatDateVn(q.issuedAt)}</span>
                            {q.status === 'ISSUED' && q.validUntil && (
                              <span className="mt-0.5 block text-meta text-fg-2">
                                {q.isExpired ? 'Hết hạn' : 'Hạn'} {formatDateVn(q.validUntil)}
                              </span>
                            )}
                            {q.status === 'ACCEPTED' && q.acceptedAt && (
                              <span className="mt-0.5 block text-meta text-fg-2">
                                Đồng ý {formatDateVn(q.acceptedAt)}
                              </span>
                            )}
                          </div>
                        </Td>
                        <Td label="Tổng cộng" className="tnum font-semibold whitespace-nowrap text-fg">
                          {formatQuotationMoney(q.totalAmount, q.currency)}
                        </Td>
                        <Td label="Trạng thái">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </Td>
                        <Td className="whitespace-nowrap lg:text-right">
                          <ButtonLink
                            icon="visibility"
                            to={withId(ROUTES.customer.quotation, q.quotationId)}
                            size="sm"
                            variant="info"
                          >
                            Xem báo giá
                          </ButtonLink>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </StatusTableSection>
          ))}
        </div>
      )}
    </div>
  )
}
