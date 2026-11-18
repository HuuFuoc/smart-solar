import { Icon } from '@/components/common/stitch-ui/Icon'
import { Count } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Field, Select } from '@/components/common/ui/field'
import { isApiError } from '@/services/api/errors'
import { formatArea, formatRelative } from '@/features/pre-surveys/preSurveyDisplay'
import { useMyDraftsQuery, useMySitesQuery } from '@/hooks/usePreSurveys'
import type { CustomerPreSurveyListItem, CustomerSiteListItem } from '@/types/res/customersRes'

// Địa điểm và bản nháp lưu trên tài khoản của khách (đọc được ở mọi máy). Tải lỗi thì nói rõ, không coi là chưa có gì

/** Lỗi 4xx (kể cả hệ thống chưa có chức năng này: 404 / 405) gọi lại vẫn vậy nên không có nút thử lại */
const retryable = (error: unknown) => !(isApiError(error) && error.status >= 400 && error.status < 500)

function LoadFailed({ text, error, onRetry }: { text: string; error: unknown; onRetry: () => void }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-fg-2" role="status">
      {text}
      {retryable(error) && (
        <Button size="sm" variant="secondary" icon="refresh" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </p>
  )
}

/**
 * Chọn lại địa điểm đã khai, ví dụ đánh giá lại công trình có yêu cầu đã đóng. `null` là "Nhập địa điểm mới".
 * Chưa có địa điểm nào thì ẩn
 */
export function SavedSitePicker({
  currentSiteId,
  onPick,
}: {
  currentSiteId: string | undefined
  onPick: (site: CustomerSiteListItem | null) => void
}) {
  const sites = useMySitesQuery()
  // Địa điểm cũ thiếu mã phường, xã không xếp được lịch nên không đưa vào để chọn lại
  const items = (sites.data?.items ?? []).filter((s) => s.communeCode)
  if (sites.data === undefined && sites.isError)
    return (
      <LoadFailed
        text="Chưa tải được địa điểm đã lưu. Nhập địa điểm bên dưới."
        error={sites.error}
        onRetry={() => void sites.refetch()}
      />
    )
  if (items.length === 0) return null
  const current = items.some((s) => s.siteId === currentSiteId) ? currentSiteId : ''
  return (
    <Field label="Địa điểm đã lưu" htmlFor="saved-site">
      <Select
        id="saved-site"
        value={current}
        onChange={(e) => onPick(items.find((s) => s.siteId === e.target.value) ?? null)}
      >
        <option value="">Nhập địa điểm mới</option>
        {items.map((s) => (
          <option key={s.siteId} value={s.siteId}>
            {[s.name, s.communeName ?? s.ward].filter(Boolean).join(', ')}
          </option>
        ))}
      </Select>
    </Field>
  )
}

/** Bản nháp chưa gửi, trừ bản đang mở: một dòng gập sẵn để form của bước vẫn đứng đầu trang. Không có thì ẩn */
export function SavedDrafts({
  currentId,
  onOpen,
}: {
  currentId: string | undefined
  onOpen: (draft: CustomerPreSurveyListItem, site: CustomerSiteListItem | undefined) => void
}) {
  const drafts = useMyDraftsQuery()
  const sites = useMySitesQuery()
  const items = (drafts.data?.items ?? []).filter((d) => d.preSurveyId !== currentId)
  if (drafts.data === undefined && drafts.isError)
    return (
      <LoadFailed
        text="Chưa tải được bản nháp đã lưu trên tài khoản."
        error={drafts.error}
        onRetry={() => void drafts.refetch()}
      />
    )
  if (items.length === 0) return null
  return (
    <details className="group rounded-container border border-line bg-panel">
      <summary className="tap flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-body font-medium text-fg [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          Tiếp tục bản nháp đã lưu <Count value={items.length} />
        </span>
        <Icon
          name="expand_more"
          className="text-[20px] text-fg-2 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="divide-y divide-line border-t border-line px-4">
        {items.map((d) => {
          const site = sites.data?.items.find((s) => s.siteId === d.propertySiteId)
          const facts = [
            `Sửa ${formatRelative(d.updatedAt)}`,
            d.usableAreaM2 != null ? `dùng được ${formatArea(d.usableAreaM2)}` : null,
            d.selectedSimulationId ? 'đã chọn mô phỏng' : null,
          ]
          return (
            <li key={d.preSurveyId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-fg">{d.siteName || 'Công trình chưa đặt tên'}</p>
                <p className="text-meta text-fg-2">{facts.filter(Boolean).join(', ')}</p>
              </div>
              <Button
                icon="edit_note"
                size="sm"
                variant="soft"
                disabled={sites.isPending}
                onClick={() => onOpen(d, site)}
              >
                Mở bản nháp
              </Button>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
