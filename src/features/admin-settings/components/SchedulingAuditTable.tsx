import { useMemo, useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { useSchedulingHistoryQuery } from '@/hooks/useAdminSystemSettings'

const SETTING_GROUPS = [
  {
    group: 'Lịch hẹn & Khảo sát',
    items: [
      { key: 'scheduling.acceptanceWindowMinutes', label: 'Thời gian chờ KTV nhận lịch' },
      { key: 'scheduling.acceptanceMinimumLeadMinutes', label: 'Khoảng đệm tối thiểu nhận lịch' },
      { key: 'scheduling.acceptanceReminderLeadMinutes', label: 'Thời điểm nhắc KTV' },
      { key: 'scheduling.customerChangeLeadMinutes', label: 'Hạn chót khách đổi/hủy lịch' },
      { key: 'scheduling.minimumBookingLeadMinutes', label: 'Đệm tối thiểu đặt lịch' },
      { key: 'scheduling.bookingHorizonDays', label: 'Khung thời gian mở lịch tối đa' },
      { key: 'scheduling.bufferBetweenAppointmentsMinutes', label: 'Khoảng nghỉ giữa 2 lịch' },
      { key: 'onsiteSurvey.earlyStartMinutes', label: 'Bắt đầu khảo sát sớm' },
      { key: 'installation.maxAssignmentDays', label: 'Thời lượng dự án lắp đặt' },
    ],
  },
  {
    group: 'Điều phối yêu cầu',
    items: [
      { key: 'dispatch.reviewSlaMinutes', label: 'SLA duyệt yêu cầu điều phối' },
      { key: 'dispatch.escalationDelayMinutes', label: 'Độ trễ leo thang lên Admin' },
      { key: 'dispatch.reminderIntervalMinutes', label: 'Tần suất nhắc nhở nhân viên' },
      { key: 'dispatch.proposalResponseWindowMinutes', label: 'Hạn khách phản hồi đề xuất' },
    ],
  },
  {
    group: 'Dịch vụ Sau bán',
    items: [
      { key: 'afterSales.inspectionDurationMinutes', label: 'Thời lượng kiểm tra sự cố' },
      { key: 'afterSales.maintenanceBookingLeadDays', label: 'Đặt lịch bảo trì trước' },
      { key: 'afterSales.maintenanceNoticeLeadDays', label: 'Thông báo trước kỳ bảo dưỡng' },
      { key: 'afterSales.customerResponseHours', label: 'Hạn phản hồi tạo việc Sales' },
      { key: 'afterSales.followUpMaxDays', label: 'Thời hạn chăm sóc tối đa' },
      { key: 'afterSales.delayedMaintenanceExtensionDays', label: 'Gia hạn bảo trì do hoãn' },
      { key: 'afterSales.appointmentChangeLeadHours', label: 'Hạn chót đổi/hủy lịch bảo trì' },
      { key: 'afterSales.disasterWaitingDays', label: 'Thời gian chờ gói thiên tai' },
      { key: 'afterSales.quotationValidityDays', label: 'Hiệu lực báo giá sau bán' },
      { key: 'afterSales.checkoutExpiryMinutes', label: 'Thời hạn thanh toán PayOS' },
    ],
  },
]

const KEY_LABEL_MAP = new Map(SETTING_GROUPS.flatMap((g) => g.items).map((i) => [i.key, i.label]))

export function SchedulingAuditTable() {
  const [page, setPage] = useState(1)
  const [selectedKey, setSelectedKey] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const pageSize = 15

  const { data, isLoading } = useSchedulingHistoryQuery(page, pageSize, selectedKey)
  const totalItems = data?.totalItems ?? data?.total ?? data?.items?.length ?? 0
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize))

  const rawItems = data?.items
  const sortedItems = useMemo(() => {
    if (!rawItems) return []
    return [...rawItems].sort((a, b) => {
      const timeA = new Date(a.changedAt).getTime()
      const timeB = new Date(b.changedAt).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })
  }, [rawItems, sortOrder])

  const toggleSort = () => setSortOrder((p) => (p === 'desc' ? 'asc' : 'desc'))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="audit-key-filter" className="text-meta font-medium text-fg-2">
            Lọc theo cài đặt:
          </label>
          <select
            id="audit-key-filter"
            value={selectedKey}
            onChange={(e) => {
              setSelectedKey(e.target.value)
              setPage(1)
            }}
            className="w-80 rounded-control border border-line bg-surface-1 px-3 py-1.5 text-body text-fg-1 outline-none focus:border-accent"
          >
            <option value="">
              -- Tất cả cài đặt ({SETTING_GROUPS.reduce((acc, g) => acc + g.items.length, 0)}) --
            </option>
            {SETTING_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((i) => (
                  <option key={i.key} value={i.key}>
                    {i.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedKey && (
            <Button variant="ghost" onClick={() => setSelectedKey('')}>
              Xem tất cả
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSort}
            className="flex items-center gap-1.5 rounded-control border border-line bg-surface-1 px-3 py-1.5 text-meta font-medium text-fg-1 transition-colors hover:border-accent"
          >
            <span>Sắp xếp thời gian:</span>
            <span className="font-semibold text-accent">
              {sortOrder === 'desc' ? 'Mới nhất trước ↓' : 'Cũ nhất trước ↑'}
            </span>
          </button>
          <span className="text-meta text-fg-3">Tổng cộng: {totalItems} lượt thay đổi</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-control border border-line bg-surface-1">
        <table className="w-full text-left text-body">
          <thead className="border-b border-line bg-canvas text-meta font-medium text-fg-3">
            <tr>
              <th className="px-4 py-3">
                <button
                  type="button"
                  onClick={toggleSort}
                  className="inline-flex items-center gap-1 font-semibold text-fg-1 hover:text-accent"
                >
                  <span>Thời gian</span>
                  <span className="text-accent">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                </button>
              </th>
              <th className="px-4 py-3">Cài đặt được thay đổi</th>
              <th className="px-4 py-3">Giá trị (Cũ → Mới)</th>
              <th className="px-4 py-3">Đơn vị</th>
              <th className="px-4 py-3">Lý do điều chỉnh (Reason)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-meta">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-fg-3">
                  Đang tải dữ liệu nhật ký…
                </td>
              </tr>
            ) : !sortedItems.length ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-fg-3">
                  {selectedKey ? 'Chưa có lịch sử thay đổi nào cho cài đặt này.' : 'Chưa có nhật ký điều chỉnh nào.'}
                </td>
              </tr>
            ) : (
              sortedItems.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/50">
                  <td className="whitespace-nowrap px-4 py-3 text-fg-2">
                    {new Date(r.changedAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-fg-1">{KEY_LABEL_MAP.get(r.key) || r.key}</div>
                    <div className="font-mono text-xs text-fg-3">{r.key}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-err line-through">{r.oldValue}</span>
                    <span className="mx-2 text-fg-3">→</span>
                    <span className="font-semibold text-ok">{r.newValue}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{r.unit}</Badge>
                  </td>
                  <td className="max-w-md px-4 py-3 text-fg-1">
                    {r.reason ? (
                      <span className="font-medium text-fg-1">{r.reason}</span>
                    ) : (
                      <span className="italic text-fg-3">Không có lý do</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-meta text-fg-3">
        <span>
          Trang {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
            Trang trước
          </Button>
          <Button variant="secondary" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
            Trang sau
          </Button>
        </div>
      </div>
    </div>
  )
}
