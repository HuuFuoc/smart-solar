import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { normalizeSearch } from '@/components/common/ui/combobox'
import { SearchInput, Select } from '@/components/common/ui/field'
import { PagedList } from '@/components/common/ui/pagination'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import {
  contractStatusMeta,
  formatContractMoney,
  versionLabel,
  warrantyText,
} from '@/features/contracts/contractDisplay'
import { isCustomerTodo } from '@/features/contracts/customerContractRules'
import { stageMeta } from '@/features/payment-plan/paymentPlanDisplay'
import {
  DATE_FILTER_OPTIONS,
  type DateFilter,
  formatDateVn,
  formatMoment,
  matchesVnDate,
  todayVn,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'
import { formatMoney } from '@/utils/format'

// Danh sách hợp đồng của khách, cùng bố cục với danh sách của nhân viên (thiết kế 19/11/2026, kiểu .ct-* trong `.ct-page`):
// bộ lọc một hàng trong thẻ, một bảng trong thẻ có cột Thao tác. Nhóm trạng thái cũ thành ô chọn; bảng xếp việc của khách lên đầu,
// bản đã huỷ / đã có bản mới xuống cuối. Lọc và phân trang ở máy vì backend trả cả danh sách

type ContractGroupKey = 'todo' | 'progress' | 'reviewing' | 'completed' | 'closed'
type PlanFilter = 'all' | 'plan' | 'legacy'

const STATUS_GROUPS: { key: ContractGroupKey; title: string }[] = [
  { key: 'todo', title: 'Chờ bạn ký hoặc thanh toán' },
  { key: 'progress', title: 'Đang thực hiện' },
  { key: 'reviewing', title: 'Đang kiểm tra bản ký' },
  { key: 'completed', title: 'Đã thanh toán' },
  { key: 'closed', title: 'Đã huỷ, đã có bản mới' },
]

const GROUP_RANK: Record<ContractGroupKey, number> = { todo: 0, progress: 1, reviewing: 2, completed: 3, closed: 4 }

function classifyContract(c: ContractView): ContractGroupKey {
  if (c.status === 'SUPERSEDED' || c.status === 'DISCARDED' || c.paymentPlan?.stage === 'DISCARDED') return 'closed'
  if (isCustomerTodo(c)) return 'todo'
  if (c.paymentPlan) return c.paymentPlan.fullyPaid ? 'completed' : 'progress'
  if (c.status === 'UNDER_REVIEW') return 'reviewing'
  return 'completed'
}

/** Hợp đồng 30/70 hiện chặng (trả 30%, ký giấy, chờ 70%…), hợp đồng cũ hiện trạng thái. Việc của khách tô cam, trả đủ tô xanh */
function rowStatus(c: ContractView, group: ContractGroupKey): { label: string; tone: Tone } {
  if (c.paymentPlan?.overdue) return { label: 'Quá hạn', tone: 'danger' }
  const meta = c.paymentPlan ? stageMeta(c.paymentPlan.stage, 'customer') : contractStatusMeta(c.status, 'customer')
  if (group === 'todo') return { ...meta, tone: 'warn' }
  if (group === 'completed') return { ...meta, tone: 'ok' }
  return meta
}

function milestoneLabel(c: ContractView): string | null {
  if (c.status === 'PAID' && c.paidAt) return `Thanh toán ${formatDateVn(c.paidAt)}`
  // Hợp đồng 30/70: lúc chốt các trang hợp đồng giấy đã ký, không có bước duyệt
  if (c.status === 'SIGNED' && c.signedAt)
    return `${c.paymentPlan ? 'Ký giấy' : 'Duyệt ký'} ${formatDateVn(c.signedAt)}`
  if (c.status === 'UNDER_REVIEW' && c.signedDocument?.confirmedAt)
    return `Đã gửi bản ký ${formatDateVn(c.signedDocument.confirmedAt)}`
  return null
}

const sentAt = (c: ContractView) => c.publishedAt ?? c.issuedAt ?? c.signedAt ?? c.paidAt

type Row = { contract: ContractView; propertyName: string; group: ContractGroupKey }

function ContractRow({ row }: { row: Row }) {
  const { contract: c, propertyName, group } = row
  const status = rowStatus(c, group)
  const plan = c.paymentPlan
  const milestone = milestoneLabel(c)
  const to = withId(ROUTES.customer.contract, c.contractId)
  const money = (amount: number) => formatMoney(amount, c.currency)
  return (
    <Tr>
      <Td label="Hợp đồng">
        <div className="flex items-start gap-2">
          <span className="ct-dot mt-[7px] max-lg:hidden" data-tone={status.tone} aria-hidden />
          <div className="min-w-0">
            <Link
              className={
                status.tone === 'neutral' || status.tone === 'warn'
                  ? 'ui-link font-semibold text-fg'
                  : 'ui-link font-semibold'
              }
              to={to}
            >
              {c.contractNumber}
            </Link>
            <p className="tnum text-meta text-fg-2">
              {versionLabel(c)}, gửi {formatDateVn(sentAt(c))}
            </p>
          </div>
        </div>
      </Td>
      <Td label="Công trình">
        <span className="font-medium text-fg">{propertyName}</span>
        {milestone && <p className="tnum text-meta text-fg-2">{milestone}</p>}
        <span className="ct-chip">Bảo hành: {warrantyText(c.warrantyMonths)}</span>
      </Td>
      <Td label="Tình hình & tiến độ">
        <Badge tone={status.tone}>
          <span className="ct-dot size-1.5!" data-tone={status.tone} aria-hidden />
          {status.label}
        </Badge>
        <p className="mt-1 text-meta text-fg-2">{plan ? 'Trả 30/70' : 'Trả 100%'}</p>
      </Td>
      <Td label="Giá trị hợp đồng" className="tnum">
        <span className="font-semibold whitespace-nowrap text-fg">{formatContractMoney(c)}</span>
        {group === 'closed' ? (
          <p className="text-meta text-fg-2">Không còn hiệu lực</p>
        ) : plan ? (
          plan.fullyPaid ? (
            <p className="text-meta text-ok">Đã trả {money(plan.paid)} (đủ)</p>
          ) : (
            <p className={plan.overdue ? 'text-meta text-danger' : 'text-meta text-warn'}>
              Đã trả {money(plan.paid)}
              {plan.outstanding > 0 && `, còn ${money(plan.outstanding)}`}
            </p>
          )
        ) : c.paymentCompleted ? (
          <p className="text-meta text-ok">Đã trả đủ</p>
        ) : (
          <p className="text-meta text-warn">Chưa thanh toán</p>
        )}
      </Td>
      <Td label="Hạn gần nhất" className="tnum lg:text-center">
        {plan?.nextDueAt && group !== 'closed' ? (
          <span className={plan.overdue ? 'text-danger' : 'text-fg'}>{formatMoment(plan.nextDueAt)}</span>
        ) : (
          <span className="text-fg-3">—</span>
        )}
      </Td>
      <Td className="whitespace-nowrap lg:text-right">
        {group === 'todo' ? (
          <ButtonLink to={to} size="sm" variant="primary" icon="arrow_forward" className="max-lg:w-full">
            Xử lý ngay
          </ButtonLink>
        ) : (
          <ButtonLink to={to} size="sm" variant="secondary" icon="visibility" className="max-lg:w-full">
            Xem chi tiết
          </ButtonLink>
        )}
      </Td>
    </Tr>
  )
}

/** Bộ lọc một hàng và bảng hợp đồng của khách */
export function CustomerContractTables({
  contracts,
  propertyNames,
}: {
  contracts: ContractView[]
  propertyNames: Map<string, string>
}) {
  const today = todayVn()
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState<PlanFilter>('all')
  const [group, setGroup] = useState<'all' | ContractGroupKey>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')

  const rows = useMemo<Row[]>(
    () =>
      contracts
        .map((c) => ({
          contract: c,
          propertyName: propertyNames.get(c.surveyRequestId) || `Hợp đồng ${c.contractNumber}`,
          group: classifyContract(c),
        }))
        .sort(
          (a, b) =>
            GROUP_RANK[a.group] - GROUP_RANK[b.group] ||
            (sentAt(b.contract) ?? '').localeCompare(sentAt(a.contract) ?? ''),
        ),
    [contracts, propertyNames],
  )

  const counts = useMemo(() => {
    const map: Record<ContractGroupKey, number> = { todo: 0, progress: 0, reviewing: 0, completed: 0, closed: 0 }
    for (const r of rows) map[r.group]++
    return map
  }, [rows])

  const shown = useMemo(() => {
    const keyword = normalizeSearch(search)
    return rows.filter(({ contract: c, propertyName, group: g }) => {
      if (group !== 'all' && g !== group) return false
      if (plan === 'plan' && !c.paymentPlan) return false
      if (plan === 'legacy' && c.paymentPlan) return false
      const dateIso = sentAt(c)
      if (dateFilter !== 'all' && (!dateIso || !matchesVnDate(vnDate(dateIso), dateFilter, today))) return false
      if (!keyword) return true
      return normalizeSearch(`${propertyName} ${c.contractNumber} ${versionLabel(c)}`).includes(keyword)
    })
  }, [rows, search, plan, group, dateFilter, today])

  const hasFilter = search.trim() !== '' || plan !== 'all' || group !== 'all' || dateFilter !== 'all'
  const resetFilters = () => {
    setSearch('')
    setPlan('all')
    setGroup('all')
    setDateFilter('all')
  }

  return (
    <div className="space-y-6">
      <div className="ct-card p-3! sm:p-4!">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            name="contract-search"
            className="min-w-72 flex-[2]"
            aria-label="Tìm hợp đồng"
            placeholder="Tên công trình, số hợp đồng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
          <Select
            className="min-w-40 flex-1"
            aria-label="Cách trả"
            active={plan !== 'all'}
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanFilter)}
          >
            <option value="all">Mọi cách trả</option>
            <option value="plan">Trả 30/70</option>
            <option value="legacy">Trả 100%</option>
          </Select>
          <Select
            className="min-w-48 flex-1"
            aria-label="Trạng thái hợp đồng"
            active={group !== 'all'}
            value={group}
            onChange={(e) => setGroup(e.target.value as 'all' | ContractGroupKey)}
          >
            <option value="all">Mọi trạng thái hợp đồng</option>
            {STATUS_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.title} ({counts[g.key]})
              </option>
            ))}
          </Select>
          <Select
            className="min-w-40 flex-1"
            aria-label="Lọc theo ngày gửi ký"
            active={dateFilter !== 'all'}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          >
            {DATE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === 'all' ? 'Mọi thời gian' : o.label}
              </option>
            ))}
          </Select>
          {hasFilter && (
            <Button variant="ghost" bleed={false} icon="filter_alt_off" onClick={resetFilters}>
              Bỏ lọc
            </Button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="ct-card">
          <EmptyState
            title="Không tìm thấy hợp đồng phù hợp"
            description="Thử đổi từ khoá tìm kiếm hoặc chọn lại bộ lọc."
            action={
              <Button size="sm" variant="secondary" icon="refresh" onClick={resetFilters}>
                Xem tất cả hợp đồng
              </Button>
            }
          />
        </div>
      ) : (
        <div className="ct-card p-0!">
          <PagedList
            key={`${search}-${plan}-${group}-${dateFilter}`}
            items={shown}
            noun="hợp đồng"
            pageSize={20}
            keepScroll
            pagerClassName="border-t border-line px-4 py-3"
          >
            {(pageRows) => (
              <div className="ct-table rounded-[14px]! border-0!">
                <Table stack>
                  <thead>
                    <tr>
                      <Th>Hợp đồng & phiên bản</Th>
                      <Th>Công trình</Th>
                      <Th>Tình hình & tiến độ</Th>
                      <Th>Giá trị hợp đồng</Th>
                      <Th className="lg:text-center">Hạn gần nhất</Th>
                      <Th className="lg:text-right">Thao tác</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <ContractRow key={row.contract.contractId} row={row} />
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </PagedList>
        </div>
      )}
    </div>
  )
}
