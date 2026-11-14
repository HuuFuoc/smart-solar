import {
  amendmentEntries,
  amendmentFiles,
  amendmentsNewestFirst,
  type ObstacleSnapshot,
} from '@/features/onsite-survey/onSiteSurveyAmendment'
import {
  amendmentFieldLabel,
  amendmentValueText,
  obstacleKindLabel,
} from '@/features/onsite-survey/onSiteSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { OnSiteSurveyView } from '@/types/res/technicianOnSiteSurveyRes'

// Lịch sử bổ sung của biên bản, chỉ đọc. Biên bản gốc không bị ghi đè: mỗi lần bổ sung, backend ghi lý do và giá trị cũ /
// mới của từng ô đã đổi; phần trên trang là bản mới nhất

const obstaclesText = (list: ObstacleSnapshot[]) =>
  list.length === 0 ? 'không có' : list.map((o) => obstacleKindLabel(o.kind)).join(', ')

export function OnSiteSurveyAmendments({ survey }: { survey: OnSiteSurveyView }) {
  if (survey.amendments.length === 0) return null
  return (
    <section aria-labelledby="onsite-amendments" className="space-y-3">
      <h3 id="onsite-amendments" className="text-body font-semibold text-fg">
        Các lần bổ sung ({survey.amendments.length})
      </h3>
      <p className="text-meta text-fg-2">
        Đang hiện phiên bản {survey.version}. Giá trị lúc hoàn thành vẫn được giữ trong lịch sử dưới đây.
      </p>
      <ol className="divide-y divide-line border-y border-line">
        {amendmentsNewestFirst(survey.amendments).map((amendment) => {
          const entries = amendmentEntries(amendment.changes)
          const files = amendmentFiles(amendment, survey.attachments)
          return (
            <li key={amendment.amendmentNumber} className="space-y-2 py-3">
              <p className="tnum text-body font-medium text-fg">
                Bổ sung lần {amendment.amendmentNumber}
                <span className="font-normal text-fg-2">, {formatMoment(amendment.createdAt)}</span>
              </p>
              <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">Lý do: {amendment.reason}</p>
              {entries.length > 0 && (
                <ul className="space-y-1 text-body">
                  {entries.map((entry) => (
                    <li key={entry.field} className="text-fg-2">
                      <span className="text-fg">{amendmentFieldLabel(entry.field)}</span>:{' '}
                      {entry.kind === 'bom' ? (
                        <span className="tnum">
                          {entry.old === entry.new
                            ? `đổi sản phẩm hoặc số lượng (${entry.new} dòng)`
                            : `${entry.old} dòng → ${entry.new} dòng`}
                        </span>
                      ) : entry.kind === 'obstacles' ? (
                        <>
                          {obstaclesText(entry.old)} → {obstaclesText(entry.new)}
                        </>
                      ) : (
                        <span className="tnum">
                          {amendmentValueText(entry.field, entry.old)} → {amendmentValueText(entry.field, entry.new)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {files.length > 0 && <p className="text-meta text-fg-2">Thêm {files.length} tệp (mục Giấy tờ).</p>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
