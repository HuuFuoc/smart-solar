import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { KNOWLEDGE_CATEGORIES } from '@/common/knowledge'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { UnavailableState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { KnowledgeUploadDialog } from '@/features/knowledge/KnowledgeUploadDialog'
import {
  KNOWLEDGE_UNAVAILABLE,
  categoryLabel,
  documentStatusMeta,
  jobKindLabel,
  jobStatusMeta,
  versionStatusMeta,
} from '@/features/knowledge/knowledgeDisplay'
import {
  KNOWLEDGE_LIMITS,
  canPublishVersion,
  canReindexVersion,
  canRetryJob,
  canUnpublish,
  isArchived,
  needsPolling,
  parseTags,
  tagsError,
  titleError,
} from '@/features/knowledge/knowledgeRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useArchiveKnowledgeMutation,
  useKnowledgeDocumentQuery,
  usePublishKnowledgeVersionMutation,
  useReindexKnowledgeVersionMutation,
  useRetryKnowledgeJobMutation,
  useUnpublishKnowledgeMutation,
  useUpdateKnowledgeMetadataMutation,
} from '@/hooks/useKnowledgeDocuments'
import { useRetryCountdown } from '@/hooks/useRetryCountdown'
import { ROUTES } from '@/routes/paths'
import {
  errorMessage,
  isApiError,
  isFeatureUnavailable,
  pendingMigrationsOf,
  rateLimitedMessage,
} from '@/services/api/errors'
import type { KnowledgeDocumentView, KnowledgeVersionView } from '@/types/res/knowledgeDocumentsRes'

// Một tài liệu của kho tri thức: phiên bản, lượt nạp chạy nền, công bố / gỡ / lưu trữ.
// Nạp lại và chạy lại trả 202 nghĩa là đã xếp lượt, không phải đã xong: trang tự hỏi lại 15 giây một lần khi còn việc chạy nền.
// Công bố, gỡ, lưu trữ, sửa thông tin gửi revision đang xem; lệch thì tải lại, không tự gửi lại

type Confirm = { kind: 'publish'; version: KnowledgeVersionView } | { kind: 'unpublish' } | { kind: 'archive' }

function MetadataDialog({
  document: d,
  open,
  onOpenChange,
}: {
  document: KnowledgeDocumentView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const update = useUpdateKnowledgeMetadataMutation()
  const [title, setTitle] = useState(d.title)
  const [category, setCategory] = useState(d.category)
  const [tags, setTags] = useState(d.tags.join(', '))
  const [revision] = useState(d.revision)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errors = checked ? { title: titleError(title), tags: tagsError(tags) } : {}

  async function submit() {
    if (update.isPending) return
    setChecked(true)
    setError(null)
    if (titleError(title) || tagsError(tags)) return
    try {
      await update.mutateAsync({
        id: d.documentId,
        body: { revision, title: title.trim(), category, tags: parseTags(tags) },
      })
      toast.success('Đã lưu thông tin tài liệu.')
      onOpenChange(false)
    } catch (e) {
      if (isApiError(e) && e.code === 'RAG_STALE_REVISION') {
        toast.error(errorMessage(e))
        onOpenChange(false)
        return
      }
      setError(rateLimitedMessage(e))
    }
  }

  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} dismissible={!update.isPending} aria-label="Sửa thông tin">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <DialogTitle>Sửa thông tin tài liệu</DialogTitle>
        <div className="mt-4 space-y-4">
          <Field label="Tên tài liệu" required htmlFor="kb-edit-title" error={errors.title}>
            <Input
              id="kb-edit-title"
              value={title}
              maxLength={KNOWLEDGE_LIMITS.titleMax}
              aria-required
              aria-invalid={errors.title ? true : undefined}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Danh mục" required htmlFor="kb-edit-category">
            <Select id="kb-edit-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(KNOWLEDGE_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Thẻ" htmlFor="kb-edit-tags" error={errors.tags} hint="Cách nhau bằng dấu phẩy.">
            <Input id="kb-edit-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          {error && (
            <div role="alert">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={update.isPending} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button icon="save" type="submit" variant="primary" disabled={update.isPending}>
            {update.isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </form>
    </ModalDialog>
  )
}

function DocumentView({ document: d }: { document: KnowledgeDocumentView }) {
  const navigate = useNavigate()
  const publish = usePublishKnowledgeVersionMutation()
  const unpublish = useUnpublishKnowledgeMutation()
  const archive = useArchiveKnowledgeMutation()
  const reindex = useReindexKnowledgeVersionMutation()
  const retry = useRetryKnowledgeJobMutation()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  // Nạp lại và chạy lại chung giới hạn 3 lần / 10 phút: bị 429 thì khoá cả hai tới hết Retry-After
  const cooldown = useRetryCountdown(() => {})
  const status = documentStatusMeta(d.status)
  const archived = isArchived(d)
  const versions = [...(d.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)
  const jobs = [...(d.jobs ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const versionNumber = (versionId: string) => d.versions?.find((v) => v.versionId === versionId)?.versionNumber
  const confirmBusy = publish.isPending || unpublish.isPending || archive.isPending

  async function run(key: string, action: () => Promise<unknown>, success: string, limited = false) {
    setBusyKey(key)
    try {
      await action()
      toast.success(success)
      return true
    } catch (e) {
      if (limited && isApiError(e) && e.status === 429 && e.retryAfter) cooldown.start(e.retryAfter)
      toast.error(rateLimitedMessage(e))
      return false
    } finally {
      setBusyKey(null)
    }
  }

  async function confirmAction() {
    if (!confirm || confirmBusy) return
    if (confirm.kind === 'publish') {
      await run(
        'confirm',
        () =>
          publish.mutateAsync({
            id: d.documentId,
            body: { versionId: confirm.version.versionId, revision: d.revision },
          }),
        `Đã công bố phiên bản ${confirm.version.versionNumber}. Chatbot dùng bản này từ bây giờ.`,
      )
    } else if (confirm.kind === 'unpublish') {
      await run(
        'confirm',
        () => unpublish.mutateAsync({ id: d.documentId, revision: d.revision }),
        'Đã gỡ công bố. Chatbot không dùng tài liệu này nữa.',
      )
    } else {
      const ok = await run(
        'confirm',
        () => archive.mutateAsync({ id: d.documentId, revision: d.revision }),
        'Đã lưu trữ tài liệu.',
      )
      if (ok) navigate(ROUTES.admin.knowledgeBase)
    }
    setConfirm(null)
  }

  return (
    <>
      <PageHeader
        meta={
          <>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span>{categoryLabel(d.category)}</span>
          </>
        }
        title={d.title}
        description={d.tags.length ? `Thẻ: ${d.tags.join(', ')}` : undefined}
        actions={
          !archived && (
            <>
              <Button variant="soft" icon="edit" onClick={() => setEditing(true)}>
                Sửa thông tin
              </Button>
              <Button variant="soft" icon="upload_file" onClick={() => setAdding(true)}>
                Thêm phiên bản
              </Button>
              {canUnpublish(d) && (
                <Button variant="warn" icon="unpublished" onClick={() => setConfirm({ kind: 'unpublish' })}>
                  Gỡ công bố
                </Button>
              )}
              <Button variant="danger" icon="archive" onClick={() => setConfirm({ kind: 'archive' })}>
                Lưu trữ
              </Button>
            </>
          )
        }
      />

      {needsPolling(d) && (
        <Notice tone="info" className="mb-6">
          Đang có lượt nạp chạy nền. Trang tự cập nhật 15 giây một lần; phiên bản nạp xong mới công bố được.
        </Notice>
      )}
      {archived && (
        <Notice tone="neutral" className="mb-6">
          Tài liệu đã lưu trữ: chatbot không dùng, không sửa hay công bố được nữa.
        </Notice>
      )}
      {cooldown.secondsLeft > 0 && (
        <Notice tone="warn" className="mb-6">
          Đã chạm giới hạn nạp lại (3 lần trong 10 phút). Nạp lại, chạy lại mở lại sau {cooldown.secondsLeft} giây.
        </Notice>
      )}

      <div className="space-y-4">
        <Panel>
          <PanelHeader title={`Phiên bản (${versions.length})`} />
          <Table stack>
            <thead>
              <tr>
                <Th>Phiên bản</Th>
                <Th>Trạng thái</Th>
                <Th>Nội dung đã nạp</Th>
                <Th>Thời gian</Th>
                <Th className="text-right">
                  <span className="sr-only">Thao tác</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const meta = versionStatusMeta(v.status)
                const live = d.publishedVersionId === v.versionId
                return (
                  <Tr key={v.versionId}>
                    <Td label="Phiên bản">
                      <span className="tnum font-medium text-fg">Bản {v.versionNumber}</span>
                      {d.latestVersionId === v.versionId && <p className="text-meta text-fg-3">Mới nhất</p>}
                    </Td>
                    <Td label="Trạng thái">
                      <span className="inline-flex flex-wrap gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {live && <Badge tone="accent">Chatbot đang dùng</Badge>}
                      </span>
                      {(v.failureReason || v.lastIngestError) && (
                        <p className="mt-1 max-w-[48ch] text-meta text-danger">
                          {v.failureReason ?? v.lastIngestError}
                        </p>
                      )}
                    </Td>
                    <Td label="Nội dung đã nạp" className="tnum text-meta text-fg-2">
                      {v.chunkCount != null ? (
                        <>
                          {v.pageCount != null && `${v.pageCount} trang, `}
                          {v.chunkCount} đoạn
                          {v.indexedChunkCharacters != null && (
                            <p>
                              Cắt {v.indexedChunkCharacters} ký tự, chồng {v.indexedChunkOverlap ?? 0}
                              {v.indexedConfigVersion != null && ` (cấu hình v${v.indexedConfigVersion})`}
                            </p>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td label="Thời gian" className="tnum text-meta whitespace-nowrap text-fg-2">
                      Tải lên {formatMoment(v.createdAt)}
                      {v.ingestedAt && <p>Nạp xong {formatMoment(v.ingestedAt)}</p>}
                      {v.publishedAt && <p>Công bố {formatMoment(v.publishedAt)}</p>}
                    </Td>
                    <Td label="Thao tác" className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {canPublishVersion(d, v) && !live && (
                          <Button
                            size="sm"
                            variant="soft"
                            icon="publish"
                            disabled={confirmBusy}
                            onClick={() => setConfirm({ kind: 'publish', version: v })}
                          >
                            Công bố
                          </Button>
                        )}
                        {canReindexVersion(d, v) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon="refresh"
                            disabled={busyKey !== null || cooldown.secondsLeft > 0}
                            onClick={() =>
                              void run(
                                `reindex-${v.versionId}`,
                                () => reindex.mutateAsync({ id: d.documentId, versionId: v.versionId }),
                                `Đã xếp lượt nạp lại bản ${v.versionNumber}. Kết quả hiện khi nạp xong.`,
                                true,
                              )
                            }
                          >
                            {busyKey === `reindex-${v.versionId}` ? 'Đang xếp…' : 'Nạp lại'}
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </Panel>

        <Panel>
          <PanelHeader title={`Lượt nạp (${jobs.length})`} />
          {jobs.length === 0 ? (
            <p className="text-body text-fg-2">Chưa có lượt nạp nào.</p>
          ) : (
            <Table stack>
              <thead>
                <tr>
                  <Th>Lượt</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Lần thử</Th>
                  <Th>Thời gian</Th>
                  <Th className="text-right">
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const meta = jobStatusMeta(j.status)
                  return (
                    <Tr key={j.jobId}>
                      <Td label="Lượt">
                        {jobKindLabel(j.kind)}
                        <p className="tnum text-meta text-fg-3">
                          Bản {versionNumber(j.versionId) ?? '—'}
                          {j.chunkCharacters != null && `, cắt ${j.chunkCharacters} / chồng ${j.chunkOverlap ?? 0}`}
                        </p>
                      </Td>
                      <Td label="Trạng thái">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {j.lastError && <p className="mt-1 max-w-[48ch] text-meta text-danger">{j.lastError}</p>}
                      </Td>
                      <Td label="Lần thử" className="tnum text-right">
                        {j.attempts} / {j.maxAttempts}
                      </Td>
                      <Td label="Thời gian" className="tnum text-meta whitespace-nowrap text-fg-2">
                        Tạo {formatMoment(j.createdAt)}
                        {j.completedAt ? (
                          <p>Xong {formatMoment(j.completedAt)}</p>
                        ) : (
                          (j.status === 'PENDING' || j.status === 'RETRY_WAITING') && (
                            <p>Chạy lúc {formatMoment(j.nextAttemptAt)}</p>
                          )
                        )}
                      </Td>
                      <Td label="Thao tác" className="text-right whitespace-nowrap">
                        {canRetryJob(j) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon="replay"
                            disabled={busyKey !== null || cooldown.secondsLeft > 0}
                            onClick={() =>
                              void run(
                                `retry-${j.jobId}`,
                                () => retry.mutateAsync({ id: d.documentId, jobId: j.jobId }),
                                'Đã xếp chạy lại. Kết quả hiện khi chạy xong.',
                                true,
                              )
                            }
                          >
                            {busyKey === `retry-${j.jobId}` ? 'Đang xếp…' : 'Chạy lại'}
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>

      <MetadataDialog
        key={editing ? `edit-${d.revision}` : 'closed'}
        document={d}
        open={editing}
        onOpenChange={setEditing}
      />
      <KnowledgeUploadDialog open={adding} document={d} onOpenChange={setAdding} />
      <ModalDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        dismissible={!confirmBusy}
        aria-label="Xác nhận"
      >
        {confirm?.kind === 'publish' && (
          <>
            <DialogTitle>Công bố bản {confirm.version.versionNumber}?</DialogTitle>
            <p className="mt-2 text-body text-fg-2">
              Chatbot dùng bản này để trả lời ngay sau khi công bố
              {d.publishedVersionId ? '; bản đang công bố được thay ra cùng lúc.' : '.'}
            </p>
          </>
        )}
        {confirm?.kind === 'unpublish' && (
          <>
            <DialogTitle>Gỡ công bố {d.title}?</DialogTitle>
            <p className="mt-2 text-body text-fg-2">
              Chatbot thôi dùng tài liệu này ngay. Bạn công bố lại phiên bản được khi cần.
            </p>
          </>
        )}
        {confirm?.kind === 'archive' && (
          <>
            <DialogTitle>Lưu trữ {d.title}?</DialogTitle>
            <p className="mt-2 text-body text-fg-2">
              Tài liệu bị gỡ công bố ngay và dữ liệu đã nạp được xoá dần. Tài liệu đã lưu trữ không sửa, không công bố
              lại được; thông tin vẫn giữ để đối chiếu.
            </p>
          </>
        )}
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={confirmBusy} onClick={() => setConfirm(null)}>
            Huỷ
          </Button>
          <Button
            icon={confirm?.kind === 'publish' ? 'publish' : confirm?.kind === 'unpublish' ? 'unpublished' : 'archive'}
            variant={confirm?.kind === 'archive' ? 'danger-solid' : confirm?.kind === 'unpublish' ? 'warn' : 'primary'}
            disabled={confirmBusy}
            onClick={() => void confirmAction()}
          >
            {confirmBusy
              ? 'Đang lưu…'
              : confirm?.kind === 'publish'
                ? 'Công bố'
                : confirm?.kind === 'unpublish'
                  ? 'Gỡ công bố'
                  : 'Lưu trữ'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </>
  )
}

export function AdminKnowledgeDocumentPage() {
  const { id } = useParams()
  const query = useKnowledgeDocumentQuery(id)
  usePageCrumb(query.data?.title ?? null)

  if (query.isError && !query.data && isFeatureUnavailable(query.error))
    return (
      <UnavailableState
        title="Kho tri thức chưa sẵn sàng."
        message={KNOWLEDGE_UNAVAILABLE}
        pendingMigrations={pendingMigrationsOf(query.error)}
      />
    )
  return <QueryBoundary query={query}>{(d) => <DocumentView document={d} />}</QueryBoundary>
}
