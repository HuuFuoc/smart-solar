import { useMemo, useState } from 'react'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { useHcmCommunesQuery } from '@/hooks/useCommunes'
import type { MySurveyRequestItem } from '@/types/res/surveyRequestsRes'

type SalesRegionalDistributionCardProps = {
  surveys: MySurveyRequestItem[]
}

type SortMode = 'count_desc' | 'name_asc'
type FilterMode = 'all' | 'has_data' | 'zero_data'

/** Danh mục 168 phường/xã/đặc khu TP.HCM theo QĐ 19/2025/QĐ-TTg (áp dụng từ 01/07/2025) */
const HCM_COMMUNES_FALLBACK: string[] = [
  'Đặc khu Côn Đảo',
  'Phường An Đông',
  'Phường An Hội Đông',
  'Phường An Hội Tây',
  'Phường An Khánh',
  'Phường An Lạc',
  'Phường An Nhơn',
  'Phường An Phú',
  'Phường An Phú Đông',
  'Phường Bà Rịa',
  'Phường Bàn Cờ',
  'Phường Bảy Hiền',
  'Phường Bến Cát',
  'Phường Bến Thành',
  'Phường Bình Cơ',
  'Phường Bình Đông',
  'Phường Bình Dương',
  'Phường Bình Hòa',
  'Phường Bình Hưng Hòa',
  'Phường Bình Lợi Trung',
  'Phường Bình Phú',
  'Phường Bình Quới',
  'Phường Bình Tân',
  'Phường Bình Tây',
  'Phường Bình Thạnh',
  'Phường Bình Thới',
  'Phường Bình Tiên',
  'Phường Bình Trị Đông',
  'Phường Bình Trưng',
  'Phường Cát Lái',
  'Phường Cầu Kiệu',
  'Phường Cầu Ông Lãnh',
  'Phường Chánh Hiệp',
  'Phường Chánh Hưng',
  'Phường Chánh Phú Hòa',
  'Phường Chợ Lớn',
  'Phường Chợ Quán',
  'Phường Dĩ An',
  'Phường Diên Hồng',
  'Phường Đông Hòa',
  'Phường Đông Hưng Thuận',
  'Phường Đức Nhuận',
  'Phường Gia Định',
  'Phường Gò Vấp',
  'Phường Hạnh Thông',
  'Phường Hiệp Bình',
  'Phường Hòa Bình',
  'Phường Hòa Hưng',
  'Phường Hòa Lợi',
  'Phường Khánh Hội',
  'Phường Lái Thiêu',
  'Phường Linh Xuân',
  'Phường Long Bình',
  'Phường Long Hương',
  'Phường Long Nguyên',
  'Phường Long Phước',
  'Phường Long Trường',
  'Phường Minh Phụng',
  'Phường Nhiêu Lộc',
  'Phường Phú An',
  'Phường Phú Định',
  'Phường Phú Lâm',
  'Phường Phú Lợi',
  'Phường Phú Mỹ',
  'Phường Phú Nhuận',
  'Phường Phú Thạnh',
  'Phường Phú Thọ',
  'Phường Phú Thọ Hòa',
  'Phường Phú Thuận',
  'Phường Phước Long',
  'Phường Phước Thắng',
  'Phường Rạch Dừa',
  'Phường Sài Gòn',
  'Phường Tam Bình',
  'Phường Tam Long',
  'Phường Tam Thắng',
  'Phường Tân Bình',
  'Phường Tân Định',
  'Phường Tân Đông Hiệp',
  'Phường Tân Hải',
  'Phường Tân Hiệp',
  'Phường Tân Hòa',
  'Phường Tân Hưng',
  'Phường Tân Khánh',
  'Phường Tân Mỹ',
  'Phường Tân Phú',
  'Phường Tân Phước',
  'Phường Tân Sơn',
  'Phường Tân Sơn Hòa',
  'Phường Tân Sơn Nhất',
  'Phường Tân Sơn Nhì',
  'Phường Tân Tạo',
  'Phường Tân Thành',
  'Phường Tân Thới Hiệp',
  'Phường Tân Thuận',
  'Phường Tân Uyên',
  'Phường Tăng Nhơn Phú',
  'Phường Tây Nam',
  'Phường Tây Thạnh',
  'Phường Thạnh Mỹ Tây',
  'Phường Thới An',
  'Phường Thới Hòa',
  'Phường Thông Tây Hội',
  'Phường Thủ Dầu Một',
  'Phường Thủ Đức',
  'Phường Thuận An',
  'Phường Thuận Giao',
  'Phường Trung Mỹ Tây',
  'Phường Vĩnh Hội',
  'Phường Vĩnh Tân',
  'Phường Vũng Tàu',
  'Phường Vườn Lài',
  'Phường Xóm Chiếu',
  'Phường Xuân Hòa',
  'Xã An Long',
  'Xã An Nhơn Tây',
  'Xã An Thới Đông',
  'Xã Bà Điểm',
  'Xã Bắc Tân Uyên',
  'Xã Bàu Bàng',
  'Xã Bàu Lâm',
  'Xã Bình Chánh',
  'Xã Bình Châu',
  'Xã Bình Giã',
  'Xã Bình Hưng',
  'Xã Bình Khánh',
  'Xã Bình Lợi',
  'Xã Bình Mỹ',
  'Xã Cần Giờ',
  'Xã Châu Đức',
  'Xã Châu Pha',
  'Xã Củ Chi',
  'Xã Đất Đỏ',
  'Xã Dầu Tiếng',
  'Xã Đông Thạnh',
  'Xã Hiệp Phước',
  'Xã Hồ Tràm',
  'Xã Hòa Hiệp',
  'Xã Hòa Hội',
  'Xã Hóc Môn',
  'Xã Hưng Long',
  'Xã Kim Long',
  'Xã Long Điền',
  'Xã Long Hải',
  'Xã Long Hòa',
  'Xã Long Sơn',
  'Xã Minh Thạnh',
  'Xã Ngãi Giao',
  'Xã Nghĩa Thành',
  'Xã Nhà Bè',
  'Xã Nhuận Đức',
  'Xã Phú Giáo',
  'Xã Phú Hòa Đông',
  'Xã Phước Hải',
  'Xã Phước Hòa',
  'Xã Phước Thành',
  'Xã Tân An Hội',
  'Xã Tân Nhựt',
  'Xã Tân Vĩnh Lộc',
  'Xã Thái Mỹ',
  'Xã Thanh An',
  'Xã Thạnh An',
  'Xã Thường Tân',
  'Xã Trừ Văn Thố',
  'Xã Vĩnh Lộc',
  'Xã Xuân Sơn',
  'Xã Xuân Thới Sơn',
  'Xã Xuyên Mộc',
]

/** Hàm chuẩn hóa bỏ dấu tiếng Việt để tìm kiếm không dấu tiện lợi */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

/** Kiểm tra xem chuỗi có phải là tên Phường / Xã / Thị trấn / Đặc khu hợp lệ hay không */
function isValidWardName(name: string | null | undefined): boolean {
  if (!name) return false
  const trimmed = name.trim()
  if (trimmed.length < 4) return false

  const lower = trimmed.toLowerCase()
  if (
    lower === 'string' ||
    lower === 'dssd' ||
    lower === 'âs' ||
    lower === 'as' ||
    lower === 'asas' ||
    lower.startsWith('xã 1') ||
    lower.startsWith('huyện 1')
  ) {
    return false
  }

  const validPrefixes = ['phường ', 'xã ', 'thị trấn ', 'đặc khu ']
  return validPrefixes.some((prefix) => lower.startsWith(prefix))
}

export function SalesRegionalDistributionCard({ surveys }: SalesRegionalDistributionCardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('count_desc')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  // Lấy toàn bộ 168 phường/xã của TP.HCM từ API backend
  const { data: remoteCommunes } = useHcmCommunesQuery()

  // Tổng hợp dữ liệu: Bao gồm TẤT CẢ các phường/xã trong hệ thống (cả có và chưa có hồ sơ)
  const { allWards, totalSurveysWithWard, hasDataCount, zeroDataCount } = useMemo(() => {
    // 1. Khởi tạo danh sách phường/xã chuẩn
    const baseNames: string[] =
      remoteCommunes && remoteCommunes.length > 0 ? remoteCommunes.map((c) => c.name) : HCM_COMMUNES_FALLBACK

    // Map lưu { originalName, count }
    const wardMap = new Map<string, { originalName: string; count: number }>()

    for (const name of baseNames) {
      wardMap.set(name.toLowerCase().trim(), {
        originalName: name,
        count: 0,
      })
    }

    // 2. Tính số lượng hồ sơ từ khảo sát
    let totalValid = 0
    for (const s of surveys) {
      const wardCandidate = s.ward?.trim()
      if (isValidWardName(wardCandidate)) {
        const key = wardCandidate!.toLowerCase()
        const existing = wardMap.get(key)
        if (existing) {
          existing.count += 1
        } else {
          // Trường hợp phường/xã hợp lệ nhưng không nằm trong danh mục mặc định
          wardMap.set(key, {
            originalName: wardCandidate!,
            count: 1,
          })
        }
        totalValid += 1
      }
    }

    const safeTotal = totalValid > 0 ? totalValid : 1

    let activeCount = 0
    let emptyCount = 0

    const list = Array.from(wardMap.values()).map(({ originalName, count }) => {
      if (count > 0) activeCount++
      else emptyCount++

      let pct = 0
      if (count > 0) {
        pct = Math.round((count / safeTotal) * 100)
        if (pct === 0) pct = 1 // Giữ tối thiểu 1% cho trực quan
      }

      return {
        location: originalName,
        count,
        pct,
      }
    })

    return {
      allWards: list,
      totalSurveysWithWard: totalValid,
      hasDataCount: activeCount,
      zeroDataCount: emptyCount,
    }
  }, [remoteCommunes, surveys])

  // Lọc theo Tìm kiếm & Tab lọc (Tất cả / Có hồ sơ / Chưa có) & Sắp xếp
  const filteredAndSortedWards = useMemo(() => {
    let result = allWards

    // Lọc theo trạng thái hồ sơ
    if (filterMode === 'has_data') {
      result = result.filter((item) => item.count > 0)
    } else if (filterMode === 'zero_data') {
      result = result.filter((item) => item.count === 0)
    }

    // Lọc theo từ khóa tìm kiếm (không dấu)
    if (searchTerm.trim()) {
      const normalizedQuery = removeVietnameseTones(searchTerm)
      result = result.filter((item) => removeVietnameseTones(item.location).includes(normalizedQuery))
    }

    // Sắp xếp
    return [...result].sort((a, b) => {
      if (sortMode === 'count_desc') {
        // Nhiều nhất lên trước, nếu bằng nhau thì xếp A-Z
        if (b.count !== a.count) {
          return b.count - a.count
        }
        return a.location.localeCompare(b.location, 'vi')
      }
      // Tên A-Z
      return a.location.localeCompare(b.location, 'vi')
    })
  }, [allWards, filterMode, searchTerm, sortMode])

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-surface-container-highest pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Icon name="location_city" className="text-[22px]" />
            </div>
            <div>
              <h3 className="text-label-lg font-bold text-on-surface">Phân bổ khách hàng theo Phường / Xã</h3>
              <p className="text-body-xs text-on-surface-variant">Toàn bộ phường/xã TP.HCM • Tra cứu không cần dấu</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-secondary/10 px-3 py-1 text-label-xs font-semibold text-secondary">
            {allWards.length} phường/xã ({hasDataCount} có hồ sơ)
          </span>
        </div>
      </div>

      {/* Filter Tabs: Tất cả / Có hồ sơ / Chưa có hồ sơ */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-label-xs">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
            filterMode === 'all'
              ? 'bg-secondary text-on-secondary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          Tất cả ({allWards.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('has_data')}
          className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
            filterMode === 'has_data'
              ? 'bg-secondary text-on-secondary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          Có hồ sơ ({hasDataCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('zero_data')}
          className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
            filterMode === 'zero_data'
              ? 'bg-secondary text-on-secondary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          Chưa có hồ sơ ({zeroDataCount})
        </button>
      </div>

      {/* Toolbar: Search input & Sort toggle */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên phường, xã (không dấu)..."
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

        {/* Nút đổi sắp xếp */}
        <button
          type="button"
          onClick={() => setSortMode((prev) => (prev === 'count_desc' ? 'name_asc' : 'count_desc'))}
          className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-surface-container-highest bg-surface-container-low px-3 text-label-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
          title={sortMode === 'count_desc' ? 'Đang xếp: Số lượng nhiều nhất' : 'Đang xếp: Tên A-Z'}
        >
          <Icon name={sortMode === 'count_desc' ? 'sort' : 'sort_by_alpha'} className="text-[18px] text-primary" />
          <span>{sortMode === 'count_desc' ? 'Nhiều nhất' : 'Tên A-Z'}</span>
        </button>
      </div>

      {/* Danh sách cuộn tất cả các phường / xã */}
      <div
        className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1.5 [scrollbar-width:thin] [scrollbar-color:var(--color-surface-container-highest)_transparent]"
        tabIndex={0}
        aria-label="Danh sách phường xã TP.HCM"
      >
        {filteredAndSortedWards.length === 0 ? (
          <div className="py-8 text-center text-body-sm text-on-surface-variant">
            {searchTerm ? (
              <p>Không tìm thấy phường, xã nào khớp với "{searchTerm}".</p>
            ) : (
              <p>Chưa có dữ liệu phường, xã phù hợp.</p>
            )}
          </div>
        ) : (
          filteredAndSortedWards.map((item) => {
            const hasContracts = item.count > 0
            return (
              <div
                key={item.location}
                className={`rounded-lg p-2 transition-colors ${
                  hasContracts
                    ? 'bg-surface-container-lowest hover:bg-surface-container-low'
                    : 'opacity-70 hover:opacity-100 hover:bg-surface-container-lowest'
                }`}
              >
                <div className="flex items-center justify-between text-body-sm">
                  <span
                    className={`flex items-center gap-1.5 ${
                      hasContracts ? 'font-medium text-on-surface' : 'text-on-surface-variant font-normal'
                    }`}
                  >
                    <Icon
                      name="location_on"
                      className={`text-[16px] ${hasContracts ? 'text-secondary' : 'text-on-surface-variant/40'}`}
                    />
                    {item.location}
                  </span>
                  <span
                    className={`text-label-sm ${
                      hasContracts ? 'font-bold text-on-surface' : 'text-body-xs text-on-surface-variant/60 font-normal'
                    }`}
                  >
                    {item.count} hồ sơ {hasContracts ? `(${item.pct}%)` : ''}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      hasContracts ? 'bg-secondary' : 'bg-transparent'
                    }`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer nhỏ báo số lượng */}
      <div className="flex items-center justify-between border-t border-surface-container-highest pt-2.5 text-body-xs text-on-surface-variant">
        <span>
          Đang hiển thị <strong className="text-on-surface">{filteredAndSortedWards.length}</strong> / {allWards.length}{' '}
          địa bàn
        </span>
        {totalSurveysWithWard > 0 && (
          <span>
            Tổng: <strong className="text-on-surface">{totalSurveysWithWard}</strong> hồ sơ hợp lệ
          </span>
        )}
      </div>
    </Card>
  )
}
