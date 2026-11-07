import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { SearchInput } from '@/components/common/ui/field'
import { PagedList } from '@/components/common/ui/pagination'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ROUTES, withId } from '@/routes/paths'
import type { MySurveyRequestItem } from '@/types/res/surveyRequestsRes'
import {
  formatDateTime,
  formatRelative,
  isCompletedStatus,
  isPendingStatus,
  isScheduledStatus,
  surveyStatusMeta,
} from '@/features/pre-surveys/preSurveyDisplay'

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

  const pendingCount = surveys.filter((s) => isPendingStatus(s.status)).length
  const scheduledCount = surveys.filter((s) => isScheduledStatus(s.status)).length
  const completedCount = surveys.filter((s) => isCompletedStatus(s.status)).length

  const filteredSurveys = surveys.filter((item) => {
    if (tab === 'pending' && !isPendingStatus(item.status)) return false
    if (tab === 'scheduled' && !isScheduledStatus(item.status)) return false
    if (tab === 'completed' && !isCompletedStatus(item.status)) return false

    if (searchTerm.trim()) {
      const q = removeVietnameseTones(searchTerm)
      const textToSearch = removeVietnameseTones(
        `${item.customerName || ''} ${item.propertyName || ''} ${item.ward || ''} ${item.district || ''} ${item.province || ''}`,
      )
      return textToSearch.includes(q)
    }
    return true
  })

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5">
      {/* Hàng 1: Tiêu đề khối & Nút Xem toàn bộ */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-title font-semibold text-fg">Hồ sơ của tôi</h2>
          <span className="text-meta font-mono text-fg-3">({surveys.length})</span>
        </div>
        <ButtonLink
          to={ROUTES.ops.surveysMine}
          size="sm"
          variant="ghost"
          icon="list"
          className="text-meta font-medium text-accent-fg hover:underline"
        >
          Xem toàn bộ
        </ButtonLink>
      </div>

      {/* Hàng 2: Toolbar chung 1 hàng - Tabs trạng thái bên trái & Ô tìm kiếm bên phải */}
      <div className="flex flex-col gap-3 border-b border-line pb-2 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          label="Lọc hồ sơ theo trạng thái"
          className="min-w-0 flex-1 shadow-none"
          value={tab}
          onChange={setTab}
          chips={[
            { value: 'all', label: 'Tất cả', count: surveys.length },
            { value: 'pending', label: 'Chờ kỹ thuật viên', count: pendingCount },
            { value: 'scheduled', label: 'Đã có lịch', count: scheduledCount },
            { value: 'completed', label: 'Khảo sát xong', count: completedCount },
          ]}
        />
        <div className="shrink-0 sm:w-56 lg:w-64">
          <label>
            <span className="sr-only">Tìm hồ sơ</span>
            <SearchInput
              name="survey-search"
              placeholder="Tìm theo tên, địa chỉ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Danh sách dạng Table chuẩn dashboard */}
      {filteredSurveys.length === 0 ? (
        <p className="py-8 text-center text-body text-fg-2">
          {searchTerm
            ? `Không tìm thấy hồ sơ nào khớp với "${searchTerm}".`
            : 'Không có hồ sơ nào trong trạng thái này.'}
        </p>
      ) : (
        <PagedList key={`${tab}|${searchTerm}`} items={filteredSurveys} noun="hồ sơ" pageSize={6} keepScroll>
          {(page) => (
            <Table className="mt-1">
              <thead>
                <tr>
                  <Th>Khách hàng & Công trình</Th>
                  <Th>Khu vực</Th>
                  <Th>Trạng thái</Th>
                  <Th>Thời gian</Th>
                  <Th className="text-right">Thao tác</Th>
                </tr>
              </thead>
              <tbody>
                {page.map((item) => {
                  const statusInfo = surveyStatusMeta(item.status)
                  const locationText =
                    [item.ward, item.district, item.province].filter(Boolean).join(', ') || 'Chưa cập nhật vị trí'
                  const isCompleted = isCompletedStatus(item.status)

                  return (
                    <Tr key={item.surveyRequestId} className="transition-colors">
                      <Td className="py-2.5">
                        <div className="font-semibold text-fg">{item.customerName || 'Khách hàng'}</div>
                        <div className="text-meta text-fg-2">{item.propertyName || 'Công trình'}</div>
                      </Td>
                      <Td className="py-2.5">
                        <div className="text-meta text-fg-2">{locationText}</div>
                      </Td>
                      <Td className="py-2.5">
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </Td>
                      <Td className="py-2.5">
                        <div className="whitespace-nowrap text-meta text-fg-3">
                          Tiếp nhận {formatRelative(item.assignedAt)}
                        </div>
                        {item.scheduledAt && (
                          <div className="whitespace-nowrap text-meta text-fg">
                            Hẹn: {formatDateTime(item.scheduledAt)}
                          </div>
                        )}
                      </Td>
                      <Td className="py-2.5 text-right whitespace-nowrap">
                        <ButtonLink
                          to={withId(ROUTES.ops.survey, item.surveyRequestId)}
                          size="sm"
                          // Nút trên dòng không đặc: lập báo giá và mở chi tiết đều là info
                          variant="info"
                          icon={isCompleted ? 'request_quote' : 'visibility'}
                        >
                          {isCompleted ? 'Lập báo giá' : 'Mở'}
                        </ButtonLink>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </PagedList>
      )}
    </div>
  )
}
