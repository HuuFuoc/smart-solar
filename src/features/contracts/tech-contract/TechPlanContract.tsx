import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { versionLabel, warrantyText } from '@/features/contracts/contractDisplay'
import { openContractPrint } from '@/features/contracts/contractPrint'
import { goToBlock } from '@/features/contracts/goToBlock'
import { NoticeRow, TechCard } from '@/features/contracts/tech-contract/TechCardParts'
import { TechContractAside } from '@/features/contracts/tech-contract/TechContractAside'
import {
  contractCsv,
  downloadCsv,
  paymentProgressLabel,
  quickActions,
  techSteps,
  type TechStep,
  TONE_TEXT,
} from '@/features/contracts/tech-contract/techContractDisplay'
import { TechPaymentCard } from '@/features/contracts/tech-contract/TechPaymentCard'
import { TechScheduleCard } from '@/features/contracts/tech-contract/TechScheduleCard'
import { TechSignatureCard } from '@/features/contracts/tech-contract/TechSignatureCard'
import { TechSnapshotCard } from '@/features/contracts/tech-contract/TechSnapshotCard'
import { TechTermsCard } from '@/features/contracts/tech-contract/TechTermsCard'
import {
  isSchedulableContract,
  liveSchedule,
  projectLocksSchedule,
} from '@/features/installation-schedules/scheduleRules'
import { formatVnd, planNextStep, stageMeta } from '@/features/payment-plan/paymentPlanDisplay'
import { planPermissions } from '@/features/payment-plan/paymentPlanRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useTechnicianContractScheduleQuery } from '@/hooks/useInstallationSchedules'
import { useRefreshContractWorld, useTechnicianAssignment } from '@/hooks/usePaymentPlan'
import { ROUTES, withId } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentPlanView } from '@/types/res/paymentPlanRes'
import { cx } from '@/utils/cx'

// Trang hợp đồng 30/70 của kỹ thuật viên theo thiết kế người dùng gửi ngày 26/11/2026: thẻ đầu trang (số hợp đồng, tiến trình bốn
// bước, thông báo), cột trái các khối làm việc (thanh toán, hợp đồng giấy, lịch thi công), bản chụp hợp đồng, điều khoản và nhật ký;
// cột phải thông tin, việc làm nhanh, đầu mối liên hệ. Kiểu thẻ `.ct-*` (contract-detail.css). Luật ghi giữ như trang cũ: chỉ kỹ
// thuật viên đã khảo sát công trình mới thu tiền, tải trang ký, hẹn lịch; người khác chỉ đọc

function StepItem({ step }: { step: TechStep }) {
  const todo = step.state === 'todo'
  return (
    <li className="flex min-w-0 gap-3">
      <span
        aria-hidden
        className={cx(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          step.state === 'done' && 'bg-accent-soft text-accent-fg',
          step.state === 'current' && 'border-2 border-accent bg-panel text-accent-fg',
          todo && 'bg-surface-2 text-fg-3',
        )}
      >
        <Icon name={step.state === 'done' ? 'check' : step.icon} className="text-[20px]" />
      </span>
      <div className="min-w-0">
        <p className={cx('text-body font-semibold', todo ? 'text-fg-3' : 'text-fg')}>
          {step.label}
          <span className="sr-only">
            {step.state === 'done' ? ', đã xong' : step.state === 'current' ? ', đang ở bước này' : ''}
          </span>
        </p>
        {step.detail && <p className="tnum text-meta text-fg-2">{step.detail}</p>}
        {step.note && (
          <p
            className={cx(
              'text-meta',
              step.state === 'current'
                ? 'font-semibold text-accent-fg'
                : step.state === 'done'
                  ? 'text-fg-2'
                  : 'text-fg-3',
            )}
          >
            {step.note}
          </p>
        )}
      </div>
    </li>
  )
}

export function TechPlanContract({
  contract: c,
  versions,
}: {
  contract: ContractView & { paymentPlan: ContractPaymentPlanView }
  versions: ContractView[]
}) {
  const plan = c.paymentPlan
  const stage = stageMeta(plan.stage)
  // Kỹ thuật viên đọc mọi hợp đồng; chỉ người đã khảo sát công trình mới ghi (backend trả 404 cho người khác)
  const assignment = useTechnicianAssignment(c.contractId, true)
  const assigned = assignment === 'assigned'
  const can = planPermissions('technician', { assigned })
  const observer = !assigned
  const checking = assignment === 'pending'
  const schedulable = can.canPlanSchedule && isSchedulableContract(c)
  // Lịch chỉ đọc được trên đường của người đã khảo sát
  const schedules = useTechnicianContractScheduleQuery(assigned ? c.contractId : undefined)
  const live = liveSchedule(schedules.data ?? [])
  const refresh = useRefreshContractWorld()
  const [refreshing, setRefreshing] = useState(false)

  const steps = techSteps(plan, live)
  const doneCount = steps.filter((s) => s.state === 'done').length
  const next = planNextStep(plan, observer ? 'observer' : 'technician')
  const progress = paymentProgressLabel(plan)

  function print() {
    if (!openContractPrint({ contract: c }))
      toast.error('Trình duyệt đã chặn cửa sổ in. Cho phép trang này mở cửa sổ mới rồi bấm lại.')
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Đã chép đường dẫn hợp đồng.')
    } catch {
      toast.error('Không chép được đường dẫn. Chép từ thanh địa chỉ của trình duyệt.')
    }
  }

  async function reload() {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  const actions = assigned
    ? quickActions({
        plan,
        live,
        schedulable,
        scheduleLocked: projectLocksSchedule(live?.projectStatus),
        onPrint: print,
      })
    : null

  return (
    <div className="ct-page space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button icon="refresh" disabled={refreshing} onClick={() => void reload()}>
          {refreshing ? 'Đang tải…' : 'Làm mới'}
        </Button>
        <Button
          icon="file_save"
          title="Tải tệp CSV mở bằng Excel: số chung, hai khoản, các dòng báo giá, gói đi kèm"
          onClick={() => downloadCsv(contractCsv(c, plan), `hop-dong_${c.contractNumber}.csv`)}
        >
          Xuất Excel
        </Button>
      </div>

      <TechCard className="space-y-5">
        <div data-page-header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta">
              <Link to={ROUTES.tech.contracts} className="tap inline-flex items-center gap-1 text-fg-2 hover:text-fg">
                <Icon name="arrow_back" className="text-[16px]" />
                Danh sách hợp đồng
              </Link>
              <span className="tnum font-semibold text-fg">{versionLabel(c)}</span>
              <span className={cx('font-bold', TONE_TEXT[stage.tone])}>{stage.label}</span>
              {progress && <span className="text-fg-2">{progress}</span>}
            </div>
            <h1 className="mt-3 text-figure font-bold">Hợp đồng {c.contractNumber}</h1>
            <p className="mt-1 text-body text-fg-2">
              Tổng giá trị: <span className="tnum font-bold text-fg">{formatVnd(plan.total)}</span>, thanh toán đợt 30%
              rồi 70%, bảo hành lắp đặt {warrantyText(c.warrantyMonths)}.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button icon="picture_as_pdf" onClick={print} title="Mở bản in của hợp đồng, chọn Lưu thành PDF">
              Xuất PDF
            </Button>
            <Button icon="share" onClick={() => void share()}>
              Chia sẻ
            </Button>
            {live?.projectId && (
              <ButtonLink to={withId(ROUTES.tech.installation, live.projectId)} variant="info" icon="fact_check">
                Mở kiểm tra thi công
              </ButtonLink>
            )}
          </div>
        </div>

        <section aria-labelledby="tech-steps" className="border-t border-line pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="tech-steps" className="ct-eyebrow text-fg-2">
              Tiến trình hoàn thiện hợp đồng
            </h2>
            <p className="ct-eyebrow tnum text-fg">
              {doneCount} / {steps.length} giai đoạn hoàn thành
            </p>
          </div>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((s) => (
              <StepItem key={s.label} step={s} />
            ))}
          </ol>
        </section>

        <div className="divide-y divide-line border-t border-line pt-4">
          {observer && !checking && (
            <NoticeRow tone="info" title="Bạn chỉ xem hợp đồng này.">
              Thu tiền, tải ảnh hợp đồng giấy đã ký và hẹn ngày thi công do kỹ thuật viên đã khảo sát công trình làm.
            </NoticeRow>
          )}
          <NoticeRow
            tone={next.tone}
            title={`${next.title}.`}
            action={
              next.action &&
              assigned && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={next.action.icon}
                  onClick={() => goToBlock(next.action!.target)}
                >
                  {next.action.label}
                </Button>
              )
            }
          >
            {next.body}
          </NoticeRow>
          {plan.termsPendingLegalReview && (
            <NoticeRow tone="warn" title="Điều khoản thanh toán và bảo lưu sở hữu đang chờ bộ phận pháp lý duyệt.">
              Nội dung hiển thị đúng như văn bản đã lập; Smart Solar có thể cập nhật điều khoản sau khi duyệt xong.
            </NoticeRow>
          )}
          {c.discard && (
            <NoticeRow tone="neutral" title={`Bản nháp đã huỷ lúc ${formatMoment(c.discard.discardedAt)}.`}>
              <span className="whitespace-pre-line">{c.discard.reason}</span>
            </NoticeRow>
          )}
        </div>
      </TechCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {checking ? (
            <Skeleton className="h-48" />
          ) : (
            <>
              <TechPaymentCard contract={c} actor={can.installmentActor} />
              <TechSignatureCard contract={c} writer={can.signatureWriter} />
              {schedulable && <TechScheduleCard contract={c} />}
            </>
          )}
          <TechSnapshotCard contract={c} />
          <TechTermsCard contract={c} />
        </div>
        <TechContractAside contract={c} versions={versions} live={live} actions={actions} />
      </div>
    </div>
  )
}
