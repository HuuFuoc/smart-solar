import { Icon } from '@/components/common/stitch-ui/Icon'

type SuggestionTopic = {
  id: string
  label: string
  icon: string
  prompt: string
}

const CHAT_SUGGESTIONS: SuggestionTopic[] = [
  {
    id: 'product',
    label: 'Sản phẩm',
    icon: 'inventory_2',
    prompt: 'Smart Solar có những dòng tấm pin và inverter nào phổ biến?',
  },
  {
    id: 'installation',
    label: 'Lắp đặt',
    icon: 'handyman',
    prompt: 'Quy trình và tiêu chuẩn kỹ thuật khi lắp đặt hệ thống pin mặt trời?',
  },
  {
    id: 'warranty',
    label: 'Bảo hành',
    icon: 'verified_user',
    prompt: 'Chính sách, điều kiện và thời hạn bảo hành của hệ thống ra sao?',
  },
  {
    id: 'maintenance',
    label: 'Bảo trì',
    icon: 'engineering',
    prompt: 'Quy trình kiểm tra, bảo trì và vệ sinh định kỳ hệ thống điện mặt trời?',
  },
  {
    id: 'policy',
    label: 'Chính sách',
    icon: 'description',
    prompt: 'Chính sách cam kết hiệu suất, thanh toán và hỗ trợ kỹ thuật Smart Solar?',
  },
]

export function ChatSuggestionChips({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Gợi ý câu hỏi">
      {CHAT_SUGGESTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(s.prompt)}
          className="press inline-flex items-center gap-2 rounded-control border border-line bg-canvas px-3.5 py-2 text-body font-medium text-fg hover:border-accent-line hover:bg-accent-soft hover:text-accent disabled:opacity-60"
        >
          <Icon name={s.icon} className="text-[20px] text-accent" />
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  )
}
