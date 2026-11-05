import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, PageSkeleton, UnavailableState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatArea, surfaceTypeLabel } from '@/features/pre-surveys/preSurveyDisplay'
import {
  appointmentStatusMeta,
  formatAppointment,
  formatMoment,
  ineligibleLabel,
} from '@/features/scheduling/schedulingDisplay'
import {
  useAcceptAppointmentMutation,
  useMyAppointmentsQuery,
  useOpenAppointmentQuery,
} from '@/hooks/useTechnicianJobs'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { OpenAppointmentView } from '@/types/res/technicianAppointmentsRes'

// Một lịch trong khu vực đang chờ người nhận (GET /technicians/me/open-appointments/{id}). Chưa có địa chỉ cụ thể và liên
// hệ của khách cho tới khi nhận. Nút Nhận việc dùng revision của lần tải mới nhất; backend kiểm lại mọi điều kiện, người khác
// nhận trước thì 409 và lịch biến khỏi danh sách chờ (GET trả 404)

function AcceptPanel({ job, refreshing }: { job: OpenAppointmentView; refreshing: boolean }) {
  const accept = useAcceptAppointmentMutation()
  const navigate = useNavigate()

  async function onAccept() {
    try {
      await accept.mutateAsync({ id: job.appointmentId, revision: job.revision })
      toast.success('Đã nhận việc. Khách và kinh doanh sẽ thấy bạn phụ trách lịch này.')
      navigate(withId(ROUTES.tech.job, job.appointmentId), { replace: true })
    } catch (e) {
      // Trang tự tải lại lịch (onSettled): đã có người nhận thì chuyển sang trạng thái "không còn chờ nhận"
      toast.error(errorMessage(e))
    }
  }

  return (
    <Panel>
      <PanelHeader title="Nhận việc" description={`Hạn nhận ${formatMoment(job.acceptanceDeadlineAt)}`} />
      <PanelBody className="space-y-4">
        {job.canAccept ? (
          <>
            <p className="max-w-prose text-body text-fg-2">
              Nhận xong bạn thấy địa chỉ, số điện thoại của khách và phụ trách khảo sát lịch này. Ai nhận trước được.
            </p>
            {job.requiresHoldRehoming && (
              <Notice tone="info">
                Lịch này trùng với lịch bạn đang được giữ chỗ. Nhận lịch này thì lịch giữ chỗ kia được chuyển cho kỹ
                thuật viên khác.
              </Notice>
            )}
            <Button
              icon="task_alt"
              variant="primary"
              disabled={accept.isPending || refreshing}
              onClick={() => void onAccept()}
            >
              {accept.isPending ? 'Đang nhận…' : refreshing ? 'Đang tải lại…' : 'Nhận việc'}
            </Button>
          </>
        ) : (
          <p className="text-body text-fg-2">
            Bạn chưa nhận được lịch này: {ineligibleLabel(job.reason) ?? 'bận'}. Hệ thống kiểm tra lại mỗi lần tải
            trang.
          </p>
        )}
      </PanelBody>
    </Panel>
  )
}

/** 404: lịch đã có người nhận, khách đổi giờ / huỷ, quá hạn nhận, hoặc nằm ngoài khu vực của mình */
function NoLongerOpen({ id }: { id: string }) {
  const mine = useMyAppointmentsQuery()
  const own = mine.data?.find((a) => a.appointmentId === id)
  if (own)
    return (
      <EmptyState
        title="Lịch này đã là việc của bạn"
        action={
          <ButtonLink icon="visibility" variant="info" to={withId(ROUTES.tech.job, id)}>
            Xem việc
          </ButtonLink>
        }
      />
    )
  return (
    <EmptyState
      title="Lịch này không còn chờ nhận"
      description="Có thể đã có người nhận trước, khách đã đổi giờ hoặc huỷ, hoặc lịch không thuộc khu vực của bạn."
      action={
        <ButtonLink icon="list" variant="secondary" to={ROUTES.tech.jobs}>
          Về danh sách việc
        </ButtonLink>
      }
    />
  )
}

export function TechOpenJobPage() {
  const { id = '' } = useParams()
  const query = useOpenAppointmentQuery(id)
  usePageCrumb(query.data ? query.data.propertyName : 'Lịch chờ nhận')

  if (query.isPending) return <PageSkeleton />
  // 404 kể cả khi còn dữ liệu cũ trong cache: lịch vừa có người nhận thì không được hiện tiếp nút Nhận việc
  if (isApiError(query.error) && query.error.status === 404)
    return (
      <>
        <PageHeader title="Lịch chờ nhận" />
        <NoLongerOpen id={id} />
      </>
    )
  if (query.data === undefined && isFeatureUnavailable(query.error))
    return (
      <>
        <PageHeader title="Lịch chờ nhận" />
        <UnavailableState message={errorMessage(query.error)} pendingMigrations={pendingMigrationsOf(query.error)} />
      </>
    )

  return (
    <QueryBoundary query={query}>
      {(job) => {
        const status = appointmentStatusMeta(job.status, 'technician')
        return (
          <>
            <PageHeader
              meta={<Badge tone={status.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>}
              title={job.propertyName}
              description={formatAppointment(job.startsAt, job.endsAt)}
            />
            <div className="space-y-6">
              <AcceptPanel job={job} refreshing={query.isFetching} />
              <Panel>
                <PanelHeader title="Công trình" />
                <PanelBody>
                  <Facts
                    items={[
                      { k: 'Khu vực', v: job.zone?.name ?? '—' },
                      { k: 'Phường, xã', v: [job.ward ?? job.district, job.province].filter(Boolean).join(', ') },
                      { k: 'Mặt lắp', v: surfaceTypeLabel(job.installationSurfaceType) },
                      { k: 'Tổng diện tích', v: formatArea(job.totalAreaM2) },
                      { k: 'Dùng được', v: formatArea(job.usableAreaM2) },
                    ]}
                  />
                </PanelBody>
              </Panel>
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}
