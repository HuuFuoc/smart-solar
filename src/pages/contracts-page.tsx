import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/common/ui/button'
import { Field, Input, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Segmented } from '@/components/common/ui/segmented'
import { EmptyState, ErrorState } from '@/components/common/ui/states'
import { ContractTermsDialog } from '@/features/contracts/ContractTermsDialog'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import { acceptedQuotation, canCreateContract, extractId } from '@/features/contracts/contractRules'
import { useSurveyRequestContractsQuery } from '@/hooks/useContracts'
import { useQuotationsQuery } from '@/hooks/useSalesQuotations'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'

// Mở hợp đồng lắp đặt (quản lý và quản trị dùng chung). Hệ thống chưa có danh sách mọi hợp đồng nên mở theo mã hợp đồng, hoặc
// theo mã yêu cầu khảo sát (kinh doanh phụ trách thấy mã này) để xem mọi phiên bản. Bản nháp tự lập khi thanh toán báo giá được
// xác minh; "Lập hợp đồng" chỉ còn là đường khôi phục (backend từ chối khi chưa có thanh toán đã xác minh). Hợp đồng có lịch thi
// công thì mở từ mục Lịch thi công

type Kind = 'contract' | 'request'

const KINDS = [
  { value: 'contract' as const, label: 'Mã hợp đồng', icon: 'history_edu' },
  { value: 'request' as const, label: 'Mã yêu cầu khảo sát', icon: 'assignment' },
]

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
      <PanelHeader title="Hợp đồng của yêu cầu" />
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
                ? `Khách đã đồng ý báo giá ${accepted!.quoteNumber}. Hợp đồng tự lập khi thanh toán của báo giá được xác minh; chỉ lập tay khi đã thanh toán mà hợp đồng chưa có.`
                : 'Hợp đồng được lập tự động khi khách thanh toán báo giá đã đồng ý với kỹ thuật viên.'
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

function ContractsPage({ viewer, contractPattern }: { viewer: 'manager' | 'admin'; contractPattern: string }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [kind, setKind] = useState<Kind>(params.get('yeu-cau') ? 'request' : 'contract')
  const [text, setText] = useState(params.get('yeu-cau') ?? '')
  const [error, setError] = useState<string | null>(null)
  const requestId = params.get('yeu-cau')

  function submit(e: FormEvent) {
    e.preventDefault()
    const id = extractId(text)
    if (!id) return setError('Dán mã đầy đủ (dạng 8-4-4-4-12 ký tự) hoặc đường dẫn có mã đó.')
    setError(null)
    if (kind === 'contract') return void navigate(withId(contractPattern, id))
    setParams({ 'yeu-cau': id }, { replace: true })
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Hợp đồng" />
      <Panel>
        <PanelHeader title="Mở hợp đồng" />
        <PanelBody>
          <form noValidate onSubmit={submit} className="space-y-4">
            <Segmented label="Mở theo" options={KINDS} value={kind} onChange={setKind} />
            <Field
              label={kind === 'contract' ? 'Mã hợp đồng' : 'Mã yêu cầu khảo sát'}
              htmlFor="contract-lookup"
              error={error ?? undefined}
              hint="Dán mã, hoặc dán cả đường dẫn trang hợp đồng / yêu cầu khảo sát."
            >
              <Input
                id="contract-lookup"
                value={text}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={fieldMessageId('contract-lookup')}
                onChange={(e) => setText(e.target.value)}
              />
            </Field>
            <Button type="submit" icon="search" variant="info">
              Mở
            </Button>
          </form>
        </PanelBody>
      </Panel>
      {requestId && kind === 'request' && (
        <RequestContracts surveyRequestId={requestId} contractPattern={contractPattern} viewer={viewer} />
      )}
    </div>
  )
}

export function ManageContractsPage() {
  return <ContractsPage viewer="manager" contractPattern={ROUTES.manage.contract} />
}

export function AdminContractsPage() {
  return <ContractsPage viewer="admin" contractPattern={ROUTES.admin.contract} />
}
