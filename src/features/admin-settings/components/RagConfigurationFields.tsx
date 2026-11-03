import { SettingFieldInput } from './SettingFieldInput'
import type { RagConfigurationValues, RagModelCatalog } from '@/types/res/adminRagConfigTypes'

type Props = {
  form: RagConfigurationValues
  notes: string
  modelCatalog?: RagModelCatalog
  isSaving: boolean
  onChange: (updater: (prev: RagConfigurationValues) => RagConfigurationValues) => void
  onNotesChange: (notes: string) => void
}

export function RagConfigurationFields({ form, notes, modelCatalog, isSaving, onChange, onNotesChange }: Props) {
  const models = modelCatalog?.models || [
    { id: 'gpt-4.1-mini', displayName: 'GPT-4.1 mini' },
    { id: 'gpt-4.1', displayName: 'GPT-4.1' },
    { id: 'gpt-4o-mini', displayName: 'GPT-4o mini' },
  ]
  const promptVersions = modelCatalog?.promptVersions || ['v1']

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-control border border-line bg-surface-1 p-3.5">
          <label htmlFor="rag-model-select" className="text-body font-medium text-fg-1">
            Mô hình sinh nội dung (LLM)
          </label>
          <select
            id="rag-model-select"
            value={form.generationModel}
            disabled={isSaving}
            onChange={(e) => onChange((p) => ({ ...p, generationModel: e.target.value }))}
            className="mt-3 w-full rounded-control border border-line bg-canvas px-3 py-1.5 text-body text-fg-1 outline-none focus:border-accent"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName || m.id}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-control border border-line bg-surface-1 p-3.5">
          <label htmlFor="rag-prompt-select" className="text-body font-medium text-fg-1">
            Phiên bản Prompt hệ thống
          </label>
          <select
            id="rag-prompt-select"
            value={form.promptVersion}
            disabled={isSaving}
            onChange={(e) => onChange((p) => ({ ...p, promptVersion: e.target.value }))}
            className="mt-3 w-full rounded-control border border-line bg-canvas px-3 py-1.5 text-body text-fg-1 outline-none focus:border-accent"
          >
            {promptVersions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SettingFieldInput
          id="temperature"
          label="Độ ngẫu nhiên (Temperature)"
          description="Giá trị thấp bám sát tài liệu; cao hơn cho câu trả lời tự nhiên."
          value={form.temperature ?? 0.1}
          unit="độ"
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.1}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, temperature: v }))}
        />
        <SettingFieldInput
          id="maxOutputTokens"
          label="Tokens phản hồi tối đa"
          description="Giới hạn độ dài phản hồi tối đa của câu trả lời chatbot."
          value={form.maxOutputTokens}
          unit="tokens"
          min={64}
          max={1500}
          defaultValue={700}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, maxOutputTokens: v }))}
        />
        <SettingFieldInput
          id="maxContextTokens"
          label="Tokens ngữ cảnh tối đa"
          description="Tổng tokens tài liệu đối sánh được đưa vào prompt LLM."
          value={form.maxContextTokens}
          unit="tokens"
          min={500}
          max={6000}
          defaultValue={3000}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, maxContextTokens: v }))}
        />
        <SettingFieldInput
          id="chunkCharacters"
          label="Kích thước đoạn văn bản"
          description="Số ký tự tối đa của một đoạn tài liệu khi chia nhỏ đưa vào vector DB."
          value={form.chunkCharacters}
          unit="ký tự"
          min={400}
          max={8000}
          defaultValue={2400}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, chunkCharacters: v }))}
        />
        <SettingFieldInput
          id="chunkOverlap"
          label="Độ gối đầu giữa các đoạn"
          description="Số ký tự lặp lại giữa các đoạn liền kề để không đứt quãng ngữ nghĩa."
          value={form.chunkOverlap}
          unit="ký tự"
          min={0}
          max={form.chunkCharacters / 2}
          defaultValue={300}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, chunkOverlap: v }))}
        />
        <SettingFieldInput
          id="topK"
          label="Số đoạn trích xuất (Top K)"
          description="Số lượng đoạn tài liệu liên quan cao nhất được nạp vào câu trả lời."
          value={form.topK}
          unit="đoạn"
          min={1}
          max={10}
          defaultValue={6}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, topK: v }))}
        />
        <SettingFieldInput
          id="minScore"
          label="Ngưỡng tương đồng tối thiểu"
          description="Các đoạn tài liệu có điểm tương đồng dưới ngưỡng này sẽ bị loại."
          value={form.minScore}
          unit="điểm"
          min={0}
          max={1}
          step={0.001}
          defaultValue={0.2}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, minScore: v }))}
        />
        <SettingFieldInput
          id="maxHistoryMessages"
          label="Lịch sử hội thoại tối đa"
          description="Số tin nhắn hội thoại gần nhất đưa vào ngữ cảnh sinh câu trả lời."
          value={form.maxHistoryMessages}
          unit="tin nhắn"
          min={0}
          max={20}
          defaultValue={6}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, maxHistoryMessages: v }))}
        />
      </div>

      <div className="rounded-control border border-line bg-surface-1 p-3.5">
        <label htmlFor="rag-notes-input" className="text-body font-medium text-fg-1">
          Ghi chú bản nháp (Notes)
        </label>
        <textarea
          id="rag-notes-input"
          rows={2}
          value={notes}
          disabled={isSaving}
          maxLength={500}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Ví dụ: Tăng kích thước chunk và topK để cải thiện độ chi tiết câu trả lời quy trình kỹ thuật..."
          className="mt-2 w-full rounded-control border border-line bg-canvas p-2.5 text-body text-fg-1 outline-none focus:border-accent"
        />
      </div>
    </div>
  )
}
