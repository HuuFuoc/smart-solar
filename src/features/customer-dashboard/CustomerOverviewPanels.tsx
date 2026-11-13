import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { KeyValueList } from '@/components/common/ui/lists'
import { EmptyState } from '@/components/common/ui/states'
import { APPOINTMENT_LABELS, APPOINTMENT_TONES } from '@/common/scheduling'
import {
  CUSTOMER_INSTALLATION_LABELS,
  INSTALLATION_STATUS_LABELS,
  INSTALLATION_STATUS_TONES,
} from '@/common/installation'
import { SERVICE_REQUEST_KINDS } from '@/common/afterSales'
import { subscriptionStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { isUpcomingAppointment } from '@/features/customer-dashboard/services/dashboardChartService'
import { shortCode, surveyStatusMeta } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { ServiceRequestSummary, SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'

const isOpenProject = (p: InstallationCustomerView) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED'
const isOpenService = (s: ServiceRequestSummary) =>
  s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && s.status !== 'CLOSED_DUPLICATE'

function PanelTitle({ title, to, linkLabel }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-title font-semibold">{title}</h2>
      {to && linkLabel && (
        <ButtonLink to={to} size="sm" variant="ghost" icon="list">
          {linkLabel}
        </ButtonLink>
      )}
    </div>
  )
}

// Công trình đang lắp đặt; chưa có công trình thì yêu cầu khảo sát gần nhất còn mở
export function CustomerProjectPanel({
  installations,
  surveyRequests,
}: {
  installations: InstallationCustomerView[]
  surveyRequests: CustomerSurveyRequestView[]
}) {
  const project = installations.find(isOpenProject) ?? installations[0]
  const survey = project
    ? null
    : (surveyRequests.find((r) => r.status !== 'CANCELLED' && r.status !== 'CLOSED') ?? surveyRequests[0] ?? null)
  return (
    <section>
      <PanelTitle
        title="Công trình"
        to={installations.length > 0 ? ROUTES.customer.projects : ROUTES.customer.requests}
        linkLabel={installations.length > 0 ? 'Tất cả công trình' : 'Tất cả yêu cầu khảo sát'}
      />
      {project ? (
        <div className="rounded-container border border-line p-4">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <h3 className="font-semibold">
                Công trình <span className="tnum">{shortCode(project.projectId)}</span>
              </h3>
              <p className="text-meta text-fg-2">
                Hợp đồng <span className="tnum">{shortCode(project.contractId)}</span>
              </p>
            </div>
            <Badge tone={INSTALLATION_STATUS_TONES.customer[project.status] ?? 'neutral'}>
              {CUSTOMER_INSTALLATION_LABELS[project.status] ??
                INSTALLATION_STATUS_LABELS[project.status] ??
                project.status}
            </Badge>
          </div>
          <KeyValueList
            columns={2}
            className="mt-3"
            items={[
              { k: 'Kỹ thuật viên', v: project.technicianName ?? 'Chưa xếp' },
              {
                k: 'Lịch thi công',
                v: project.scheduledStartsAt ? formatMoment(project.scheduledStartsAt) : 'Chưa có lịch',
              },
              { k: 'Thiết bị đã ghi', v: project.assets.length },
              { k: 'Ảnh thi công', v: project.evidence.length },
            ]}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <ButtonLink to={ROUTES.customer.quotations} size="sm" variant="ghost" icon="request_quote">
              Báo giá, hợp đồng
            </ButtonLink>
            <ButtonLink
              to={withId(ROUTES.customer.project, project.projectId)}
              size="sm"
              variant="info"
              icon="visibility"
            >
              Mở công trình
            </ButtonLink>
          </div>
        </div>
      ) : survey ? (
        <div className="rounded-container border border-line p-4">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <h3 className="font-semibold">{survey.propertyName || 'Công trình chưa đặt tên'}</h3>
              <p className="text-meta text-fg-2">Gửi lúc {formatMoment(survey.submittedAt)}</p>
            </div>
            <Badge tone={surveyStatusMeta(survey.status).tone}>{surveyStatusMeta(survey.status).label}</Badge>
          </div>
          <p className="mt-3 text-body text-fg-2">
            {survey.appointment
              ? `Giờ khảo sát: ${formatMoment(survey.appointment.startsAt)}`
              : 'Chưa đặt giờ khảo sát.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <ButtonLink to={ROUTES.customer.quotations} size="sm" variant="ghost" icon="request_quote">
              Báo giá
            </ButtonLink>
            <ButtonLink
              to={withId(ROUTES.customer.request, survey.surveyRequestId)}
              size="sm"
              variant="info"
              icon="visibility"
            >
              Mở yêu cầu
            </ButtonLink>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Chưa có công trình nào"
          description="Bắt đầu bằng đánh giá sơ bộ mái nhà, rồi chọn giờ để kỹ thuật viên đến khảo sát."
          action={
            <ButtonLink to={ROUTES.customer.assessment} size="sm" variant="soft" icon="roofing">
              Đánh giá sơ bộ
            </ButtonLink>
          }
        />
      )}
    </section>
  )
}

// Lịch khảo sát còn hiệu lực, gần nhất trước
export function UpcomingAppointments({ requests }: { requests: CustomerSurveyRequestView[] }) {
  const upcoming = requests
    .filter((r) => isUpcomingAppointment(r))
    .sort((a, b) => a.appointment!.startsAt.localeCompare(b.appointment!.startsAt))
  return (
    <section>
      <PanelTitle title="Lịch hẹn sắp tới" to={ROUTES.customer.requests} linkLabel="Tất cả" />
      {upcoming.length === 0 ? (
        <p className="text-body text-fg-2">
          Chưa có lịch hẹn nào sắp tới.{' '}
          <Link to={ROUTES.customer.requests} className="ui-link">
            Đặt giờ khảo sát
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.slice(0, 4).map((r) => {
            const appt = r.appointment!
            return (
              <li key={r.surveyRequestId} className="py-3 first:pt-0 last:pb-0">
                <Link to={withId(ROUTES.customer.request, r.surveyRequestId)} className="ui-link font-medium">
                  {r.propertyName}
                </Link>
                <p className="tnum text-body">{formatMoment(appt.startsAt)}</p>
                <p className="text-meta text-fg-2">
                  <Badge tone={APPOINTMENT_TONES.customer[appt.status] ?? 'neutral'}>
                    {APPOINTMENT_LABELS[appt.status] ?? appt.status}
                  </Badge>
                  {appt.assignedTechnicianName && `, ${appt.assignedTechnicianName}`}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// Gói đang hiệu lực và yêu cầu bảo hành, sửa chữa còn mở. Chỉ in điều backend trả về
export function ServicesSummary({
  subscriptions,
  serviceRequests,
}: {
  subscriptions: SubscriptionView[]
  serviceRequests: ServiceRequestSummary[]
}) {
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE' || s.status === 'PAID')
  const openRequests = serviceRequests.filter(isOpenService)
  return (
    <section>
      <PanelTitle title="Gói dịch vụ, bảo hành" to={ROUTES.customer.packages} linkLabel="Gói dịch vụ" />
      {activeSubs.length === 0 ? (
        <p className="text-body text-fg-2">Chưa có gói nào đang hiệu lực.</p>
      ) : (
        <ul className="space-y-1">
          {activeSubs.map((s) => (
            <li key={s.subscriptionId} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-body">{s.packageName}</span>
              <Badge tone={subscriptionStatusMeta(s.status).tone}>{subscriptionStatusMeta(s.status).label}</Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium">Yêu cầu đang mở</h3>
          <Link to={ROUTES.customer.afterSales} className="ui-link text-meta">
            Bảo hành, sửa chữa
          </Link>
        </div>
        {openRequests.length === 0 ? (
          <p className="mt-1 text-body text-fg-2">Không có yêu cầu nào đang mở.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {openRequests.slice(0, 3).map((r) => (
              <li key={r.requestId} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <Link to={withId(ROUTES.customer.afterSalesRequest, r.requestId)} className="ui-link">
                  {SERVICE_REQUEST_KINDS[r.kind] ?? r.kind} <span className="tnum">{r.requestNumber}</span>
                </Link>
                <Badge tone={requestStatusMeta(r.status, 'customer').tone}>
                  {requestStatusMeta(r.status, 'customer').label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
