import { useCallback } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState } from '@/components/common/ui/states'
import { OnSiteSurveyFiles } from '@/features/onsite-survey/OnSiteSurveyFiles'
import { OnSiteSurveySummary } from '@/features/onsite-survey/OnSiteSurveySummary'
import { onSiteSurveyStatusMeta } from '@/features/onsite-survey/onSiteSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useStaffOnSiteSurveyQuery } from '@/hooks/useOnSiteSurvey'
import { getStaffOnSiteSurveyAttachmentUrl } from '@/services/onSiteSurveyService'
import { errorMessage } from '@/services/api/errors'

// Biên bản khảo sát tại công trình cho kinh doanh / quản lý, chỉ đọc. Chưa có biên bản thì không hiện gì
// (khối Tình hình đã cho biết lịch khảo sát đang ở đâu)
export function OnSiteSurveyResultPanel({ surveyRequestId, enabled }: { surveyRequestId: string; enabled: boolean }) {
  const query = useStaffOnSiteSurveyQuery(surveyRequestId, { enabled })
  const getUrl = useCallback(
    (attachmentId: string) => getStaffOnSiteSurveyAttachmentUrl(surveyRequestId, attachmentId),
    [surveyRequestId],
  )
  if (!enabled || query.isPending) return null
  if (query.isError)
    return (
      <Panel>
        <PanelHeader title="Kết quả khảo sát tại công trình" />
        <PanelBody>
          <ErrorState
            title="Không tải được kết quả khảo sát."
            message={errorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        </PanelBody>
      </Panel>
    )
  const survey = query.data
  if (!survey) return null
  const status = onSiteSurveyStatusMeta(survey.status)
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Kết quả khảo sát tại công trình <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
      />
      <PanelBody className="space-y-6">
        {survey.status === 'COMPLETED' ? (
          <>
            <OnSiteSurveySummary survey={survey} />
            <div>
              <h3 className="mb-3 text-body font-semibold text-fg">Ảnh và tài liệu</h3>
              <OnSiteSurveyFiles attachments={survey.attachments} getUrl={getUrl} emptyText="Không có tệp nào." />
            </div>
          </>
        ) : (
          <p className="tnum text-body text-fg-2">
            {survey.startedAt
              ? `Kỹ thuật viên bắt đầu khảo sát lúc ${formatMoment(survey.startedAt)}.`
              : 'Kỹ thuật viên đã mở biên bản nhưng chưa bắt đầu khảo sát.'}{' '}
            Kết quả hiện ở đây khi kỹ thuật viên hoàn thành.
          </p>
        )}
      </PanelBody>
    </Panel>
  )
}
