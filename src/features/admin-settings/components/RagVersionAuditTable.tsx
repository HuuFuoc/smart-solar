import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { useRagVersionsQuery, useRollbackRagMutation } from '@/hooks/useAdminRagConfig'
import { errorMessage } from '@/services/api/errors'
import type { RagActivationView, RagConfigurationView } from '@/types/res/adminRagConfigTypes'
import { RagActivationResult } from './RagConfigurationTab'

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Đang dùng', DRAFT: 'Bản nháp', SUPERSEDED: 'Đã thay' }

export function RagVersionAuditTable() {
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const pageSize = 15

  const { data, isLoading } = useRagVersionsQuery(page, pageSize)
  const rollback = useRollbackRagMutation()
  // Khôi phục là chép phiên bản cũ thành phiên bản mới rồi áp dụng; chỉ phiên bản đã từng dùng (SUPERSEDED)
  const [restoring, setRestoring] = useState<RagConfigurationView | null>(null)
  const [restored, setRestored] = useState<RagActivationView | null>(null)

  const confirmRestore = async () => {
    if (!restoring) return
    try {
      const result = await rollback.mutateAsync(restoring.version)
      setRestored(result)
      toast.success(`Đã khôi phục v${restoring.version} thành v${result.active.version}.`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setRestoring(null)
    }
  }
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
      {restored && <RagActivationResult key={restored.active.version} activation={restored} />}
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
              <th className="px-4 py-3">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-meta">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-fg-3">
                  Đang tải lịch sử phiên bản…
                </td>
              </tr>
            ) : !sortedItems.length ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-fg-3">
                  Chưa có phiên bản nào.
                </td>
              </tr>
            ) : (
              sortedItems.map((v) => (
                <tr key={v.version} className="hover:bg-canvas/50">
                  <td className="px-4 py-3 font-semibold text-fg-1">v{v.version}</td>
                  <td className="px-4 py-3">
                    <Badge tone={v.status === 'ACTIVE' ? 'ok' : v.status === 'DRAFT' ? 'warn' : 'neutral'}>
                      {STATUS_LABELS[v.status] ?? v.status}
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {v.status === 'SUPERSEDED' && (
                      <Button
                        size="sm"
                        variant="soft"
                        icon="history"
                        disabled={rollback.isPending}
                        onClick={() => setRestoring(v)}
                      >
                        Khôi phục
                      </Button>
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

      <ModalDialog
        open={restoring !== null}
        onOpenChange={(open) => !open && setRestoring(null)}
        dismissible={!rollback.isPending}
        aria-label="Khôi phục phiên bản cấu hình"
      >
        <DialogTitle>Khôi phục cấu hình v{restoring?.version}?</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          Các tham số của v{restoring?.version} được chép thành một phiên bản mới và áp dụng ngay, thay cho cấu hình
          đang dùng. Lịch sử cũ giữ nguyên. Nếu cách cắt đoạn khác, tài liệu đã nạp không tự nạp lại.
        </p>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={rollback.isPending} onClick={() => setRestoring(null)}>
            Huỷ
          </Button>
          <Button icon="history" variant="primary" disabled={rollback.isPending} onClick={() => void confirmRestore()}>
            {rollback.isPending ? 'Đang khôi phục…' : 'Khôi phục'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </div>
  )
}
