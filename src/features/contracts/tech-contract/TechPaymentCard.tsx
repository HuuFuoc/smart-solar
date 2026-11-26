import { useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Notice } from '@/components/common/ui/lists'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { CardTitle, Stat, TechCard } from '@/features/contracts/tech-contract/TechCardParts'
import { installmentPurpose, TONE_TEXT } from '@/features/contracts/tech-contract/techContractDisplay'
import { installmentAllocations } from '@/features/payment-plan/bundledContractRules'
import { InstallmentPaymentBlock } from '@/features/payment-plan/InstallmentPaymentBlock'
import {
  dueText,
  formatVnd,
  installmentName,
  installmentStatusMeta,
  ownershipText,
} from '@/features/payment-plan/paymentPlanDisplay'
import { installmentWaitReason, isOverdueAt, moneySplit } from '@/features/payment-plan/paymentPlanRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { InstallmentActor } from '@/services/installmentService'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentPlanView, InstallmentView } from '@/types/res/paymentPlanRes'
import { cx } from '@/utils/cx'

// Thẻ "Thanh toán theo khoản" của trang hợp đồng 30/70 phía kỹ thuật viên: số liệu, hai khoản, phần chia của từng đợt và khối thu
// tiền của khoản đang đến hạn (InstallmentPaymentBlock, cùng khối với trang cũ). Số tiền, trạng thái, hạn đều của backend

const WAIT_TEXT: Record<NonNullable<ReturnType<typeof installmentWaitReason>>, string> = {
  'balance-after-acceptance': 'Mở khi khách ký nghiệm thu công trình',
  'deposit-closed': 'Không còn trả được (hợp đồng đã qua bước trả 30%)',
  'balance-needs-signature': 'Chờ ký hợp đồng giấy',
  cancelled: 'Đã huỷ cùng hợp đồng',
}

function InstallmentRow({ i, contractStatus, now }: { i: InstallmentView; contractStatus: string; now: number }) {
  const overdue = isOverdueAt(i, now)
  const status = overdue
    ? { label: 'Quá hạn', tone: 'danger' as const }
    : i.status === 'PAID'
      ? { label: 'Đã thanh toán', tone: 'ok' as const }
      : installmentStatusMeta(i.status)
  const wait = installmentWaitReason(i, contractStatus)
  const purpose = installmentPurpose(i)
  return (
    <Tr>
      <Td label="Khoản thu">
        <span className="font-semibold text-fg">{installmentName(i)}</span>
        {purpose && <p className="text-meta text-fg-2">{purpose}</p>}
      </Td>
      <Td label="Số tiền" className="tnum font-semibold text-fg">
        {formatVnd(i.amount)}
      </Td>
      <Td label="Trạng thái">
        <span className={cx('text-body font-semibold', TONE_TEXT[status.tone])}>{status.label}</span>
      </Td>
      <Td label="Mốc thời gian, điều kiện" className="tnum text-fg-2 lg:text-right">
        {i.status === 'PAID'
          ? `Trả lúc ${formatMoment(i.paidAt)}${i.paidLate ? ' (sau hạn)' : ''}`
          : i.status === 'DUE'
            ? (dueText(i.dueAt) ?? 'Trả được ngay')
            : wait
              ? WAIT_TEXT[wait]
              : '—'}
      </Td>
    </Tr>
  )
}

function Allocation({ plan }: { plan: ContractPaymentPlanView }) {
  const rows = installmentAllocations(plan)
  if (!rows) return null
  return (
    <section aria-labelledby="tech-allocation" className="space-y-3">
      <h3 id="tech-allocation" className="ct-eyebrow text-fg-2">
        Phân bổ chi tiết theo đợt
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.sequence} className="ct-box ct-well p-3">
            <p className="flex items-baseline justify-between gap-3 text-body font-bold text-fg">
              <span>
                Đợt {r.sequence} ({r.percent.toLocaleString('vi-VN')}%)
              </span>
              <span className="tnum">{formatVnd(r.amount)}</span>
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <Stat label="Chi phí lắp đặt" value={formatVnd(r.installation)} />
              {r.disaster > 0 && <Stat label="Gói thiên tai" value={formatVnd(r.disaster)} />}
              {r.maintenance > 0 && <Stat label="Gói bảo trì" value={formatVnd(r.maintenance)} />}
            </dl>
          </div>
        ))}
      </div>
      <p className="text-meta text-fg-2 italic">
        * Số tiền thanh toán của mỗi đợt đã gồm gói dịch vụ đi kèm; không thu riêng gói.
      </p>
    </section>
  )
}

export function TechPaymentCard({
  contract: c,
  actor,
}: {
  contract: ContractView & { paymentPlan: ContractPaymentPlanView }
  actor: InstallmentActor
}) {
  const plan = c.paymentPlan
  // Mốc giờ của lần vẽ; quá hạn chính thức vẫn là cờ `overdue` của backend
  const [now] = useState(() => Date.now())
  const split = moneySplit(plan, now)
  const live = plan.installments.filter((i) => i.status === 'DUE')
  const paidCount = plan.installments.filter((i) => i.status === 'PAID').length
  const pages = plan.signature?.status === 'FINALIZED' ? plan.signature.expectedPageCount : null
  return (
    <TechCard id="installments" className="scroll-mt-6" aria-labelledby="tech-installments">
      <CardTitle
        id="tech-installments"
        icon="payments"
        aside={
          <span className="tnum">
            Đã thu {paidCount}/{plan.installments.length} khoản
          </span>
        }
      >
        Thanh toán theo khoản (30% và 70%)
      </CardTitle>
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
          <Stat label="Tổng giá trị" value={formatVnd(plan.total)} />
          <Stat label="Đã trả" value={formatVnd(plan.paid)} tone={plan.paid > 0 ? 'accent' : undefined} />
          <Stat label="Còn lại" value={formatVnd(split.outstanding)} />
          <Stat label="Phải trả ngay" value={formatVnd(split.dueNow)} />
          <Stat label="Quá hạn" value={formatVnd(split.overdue)} tone={split.overdue > 0 ? 'danger' : undefined} />
          <Stat label="Hạn gần nhất" value={plan.nextDueAt ? formatMoment(plan.nextDueAt) : '—'} />
        </dl>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 gap-2 text-meta">
            <Icon
              name={plan.paperSigned ? 'task_alt' : 'schedule'}
              className={cx('shrink-0 text-[20px]', plan.paperSigned ? 'text-ok' : 'text-fg-3')}
            />
            <div className="min-w-0">
              <dt className="inline font-semibold text-fg">Hợp đồng giấy: </dt>
              <dd className="inline text-fg-2">
                {plan.paperSigned ? `Đã ký, đã tải đủ${pages ? ` ${pages} trang` : ' trang'}` : 'Chưa ký'}
              </dd>
            </div>
          </div>
          <div className="flex min-w-0 gap-2 text-meta">
            <Icon
              name={plan.ownershipStatus === 'OWNERSHIP_TRANSFER_ELIGIBLE' ? 'task_alt' : 'shield'}
              className={cx(
                'shrink-0 text-[20px]',
                plan.ownershipStatus === 'OWNERSHIP_TRANSFER_ELIGIBLE' ? 'text-ok' : 'text-fg-3',
              )}
            />
            <div className="min-w-0">
              <dt className="inline font-semibold text-fg">Quyền sở hữu: </dt>
              <dd className="inline text-fg-2">{ownershipText(plan.ownershipStatus)}</dd>
            </div>
          </div>
        </dl>

        <Table stack>
          <thead>
            <tr>
              <Th>Khoản thu</Th>
              <Th>Số tiền</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Mốc thời gian, điều kiện</Th>
            </tr>
          </thead>
          <tbody>
            {plan.installments.map((i) => (
              <InstallmentRow key={i.installmentId} i={i} contractStatus={c.status} now={now} />
            ))}
          </tbody>
        </Table>

        <Allocation plan={plan} />

        {live.map((i) => (
          <div key={i.installmentId} className="border-t border-line pt-4">
            <InstallmentPaymentBlock actor={actor} contractId={c.contractId} sequence={i.sequence} />
          </div>
        ))}
        {plan.fullyPaid && <Notice tone="ok">Đã trả đủ 100% hợp đồng.</Notice>}
      </div>
    </TechCard>
  )
}
