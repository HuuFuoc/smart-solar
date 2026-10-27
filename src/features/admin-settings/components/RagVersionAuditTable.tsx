import { useMemo, useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { useRagVersionsQuery } from '@/hooks/useAdminRagConfig'

export function RagVersionAuditTable() {
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const pageSize = 15

  const { data, isLoading } = useRagVersionsQuery(page, pageSize)
  const totalItems = data?.total ?? data?.items?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const rawItems = data?.items
  const sortedItems = useMemo(() => {
    if (!rawItems) return []
    return [...rawItems].sort((a, b) => {
      const timeA = new Date(a.activatedAt || a.createdAt || 0).getTime()
      const timeB = new Date(b.activatedAt || b.createdAt || 0).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })
  }, [rawItems, sortOrder])

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
        <span className="text-meta text-fg-3">Tổng cộng: {totalItems} phiên bản</span>
      </div>

      <div className="overflow-x-auto rounded-control border border-line bg-surface-1">
        <table className="w-full text-left text-body">
          <thead className="border-b border-line bg-canvas text-meta font-medium text-fg-3">
            <tr>
              <th className="px-4 py-3">Phiên bản</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Mô hình LLM</th>
              <th className="px-4 py-3">Chunk / Overlap</th>
              <th className="px-4 py-3">Top K / Min Score</th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  onClick={toggleSort}
                  className="inline-flex items-center gap-1 font-semibold text-fg-1 hover:text-accent"
                >
                  <span>Thời điểm</span>
                  <span className="text-accent">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                </button>
              </th>
              <th className="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-meta">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-fg-3">
                  Đang tải lịch sử phiên bản…
                </td>
              </tr>
            ) : !sortedItems.length ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-fg-3">
                  Chưa có phiên bản nào.
                </td>
              </tr>
            ) : (
              sortedItems.map((v) => (
                <tr key={v.version} className="hover:bg-canvas/50">
                  <td className="px-4 py-3 font-semibold text-fg-1">v{v.version}</td>
                  <td className="px-4 py-3">
                    <Badge tone={v.status === 'ACTIVE' ? 'ok' : v.status === 'DRAFT' ? 'warn' : 'neutral'}>
                      {v.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-fg-1">{v.generationModel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-2">
                    {v.chunkCharacters} / {v.chunkOverlap} ký tự
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-2">
                    K={v.topK} | Score ≥ {v.minScore}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-2">
                    {v.activatedAt
                      ? new Date(v.activatedAt).toLocaleString('vi-VN')
                      : v.createdAt
                        ? new Date(v.createdAt).toLocaleString('vi-VN')
                        : '—'}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-fg-3">{v.notes || '—'}</td>
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
