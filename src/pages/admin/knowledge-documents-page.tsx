import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_DOCUMENT_STATUSES } from '@/common/knowledge'
import { Badge } from '@/components/common/ui/badge'
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
        actions={
          !unavailable && (
            <Button variant="primary" icon="add" onClick={() => setAdding(true)}>
              Thêm tài liệu
            </Button>
          )
        }
      />

      {!unavailable && (
        <FilterBar>
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
          <Table stack>
            <thead>
              <tr>
                <Th>Tài liệu</Th>
                <Th>Danh mục</Th>
                <Th>Trạng thái</Th>
                <Th>Cập nhật</Th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((d) => {
                const status = documentStatusMeta(d.status)
                return (
                  <Tr key={d.documentId} className="relative cursor-pointer">
                    <Td label="Tài liệu">
                      <Link
                        to={withId(ROUTES.admin.knowledgeDocument, d.documentId)}
                        className="font-medium text-fg after:absolute after:inset-0 hover:text-accent-fg hover:underline"
                      >
                        {d.title}
                      </Link>
                      {d.tags.length > 0 && <p className="text-meta text-fg-3">{d.tags.join(', ')}</p>}
                    </Td>
                    <Td label="Danh mục">{categoryLabel(d.category)}</Td>
                    <Td label="Trạng thái">
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </Td>
                    <Td label="Cập nhật" className="tnum whitespace-nowrap text-fg-2">
                      {formatMoment(d.updatedAt)}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
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
