import { useId, useState } from 'react'
import { ActivityList } from '@/components/common/ui/lists'
import { CardTabs, CardTitle, TechCard } from '@/features/contracts/tech-contract/TechCardParts'
import { contractEventLabel, contractStatusLabel, warrantyText } from '@/features/contracts/contractDisplay'
import { parseTerms, type TermsLine } from '@/features/contracts/contractTerms'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { ContractView } from '@/types/res/customerContractsRes'

// Thẻ "Điều khoản cam kết, nhật ký hợp đồng" của trang hợp đồng 30/70 phía kỹ thuật viên: hai tab, điều khoản đúng chữ backend
// dựng (parseTerms chỉ tách mục, không đổi chữ) và nhật ký sự kiện của hợp đồng, mới nhất lên đầu

type Tab = 'terms' | 'log'

/** Điều có dạng "Tiêu đề: nội dung" thì in đậm phần tiêu đề; chữ giữ nguyên */
function splitTitle(text: string) {
  const at = text.indexOf(':')
  if (at < 3 || at > 90 || at === text.length - 1 || text.slice(0, at).includes('\n')) return null
  return { title: text.slice(0, at + 1), body: text.slice(at + 1).trim() }
}

function TermItem({ line }: { line: TermsLine }) {
  if (line.kind === 'text') return <p className="whitespace-pre-line">{line.text}</p>
  const split = splitTitle(line.text)
  return (
    <div>
      <p className="font-bold text-fg">
        <span className="tnum">{line.number}.</span> {split ? split.title : null}
      </p>
      <p className="mt-1 whitespace-pre-line">{split ? split.body : line.text}</p>
    </div>
  )
}

export function TechTermsCard({ contract: c }: { contract: ContractView }) {
  const [tab, setTab] = useState<Tab>('terms')
  const panelId = useId()
  const sections = parseTerms(c.terms)
  const itemCount = sections.reduce((n, s) => n + s.lines.filter((l) => l.kind === 'item').length, 0)
  const events = [...(c.events ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

  return (
    <TechCard aria-labelledby="tech-terms">
      <CardTitle
        id="tech-terms"
        icon="gavel"
        aside={
          <CardTabs
            label="Nội dung thẻ"
            panelId={panelId}
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'terms', label: `Điều khoản (${itemCount > 0 ? itemCount : sections.length} mục)` },
              { value: 'log', label: `Nhật ký hệ thống (${events.length})` },
            ]}
          />
        }
      >
        Điều khoản cam kết, nhật ký hợp đồng
      </CardTitle>

      <div id={panelId} role="tabpanel" className="space-y-4">
        {tab === 'terms' ? (
          <>
            <p className="text-meta text-fg-2">
              Giá theo báo giá phiên bản {c.quotationVersion} khách đã đồng ý, bảo hành lắp đặt{' '}
              {warrantyText(c.warrantyMonths)}.
            </p>
            {sections.length === 0 ? (
              <p className="text-body text-fg-2">Chưa có điều khoản.</p>
            ) : (
              <div className="space-y-5 text-body text-fg-2">
                {sections.map((s, i) => (
                  <section key={`${i}-${s.heading ?? ''}`} className="space-y-4">
                    {s.heading && <h3 className="text-body font-bold text-fg">{s.heading}</h3>}
                    {s.lines.map((l, j) => (
                      <TermItem key={j} line={l} />
                    ))}
                  </section>
                ))}
              </div>
            )}
          </>
        ) : events.length === 0 ? (
          <p className="text-body text-fg-2">Chưa có sự kiện nào.</p>
        ) : (
          <ActivityList
            items={events.map((e) => ({
              time: formatMoment(e.createdAt),
              title: contractEventLabel(e.eventType),
              body:
                e.fromStatus && e.toStatus
                  ? `${contractStatusLabel(e.fromStatus)} sang ${contractStatusLabel(e.toStatus)}.`
                  : undefined,
            }))}
          />
        )}
      </div>
    </TechCard>
  )
}
