import { Link, useParams, useSearchParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { UnavailableState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import {
  contractStatusMeta,
  contractTitle,
  formatContractMoney,
  versionLabel,
  warrantyText,
} from '@/features/contracts/contractDisplay'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import { customerContractNext, customerContractSteps } from '@/features/contracts/customerContractDisplay'
import { newerVersion } from '@/features/contracts/customerContractRules'
import { CustomerContractPayment } from '@/features/contracts/CustomerContractPayment'
import { CustomerSignPanel } from '@/features/contracts/CustomerSignPanel'
import { PAYOS_RETURN_PARAM } from '@/features/payments/payosReturn'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyContractQuery, useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { ROUTES, withId } from '@/routes/paths'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'

// Chi tiết một phiên bản hợp đồng của khách: tình hình, ký (gửi bản ký tay), thanh toán PayOS, nội dung. Nút chỉ hiện khi
// trạng thái cho phép; backend vẫn kiểm lại. Quay về từ PayOS (?payos=) chỉ làm hiện câu "đang kiểm tra", không đổi trạng thái

function ContentPanel({ contract: c }: { contract: ContractView }) {
  return (
    <Panel>
      <PanelHeader title="Nội dung" description={`Giá theo báo giá phiên bản ${c.quotationVersion} bạn đã đồng ý.`} />
      <PanelBody className="space-y-4">
        <Facts
          items={[
            { k: 'Tổng giá trị', v: formatContractMoney(c) },
            { k: 'Bảo hành lắp đặt', v: warrantyText(c.warrantyMonths) },
          ]}
        />
        <section>
          <h3 className="text-body font-medium text-fg">Điều khoản</h3>
          <p className="mt-1 max-w-[72ch] text-body whitespace-pre-line text-fg-2">
            {c.terms || 'Chưa có điều khoản.'}
          </p>
        </section>
        <ButtonLink to={withId(ROUTES.customer.quotation, c.quotationId)} size="sm" variant="info" icon="request_quote">
          Xem báo giá
        </ButtonLink>
      </PanelBody>
    </Panel>
  )
}

function ContractAside({ contract: c }: { contract: ContractView }) {
  return (
    <PanelAside aria-label="Thông tin hợp đồng">
      <Panel>
        <PanelHeader title="Thông tin" />
        <PanelBody>
          <Facts
            column
            items={[
              { k: 'Số hợp đồng', v: c.contractNumber },
              { k: 'Phiên bản', v: versionLabel(c) },
              {
                k: 'Yêu cầu khảo sát',
                v: (
                  <Link className="ui-link" to={withId(ROUTES.customer.request, c.surveyRequestId)}>
                    Xem yêu cầu
                  </Link>
                ),
              },
              { k: 'Gửi bạn ký', v: formatMoment(c.publishedAt) },
              { k: 'Duyệt bản ký', v: formatMoment(c.signedAt) },
              { k: 'Thanh toán đủ', v: formatMoment(c.paidAt) },
            ]}
          />
        </PanelBody>
      </Panel>
    </PanelAside>
  )
}

export function CustomerContractPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const query = useMyContractQuery(id)
  const all = useMyContractsQuery()
  const returnedParam = params.get(PAYOS_RETURN_PARAM)
  const returned = returnedParam === 'return' || returnedParam === 'cancel' ? returnedParam : null
  usePageCrumb(query.data ? contractTitle(query.data) : null)

  if (query.data === undefined && isFeatureUnavailable(query.error))
    return (
      <UnavailableState
        title="Chức năng hợp đồng chưa sẵn sàng."
        message="Hợp đồng chưa mở được trên web. Thử lại sau."
        pendingMigrations={pendingMigrationsOf(query.error)}
      />
    )

  return (
    <QueryBoundary query={query}>
      {(c) => {
        const status = contractStatusMeta(c.status, 'customer')
        const next = customerContractNext(c)
        const versions = (all.data ?? []).filter((v) => v.contractNumber === c.contractNumber)
        const newer = c.status === 'SUPERSEDED' ? newerVersion(c, versions) : null
        return (
          <>
            <PageHeader
              meta={
                <>
                  {/* Việc cần làm đã báo đỏ ở khối Tình hình */}
                  <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                  <span className="tnum">{versionLabel(c)}</span>
                </>
              }
              title={`Hợp đồng ${c.contractNumber}`}
              description={`${formatContractMoney(c)}, bảo hành lắp đặt ${warrantyText(c.warrantyMonths)}.`}
            />

            <ProgressTracker steps={customerContractSteps(c)} next={next} />

            {c.status === 'SUPERSEDED' && (
              <Notice className="mt-6" title="Đã có phiên bản mới thay phiên bản này">
                {newer ? (
                  <span className="mt-3 flex">
                    <ButtonLink
                      to={withId(ROUTES.customer.contract, newer.contractId)}
                      size="sm"
                      variant="info"
                      icon="visibility"
                    >
                      Mở {versionLabel(newer).toLowerCase()}
                    </ButtonLink>
                  </span>
                ) : (
                  'Phiên bản mới hiện ở danh sách hợp đồng khi Smart Solar gửi bạn ký.'
                )}
              </Notice>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                <CustomerSignPanel contract={c} />
                <CustomerContractPayment contract={c} returned={returned} />
                <ContentPanel contract={c} />
              </div>
              <ContractAside contract={c} />
            </div>

            {versions.length > 1 && (
              <div className="mt-6 border-t border-line pt-4">
                <Panel>
                  <PanelHeader title="Các phiên bản" />
                  <PanelBody>
                    <ContractVersionList
                      versions={versions}
                      detailPattern={ROUTES.customer.contract}
                      currentId={c.contractId}
                      viewer="customer"
                    />
                  </PanelBody>
                </Panel>
              </div>
            )}
          </>
        )
      }}
    </QueryBoundary>
  )
}
