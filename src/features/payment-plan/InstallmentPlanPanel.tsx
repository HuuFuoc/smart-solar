import { useState, type ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { InstallmentPaymentBlock } from '@/features/payment-plan/InstallmentPaymentBlock'
import {
  dueText,
  formatVnd,
  installmentName,
  installmentStatusMeta,
  ownershipText,
  stageMeta,
} from '@/features/payment-plan/paymentPlanDisplay'
import { installmentWaitReason, isOverdueAt, moneySplit } from '@/features/payment-plan/paymentPlanRules'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { InstallmentActor } from '@/services/installmentService'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentPlanView, InstallmentView } from '@/types/res/paymentPlanRes'
import { cx } from '@/utils/cx'

// Hai khoản của hợp đồng 30/70: số tiền, trạng thái, hạn đều lấy từ backend. Khối thanh toán chỉ vẽ cho khoản đang đến hạn (mỗi
// khối gọi một API có giới hạn số lần), khoản đã trả đọc từ hợp đồng. Không khẳng định gì về pháp lý: điều khoản còn chờ duyệt
// thì báo vàng, quyền sở hữu chỉ ghi "đủ điều kiện xem xét"

const WAIT_TEXT: Record<NonNullable<ReturnType<typeof installmentWaitReason>>, string> = {
  'balance-after-acceptance': 'Mở khi khách nghiệm thu công trình',
  'deposit-closed': 'Không còn trả được (hợp đồng đã qua bước trả 30%)',
  'balance-needs-signature': 'Chờ ký hợp đồng giấy',
  cancelled: 'Đã huỷ cùng hợp đồng',
}

function InstallmentRow({ i, contractStatus, now }: { i: InstallmentView; contractStatus: string; now: number }) {
  const status = installmentStatusMeta(i.status)
  const overdue = isOverdueAt(i, now)
  const wait = installmentWaitReason(i, contractStatus)
  return (
    <Tr>
      <Td label="Khoản">
        <span className="font-medium text-fg">{installmentName(i)}</span>
        <p className="tnum text-meta text-fg-2">{i.percent.toLocaleString('vi-VN')}% tổng giá trị</p>
      </Td>
      <Td label="Số tiền" className="tnum">
        {formatVnd(i.amount)}
      </Td>
      <Td label="Trạng thái">
        <Badge tone={overdue ? 'danger' : status.tone}>{overdue ? 'Quá hạn' : status.label}</Badge>
        {wait && i.status !== 'DUE' && <p className="text-meta text-fg-2">{WAIT_TEXT[wait]}</p>}
      </Td>
      <Td label="Hạn, ngày trả" className="tnum">
        {i.status === 'PAID'
          ? `Trả lúc ${formatMoment(i.paidAt)}${i.paidLate ? ' (sau hạn)' : ''}`
          : (dueText(i.dueAt) ?? '—')}
      </Td>
    </Tr>
  )
}

export function PlanSummary({
  plan,
  viewer,
  now,
}: {
  plan: ContractPaymentPlanView
  viewer: 'staff' | 'customer'
  now: number
}) {
  const split = moneySplit(plan, now)
  const stage = stageMeta(plan.stage, viewer)
  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-body text-fg-2">
        Chặng hiện tại <Badge tone={stage.tone}>{stage.label}</Badge>
      </p>
      <Facts
        items={[
          { k: 'Tổng giá trị', v: <span className="tnum">{formatVnd(plan.total)}</span> },
          { k: 'Đã trả', v: <span className="tnum">{formatVnd(plan.paid)}</span> },
          { k: 'Còn lại', v: <span className="tnum">{formatVnd(split.outstanding)}</span> },
          { k: 'Phải trả ngay', v: <span className="tnum">{formatVnd(split.dueNow)}</span> },
          {
            k: 'Quá hạn',
            v: <span className={split.overdue > 0 ? 'tnum text-danger' : 'tnum'}>{formatVnd(split.overdue)}</span>,
          },
          { k: 'Hạn gần nhất', v: plan.nextDueAt ? <span className="tnum">{formatMoment(plan.nextDueAt)}</span> : '—' },
          { k: 'Hợp đồng giấy', v: plan.paperSigned ? 'Đã ký, đã tải đủ trang' : 'Chưa ký' },
          { k: 'Quyền sở hữu thiết bị', v: ownershipText(plan.ownershipStatus) },
        ]}
      />
    </div>
  )
}

function Tile({ label, value, tone }: { label: string; value: ReactNode; tone?: 'accent' | 'danger' }) {
  return (
    <div className="ct-tile" data-tone={tone}>
      <dt className="text-meta text-fg-2">{label}</dt>
      <dd
        className={cx(
          'tnum mt-1 text-body font-semibold',
          tone === 'accent' ? 'text-accent-fg' : tone === 'danger' ? 'text-danger' : 'text-fg',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function InfoBox({ label, icon, done, children }: { label: string; icon: string; done: boolean; children: ReactNode }) {
  return (
    <div className="ct-box ct-well min-w-0 px-3 py-2.5">
      <dt className="text-meta text-fg-2">{label}</dt>
      <dd className="mt-1 flex gap-1.5 text-meta font-medium text-fg">
        <Icon name={icon} className={cx('mt-0.5 shrink-0 text-[16px]', done ? 'text-ok' : 'text-fg-3')} />
        <span className="min-w-0">{children}</span>
      </dd>
    </div>
  )
}

const OWNERSHIP_ICONS: Record<string, string> = { OWNERSHIP_TRANSFER_ELIGIBLE: 'check', OWNERSHIP_RETAINED: 'lock' }

/** Số liệu của gói dạng ô (trang hợp đồng của khách): cùng số với PlanSummary */
function PlanTiles({ plan, now }: { plan: ContractPaymentPlanView; now: number }) {
  const split = moneySplit(plan, now)
  return (
    <>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Tile label="Tổng giá trị" value={formatVnd(plan.total)} />
        <Tile label="Đã trả" value={formatVnd(plan.paid)} tone={plan.paid > 0 ? 'accent' : undefined} />
        <Tile label="Còn lại" value={formatVnd(split.outstanding)} />
        <Tile label="Phải trả ngay" value={formatVnd(split.dueNow)} />
        <Tile label="Quá hạn" value={formatVnd(split.overdue)} tone={split.overdue > 0 ? 'danger' : undefined} />
        <Tile label="Hạn gần nhất" value={plan.nextDueAt ? formatMoment(plan.nextDueAt) : '—'} />
      </dl>
      <dl className="grid gap-2 sm:grid-cols-2">
        <InfoBox label="Hợp đồng giấy" icon={plan.paperSigned ? 'check' : 'schedule'} done={plan.paperSigned}>
          {plan.paperSigned ? 'Đã ký, đã tải đủ trang' : 'Chưa ký'}
        </InfoBox>
        <InfoBox
          label="Quyền sở hữu thiết bị"
          icon={OWNERSHIP_ICONS[plan.ownershipStatus ?? ''] ?? 'remove'}
          done={plan.ownershipStatus === 'OWNERSHIP_TRANSFER_ELIGIBLE'}
        >
          {ownershipText(plan.ownershipStatus)}
        </InfoBox>
      </dl>
    </>
  )
}

/** `variant="card"`: kiểu thẻ của trang hợp đồng phía khách (ô số liệu, bảng có khung; xem contract-detail.css) */
export function InstallmentPlanPanel({
  contract: c,
  actor,
  canConfirmCash = false,
  variant = 'plain',
}: {
  contract: ContractView & { paymentPlan: ContractPaymentPlanView }
  actor: InstallmentActor
  canConfirmCash?: boolean
  variant?: 'plain' | 'card'
}) {
  const plan = c.paymentPlan
  // Mốc giờ của lần vẽ; quá hạn chính thức vẫn là cờ `overdue` của backend
  const [now] = useState(() => Date.now())
  const live = plan.installments.filter((i) => i.status === 'DUE')
  const card = variant === 'card'
  const table = (
    <Table stack>
      <thead>
        <tr>
          <Th>Khoản</Th>
          <Th>Số tiền</Th>
          <Th>Trạng thái</Th>
          <Th>Hạn, ngày trả</Th>
        </tr>
      </thead>
      <tbody>
        {plan.installments.map((i) => (
          <InstallmentRow key={i.installmentId} i={i} contractStatus={c.status} now={now} />
        ))}
      </tbody>
    </Table>
  )
  return (
    <Panel id="installments" className="scroll-mt-6">
      <PanelHeader
        title="Thanh toán theo khoản (30% và 70%)"
        description="Trả 30% trước khi ký hợp đồng giấy; khoản 70% mở khi khách nghiệm thu, hạn tối đa 72 giờ."
      />
      <PanelBody className="space-y-4">
        {plan.termsPendingLegalReview && (
          <Notice tone="warn" title="Điều khoản thanh toán và sở hữu đang chờ bộ phận pháp lý duyệt">
            Nội dung hiển thị đúng như hợp đồng đã lập; Smart Solar có thể cập nhật điều khoản sau khi duyệt.
          </Notice>
        )}
        {actor === 'staff' && plan.legalReviewRequired && (
          <Notice tone="warn" title="Có hồ sơ công nợ đang chờ xem xét pháp lý">
            Xem ở mục Thu hồi công nợ.
          </Notice>
        )}
        {card ? (
          <PlanTiles plan={plan} now={now} />
        ) : (
          <PlanSummary plan={plan} viewer={actor === 'customer' ? 'customer' : 'staff'} now={now} />
        )}
        {card ? <div className="ct-table">{table}</div> : table}
        {live.map((i) => (
          <div key={i.installmentId} className="border-t border-line pt-4">
            <InstallmentPaymentBlock
              actor={actor}
              contractId={c.contractId}
              sequence={i.sequence}
              canConfirmCash={canConfirmCash}
            />
          </div>
        ))}
        {plan.fullyPaid && <Notice tone="ok">Đã trả đủ 100% hợp đồng.</Notice>}
      </PanelBody>
    </Panel>
  )
}
