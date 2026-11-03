import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { ErrorState, UnavailableState } from '@/components/common/ui/states'
import { RagConfigurationFields } from './RagConfigurationFields'
import { LoadingWaveDots } from './LoadingWaveDots'
import { KNOWLEDGE_UNAVAILABLE } from '@/features/knowledge/knowledgeDisplay'
import {
  useActivateRagDraftMutation,
  useDeleteRagDraftMutation,
  useRagConfigurationQuery,
  useRagModelsQuery,
  useReindexStaleMutation,
  useSaveRagDraftMutation,
  useValidateRagDraftMutation,
} from '@/hooks/useAdminRagConfig'
import { useRetryCountdown } from '@/hooks/useRetryCountdown'
import {
  errorMessage,
  isApiError,
  isFeatureUnavailable,
  pendingMigrationsOf,
  rateLimitedMessage,
} from '@/services/api/errors'
import {
  DEFAULT_RAG_VALUES,
  type RagActivationView,
  type RagConfigurationState,
  type RagConfigurationValidationView,
  type RagConfigurationValues,
  type RagConfigurationView,
  type RagModelCatalog,
  type RagReindexStaleView,
} from '@/types/res/adminRagConfigTypes'

// Cấu hình chatbot: lưu bản nháp, kiểm tra, áp dụng. Áp dụng luôn kiểm tra bản nháp trước; đổi cách cắt đoạn thì hỏi lại vì
// tài liệu đã nạp không tự nạp lại, người dùng tự bấm "Nạp lại" sau khi áp dụng

type FormProps = {
  initialValues: RagConfigurationValues
  configState: RagConfigurationState
  modelCatalog?: RagModelCatalog
  /** Kết quả áp dụng giữ ở trang cha vì form vẽ lại theo phiên bản mới ngay sau khi áp dụng */
  onActivated: (result: RagActivationView) => void
}

function extractRagValues(view?: RagConfigurationView | null): RagConfigurationValues {
  if (!view) return DEFAULT_RAG_VALUES
  return {
    generationModel: view.generationModel,
    temperature: view.temperature,
    maxOutputTokens: view.maxOutputTokens,
    chunkCharacters: view.chunkCharacters,
    chunkOverlap: view.chunkOverlap,
    topK: view.topK,
    minScore: view.minScore,
    maxContextTokens: view.maxContextTokens,
    maxHistoryMessages: view.maxHistoryMessages,
    promptVersion: view.promptVersion,
  }
}

/** Lỗi theo tham số: từ kết quả kiểm tra, hoặc từ `details` của 400 RAG_CONFIG_VALIDATION_FAILED */
function ValidationErrors({ errors }: { errors: Record<string, string> | Record<string, string[]> }) {
  const entries = Object.entries(errors).map(([field, value]) => [
    field,
    Array.isArray(value) ? value.join(' ') : value,
  ])
  if (entries.length === 0) return null
  return (
    <ul className="mt-1 list-disc pl-5">
      {entries.map(([field, message]) => (
        <li key={field}>
          <span className="font-mono">{field}</span>: {message}
        </li>
      ))}
    </ul>
  )
}

function ReindexNotice({
  count,
  result,
  busy,
  cooldown,
  onReindex,
}: {
  count: number
  result: RagReindexStaleView | null
  busy: boolean
  cooldown: number
  onReindex: () => void
}) {
  if (result)
    return (
      <Notice tone="info" title={`Đã xếp lượt nạp lại theo cấu hình v${result.configVersion}`}>
        {result.queued} phiên bản được xếp nạp lại
        {result.skippedOpenJob > 0 && `, ${result.skippedOpenJob} phiên bản đang có lượt nạp chờ nên bỏ qua`} (tổng{' '}
        {result.stale} phiên bản cắt theo cấu hình cũ). Bản đang công bố vẫn được dùng cho tới khi nạp lại xong. Xem
        tiến độ ở Kho tri thức AI.
      </Notice>
    )
  return (
    <Notice tone="warn" title="Tài liệu đã nạp chưa được nạp lại">
      <p>
        Cách cắt đoạn đã đổi nhưng hệ thống không tự nạp lại. {count} phiên bản tài liệu vẫn dùng cách cắt cũ tới khi
        nạp lại.
      </p>
      <Button
        size="sm"
        variant="secondary"
        icon="refresh"
        className="mt-3"
        disabled={busy || cooldown > 0}
        onClick={onReindex}
      >
        {busy ? 'Đang xếp lượt nạp…' : cooldown > 0 ? `Chờ ${cooldown} giây` : 'Nạp lại tài liệu theo cấu hình mới'}
      </Button>
    </Notice>
  )
}

function RagConfigForm({ initialValues, configState, modelCatalog, onActivated }: FormProps) {
  const [form, setForm] = useState<RagConfigurationValues>(initialValues)
  const [notes, setNotes] = useState(configState.draft?.notes ?? '')
  const saveMutation = useSaveRagDraftMutation()
  const activateMutation = useActivateRagDraftMutation()
  const validateMutation = useValidateRagDraftMutation()
  const deleteMutation = useDeleteRagDraftMutation()
  const [validation, setValidation] = useState<RagConfigurationValidationView | null>(null)
  const [saveError, setSaveError] = useState<unknown>(null)
  const [confirmChunk, setConfirmChunk] = useState<RagConfigurationValidationView | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const draft = configState.draft ?? null

  const handleRestoreDefaults = () => {
    setForm(DEFAULT_RAG_VALUES)
    toast.info('Đã điền lại các tham số mặc định. Bấm "Lưu bản nháp" để lưu.')
  }

  const handleSaveDraft = async () => {
    setSaveError(null)
    setValidation(null)
    try {
      await saveMutation.mutateAsync({ ...form, notes: notes.trim() || undefined, expectedRevision: draft?.revision })
      toast.success('Đã lưu bản nháp cấu hình.')
    } catch (e) {
      setSaveError(e)
      toast.error(errorMessage(e))
    }
  }

  // Kiểm tra bản nháp đã lưu; trả kết quả để bước áp dụng dùng lại
  const runValidate = async () => {
    try {
      const result = await validateMutation.mutateAsync()
      setValidation(result)
      return result
    } catch (e) {
      toast.error(errorMessage(e))
      return null
    }
  }

  const activate = async () => {
    if (!draft) return
    setConfirmChunk(null)
    try {
      const result = await activateMutation.mutateAsync(draft.revision)
      setValidation(null)
      onActivated(result)
      toast.success(`Đã áp dụng cấu hình v${result.active.version}.`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  // Áp dụng: kiểm tra trước, không hợp lệ thì dừng; đổi cách cắt đoạn thì hỏi lại
  const handleActivate = async () => {
    if (!draft) return
    const result = await runValidate()
    if (!result) return
    if (!result.valid) {
      toast.error('Bản nháp chưa hợp lệ. Sửa các tham số được báo lỗi rồi lưu lại.')
      return
    }
    if (result.chunkSettingsChanged) setConfirmChunk(result)
    else await activate()
  }

  const handleDelete = async () => {
    if (!draft) return
    try {
      await deleteMutation.mutateAsync(draft.revision)
      setConfirmDelete(false)
      setValidation(null)
      toast.success('Đã bỏ bản nháp.')
    } catch (e) {
      setConfirmDelete(false)
      toast.error(errorMessage(e))
    }
  }

  const isSaving =
    saveMutation.isPending || activateMutation.isPending || validateMutation.isPending || deleteMutation.isPending
  const fieldErrors =
    isApiError(saveError) && saveError.code === 'RAG_CONFIG_VALIDATION_FAILED' ? saveError.fieldErrors : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-body font-semibold text-fg-1">Cấu hình chatbot</h3>
          <Badge tone="ok">
            {configState.bootstrap
              ? 'Đang dùng giá trị mặc định'
              : `Đang dùng v${configState.active?.version ?? configState.effective.version}`}
          </Badge>
          {draft && <Badge tone="info">Có bản nháp v{draft.version}</Badge>}
        </div>
        <Button variant="secondary" icon="restart_alt" disabled={isSaving} onClick={handleRestoreDefaults}>
          Điền giá trị mặc định
        </Button>
      </div>

      <RagConfigurationFields
        form={form}
        notes={notes}
        modelCatalog={modelCatalog}
        isSaving={isSaving}
        onChange={setForm}
        onNotesChange={setNotes}
      />

      {fieldErrors && Object.keys(fieldErrors).length > 0 && (
        <div role="alert">
          <Notice tone="danger" title="Bản nháp chưa lưu được">
            <ValidationErrors errors={fieldErrors} />
          </Notice>
        </div>
      )}

      {validation && (
        <div role="status">
          {validation.valid ? (
            <Notice tone="ok" title={`Bản nháp v${validation.version} hợp lệ`}>
              {validation.chunkSettingsChanged
                ? `Cách cắt đoạn khác cấu hình đang dùng: áp dụng xong cần nạp lại ${validation.versionsNeedingReindex} phiên bản tài liệu.`
                : 'Cách cắt đoạn giống cấu hình đang dùng.'}
            </Notice>
          ) : (
            <Notice tone="danger" title={`Bản nháp v${validation.version} chưa hợp lệ`}>
              <ValidationErrors errors={validation.errors} />
            </Notice>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        {draft && (
          <>
            <Button variant="danger" icon="delete" disabled={isSaving} onClick={() => setConfirmDelete(true)}>
              Bỏ bản nháp
            </Button>
            <Button variant="info" icon="fact_check" disabled={isSaving} onClick={() => void runValidate()}>
              {validateMutation.isPending ? 'Đang kiểm tra…' : 'Kiểm tra bản nháp'}
            </Button>
          </>
        )}
        <Button variant="secondary" icon="save" disabled={isSaving} onClick={() => void handleSaveDraft()}>
          {saveMutation.isPending ? 'Đang lưu…' : 'Lưu bản nháp'}
        </Button>
        {draft && (
          <Button variant="primary" icon="check_circle" disabled={isSaving} onClick={() => void handleActivate()}>
            {activateMutation.isPending ? 'Đang áp dụng…' : 'Áp dụng bản nháp'}
          </Button>
        )}
      </div>

      <ModalDialog
        open={confirmChunk !== null}
        onOpenChange={(open) => !open && setConfirmChunk(null)}
        dismissible={!activateMutation.isPending}
        aria-label="Áp dụng bản nháp đổi cách cắt đoạn"
      >
        <DialogTitle>Áp dụng cấu hình đổi cách cắt đoạn?</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          Hệ thống không tự nạp lại tài liệu. Sau khi áp dụng, {confirmChunk?.versionsNeedingReindex ?? 0} phiên bản tài
          liệu vẫn dùng cách cắt cũ cho tới khi bạn bấm nạp lại.
        </p>
        <DialogFooter>
          <Button
            icon="close"
            variant="secondary"
            disabled={activateMutation.isPending}
            onClick={() => setConfirmChunk(null)}
          >
            Huỷ
          </Button>
          <Button
            icon="check_circle"
            variant="primary"
            disabled={activateMutation.isPending}
            onClick={() => void activate()}
          >
            {activateMutation.isPending ? 'Đang áp dụng…' : 'Áp dụng'}
          </Button>
        </DialogFooter>
      </ModalDialog>

      <ModalDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        dismissible={!deleteMutation.isPending}
        aria-label="Bỏ bản nháp"
      >
        <DialogTitle>Bỏ bản nháp v{draft?.version}?</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          Các thay đổi chưa áp dụng trong bản nháp bị xoá. Cấu hình đang dùng không đổi.
        </p>
        <DialogFooter>
          <Button
            icon="close"
            variant="secondary"
            disabled={deleteMutation.isPending}
            onClick={() => setConfirmDelete(false)}
          >
            Huỷ
          </Button>
          <Button
            icon="delete"
            variant="danger-solid"
            disabled={deleteMutation.isPending}
            onClick={() => void handleDelete()}
          >
            {deleteMutation.isPending ? 'Đang bỏ…' : 'Bỏ bản nháp'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </div>
  )
}

/** Kết quả lần áp dụng / khôi phục gần nhất và nút nạp lại tài liệu khi cách cắt đoạn đổi. Dùng chung với lịch sử phiên bản */
export function RagActivationResult({ activation }: { activation: RagActivationView }) {
  const reindexMutation = useReindexStaleMutation()
  const cooldown = useRetryCountdown(() => {})
  const [reindexResult, setReindexResult] = useState<RagReindexStaleView | null>(null)
  const needsReindex = activation.chunkSettingsChanged && activation.versionsNeedingReindex > 0

  const handleReindex = async () => {
    try {
      setReindexResult(await reindexMutation.mutateAsync())
    } catch (e) {
      if (isApiError(e) && e.status === 429 && e.retryAfter) cooldown.start(e.retryAfter)
      toast.error(rateLimitedMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <Notice tone="ok" title={`Cấu hình v${activation.active.version} đang được dùng`}>
        {activation.supersededVersion != null && `Thay cho v${activation.supersededVersion}. `}
        {activation.chunkSettingsChanged
          ? `Cách cắt đoạn đã đổi; ${activation.versionsNeedingReindex} phiên bản tài liệu cần nạp lại.`
          : 'Cách cắt đoạn không đổi, không cần nạp lại tài liệu.'}
      </Notice>
      {needsReindex && (
        <ReindexNotice
          count={activation.versionsNeedingReindex}
          result={reindexResult}
          busy={reindexMutation.isPending}
          cooldown={cooldown.secondsLeft}
          onReindex={() => void handleReindex()}
        />
      )}
    </div>
  )
}

export function RagConfigurationTab() {
  const { data: configState, isLoading, isError, error, refetch } = useRagConfigurationQuery()
  const { data: modelCatalog } = useRagModelsQuery()
  const [activation, setActivation] = useState<RagActivationView | null>(null)

  if (isLoading)
    return <LoadingWaveDots text="Đang tải cấu hình AI" subtitle="Đang đồng bộ tham số mô hình từ hệ thống..." />

  // Không tải được thì không hiện giá trị mặc định như thể là cấu hình thật
  if (isError || !configState) {
    if (isFeatureUnavailable(error))
      return (
        <UnavailableState
          title="Cấu hình chatbot chưa sẵn sàng."
          message={KNOWLEDGE_UNAVAILABLE}
          pendingMigrations={pendingMigrationsOf(error)}
        />
      )
    return (
      <ErrorState message={errorMessage(error, 'Không tải được cấu hình chatbot.')} onRetry={() => void refetch()} />
    )
  }

  const initialValues = extractRagValues(configState.draft || configState.active || configState.effective)
  const versionKey = configState.draft
    ? `draft-${configState.draft.version}-${configState.draft.revision}`
    : `active-${configState.active?.version ?? 0}`

  return (
    <div className="space-y-6">
      {activation && <RagActivationResult key={activation.active.version} activation={activation} />}
      <RagConfigForm
        key={versionKey}
        initialValues={initialValues}
        configState={configState}
        modelCatalog={modelCatalog}
        onActivated={setActivation}
      />
    </div>
  )
}
