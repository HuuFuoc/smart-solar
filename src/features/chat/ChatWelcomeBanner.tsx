import { ChatSuggestionChips } from './ChatSuggestionChips'

// Lời chào khi chưa có câu hỏi nào: trợ lý trả lời gì và vài câu hỏi gợi ý
export function ChatWelcomeBanner({
  onSelectPrompt,
  disabled,
}: {
  onSelectPrompt: (prompt: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-3">
      <p className="text-body text-fg-2">
        Hỏi về sản phẩm, lắp đặt, bảo hành, bảo trì và chính sách. Trợ lý trả lời theo tài liệu Smart Solar đã công bố,
        kèm nguồn; câu trả lời không thay cho tư vấn kỹ thuật hay điều khoản hợp đồng.
      </p>
      <ChatSuggestionChips onSelect={onSelectPrompt} disabled={disabled} />
    </div>
  )
}
