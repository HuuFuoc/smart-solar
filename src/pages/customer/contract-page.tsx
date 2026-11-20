import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CONTRACT_DOCUMENT_LINKS } from '@/common/contract'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { UnavailableState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { handedOverProjects } from '@/features/after-sales/customerServiceRules'
import {
  contractStatusMeta,
  contractTitle,
  formatContractMoney,
  versionLabel,
  warrantyText,
} from '@/features/contracts/contractDisplay'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import {
  ContractCard,
  ContractHelpCard,
  ContractTerms,
  ContractTracker,
} from '@/features/contracts/CustomerContractCards'
import { customerContractNext, customerContractSteps } from '@/features/contracts/customerContractDisplay'
import { isPrepaid, newerVersion, paidMoment } from '@/features/contracts/customerContractRules'
import { CustomerContractPayment } from '@/features/contracts/CustomerContractPayment'
import { CustomerSignPanel } from '@/features/contracts/CustomerSignPanel'
import { useContractPrint } from '@/features/contracts/useContractPrint'
import { CustomerSchedulePanel } from '@/features/installation-schedules/CustomerSchedulePanel'
import { installationStatusMeta } from '@/features/installations/installationDisplay'
import { ContractSnapshotPanel } from '@/features/payment-plan/ContractSnapshotPanel'
import { InstallmentPlanPanel } from '@/features/payment-plan/InstallmentPlanPanel'
import { SignatureSetPanel } from '@/features/payment-plan/SignatureSetPanel'
import { formatVnd, planNextStep, planTrackerSteps, stageMeta } from '@/features/payment-plan/paymentPlanDisplay'
import { isPaymentPlanContract } from '@/features/payment-plan/paymentPlanRules'
import { PAYOS_RETURN_PARAM } from '@/features/payments/payosReturn'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyContractDocumentUrlMutation, useMyContractQuery, useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'

// Chi tiết một phiên bản hợp đồng của khách: tình hình, ký, thanh toán, lịch thi công, nội dung. Hợp đồng 30/70 (backend 7d27054):
// khách đọc bản nháp trước khi trả 30%, trả 30% / 70% trong ứng dụng, xem ảnh các trang đã ký; không còn tải bản ký lên (410).
// Hợp đồng cũ vẫn ký và thanh toán 100% ở đây. Quay về từ PayOS (?payos=) chỉ làm hiện câu "đang kiểm tra", không đổi trạng thái.
// Bố cục kiểu thẻ theo thiết kế 19/11/2026 (`.ct-page`, contract-detail.css); chỉ trang này dùng, trang nhân viên giữ kiểu chung

/** Giờ của mốc gần nhất trong các mốc đã có */
function latestMoment(...isos: (string | null | undefined)[]) {
  const times = isos.flatMap((s) => (s ? [Date.parse(s)] : [])).filter(Number.isFinite)
  return times.length > 0 ? formatMoment(new Date(Math.max(...times)).toISOString()) : null
}

function contractUpdatedAt(c: ContractView) {
  const plan = c.paymentPlan
  return latestMoment(
    c.issuedAt,
    c.publishedAt,
    c.signedAt,
    c.paidAt,
    c.paymentConfirmedAt,
    plan?.signature?.finalizedAt,
    ...(plan?.installments.map((i) => i.paidAt) ?? []),
  )
}

/** Nhãn trạng thái ở đầu trang: có chấm màu, rồi phiên bản */
function HeaderMeta({ tone, label, contract: c }: { tone: Tone; label: string; contract: ContractView }) {
  return (
    <>
      <Badge tone={tone}>
        <span className="ct-dot" data-tone={tone} aria-hidden />
        {label}
      </Badge>
      <Badge tone="neutral">
        <span className="tnum">{versionLabel(c)}</span>
      </Badge>
    </>
  )
}

function ContentPanel({ contract: c }: { contract: ContractView }) {
  return (
    <Panel>
      <PanelHeader
        title="Nội dung"
        description={`Giá theo báo giá phiên bản ${c.quotationVersion} bạn đã đồng ý với kỹ thuật viên.`}
      />
      <PanelBody className="space-y-4">
        <dl className="ct-box ct-well flex flex-wrap gap-x-10 gap-y-3 px-4 py-3">
          <div>
            <dt className="text-meta text-fg-2">Tổng giá trị</dt>
            <dd className="tnum text-body font-semibold text-fg">{formatContractMoney(c)}</dd>
          </div>
          <div>
            <dt className="text-meta text-fg-2">Bảo hành lắp đặt</dt>
            <dd className="text-body font-semibold text-fg">{warrantyText(c.warrantyMonths)}</dd>
          </div>
        </dl>
        <ContractTerms terms={c.terms} />
      </PanelBody>
    </Panel>
  )
}

function downloadUrl(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
}

/** Tải PDF chính thức khi hợp đồng có (link ký sẵn xin lúc bấm); chưa có thì in bản dựng từ dữ liệu hợp đồng, lưu thành PDF */
function ContractFileButton({ contract: c }: { contract: ContractView }) {
  const documentUrl = useMyContractDocumentUrlMutation()
  const { print, blocked } = useContractPrint(c)
  const [error, setError] = useState<string | null>(null)
  const official = CONTRACT_DOCUMENT_LINKS && c.officialDocument !== null

  async function download() {
    setError(null)
    try {
      downloadUrl((await documentUrl.mutateAsync({ contractId: c.contractId, disposition: 'attachment' })).url)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        icon={official ? 'download' : 'print'}
        className="w-full"
        disabled={documentUrl.isPending}
        onClick={official ? () => void download() : print}
      >
        {official
          ? documentUrl.isPending
            ? 'Đang tải…'
            : 'Tải bản hợp đồng đầy đủ (PDF)'
          : 'In hoặc lưu hợp đồng (PDF)'}
      </Button>
      {(error || (!official && blocked)) && (
        <p role="alert" className="text-meta text-danger">
          {error ?? 'Trình duyệt đã chặn cửa sổ in. Cho phép trang này mở cửa sổ mới rồi bấm lại.'}
        </p>
      )}
    </div>
  )
}

function InfoRow({ k, v, stack }: { k: string; v: ReactNode; stack?: boolean }) {
  return stack ? (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <dt className="text-fg-2">{k}</dt>
      <dd className="mt-1 text-fg">{v}</dd>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-fg-2">{k}</dt>
      <dd className="min-w-0 text-right font-medium wrap-break-word text-fg">{v}</dd>
    </div>
  )
}

function ContractAside({ contract: c, tone }: { contract: ContractView; tone: Tone }) {
  // Công trình của hợp đồng (nghiệm thu, tiến độ thi công); danh sách đã được khung khách hàng tải cho số trên menu
  const project = useMyInstallationsQuery().data?.find((p) => p.contractId === c.contractId)
  const handedOver = project ? handedOverProjects([project]).length > 0 : false
  const projectStatus = project ? installationStatusMeta(project.status, 'customer') : null
  const plan = c.paymentPlan
  return (
    <aside aria-label="Thông tin hợp đồng" className="min-w-0 space-y-4 self-start">
      <section aria-labelledby="contract-info-title" className="ct-card">
        <header className="flex items-center justify-between gap-3">
          <h2 id="contract-info-title" className="ct-eyebrow text-fg">
            Thông tin hợp đồng
          </h2>
          <span className="ct-dot" data-tone={tone} aria-hidden />
        </header>
        <dl className="mt-4 divide-y divide-line text-meta">
          <InfoRow
            stack
            k="Số hợp đồng"
            v={<span className="ct-code text-body font-bold break-all">{c.contractNumber}</span>}
          />
          <InfoRow k="Phiên bản" v={versionLabel(c)} />
          <InfoRow
            k="Yêu cầu khảo sát"
            v={
              <Link
                className="inline-flex items-center gap-1 font-semibold text-accent-fg underline-offset-4 hover:underline"
                to={withId(ROUTES.customer.request, c.surveyRequestId)}
              >
                Xem yêu cầu
                <Icon name="open_in_new" className="text-[16px]" />
              </Link>
            }
          />
          {project && projectStatus && (
            <InfoRow
              k="Công trình"
              v={
                <Link to={withId(ROUTES.customer.project, project.projectId)} className="press rounded-control">
                  <Badge tone={projectStatus.tone}>{projectStatus.label}</Badge>
                </Link>
              }
            />
          )}
          {plan ? (
            <>
              <InfoRow stack k="Cách trả" v="Hai khoản: 30% trước khi ký, 70% sau nghiệm thu" />
              <InfoRow k="Đã trả" v={<span className="tnum font-bold text-accent-fg">{formatVnd(plan.paid)}</span>} />
              <InfoRow k="Còn lại" v={<span className="tnum font-bold">{formatVnd(plan.outstanding)}</span>} />
              <InfoRow
                k="Đã trả đủ"
                v={<span className="tnum">{plan.fullyPaid ? formatMoment(c.paidAt) : 'Chưa'}</span>}
              />
            </>
          ) : (
            <>
              <InfoRow
                k="Thanh toán"
                v={
                  <span className="tnum">
                    {c.paymentCompleted ? `Đã nhận đủ ${formatMoment(paidMoment(c))}` : 'Chưa'}
                  </span>
                }
              />
              <InfoRow
                k={isPrepaid(c) ? 'Lập hồ sơ ký' : 'Gửi bạn ký'}
                v={<span className="tnum">{formatMoment(c.publishedAt)}</span>}
              />
              <InfoRow k="Duyệt bản ký" v={<span className="tnum">{formatMoment(c.signedAt)}</span>} />
            </>
          )}
        </dl>
        <div className="mt-5 space-y-2">
          <ContractFileButton contract={c} />
          {/* Hỗ trợ kỹ thuật là yêu cầu bảo hành / sửa chữa: chỉ mở được cho công trình đã bàn giao */}
          {handedOver && (
            <ButtonLink to={`${ROUTES.customer.afterSales}?bao-loi=1`} icon="support_agent" className="w-full">
              Liên hệ hỗ trợ kỹ thuật
            </ButtonLink>
          )}
        </div>
      </section>
      <ContractHelpCard />
    </aside>
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
        const updatedAt = contractUpdatedAt(c)
        if (isPaymentPlanContract(c)) {
          const plan = c.paymentPlan
          const stage = stageMeta(plan.stage, 'customer')
          const planNext = planNextStep(plan, 'customer')
          const tone = planNext.tone === 'danger' ? 'neutral' : stage.tone
          return (
            <div className="ct-page">
              <PageHeader
                meta={<HeaderMeta tone={tone} label={stage.label} contract={c} />}
                title={`Hợp đồng ${c.contractNumber}`}
                description={`${formatVnd(plan.total)}, trả 30% rồi 70%, bảo hành lắp đặt ${warrantyText(c.warrantyMonths)}.`}
              />
              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                  <ContractCard>
                    <ContractTracker steps={planTrackerSteps(plan)} next={planNext} updatedAt={updatedAt} />
                  </ContractCard>
                  {returned && (
                    <Notice title="Đang kiểm tra thanh toán">
                      Khoản tiền chỉ được ghi đã trả khi PayOS xác nhận với Smart Solar; trang tự cập nhật.
                    </Notice>
                  )}
                  {c.status === 'DRAFT' && (
                    <Notice title="Đọc kỹ toàn bộ điều khoản trước khi trả 30%">
                      Hợp đồng gồm điều khoản thanh toán hai khoản, nghiệm thu và quyền sở hữu thiết bị. Khoản 70% đến
                      hạn trong tối đa 72 giờ sau khi bạn nghiệm thu công trình (giờ cụ thể ghi trong điều khoản).
                    </Notice>
                  )}
                  <ContractCard>
                    <InstallmentPlanPanel contract={c} actor="customer" variant="card" />
                  </ContractCard>
                  <ContractCard>
                    <SignatureSetPanel contract={c} writer={null} reader="customer" variant="card" />
                  </ContractCard>
                  <ContractCard>
                    <CustomerSchedulePanel contract={c} />
                  </ContractCard>
                  <ContractCard>
                    <ContractSnapshotPanel contract={c} variant="card" />
                  </ContractCard>
                  <ContractCard>
                    <ContentPanel contract={c} />
                  </ContractCard>
                </div>
                <ContractAside contract={c} tone={tone} />
              </div>
            </div>
          )
        }
        const next = customerContractNext(c)
        const versions = (all.data ?? []).filter((v) => v.contractNumber === c.contractNumber)
        const newer = c.status === 'SUPERSEDED' ? newerVersion(c, versions) : null
        // Việc cần làm đã báo đỏ ở khối Tình hình
        const tone = next.tone === 'danger' ? 'neutral' : status.tone
        return (
          <div className="ct-page">
            <PageHeader
              meta={<HeaderMeta tone={tone} label={status.label} contract={c} />}
              title={`Hợp đồng ${c.contractNumber}`}
              description={`${formatContractMoney(c)}, bảo hành lắp đặt ${warrantyText(c.warrantyMonths)}.`}
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <ContractCard>
                  <ContractTracker steps={customerContractSteps(c)} next={next} updatedAt={updatedAt} />
                </ContractCard>

                {c.status === 'SUPERSEDED' && (
                  <Notice title="Đã có phiên bản mới thay phiên bản này">
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

                <ContractCard>
                  <CustomerSignPanel contract={c} />
                </ContractCard>
                <ContractCard>
                  <CustomerContractPayment contract={c} returned={returned} />
                </ContractCard>
                <ContractCard>
                  <CustomerSchedulePanel contract={c} />
                </ContractCard>
                <ContractCard>
                  <ContentPanel contract={c} />
                </ContractCard>
                {versions.length > 1 && (
                  <ContractCard>
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
                  </ContractCard>
                )}
              </div>
              <ContractAside contract={c} tone={tone} />
            </div>
          </div>
        )
      }}
    </QueryBoundary>
  )
}
