import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { contractStatusMeta, formatContractMoney, versionLabel } from '@/features/contracts/contractDisplay'
import { byVersionDesc } from '@/features/contracts/contractRules'
import { withId } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'

// Các phiên bản hợp đồng của một yêu cầu, mới nhất trước. Phụ lục ghi phiên bản nó thay; bản bị thay giữ lại để xem lịch sử
export function ContractVersionList({
  versions,
  detailPattern,
  currentId,
  viewer = 'staff',
}: {
  versions: ContractView[]
  /** Đường dẫn trang chi tiết hợp đồng của portal đang xem */
  detailPattern: string
  /** Phiên bản đang mở trên trang, không vẽ nút mở */
  currentId?: string
  /** Nhãn trạng thái theo người xem */
  viewer?: 'staff' | 'customer'
}) {
  const byId = new Map(versions.map((v) => [v.contractId, v]))
  return (
    <ul className="divide-y divide-line">
      {[...versions].sort(byVersionDesc).map((c) => {
        const status = contractStatusMeta(c.status, viewer)
        const previous = c.previousContractId ? byId.get(c.previousContractId) : undefined
        return (
          <li key={c.contractId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body">
                <span className="font-medium text-fg">{versionLabel(c)}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
                <span className="tnum text-fg">{formatContractMoney(c)}</span>
              </p>
              <p className="tnum text-meta text-fg-2">
                {c.contractNumber}
                {previous ? `, thay phiên bản ${previous.version}` : ''}
                {c.issuedAt ? `, phát hành ${formatMoment(c.issuedAt)}` : ''}
              </p>
            </div>
            {c.contractId !== currentId && (
              <ButtonLink to={withId(detailPattern, c.contractId)} size="sm" variant="info" icon="visibility">
                Mở
              </ButtonLink>
            )}
          </li>
        )
      })}
    </ul>
  )
}
