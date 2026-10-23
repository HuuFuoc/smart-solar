import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { RagConfigurationFields } from './RagConfigurationFields'
import { LoadingWaveDots } from './LoadingWaveDots'
import {
  useActivateRagDraftMutation,
  useRagConfigurationQuery,
  useRagModelsQuery,
  useSaveRagDraftMutation,
} from '@/hooks/useAdminRagConfig'
import {
  DEFAULT_RAG_VALUES,
  type RagConfigurationState,
  type RagConfigurationValues,
  type RagConfigurationView,
  type RagModelCatalog,
} from '@/types/res/adminRagConfigTypes'

type FormProps = {
  initialValues: RagConfigurationValues
  configState?: RagConfigurationState
  modelCatalog?: RagModelCatalog
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

function RagConfigForm({ initialValues, configState, modelCatalog }: FormProps) {
  const [form, setForm] = useState<RagConfigurationValues>(initialValues)
  const [notes, setNotes] = useState(configState?.draft?.notes ?? '')
  const saveMutation = useSaveRagDraftMutation()
  const activateMutation = useActivateRagDraftMutation()

  const handleRestoreDefaults = () => {
    setForm(DEFAULT_RAG_VALUES)
    toast.info('Đã khôi phục các tham số AI/RAG về giá trị mặc định chuẩn từ hệ thống.')
  }

  const handleSaveDraft = async () => {
    try {
      await saveMutation.mutateAsync({ ...form, notes: notes.trim() || undefined, expectedRevision: configState?.draft?.revision })
      toast.success('Đã lưu bản nháp cấu hình AI thành công.')
    } catch {
      toast.error('Không thể lưu bản nháp cấu hình AI.')
    }
  }

  const handleActivate = async () => {
    if (!configState?.draft?.revision) return
    try {
      await activateMutation.mutateAsync(configState.draft.revision)
      toast.success('Đã kích hoạt phiên bản cấu hình AI vào hệ thống.')
    } catch {
      toast.error('Không thể kích hoạt cấu hình AI.')
    }
  }

  const isSaving = saveMutation.isPending || activateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface-1 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-body font-semibold text-fg-1">Trạng thái cấu hình AI Chatbot</h3>
            {configState?.draft ? (
              <Badge tone="warn">Có bản nháp (Rev {configState.draft.revision})</Badge>
            ) : (
              <Badge tone="ok">Đang hoạt động (v{configState?.active?.version || 1})</Badge>
            )}
          </div>
          <p className="mt-1 text-meta text-fg-3">
            Điều chỉnh mô hình LLM, độ phân đoạn tài liệu và tham số truy xuất ngữ cảnh RAG.
          </p>
        </div>
        <Button variant="secondary" icon="restart_alt" disabled={isSaving} onClick={handleRestoreDefaults}>
          Khôi phục mặc định
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

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <Button variant="secondary" icon="save" disabled={isSaving} onClick={() => void handleSaveDraft()}>
          {saveMutation.isPending ? 'Đang lưu…' : 'Lưu bản nháp'}
        </Button>
        {configState?.draft && (
          <Button variant="primary" icon="check_circle" disabled={isSaving} onClick={() => void handleActivate()}>
            {activateMutation.isPending ? 'Đang kích hoạt…' : 'Kích hoạt bản nháp vào hệ thống'}
          </Button>
        )}
      </div>
    </div>
  )
}

export function RagConfigurationTab() {
  const { data: configState, isLoading } = useRagConfigurationQuery()
  const { data: modelCatalog } = useRagModelsQuery()

  if (isLoading) return <LoadingWaveDots text="Đang tải cấu hình AI" subtitle="Đang đồng bộ tham số mô hình từ hệ thống..." />

  const initialValues = extractRagValues(configState?.draft || configState?.active)
  const versionKey = configState?.draft?.revision ? `draft-${configState.draft.revision}` : `active-${configState?.active?.version ?? 0}`

  return (
    <RagConfigForm
      key={versionKey}
      initialValues={initialValues}
      configState={configState}
      modelCatalog={modelCatalog}
    />
  )
}
