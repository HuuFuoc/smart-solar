import { Badge, type Tone } from '@/components/common/ui/badge'
import { Notice } from '@/components/common/ui/lists'
import type { AdvisorConfiguration, SolarAdvisorView } from '@/types/res/chatRes'
import { formatMoney } from '@/utils/format'

// Kết quả của trợ lý cấu hình dưới câu trả lời: cấu hình tham khảo theo giá danh mục hiện hành, KHÔNG phải báo giá. Luôn hiện lời
// lưu ý của backend; thiếu số liệu thì hiện câu hỏi của backend để khách trả lời ở câu tiếp theo

const STATUS: Record<string, { label: string; tone: Tone }> = {
  READY: { label: 'Cấu hình tham khảo', tone: 'ok' },
  NEEDS_INPUT: { label: 'Cần thêm số liệu', tone: 'warn' },
  BLOCKED: { label: 'Chưa tư vấn được', tone: 'warn' },
}

const LIMITED_BY: Record<string, string> = {
  CONSUMPTION: 'Theo điện tiêu thụ',
  AREA: 'Tối đa theo diện tích',
  BUDGET: 'Vừa ngân sách',
}

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

function Configuration({ c }: { c: AdvisorConfiguration }) {
  return (
    <li className="space-y-0.5 py-2 first:pt-0 last:pb-0">
      <p className="text-body font-medium text-fg">{LIMITED_BY[c.limitedBy] ?? c.limitedBy}</p>
      <p className="tnum text-body text-fg">
        {c.panelCount} × {c.panel.name}, {num.format(c.systemKwp)} kWp
      </p>
      <p className="text-meta text-fg-2">
        Inverter: {c.inverter ? c.inverter.name : (c.inverterNote ?? 'chưa chọn được')}
      </p>
      {c.averageMonthlyProductionKwh != null && (
        <p className="tnum text-meta text-fg-2">
          Khoảng {num.format(c.averageMonthlyProductionKwh)} kWh/tháng
          {c.consumptionCoveragePercent != null
            ? `, đáp ứng ${num.format(c.consumptionCoveragePercent)}% điện dùng`
            : ''}
        </p>
      )}
      <p className="tnum text-body font-semibold text-fg">
        Ước tính {formatMoney(c.estimatedTotal, 'VND')}
        {!c.withinBudget && <span className="font-normal text-fg-2">, vượt ngân sách</span>}
      </p>
    </li>
  )
}

export function AdvisorResult({ advisor }: { advisor: SolarAdvisorView }) {
  const status = STATUS[advisor.status] ?? { label: advisor.status, tone: 'neutral' as Tone }
  return (
    <section aria-label="Tư vấn cấu hình" className="mt-3 space-y-3 rounded-control border border-line p-3 text-left">
      <Badge tone={status.tone}>{status.label}</Badge>
      {advisor.missingInputs.length > 0 && (
        <div>
          <p className="text-body font-medium text-fg">Cho trợ lý biết thêm:</p>
          <ul className="mt-1 list-disc pl-5 text-body text-fg-2">
            {advisor.missingInputs.map((m) => (
              <li key={m.code}>{m.question}</li>
            ))}
          </ul>
        </div>
      )}
      {advisor.blocked.length > 0 && (
        <ul className="list-disc pl-5 text-body text-fg-2">
          {advisor.blocked.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {advisor.configurations.length > 0 && (
        <ul className="divide-y divide-line">
          {advisor.configurations.map((c, i) => (
            <Configuration key={`${c.limitedBy}-${i}`} c={c} />
          ))}
        </ul>
      )}
      {(advisor.assumptions.length > 0 || advisor.limitations.length > 0 || advisor.sources.length > 0) && (
        <details>
          <summary className="tap cursor-pointer text-meta font-medium text-fg-2">Cách tính và giới hạn</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-meta text-fg-2">
            {[...advisor.assumptions, ...advisor.limitations].map((line) => (
              <li key={line}>{line}</li>
            ))}
            {advisor.sources.map((s) => (
              <li key={`${s.kind}-${s.reference}`}>
                Nguồn: {s.reference}
                {s.detail ? `, ${s.detail}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
      <Notice tone="warn">{advisor.disclaimer}</Notice>
    </section>
  )
}
