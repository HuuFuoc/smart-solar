import { AI_BUDGET_PERIODS } from '@/common/aiUsage'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { KeyValueList, Notice, Progress } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { alertTone, budgetAlertText, formatCount } from '@/features/ai-usage/aiUsageDisplay'
import { formatUsd } from '@/features/ai-usage/aiUsageRules'
import type { AiBudgetLineView, AiBudgetView } from '@/types/res/adminRagUsageRes'

// Ngân sách đang áp dụng (GET /admin/rag-budget): ba kỳ, cảnh báo của backend và các giới hạn của trợ lý

const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const used = (line: AiBudgetLineView) => line.settledUsd + line.uncertainUsd + line.reservedUsd

function BudgetLines({ lines }: { lines: AiBudgetLineView[] }) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Kỳ</Th>
          <Th className="text-right">Đã dùng</Th>
          <Th className="text-right">Hạn mức</Th>
          <Th className="text-right">Còn lại</Th>
          <Th>Tỉ lệ</Th>
          <Th className="text-right">Chờ đối soát</Th>
          <Th className="text-right">Bị từ chối</Th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <Tr key={line.period}>
            <Td label="Kỳ">
              <p className="font-medium text-fg">{AI_BUDGET_PERIODS[line.period] ?? line.period}</p>
              <p className="text-meta text-fg-3">{formatCount(line.requests)} lượt</p>
            </Td>
            <Td label="Đã dùng" className="tnum lg:text-right">
              {formatUsd(used(line))}
              {line.reservedUsd > 0 && <p className="text-meta text-fg-3">đang giữ {formatUsd(line.reservedUsd)}</p>}
            </Td>
            <Td label="Hạn mức" className="tnum lg:text-right">
              {formatUsd(line.limitUsd)}
            </Td>
            <Td label="Còn lại" className="tnum lg:text-right">
              {formatUsd(line.remainingUsd)}
            </Td>
            <Td label="Tỉ lệ">
              <div className="flex min-w-32 items-center gap-2">
                <Progress
                  value={line.usedPercent}
                  label={`Đã dùng ${percent.format(line.usedPercent)}% ${AI_BUDGET_PERIODS[line.period] ?? ''}`}
                  className="flex-1"
                />
                <span className="tnum text-meta text-fg-2">{percent.format(line.usedPercent)}%</span>
              </div>
            </Td>
            <Td label="Chờ đối soát" className="tnum lg:text-right">
              {line.uncertainUsd > 0 ? formatUsd(line.uncertainUsd) : <span className="text-fg-3">—</span>}
            </Td>
            <Td label="Bị từ chối" className="tnum lg:text-right">
              {formatCount(line.blocked)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

export function BudgetPanel({ budget, onEdit }: { budget: AiBudgetView; onEdit: () => void }) {
  return (
    <Panel>
      <PanelHeader
        title="Ngân sách"
        action={
          <Button size="sm" variant="soft" icon="edit" onClick={onEdit}>
            Sửa giới hạn
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        {budget.alerts.length > 0 && (
          <div className="space-y-2">
            {budget.alerts.map((a) => (
              <Notice key={a.code} tone={alertTone(a.severity)}>
                {budgetAlertText(a)}
              </Notice>
            ))}
          </div>
        )}
        <BudgetLines lines={[budget.today, budget.month, budget.ingestionMonth]} />
        <KeyValueList
          columns={2}
          items={[
            {
              k: 'Soạn câu trả lời',
              v: budget.generationEnabled ? (
                <Badge tone="ok">Đang bật</Badge>
              ) : (
                <Badge tone="warn">Đang tắt, chỉ trả lời câu tư vấn cấu hình</Badge>
              ),
            },
            { k: 'Model trả lời', v: budget.activeGenerationModel ?? '—' },
            { k: 'Model đọc câu hỏi', v: budget.activeEmbeddingModel ?? '—' },
            {
              k: 'Phiên bản cấu hình',
              v: budget.bootstrap ? 'Giá trị mặc định' : `v${budget.activeVersion}`,
            },
            { k: 'Số câu mỗi người mỗi ngày', v: formatCount(budget.userRequestsPerDay) },
            {
              k: 'Số câu cùng lúc',
              v: `${formatCount(budget.userConcurrency)} mỗi người, ${formatCount(budget.globalConcurrency)} toàn hệ thống`,
            },
            { k: 'Ký tự mỗi câu hỏi', v: `Tối đa ${formatCount(budget.maxQuestionCharacters)}` },
            { k: 'Thời gian chờ trả lời', v: `${formatCount(budget.generationTimeoutSeconds)} giây` },
          ]}
        />
      </PanelBody>
    </Panel>
  )
}
