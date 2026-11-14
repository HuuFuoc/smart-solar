import { useMemo, useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
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

function classifyContract(c: ContractView): ContractGroupKey {
  if (isCustomerTodo(c)) return 'todo'
  if (c.status === 'UNDER_REVIEW') return 'reviewing'
  return 'completed'
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
        // Số đỏ đã ở menu nên số trên tab và tiêu đề nhóm là xám
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
          {visibleTables.map((table) => {
            // Nhóm chỉ một trạng thái thì tiêu đề nhóm đã ghi trạng thái đó, cột trạng thái chỉ lặp lại
            const showStatus =
              new Set(table.rows.map((r) => contractStatusMeta(r.contract.status, 'customer').label)).size > 1
            return (
              <StatusTableSection
                key={table.key}
                title={table.title}
                count={table.rows.length}
                emptyText={table.emptyText}
              >
                <Table stack>
                  <thead>
                    <tr>
                      <Th>Công trình</Th>
                      <Th>Số hợp đồng</Th>
                      <Th>Ngày gửi ký</Th>
                      <Th>Tổng cộng</Th>
                      {showStatus && <Th>Trạng thái</Th>}
                      <Th className="text-right">Thao tác</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map(({ contract: c, propertyName }) => {
                      const status = contractStatusMeta(c.status, 'customer')
                      const milestone = contractMilestoneLabel(c)
                      return (
                        <Tr key={c.contractId}>
                          <Td label="Công trình" className="font-semibold text-fg">
                            {propertyName}
                          </Td>
                          <Td label="Số hợp đồng" className="tnum text-fg-2">
                            {c.contractNumber}, {versionLabel(c).toLowerCase()}
                          </Td>
                          <Td label="Ngày gửi ký" className="tnum">
                            <div className="min-w-0">
                              <span className="block text-fg">{formatDateVn(c.publishedAt ?? c.issuedAt)}</span>
                              {milestone && <span className="mt-0.5 block text-meta text-fg-2">{milestone}</span>}
                            </div>
                          </Td>
                          <Td label="Tổng cộng" className="tnum">
                            <div className="min-w-0">
                              <span className="block font-semibold whitespace-nowrap text-fg">
                                {formatContractMoney(c)}
                              </span>
                              <span className="mt-0.5 block text-meta text-fg-2">
                                Bảo hành: {warrantyText(c.warrantyMonths)}
                              </span>
                            </div>
                          </Td>
                          {showStatus && (
                            <Td label="Trạng thái">
                              <Badge tone={status.tone}>{status.label}</Badge>
                            </Td>
                          )}
                          <Td className="whitespace-nowrap lg:text-right">
                            <ButtonLink
                              icon="visibility"
                              to={withId(ROUTES.customer.contract, c.contractId)}
                              size="sm"
                              variant="info"
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
            )
          })}
        </div>
      )}
    </div>
  )
}
