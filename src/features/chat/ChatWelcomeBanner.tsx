import { Icon } from '@/components/common/stitch-ui/Icon'
import { ChatSuggestionChips } from './ChatSuggestionChips'

export function ChatWelcomeBanner({
  onSelectPrompt,
  disabled,
}: {
  onSelectPrompt: (prompt: string) => void
  disabled?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-container border border-line bg-surface-2/30 p-5 md:p-6 lg:p-7">
      <div className="flex flex-col-reverse gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-accent-soft text-accent">
              <Icon name="auto_awesome" className="text-[20px]" />
            </span>
            <h2 className="text-title font-semibold text-fg">Hỏi trợ lý Smart Solar</h2>
          </div>
          <p className="text-body leading-relaxed text-fg-2">
            Trợ lý trả lời về sản phẩm, lắp đặt, bảo hành, bảo trì và chính sách theo tài liệu Smart Solar đã công bố,
            kèm nguồn. Câu trả lời sẽ nêu rõ tài liệu hỗ trợ khi trợ lý nói rõ. Câu trả lời không thay thế tư vấn kỹ
            thuật hay điều khoản hợp đồng.
          </p>
          <div className="pt-2">
            <ChatSuggestionChips onSelect={onSelectPrompt} disabled={disabled} />
          </div>
        </div>

        <div className="flex shrink-0 justify-center md:justify-end">
          <img
            src="/images/ai-assistant-mascot.png"
            alt="Trợ lý AI Smart Solar"
            className="h-auto w-40 object-contain md:w-56 lg:w-64"
          />
        </div>
      </div>
    </div>
  )
}
