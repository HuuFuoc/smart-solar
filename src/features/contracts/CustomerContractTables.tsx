import { useMemo, useState } from 'react'
import type { Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { normalizeSearch } from '@/components/common/ui/combobox'
import { EmptyState } from '@/components/common/ui/states'
import { StatusTableFilterBar, StatusTableSection } from '@/components/common/ui/status-tables'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import {
  contractStatusMeta,
  formatContractMoney,
  versionLabel,
  warrantyText,
} from '@/features/contracts/contractDisplay'
import { isCustomerTodo } from '@/features/contracts/customerContractRules'
import { StatusBadge } from '@/features/pre-surveys/components/StatusBadge'
import {
  DATE_FILTER_OPTIONS,
  type DateFilter,
  formatDateVn,
  matchesVnDate,
  todayVn,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'

type ContractGroupKey = 'todo' | 'reviewing' | 'completed'

const STATUS_GROUPS: { key: ContractGroupKey; title: string; emptyText: string }[] = [
  {
    key: 'todo',
    title: 'Chờ bạn ký hoặc thanh toán',
    emptyText: 'Không có hợp đồng nào đang chờ bạn ký hoặc thanh toán.',
  },
  {
    key: 'reviewing',
    title: 'Đang kiểm tra bản ký',
    emptyText: 'Không có hợp đồng nào đang được kiểm tra bản ký.',
  },
  {
    key: 'completed',
    title: 'Đã thanh toán',
    emptyText: 'Chưa có hợp đồng nào đã thanh toán.',
  },
]

const STATUS_BADGE_MAP: Record<string, { tone: Tone; icon: string }> = {
  AWAITING_SIGNATURE: { tone: 'accent', icon: 'draw' },
  SIGNATURE_REJECTED: { tone: 'warn', icon: 'edit_note' },
  SIGNED: { tone: 'accent', icon: 'payments' },
  UNDER_REVIEW: { tone: 'info', icon: 'hourglass_top' },
  PAID: { tone: 'ok', icon: 'check_circle' },
  SUPERSEDED: { tone: 'neutral', icon: 'description' },
  DISCARDED: { tone: 'neutral', icon: 'cancel' },
}

function classifyContract(c: ContractView): ContractGroupKey {
  if (isCustomerTodo(c)) return 'todo'
  if (c.status === 'UNDER_REVIEW') return 'reviewing'
  return 'completed'
}

function statusBadgeConfig(c: ContractView): { label: string; tone: Tone; icon: string } {
  const meta = contractStatusMeta(c.status, 'customer')
  const visual = STATUS_BADGE_MAP[c.status]
  return {
    label: meta.label,
    tone: visual?.tone ?? (meta.tone === 'info' ? 'neutral' : meta.tone),
    icon: visual?.icon ?? 'description',
  }
}

function contractMilestoneLabel(c: ContractView): string | null {
  if (c.status === 'PAID' && c.paidAt) return `Thanh toán ${formatDateVn(c.paidAt)}`
  if (c.status === 'SIGNED' && c.signedAt) return `Duyệt ký ${formatDateVn(c.signedAt)}`
  if (c.status === 'UNDER_REVIEW' && c.signedDocument?.confirmedAt) {
    return `Đã gửi ${formatDateVn(c.signedDocument.confirmedAt)}`
  }
  return null
}

type EnrichedContract = {
  contract: ContractView
  propertyName: string
  group: ContractGroupKey
}

/** Bảng theo dõi hợp đồng chia theo trạng thái, kèm thanh tìm kiếm và lọc theo ngày. */
export function CustomerContractTables({
  contracts,
  propertyNames,
}: {
  contracts: ContractView[]
  propertyNames: Map<string, string>
}) {
  const today = todayVn()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [activeGroup, setActiveGroup] = useState<'all' | ContractGroupKey>('all')

  const enriched = useMemo<EnrichedContract[]>(
    () =>
      contracts.map((c) => ({
        contract: c,
        propertyName: propertyNames.get(c.surveyRequestId) || `Hợp đồng ${c.contractNumber}`,
        group: classifyContract(c),
      })),
    [contracts, propertyNames],
  )

  const filtered = useMemo(() => {
    const keyword = normalizeSearch(search)
    return enriched.filter(({ contract: c, propertyName }) => {
      const dateIso = c.publishedAt ?? c.issuedAt ?? c.signedAt ?? c.paidAt
      if (dateFilter !== 'all' && (!dateIso || !matchesVnDate(vnDate(dateIso), dateFilter, today))) {
        return false
      }
      if (!keyword) return true
      return normalizeSearch(`${propertyName} ${c.contractNumber} ${versionLabel(c)}`).includes(keyword)
    })
  }, [enriched, search, dateFilter, today])

  const grouped = useMemo(() => {
    const map: Record<ContractGroupKey, EnrichedContract[]> = {
      todo: [],
      reviewing: [],
      completed: [],
    }
    for (const item of filtered) {
      map[item.group].push(item)
    }
    return STATUS_GROUPS.map((cfg) => ({
      ...cfg,
      rows: map[cfg.key],
      highlight: cfg.key === 'todo' && map[cfg.key].length > 0,
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
      <StatusTableFilterBar
        searchName="contract-search"
        searchLabel="Tìm hợp đồng"
        searchPlaceholder="Tìm theo tên công trình, số hợp đồng..."
        searchValue={search}
        onSearchChange={setSearch}
        dateLabel="Lọc theo ngày gửi ký"
        dateValue={dateFilter}
        dateOptions={DATE_FILTER_OPTIONS}
        defaultDateValue="all"
        onDateChange={setDateFilter}
        groups={grouped.map((g) => ({ key: g.key, title: g.title, count: g.rows.length }))}
        totalCount={filtered.length}
        activeGroup={activeGroup}
        onGroupChange={setActiveGroup}
        hasFilter={hasFilter}
        onReset={resetFilters}
      />

      {filtered.length === 0 && hasFilter ? (
        <EmptyState
          title="Không tìm thấy hợp đồng phù hợp"
          description="Thử đổi từ khoá tìm kiếm hoặc chọn lại khoảng thời gian."
          action={
            <Button size="sm" variant="secondary" icon="refresh" onClick={resetFilters}>
              Xem tất cả hợp đồng
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
                    <Th>Số hợp đồng</Th>
                    <Th>Ngày gửi ký</Th>
                    <Th>Tổng cộng</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map(({ contract: c, propertyName }) => {
                    const badge = statusBadgeConfig(c)
                    const milestone = contractMilestoneLabel(c)
                    return (
                      <Tr key={c.contractId} className="transition-colors">
                        <Td label="Công trình" className="py-3 font-semibold text-fg">
                          {propertyName}
                        </Td>
                        <Td label="Số hợp đồng" className="tnum py-3 text-fg-2">
                          {c.contractNumber}, {versionLabel(c).toLowerCase()}
                        </Td>
                        <Td label="Ngày gửi ký" className="tnum py-3">
                          <div className="min-w-0">
                            <span className="block text-fg">{formatDateVn(c.publishedAt ?? c.issuedAt)}</span>
                            {milestone && <span className="mt-0.5 block text-meta text-fg-2">{milestone}</span>}
                          </div>
                        </Td>
                        <Td label="Tổng cộng" className="tnum py-3">
                          <div className="min-w-0">
                            <span className="block font-semibold whitespace-nowrap text-fg">
                              {formatContractMoney(c)}
                            </span>
                            <span className="mt-0.5 block text-meta text-fg-2">
                              Bảo hành: {warrantyText(c.warrantyMonths)}
                            </span>
                          </div>
                        </Td>
                        <Td label="Trạng thái" className="py-3">
                          <StatusBadge label={badge.label} tone={badge.tone} icon={badge.icon} size="sm" />
                        </Td>
                        <Td className="py-3 whitespace-nowrap lg:text-right">
                          <ButtonLink
                            icon="visibility"
                            to={withId(ROUTES.customer.contract, c.contractId)}
                            size="sm"
                            variant="secondary"
                          >
                            Xem hợp đồng
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

