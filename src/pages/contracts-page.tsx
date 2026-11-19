import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CONTRACT_STATUSES } from '@/common/contract'
import { PAYMENT_PLAN_FILTERS } from '@/common/paymentPlan'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Field, Input, SearchInput, Select, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { ListPager } from '@/components/common/ui/pagination'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, ErrorState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ContractTermsDialog } from '@/features/contracts/ContractTermsDialog'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import { contractStatusMeta } from '@/features/contracts/contractDisplay'
import { acceptedQuotation, canCreateContract, extractId } from '@/features/contracts/contractRules'
import { formatVnd, stageMeta } from '@/features/payment-plan/paymentPlanDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useSurveyRequestContractsQuery } from '@/hooks/useContracts'
import { useContractDirectoryQuery } from '@/hooks/usePaymentPlan'
import { useQuotationsQuery } from '@/hooks/useSalesQuotations'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { ContractDirectoryQuery } from '@/types/req/paymentPlanReq'
import type { ContractDirectoryItem } from '@/types/res/paymentPlanRes'

// Danh sách mọi hợp đồng cho kinh doanh, kỹ thuật viên, quản lý, quản trị (chỉ đọc; backend 7d27054). Tìm, lọc và phân trang ở
// server, bộ lọc nằm trên địa chỉ. Tách rõ đã trả 30% và đã trả đủ: hợp đồng đã ký chưa chắc đã trả đủ. Quản lý / quản trị còn
// đường khôi phục của luồng cũ: mở theo mã yêu cầu khảo sát rồi "Lập hợp đồng" khi đã có thanh toán đã xác minh

type Viewer = 'sales' | 'technician' | 'manager' | 'admin'

const DETAIL: Record<Viewer, string> = {
  sales: ROUTES.ops.contract,
  technician: ROUTES.tech.contract,
  manager: ROUTES.manage.contract,
  admin: ROUTES.admin.contract,
}

const PAGE_SIZE = 20

function queryFrom(params: URLSearchParams): ContractDirectoryQuery {
  const plan = params.get('goi')
  return {
    page: Math.max(1, Number(params.get('trang')) || 1),
    pageSize: PAGE_SIZE,
    search: params.get('q') || undefined,
    status: params.get('trang-thai') || undefined,
    paymentPlan: plan === 'DEPOSIT_30_BALANCE_70' || plan === 'LEGACY' ? plan : undefined,
    overdue: params.get('qua-han') === '1' ? true : undefined,
    customerId: params.get('khach') || undefined,
    surveyRequestId: params.get('yeu-cau') || undefined,
  }
}

function DirectoryRow({ item, detail }: { item: ContractDirectoryItem; detail: string }) {
  const plan = item.paymentPlan !== null
  const stage = plan ? stageMeta(item.stage) : contractStatusMeta(item.status)
  return (
    <Tr>
      <Td label="Hợp đồng">
        <Link className="ui-link font-medium" to={withId(detail, item.contractId)}>
          {item.contractNumber}
        </Link>
        <p className="tnum text-meta text-fg-2">
          Phiên bản {item.version}, lập {formatMoment(item.createdAt)}
        </p>
      </Td>
      <Td label="Khách">
        <span className="text-fg">{item.customerName}</span>
        {item.customerPhone && <p className="tnum text-meta text-fg-2">{item.customerPhone}</p>}
        {item.propertyName && <p className="text-meta text-fg-2">{item.propertyName}</p>}
      </Td>
      <Td label="Tình hình">
        <Badge tone={item.overdue ? 'danger' : stage.tone}>{item.overdue ? 'Quá hạn' : stage.label}</Badge>
        <p className="text-meta text-fg-2">{plan ? 'Trả 30/70' : 'Trả 100% (cách cũ)'}</p>
      </Td>
      <Td label="Tiền" className="tnum">
        <span className="text-fg">{formatVnd(item.totalAmount)}</span>
        <p className="text-meta text-fg-2">
          Đã trả {formatVnd(item.paid)}
          {item.outstanding > 0 && `, còn ${formatVnd(item.outstanding)}`}
        </p>
        {plan && (
          <p className="text-meta text-fg-2">
            {item.fullyPaid ? 'Đã trả đủ' : item.depositPaid ? 'Đã trả 30%' : 'Chưa trả 30%'}
          </p>
        )}
      </Td>
      <Td label="Hạn gần nhất" className="tnum">
        {item.nextDueAt ? formatMoment(item.nextDueAt) : '—'}
      </Td>
    </Tr>
  )
}

function RequestContracts({
  surveyRequestId,
  contractPattern,
  viewer,
}: {
  surveyRequestId: string
  contractPattern: string
  viewer: 'manager' | 'admin'
}) {
  const navigate = useNavigate()
  const contracts = useSurveyRequestContractsQuery(surveyRequestId)
  const quotations = useQuotationsQuery(surveyRequestId)
  const [creating, setCreating] = useState(false)
  const accepted = acceptedQuotation(quotations.data ?? [])
  const creatable = contracts.data !== undefined && canCreateContract(accepted, contracts.data)

  return (
    <Panel>
      <PanelHeader title="Hợp đồng của yêu cầu (khôi phục luồng cũ)" />
      <PanelBody className="space-y-4">
        {contracts.isPending ? (
          <p className="text-body text-fg-2">Đang tải…</p>
        ) : contracts.data === undefined ? (
          <ErrorState
            title="Không mở được yêu cầu này."
            message={errorMessage(contracts.error)}
            onRetry={() => void contracts.refetch()}
          />
        ) : contracts.data.length === 0 ? (
          <EmptyState
            title="Yêu cầu chưa có hợp đồng"
            description={
              creatable
                ? `Báo giá ${accepted!.quoteNumber} đã được đồng ý theo cách cũ. Chỉ lập tay khi đã có thanh toán đã xác minh mà hợp đồng chưa có.`
                : 'Hợp đồng 30/70 được lập ngay khi kỹ thuật viên ghi khách đồng ý báo giá.'
            }
            action={
              creatable ? (
                <Button icon="add" variant="soft" onClick={() => setCreating(true)}>
                  Lập hợp đồng
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ContractVersionList versions={contracts.data} detailPattern={contractPattern} />
        )}
        {quotations.isError && (
          <Notice tone="warn">Không đọc được báo giá của yêu cầu ({errorMessage(quotations.error)}).</Notice>
        )}
      </PanelBody>
      {creating && accepted && (
        <ContractTermsDialog
          target={{ mode: 'create', quotation: accepted }}
          viewer={viewer}
          onClose={() => setCreating(false)}
          onDone={(view) => void navigate(withId(contractPattern, view.contractId))}
        />
      )}
    </Panel>
  )
}

function ContractsPage({ viewer }: { viewer: Viewer }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = queryFrom(params)
  const directory = useContractDirectoryQuery(query)
  const [text, setText] = useState(query.search ?? '')
  const [lookup, setLookup] = useState('')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const staffWriter = viewer === 'manager' || viewer === 'admin'

  function update(change: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(change)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('trang' in change)) next.delete('trang')
    setParams(next, { replace: true })
  }

  function search(e: FormEvent) {
    e.preventDefault()
    update({ q: text.trim() || null })
  }

  function open(e: FormEvent) {
    e.preventDefault()
    const id = extractId(lookup)
    if (!id) return setLookupError('Dán mã hợp đồng đầy đủ (dạng 8-4-4-4-12 ký tự) hoặc đường dẫn có mã đó.')
    setLookupError(null)
    void navigate(withId(DETAIL[viewer], id))
  }

  const filtered = Boolean(query.search || query.status || query.paymentPlan || query.overdue || query.customerId)

  return (
    <div className="space-y-4">
      <PageHeader title="Hợp đồng" />

      <Panel>
        <PanelBody className="space-y-3">
          <form noValidate onSubmit={search} className="flex flex-wrap items-end gap-3">
            <SearchInput
              className="min-w-64 flex-1"
              aria-label="Tìm theo số hợp đồng, tên, số điện thoại hoặc email của khách"
              placeholder="Số hợp đồng, tên, số điện thoại, email"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onClear={() => {
                setText('')
                update({ q: null })
              }}
            />
            <Button type="submit" icon="search" variant="info">
              Tìm
            </Button>
          </form>
          <div className="flex flex-wrap gap-3">
            <Select
              aria-label="Cách trả"
              active={Boolean(query.paymentPlan)}
              value={query.paymentPlan ?? ''}
              onChange={(e) => update({ goi: e.target.value || null })}
            >
              <option value="">Mọi cách trả</option>
              {Object.entries(PAYMENT_PLAN_FILTERS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Trạng thái hợp đồng"
              active={Boolean(query.status)}
              value={query.status ?? ''}
              onChange={(e) => update({ 'trang-thai': e.target.value || null })}
            >
              <option value="">Mọi trạng thái</option>
              {Object.entries(CONTRACT_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.staff}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Quá hạn"
              active={query.overdue === true}
              value={query.overdue ? '1' : ''}
              onChange={(e) => update({ 'qua-han': e.target.value || null })}
            >
              <option value="">Mọi hạn</option>
              <option value="1">Chỉ khoản quá hạn</option>
            </Select>
            {filtered && (
              <Button
                variant="secondary"
                icon="filter_alt_off"
                onClick={() => {
                  setText('')
                  setParams(new URLSearchParams(), { replace: true })
                }}
              >
                Bỏ lọc
              </Button>
            )}
          </div>
        </PanelBody>
      </Panel>

      <QueryBoundary query={directory}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title={filtered ? 'Không có hợp đồng khớp bộ lọc' : 'Chưa có hợp đồng'}
              description={
                filtered
                  ? undefined
                  : 'Hợp đồng 30/70 được lập khi kỹ thuật viên ghi khách đồng ý báo giá tại công trình.'
              }
            />
          ) : (
            <>
              <Table stack="xl">
                <thead>
                  <tr>
                    <Th>Hợp đồng</Th>
                    <Th>Khách</Th>
                    <Th>Tình hình</Th>
                    <Th>Tiền</Th>
                    <Th>Hạn gần nhất</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <DirectoryRow key={item.contractId} item={item} detail={DETAIL[viewer]} />
                  ))}
                </tbody>
              </Table>
              <ListPager
                page={data.page}
                pages={data.totalPages}
                from={(data.page - 1) * data.pageSize + 1}
                to={(data.page - 1) * data.pageSize + data.items.length}
                total={data.totalItems}
                noun="hợp đồng"
                onChange={(page) => update({ trang: page > 1 ? String(page) : null })}
              />
            </>
          )
        }
      </QueryBoundary>

      <Panel>
        <PanelHeader title="Mở theo mã hợp đồng" />
        <PanelBody>
          <form noValidate onSubmit={open} className="flex flex-wrap items-end gap-3">
            <Field
              label="Mã hợp đồng"
              htmlFor="contract-lookup"
              error={lookupError ?? undefined}
              className="min-w-64 flex-1"
            >
              <Input
                id="contract-lookup"
                value={lookup}
                aria-invalid={Boolean(lookupError) || undefined}
                aria-describedby={fieldMessageId('contract-lookup')}
                onChange={(e) => setLookup(e.target.value)}
              />
            </Field>
            <Button type="submit" icon="open_in_new" variant="info">
              Mở
            </Button>
          </form>
        </PanelBody>
      </Panel>

      {staffWriter && query.surveyRequestId && (
        <RequestContracts
          surveyRequestId={query.surveyRequestId}
          contractPattern={DETAIL[viewer]}
          viewer={viewer as 'manager' | 'admin'}
        />
      )}
    </div>
  )
}

export function OpsContractsPage() {
  return <ContractsPage viewer="sales" />
}

export function TechContractsPage() {
  return <ContractsPage viewer="technician" />
}

export function ManageContractsPage() {
  return <ContractsPage viewer="manager" />
}

export function AdminContractsPage() {
  return <ContractsPage viewer="admin" />
}
