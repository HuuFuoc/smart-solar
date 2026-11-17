import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PagedList } from '@/components/common/ui/pagination'
import { EmptyState } from '@/components/common/ui/states'
import { isCompletedStatus } from '@/features/pre-surveys/preSurveyDisplay'
import { Property, When } from '@/features/pre-surveys/SurveyRequestLists'
import { quotationWork, type QuotationWork } from '@/features/quotations/quotationRules'
import { compareSchedule } from '@/features/scheduling/scheduleOrder'
import { useQuotationsForRequestsQuery } from '@/hooks/useSalesQuotations'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { MySurveyRequestItem } from '@/types/res/surveyRequestsRes'

// Tab "Báo giá" của kinh doanh: yêu cầu của mình đã khảo sát xong mà báo giá còn việc phải làm (chưa lập, bản nháp, khách
// yêu cầu sửa, biên bản khảo sát đổi, báo giá hết hạn). Việc làm ở khối Báo giá của trang yêu cầu nên mỗi dòng dẫn sang đó

const COLUMNS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,2fr)_9rem]'

type Item = {
  row: MySurveyRequestItem
  /** null khi không tải được báo giá của yêu cầu này */
  work: QuotationWork | null
  error: unknown
}

const isSurveyDone = (r: MySurveyRequestItem) => isCompletedStatus(r.status) || r.appointment?.status === 'COMPLETED'
const surveyedAt = (r: MySurveyRequestItem) => r.appointment?.endsAt ?? r.appointment?.startsAt ?? r.scheduledAt

// Lỗi lên đầu để không bị bỏ sót, rồi việc gấp trước; cùng mức thì khảo sát xong gần nhất trước
function byUrgency(a: Item, b: Item) {
  const rank = (i: Item) => (i.work ? i.work.rank : -1)
  return rank(a) - rank(b) || compareSchedule(surveyedAt(a.row), surveyedAt(b.row))
}

export function QuotationNeededList({ rows }: { rows: MySurveyRequestItem[] }) {
  const done = rows.filter(isSurveyDone)
  const results = useQuotationsForRequestsQuery(done.map((r) => r.surveyRequestId))
  const checking = results.filter((r) => r.isPending).length

  // Dòng đang tải chưa xếp được vào đâu nên chưa hiện; dòng lỗi vẫn hiện để không bị coi là "không cần báo giá"
  const items: Item[] = []
  done.forEach((row, i) => {
    const result = results[i]
    if (!result || result.isPending) return
    if (result.data === undefined) return void items.push({ row, work: null, error: result.error })
    const work = quotationWork(result.data)
    if (work) items.push({ row, work, error: null })
  })
  items.sort(byUrgency)

  if (done.length === 0) return <EmptyState title="Chưa có yêu cầu nào khảo sát xong" />
  if (items.length === 0 && checking === 0) return <EmptyState title="Không có yêu cầu nào cần báo giá" />

  return (
    <div className="space-y-4">
      {checking > 0 && <p className="text-meta text-fg-2">{`Đang kiểm tra báo giá của ${checking} yêu cầu…`}</p>}
      {items.length > 0 && (
        <PagedList items={items} noun="yêu cầu" keepScroll>
          {(pageItems) => (
            <>
              <ListHead
                columns={COLUMNS}
                labels={['Tên công trình & địa chỉ', 'Khách hàng', 'Khảo sát xong', 'Báo giá', 'Thao tác']}
              />
              <ul className="divide-y divide-line">
                {pageItems.map(({ row, work, error }) => {
                  const at = surveyedAt(row)
                  return (
                    <ListRow key={row.surveyRequestId}>
                      <ListCells columns={COLUMNS}>
                        <Property name={row.propertyName} row={row} />
                        <ListCell label="Khách hàng">{row.customerName || '—'}</ListCell>
                        <ListCell label="Khảo sát xong">{at ? <When iso={at} /> : '—'}</ListCell>
                        <ListCell label="Báo giá" wide>
                          {work ? (
                            <>
                              <Badge tone={work.tone}>{work.label}</Badge>
                              {work.hints.map((hint) => (
                                <p key={hint} className="mt-0.5 text-meta text-fg-2">
                                  {hint}
                                </p>
                              ))}
                            </>
                          ) : (
                            <>
                              <Badge tone="danger">Không tải được báo giá</Badge>
                              <p className="mt-0.5 text-meta text-fg-2">{errorMessage(error)}</p>
                            </>
                          )}
                        </ListCell>
                        <ListCell wide className="lg:justify-self-end">
                          <ButtonLink
                            icon="visibility"
                            to={withId(ROUTES.ops.survey, row.surveyRequestId)}
                            size="sm"
                            variant="info"
                          >
                            Mở yêu cầu
                          </ButtonLink>
                        </ListCell>
                      </ListCells>
                    </ListRow>
                  )
                })}
              </ul>
            </>
          )}
        </PagedList>
      )}
    </div>
  )
}
