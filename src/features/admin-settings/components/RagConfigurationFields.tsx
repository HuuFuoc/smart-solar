import { SettingFieldInput } from './SettingFieldInput'
import { Field, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  RAG_SERVICE_CAPS,
  fieldBounds,
  findModel,
  modelOptions,
  modelPriceText,
  withModel,
} from '@/features/admin-settings/ragConfigRules'
import {
  DEFAULT_RAG_TEMPERATURE,
  DEFAULT_RAG_VALUES,
  type RagConfigurationValues,
  type RagModelCatalog,
} from '@/types/res/adminRagConfigTypes'

type Props = {
  form: RagConfigurationValues
  notes: string
  modelCatalog?: RagModelCatalog
  isSaving: boolean
  onChange: (updater: (prev: RagConfigurationValues) => RagConfigurationValues) => void
  onNotesChange: (notes: string) => void
}

const cap = (n: number) => n.toLocaleString('vi-VN')

export function RagConfigurationFields({ form, notes, modelCatalog, isSaving, onChange, onNotesChange }: Props) {
  // Chỉ model registry báo dùng được; chưa tải được registry thì không có lựa chọn nào (không dùng danh sách viết sẵn)
  const options = modelOptions(modelCatalog, form.generationModel)
  const model = findModel(modelCatalog, form.generationModel)
  const usable = Boolean(model && model.usable !== false)
  const efforts = model?.reasoningEfforts ?? []
  const price = model ? modelPriceText(model) : null
  const promptVersions = modelCatalog?.promptVersions ?? [form.promptVersion]
  const bounds = fieldBounds(modelCatalog?.limits, model)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Model soạn câu trả lời"
          htmlFor="rag-model-select"
          hint={
            model
              ? [
                  price ?? 'Chưa có giá trong danh sách model.',
                  model.pricingEffectiveDate && `Giá áp dụng từ ${model.pricingEffectiveDate}.`,
                ]
                  .filter(Boolean)
                  .join(' ')
              : undefined
          }
        >
          <Select
            id="rag-model-select"
            value={form.generationModel}
            disabled={isSaving || !modelCatalog}
            aria-describedby="rag-model-select-msg"
            onChange={(e) => {
              const next = findModel(modelCatalog, e.target.value)
              if (next) onChange((p) => withModel(p, next))
            }}
          >
            {options.map(({ model: m, disabled }) => (
              <option key={m.id} value={m.id} disabled={disabled}>
                {m.displayName || m.id}
                {m.isDefault ? ' (mặc định)' : ''}
                {disabled ? ' (không còn dùng được)' : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Phiên bản câu lệnh hệ thống" htmlFor="rag-prompt-select">
          <Select
            id="rag-prompt-select"
            value={form.promptVersion}
            disabled={isSaving}
            onChange={(e) => onChange((p) => ({ ...p, promptVersion: e.target.value }))}
          >
            {promptVersions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>

        {efforts.length > 0 && (
          <Field
            label="Mức suy luận"
            htmlFor="rag-reasoning-select"
            hint="Cao hơn thì trả lời kỹ hơn nhưng chậm và tốn hơn."
          >
            <Select
              id="rag-reasoning-select"
              value={form.reasoningEffort ?? model?.defaultReasoningEffort ?? efforts[0]}
              disabled={isSaving}
              aria-describedby="rag-reasoning-select-msg"
              onChange={(e) => onChange((p) => ({ ...p, reasoningEffort: e.target.value }))}
            >
              {efforts.map((v) => (
                <option key={v} value={v}>
                  {v}
                  {v === model?.defaultReasoningEffort ? ' (mặc định)' : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {modelCatalog && !usable && (
        <Notice tone="warn" title={`Model ${form.generationModel} không còn dùng được`}>
          Cấu hình này vẫn đang lưu model đó nên chi phí bị tính theo giá cao nhất. Chọn một model trong danh sách rồi
          lưu bản nháp.
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {model?.supportsTemperature !== false && (
          <SettingFieldInput
            id="temperature"
            label="Độ ngẫu nhiên"
            description="Giá trị thấp bám sát tài liệu; cao hơn cho câu trả lời tự nhiên."
            value={form.temperature ?? DEFAULT_RAG_TEMPERATURE}
            unit="độ"
            min={bounds.temperature.min}
            max={bounds.temperature.max}
            step={0.01}
            defaultValue={DEFAULT_RAG_TEMPERATURE}
            disabled={isSaving}
            onChange={(v) => onChange((p) => ({ ...p, temperature: v }))}
          />
        )}
        <SettingFieldInput
          id="maxOutputTokens"
          label="Token trả lời tối đa"
          description={`Độ dài tối đa của câu trả lời. Dịch vụ trả lời chỉ dùng tối đa ${cap(RAG_SERVICE_CAPS.maxOutputTokens)} token; số lớn hơn không có tác dụng.`}
          value={form.maxOutputTokens}
          unit="token"
          min={bounds.maxOutputTokens.min}
          max={bounds.maxOutputTokens.max}
          defaultValue={DEFAULT_RAG_VALUES.maxOutputTokens}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, maxOutputTokens: v }))}
        />
        <SettingFieldInput
          id="maxContextTokens"
          label="Token tài liệu tối đa"
          description={`Độ dài tài liệu đưa vào mỗi câu trả lời. Dịch vụ trả lời chỉ dùng tối đa ${cap(RAG_SERVICE_CAPS.maxContextTokens)} token.`}
          value={form.maxContextTokens}
          unit="token"
          min={bounds.maxContextTokens.min}
          max={bounds.maxContextTokens.max}
          defaultValue={DEFAULT_RAG_VALUES.maxContextTokens}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, maxContextTokens: v }))}
        />
        <SettingFieldInput
          id="chunkCharacters"
          label="Kích thước đoạn văn bản"
          description="Số ký tự tối đa của một đoạn khi chia nhỏ tài liệu."
          value={form.chunkCharacters}
          unit="ký tự"
          min={bounds.chunkCharacters.min}
          max={bounds.chunkCharacters.max}
          defaultValue={DEFAULT_RAG_VALUES.chunkCharacters}
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
          defaultValue={DEFAULT_RAG_VALUES.chunkOverlap}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, chunkOverlap: v }))}
        />
        <SettingFieldInput
          id="topK"
          label="Số đoạn trích xuất (Top K)"
          description="Số lượng đoạn tài liệu liên quan cao nhất được nạp vào câu trả lời."
          value={form.topK}
          unit="đoạn"
          min={bounds.topK.min}
          max={bounds.topK.max}
          defaultValue={DEFAULT_RAG_VALUES.topK}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, topK: v }))}
        />
        <SettingFieldInput
          id="minScore"
          label="Ngưỡng tương đồng tối thiểu"
          description="Các đoạn tài liệu có điểm tương đồng dưới ngưỡng này sẽ bị loại."
          value={form.minScore}
          unit="điểm"
          min={bounds.minScore.min}
          max={bounds.minScore.max}
          step={0.001}
          defaultValue={DEFAULT_RAG_VALUES.minScore}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, minScore: v }))}
        />
        <SettingFieldInput
          id="maxHistoryMessages"
          label="Lịch sử hội thoại tối đa"
          description="Số tin nhắn hội thoại gần nhất đưa vào ngữ cảnh sinh câu trả lời."
          value={form.maxHistoryMessages}
          unit="tin nhắn"
          min={bounds.maxHistoryMessages.min}
          max={bounds.maxHistoryMessages.max}
          defaultValue={DEFAULT_RAG_VALUES.maxHistoryMessages}
          disabled={isSaving}
          onChange={(v) => onChange((p) => ({ ...p, maxHistoryMessages: v }))}
        />
      </div>

      <div className="rounded-control border border-line bg-panel p-3.5">
        <label htmlFor="rag-notes-input" className="text-body font-medium text-fg">
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
          className="mt-2 w-full rounded-control border border-line bg-panel p-2.5 text-body text-fg outline-none focus:border-accent"
        />
      </div>
    </div>
  )
}
