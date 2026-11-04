import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { SearchInput } from '@/components/common/ui/field'
import { ListRow } from '@/components/common/ui/list-row'
import { PagedList } from '@/components/common/ui/pagination'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { ROUTES, withId } from '@/routes/paths'
import type { MySurveyRequestItem } from '@/types/res/surveyRequestsRes'
import { formatDateTime, formatRelative, surveyStatusMeta } from '@/features/pre-surveys/preSurveyDisplay'

type TabFilter = 'all' | 'pending' | 'scheduled' | 'completed'

type SalesRecentSurveysCardProps = {
  surveys: MySurveyRequestItem[]
}

/** Chuẩn hóa chuỗi tìm kiếm không dấu */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export function SalesRecentSurveysCard({ surveys }: SalesRecentSurveysCardProps) {
  const [tab, setTab] = useState<TabFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSurveys = surveys.filter((item) => {
    if (tab === 'pending' && item.status !== 'PENDING') return false
    if (tab === 'scheduled' && item.status !== 'SCHEDULED') return false
    if (tab === 'completed' && item.status !== 'COMPLETED') return false

    if (searchTerm.trim()) {
      const q = removeVietnameseTones(searchTerm)
      const textToSearch = removeVietnameseTones(
        `${item.customerName || ''} ${item.propertyName || ''} ${item.ward || ''} ${item.district || ''} ${item.province || ''}`,
      )
      return textToSearch.includes(q)
    }
    return true
  })

  const count = (status: string) => surveys.filter((s) => s.status === status).length

  return (
    <Panel>
      <PanelHeader
        className="items-start"
        title="Hồ sơ của tôi"
        action={
          <ButtonLink to={ROUTES.ops.surveysMine} size="sm" variant="info" icon="list">
            Xem toàn bộ
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:gap-4">
        <FilterChips
          label="Lọc hồ sơ theo trạng thái"
          className="min-w-0 flex-1"
          value={tab}
          onChange={setTab}
          chips={[
            { value: 'all', label: 'Tất cả', count: surveys.length },
            { value: 'pending', label: 'Chờ KTV', count: count('PENDING') },
            { value: 'scheduled', label: 'Đã có lịch', count: count('SCHEDULED') },
            { value: 'completed', label: 'Khảo sát xong', count: count('COMPLETED') },
          ]}
        />
        <label className="2xl:w-60">
          <span className="sr-only">Tìm hồ sơ</span>
          <SearchInput
            name="survey-search"
            placeholder="Tìm theo tên, địa chỉ"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
      </div>

      {filteredSurveys.length === 0 ? (
        <p className="mt-3 text-body text-fg-2">Không có hồ sơ nào khớp bộ lọc.</p>
      ) : (
        <PagedList key={`${tab}|${searchTerm}`} items={filteredSurveys} noun="hồ sơ" pageSize={6} keepScroll>
          {(page) => (
            <ul className="divide-y divide-line">
              {page.map((item) => {
                const statusInfo = surveyStatusMeta(item.status)
                return (
                  <ListRow
                    key={item.surveyRequestId}
                    className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-body font-semibold text-fg">{item.customerName || 'Khách hàng'}</span>
                        <span className="text-body text-fg-2">{item.propertyName || 'Công trình'}</span>
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-meta text-fg-2">
                        {[item.ward, item.district, item.province].filter(Boolean).join(', ') || 'Chưa cập nhật vị trí'}
                        , tiếp nhận {formatRelative(item.assignedAt)}
                      </p>
                      {item.scheduledAt && (
                        <p className="text-meta text-fg">Lịch hẹn KTV: {formatDateTime(item.scheduledAt)}</p>
                      )}
                    </div>
                    <ButtonLink
                      to={withId(ROUTES.ops.survey, item.surveyRequestId)}
                      size="sm"
                      variant={item.status === 'COMPLETED' ? 'primary' : 'info'}
                      icon={item.status === 'COMPLETED' ? 'request_quote' : 'visibility'}
                    >
                      {item.status === 'COMPLETED' ? 'Lập báo giá' : 'Chi tiết'}
                    </ButtonLink>
                  </ListRow>
                )
              })}
            </ul>
          )}
        </PagedList>
      )}
    </Panel>
  )
}
