import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_DOCUMENT_STATUSES } from '@/common/knowledge'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { KnowledgeUploadDialog } from '@/features/knowledge/KnowledgeUploadDialog'
import { KNOWLEDGE_UNAVAILABLE, categoryLabel, documentStatusMeta } from '@/features/knowledge/knowledgeDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useKnowledgeDocumentsQuery } from '@/hooks/useKnowledgeDocuments'
import { ROUTES, withId } from '@/routes/paths'
import { isFeatureUnavailable, pendingMigrationsOf, rateLimitedMessage } from '@/services/api/errors'

// Kho tri thức của chatbot: tài liệu (pdf, docx, txt, md) có nhiều phiên bản, chỉ phiên bản đã công bố được dùng để trả lời.
// Bộ lọc gửi thẳng lên backend và nằm trên địa chỉ

const DOC_STATUS_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; icon: string }> = {
  PUBLISHED: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: 'verified',
  },
  REGISTERED: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    icon: 'hourglass_empty',
  },
  PROCESSING: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    icon: 'sync',
  },
  READY_FOR_REVIEW: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-500',
    icon: 'fact_check',
  },
  UNPUBLISHED: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    icon: 'visibility_off',
  },
  FAILED: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
    icon: 'error_outline',
  },
  ARCHIVED: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    icon: 'archive',
  },
}

export function AdminKnowledgeDocumentsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filter = { status: params.get('trang-thai') ?? '', category: params.get('danh-muc') ?? '' }
  const query = useKnowledgeDocumentsQuery(filter)
  const [adding, setAdding] = useState(false)
  const unavailable = query.isError && isFeatureUnavailable(query.error)
  const filtering = Boolean(filter.status || filter.category)

  const set = (key: 'trang-thai' | 'danh-muc', value: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (value) p.set(key, value)
        else p.delete(key)
        return p
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        title="Kho tri thức AI"
        description="Chatbot chỉ trả lời dựa trên phiên bản tài liệu đã nạp xong và được công bố."
        actions={
          !unavailable && (
            <Button variant="primary" icon="add" onClick={() => setAdding(true)}>
              Thêm tài liệu
            </Button>
          )
        }
      />

      {!unavailable && (
        <FilterBar className="mb-4">
          <label className="w-full sm:w-56">
            <span className="sr-only">Trạng thái</span>
            <Select
              active={filter.status !== ''}
              value={filter.status}
              onChange={(e) => set('trang-thai', e.target.value)}
            >
              <option value="">Mọi trạng thái</option>
              {Object.entries(KNOWLEDGE_DOCUMENT_STATUSES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="w-full sm:w-56">
            <span className="sr-only">Danh mục</span>
            <Select
              active={filter.category !== ''}
              value={filter.category}
              onChange={(e) => set('danh-muc', e.target.value)}
            >
              <option value="">Mọi danh mục</option>
              {Object.entries(KNOWLEDGE_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          {filtering && (
            <Button
              variant="ghost"
              bleed={false}
              icon="filter_alt_off"
              onClick={() => setParams({}, { replace: true })}
            >
              Xoá bộ lọc
            </Button>
          )}
        </FilterBar>
      )}

      {/* Thanh chú thích trạng thái tài liệu & tổng số */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-1 px-4 py-2.5 text-meta shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-fg-2">Trạng thái tri thức:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-fg-2">Đang công bố</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-fg-2">Chờ / Đang nạp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-fg-2">Nạp lỗi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
            <span className="text-fg-2">Đã gỡ / Lưu trữ</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-fg-3">
          <span>
            Tổng cộng: <strong className="text-fg-1">{query.data?.length ?? 0}</strong> tài liệu
          </span>
        </div>
      </div>

      <section aria-label="Danh sách tài liệu" aria-busy={query.isFetching}>
        {query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : unavailable ? (
          <UnavailableState
            title="Kho tri thức chưa sẵn sàng."
            message={KNOWLEDGE_UNAVAILABLE}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : query.isError ? (
          <ErrorState message={rateLimitedMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            title={filtering ? 'Không có tài liệu nào khớp bộ lọc' : 'Chưa có tài liệu nào'}
            description={filtering ? undefined : 'Bấm "Thêm tài liệu" để tải tài liệu đầu tiên lên.'}
          />
        ) : (
          <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
            <Table stack>
              <thead>
                <tr>
                  <Th className="border-r border-line">Tài liệu & Thẻ gắn</Th>
                  <Th className="border-r border-line">Danh mục tài liệu</Th>
                  <Th className="border-r border-line">Trạng thái công bố</Th>
                  <Th className="text-right">Cập nhật gần nhất</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {query.data.map((d) => {
                  const status = documentStatusMeta(d.status)
                  const style = DOC_STATUS_STYLE[d.status] ?? {
                    bg: 'bg-surface-2',
                    text: 'text-fg-2',
                    border: 'border-line',
                    dot: 'bg-fg-3',
                    icon: 'description',
                  }
                  return (
                    <Tr key={d.documentId} className="relative cursor-pointer hover:bg-surface-2/60 transition-colors">
                      <Td label="Tài liệu" className="border-r border-line">
                        <Link
                          to={withId(ROUTES.admin.knowledgeDocument, d.documentId)}
                          className="font-semibold text-fg after:absolute after:inset-0 hover:text-accent-fg hover:underline"
                        >
                          {d.title}
                        </Link>
                        {d.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {d.tags.map((t) => (
                              <span
                                key={t}
                                className="inline-block rounded bg-surface-2 px-1.5 py-0.5 text-micro font-mono text-fg-2"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </Td>
                      <Td label="Danh mục" className="border-r border-line whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                          <Icon name="folder_open" className="text-accent text-[16px]" aria-hidden />
                          {categoryLabel(d.category)}
                        </span>
                      </Td>
                      <Td label="Trạng thái" className="border-r border-line whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-meta font-medium border ${style.bg} ${style.text} ${style.border}`}
                        >
                          <Icon name={style.icon} className="text-[16px]" aria-hidden />
                          <span>{status.label}</span>
                        </span>
                      </Td>
                      <Td label="Cập nhật" className="tnum whitespace-nowrap text-fg-2 text-right">
                        {formatMoment(d.updatedAt)}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <div className="border-t border-line bg-surface-2/40 px-4 py-2.5 text-meta text-fg-3 flex items-center justify-between">
              <span>
                Hiển thị <strong>{query.data.length}</strong> tài liệu trong kho tri thức
              </span>
              <span className="tnum">SmartSolar RAG Knowledge Engine</span>
            </div>
          </div>
        )}
      </section>

      <KnowledgeUploadDialog
        open={adding}
        document={null}
        onOpenChange={setAdding}
        onRegistered={(view) => navigate(withId(ROUTES.admin.knowledgeDocument, view.documentId))}
      />
    </>
  )
}
