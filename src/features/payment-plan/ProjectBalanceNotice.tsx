import { ButtonLink } from '@/components/common/ui/button'
import { CalloutCard } from '@/features/contracts/CustomerContractCards'
import { dueText, formatVnd, installmentName } from '@/features/payment-plan/paymentPlanDisplay'
import { installmentOf } from '@/features/payment-plan/paymentPlanRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyContractQuery } from '@/hooks/useCustomerContracts'
import { ROUTES, withId } from '@/routes/paths'

// Trên trang công trình của khách: hợp đồng 30/70 đã nghiệm thu thì khoản 70% đến hạn (hạn do backend ghi, 72 giờ sau lúc nghiệm
// thu). Chỉ đọc hợp đồng để báo và dẫn sang trang hợp đồng trả tiền; không mở thanh toán ở đây. Hợp đồng cũ không vẽ gì

export function ProjectBalanceNotice({ contractId }: { contractId: string }) {
  const contract = useMyContractQuery(contractId).data
  const plan = contract?.paymentPlan
  if (!contract || !plan) return null
  const balance = installmentOf(plan, 2)
  if (!balance) return null
  const to = withId(ROUTES.customer.contract, contractId)

  if (balance.status === 'PAID')
    return (
      <CalloutCard
        tone="ok"
        title={
          <span className="tnum">
            Đã trả {installmentName(balance).toLowerCase()} lúc {formatMoment(balance.paidAt)}
          </span>
        }
      >
        {plan.fullyPaid ? (
          <>
            Hợp đồng đã trả đủ <span className="font-semibold text-fg">100%</span>.
          </>
        ) : null}
      </CalloutCard>
    )
  if (balance.status !== 'DUE') return null
  return (
    <CalloutCard
      tone="danger"
      title={`${balance.overdue ? 'Khoản 70% đã quá hạn' : 'Trả khoản 70%'}: ${formatVnd(balance.amount)}`}
      action={
        <ButtonLink to={to} size="sm" variant="info" icon="payments">
          Trả 70%
        </ButtonLink>
      }
    >
      <span className="tnum">{dueText(balance.dueAt)} (giờ Việt Nam).</span>{' '}
      {balance.overdue
        ? 'Bạn vẫn trả được; khoản trả muộn được ghi lại. Liên hệ Smart Solar nếu cần hỗ trợ.'
        : 'Trả bằng mã QR trong ứng dụng hoặc tiền mặt có phiếu thu của Smart Solar.'}
    </CalloutCard>
  )
}
