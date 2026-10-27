import { useState } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/common/stitch-ui/Card'
import { Button } from '@/components/common/stitch-ui/Button'
import { Icon } from '@/components/common/stitch-ui/Icon'
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
    if (tab === 'pending' && item.status !== 1) return false
    if (tab === 'scheduled' && item.status !== 4) return false
    if (tab === 'completed' && item.status !== 5) return false

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
    <Card className="flex flex-col gap-4 p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-surface-container-highest pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-label-lg font-bold text-on-surface">Danh sách hồ sơ theo dõi gần đây</h3>
          <p className="text-body-sm text-on-surface-variant">Chi tiết các yêu cầu khảo sát do bạn quản lý</p>
        </div>
        <Link to={ROUTES.ops.surveysMine}>
          <span className="text-label-sm font-semibold text-primary hover:underline">
            Xem toàn bộ ({surveys.length}) →
          </span>
        </Link>
      </div>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface-container p-1">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`rounded-lg px-3 py-1 text-label-sm font-semibold transition-colors ${
              tab === 'all' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Tất cả ({surveys.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`rounded-lg px-3 py-1 text-label-sm font-semibold transition-colors ${
              tab === 'pending' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Chờ KTV ({surveys.filter((s) => s.status === 1).length})
          </button>
          <button
            type="button"
            onClick={() => setTab('scheduled')}
            className={`rounded-lg px-3 py-1 text-label-sm font-semibold transition-colors ${
              tab === 'scheduled'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Đã có lịch ({surveys.filter((s) => s.status === 4).length})
          </button>
          <button
            type="button"
            onClick={() => setTab('completed')}
            className={`rounded-lg px-3 py-1 text-label-sm font-semibold transition-colors ${
              tab === 'completed'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Khảo sát xong ({surveys.filter((s) => s.status === 5).length})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, địa chỉ..."
            className="h-9 w-full rounded-xl border border-surface-container-highest bg-surface-container-low pl-9 pr-8 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              title="Xóa tìm kiếm"
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          )}
        </div>
      </div>

      {/* Danh sách có thanh cuộn mượt mà khi có nhiều hồ sơ */}
      {filteredSurveys.length === 0 ? (
        <div className="py-8 text-center text-body-md text-on-surface-variant">
          Không tìm thấy hồ sơ nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div
          className="max-h-[480px] divide-y divide-surface-container-highest overflow-y-auto rounded-xl border border-surface-container-highest bg-surface [scrollbar-width:thin] [scrollbar-color:var(--color-surface-container-highest)_transparent]"
          tabIndex={0}
          aria-label="Danh sách hồ sơ gần đây"
        >
          {filteredSurveys.map((item) => {
            const statusInfo = surveyStatusMeta(item.status)
            return (
              <div
                key={item.surveyRequestId}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-container-lowest sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-on-surface">{item.customerName || 'Khách hàng'}</span>
                    <span className="rounded-md bg-surface-container px-2 py-0.5 text-label-xs font-medium text-on-surface-variant">
                      {item.propertyName || 'Công trình'}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-label-xs font-semibold ${
                        item.status === 5
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : item.status === 4
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className="text-body-sm text-on-surface-variant">
                    {[item.ward, item.district, item.province].filter(Boolean).join(', ') || 'Chưa cập nhật vị trí'} •
                    Tiếp nhận lúc {formatRelative(item.assignedAt)}
                  </p>
                  {item.scheduledAt && (
                    <p className="text-body-xs font-medium text-primary">
                      Lịch hẹn KTV: {formatDateTime(item.scheduledAt)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link to={withId(ROUTES.ops.survey, item.surveyRequestId)}>
                    <Button size="sm" variant={item.status === 5 ? 'primary' : 'tonal'}>
                      {item.status === 5 ? 'Lập báo giá' : 'Chi tiết'}
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer nhỏ thông báo số lượng */}
      {filteredSurveys.length > 0 && (
        <div className="flex items-center justify-between pt-1 text-body-xs text-on-surface-variant">
          <span>
            Đang hiển thị <strong>{filteredSurveys.length}</strong> / {surveys.length} hồ sơ
          </span>
          {filteredSurveys.length > 5 && (
            <span className="italic text-on-surface-variant/80">(Cuộn chuột trong khung để xem tất cả)</span>
          )}
        </div>
      )}
    </Card>
  )
}
