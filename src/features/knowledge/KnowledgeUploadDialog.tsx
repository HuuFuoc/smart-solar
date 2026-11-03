import { useState } from 'react'
import { toast } from 'sonner'
import { KNOWLEDGE_CATEGORIES } from '@/common/knowledge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Select } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice, Progress } from '@/components/common/ui/lists'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import {
  KNOWLEDGE_LIMITS,
  parseTags,
  tagsError,
  titleError,
  titleFromFileName,
} from '@/features/knowledge/knowledgeRules'
import { useFileUpload } from '@/hooks/useFiles'
import { useAddKnowledgeVersionMutation, useRegisterKnowledgeDocumentMutation } from '@/hooks/useKnowledgeDocuments'
import { rateLimitedMessage } from '@/services/api/errors'
import type { KnowledgeDocumentView } from '@/types/res/knowledgeDocumentsRes'

// Tải tệp lên kho (mục đích KNOWLEDGE_DOCUMENT) rồi đăng ký tài liệu mới, hoặc thêm phiên bản cho tài liệu đã có.
// Tải xong mà đăng ký lỗi thì giữ fileId để lần bấm sau chỉ đăng ký lại, không tải lại tệp

const PURPOSE = 'KNOWLEDGE_DOCUMENT' as const

type Mutations = {
  uploader: ReturnType<typeof useFileUpload>
  register: ReturnType<typeof useRegisterKnowledgeDocumentMutation>
  addVersion: ReturnType<typeof useAddKnowledgeVersionMutation>
}

function UploadForm({
  document,
  mutations: { uploader, register, addVersion },
  onDone,
  onRegistered,
}: {
  /** Có thì là thêm phiên bản cho tài liệu này */
  document: KnowledgeDocumentView | null
  mutations: Mutations
  onDone: () => void
  onRegistered?: (view: KnowledgeDocumentView) => void
}) {
  const { upload, uploading, progress } = uploader
  const [file, setFile] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = uploading || register.isPending || addVersion.isPending

  const problem = file ? fileProblem(file, PURPOSE) : null
  const errors = checked
    ? {
        file: !file ? 'Chọn tệp.' : (problem ?? undefined),
        title: document ? undefined : titleError(title),
        category: document || category ? undefined : 'Chọn danh mục.',
        tags: document ? undefined : tagsError(tags),
      }
    : {}
  const invalid = Object.values(errors).some(Boolean)

  function choose(files: File[]) {
    const next = files[0]
    if (!next) return
    setFile(next)
    setFileId(null)
    setError(null)
    if (!document && !title.trim()) setTitle(titleFromFileName(next.name))
  }

  async function submit() {
    if (busy) return
    setChecked(true)
    setError(null)
    const hasError =
      !file || fileProblem(file, PURPOSE) || (!document && (titleError(title) || !category || tagsError(tags)))
    if (hasError) return
    try {
      const id = fileId ?? (await upload(file)).fileId
      setFileId(id)
      if (document) {
        await addVersion.mutateAsync({ id: document.documentId, fileId: id })
        toast.success('Đã thêm phiên bản mới. Tài liệu đang được nạp, công bố khi nạp xong.')
      } else {
        const view = await register.mutateAsync({ fileId: id, title: title.trim(), category, tags: parseTags(tags) })
        toast.success(`Đã thêm ${view.title}. Tài liệu đang được nạp, công bố khi nạp xong.`)
        onRegistered?.(view)
      }
      onDone()
    } catch (e) {
      setError(rateLimitedMessage(e))
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <DialogTitle>{document ? `Thêm phiên bản: ${document.title}` : 'Thêm tài liệu'}</DialogTitle>
      <p className="mt-1 text-body text-fg-2">
        {fileTypesText(PURPOSE)}, tối đa {maxSizeText(PURPOSE)}.{' '}
        {document
          ? 'Phiên bản đang công bố vẫn được chatbot dùng cho tới khi bạn công bố bản mới.'
          : 'Chatbot chỉ dùng tài liệu sau khi nạp xong và được công bố.'}
      </p>
      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-2">
          <span className="text-body font-medium text-fg">
            Tệp
            <span aria-hidden className="text-danger">
              {' *'}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <FileButton accept={acceptFor(PURPOSE)} icon="upload_file" variant="soft" disabled={busy} onFiles={choose}>
              {file ? 'Chọn tệp khác' : 'Chọn tệp'}
            </FileButton>
            {file && <span className="min-w-0 break-all text-body text-fg">{file.name}</span>}
          </div>
          {errors.file && (
            <p className="text-meta text-danger" role="alert">
              {errors.file}
            </p>
          )}
          {progress !== null && <Progress value={Math.round(progress * 100)} label="Đang tải tệp lên" />}
          {fileId && !busy && <p className="text-meta text-fg-3">Tệp đã tải lên, lần gửi sau không tải lại.</p>}
        </div>
        {!document && (
          <>
            <Field label="Tên tài liệu" required htmlFor="kb-title" error={errors.title}>
              <Input
                id="kb-title"
                value={title}
                maxLength={KNOWLEDGE_LIMITS.titleMax}
                aria-required
                aria-invalid={errors.title ? true : undefined}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Danh mục" required htmlFor="kb-category" error={errors.category}>
              <Select
                id="kb-category"
                value={category}
                aria-required
                aria-invalid={errors.category ? true : undefined}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Chọn danh mục</option>
                {Object.entries(KNOWLEDGE_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Thẻ"
              htmlFor="kb-tags"
              error={errors.tags}
              hint={`Cách nhau bằng dấu phẩy, tối đa ${KNOWLEDGE_LIMITS.tagsMax} thẻ, mỗi thẻ tối đa ${KNOWLEDGE_LIMITS.tagMax} ký tự.`}
            >
              <Input
                id="kb-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="inverter, bảo hành"
              />
            </Field>
          </>
        )}
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        {checked && invalid && <p className="mr-auto text-body text-danger">Còn ô chưa hợp lệ.</p>}
        <Button icon="close" variant="secondary" disabled={busy} onClick={onDone}>
          Huỷ
        </Button>
        <Button icon="upload" type="submit" variant="primary" disabled={busy}>
          {uploading ? 'Đang tải tệp…' : busy ? 'Đang lưu…' : document ? 'Thêm phiên bản' : 'Thêm tài liệu'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function KnowledgeUploadDialog({
  open,
  document,
  onOpenChange,
  onRegistered,
}: {
  open: boolean
  document: KnowledgeDocumentView | null
  onOpenChange: (open: boolean) => void
  onRegistered?: (view: KnowledgeDocumentView) => void
}) {
  const uploader = useFileUpload(PURPOSE)
  const register = useRegisterKnowledgeDocumentMutation()
  const addVersion = useAddKnowledgeVersionMutation()
  // Đang tải hay đang đăng ký thì không cho đóng, để tệp đã tải lên không bị bỏ dở
  const busy = uploader.uploading || register.isPending || addVersion.isPending
  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!busy}
      aria-label={document ? 'Thêm phiên bản' : 'Thêm tài liệu'}
      className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
    >
      {open && (
        <UploadForm
          document={document}
          mutations={{ uploader, register, addVersion }}
          onDone={() => onOpenChange(false)}
          onRegistered={onRegistered}
        />
      )}
    </ModalDialog>
  )
}
