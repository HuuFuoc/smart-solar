import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import { versionLabel } from '@/features/contracts/contractDisplay'
import { CardTabs, InfoRow, TechCard } from '@/features/contracts/tech-contract/TechCardParts'
import { paidPercent, type QuickAction } from '@/features/contracts/tech-contract/techContractDisplay'
import { scheduleStatusMeta, scheduleWhen } from '@/features/installation-schedules/scheduleDisplay'
import { readContractSnapshot } from '@/features/payment-plan/contractSnapshot'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { ROUTES } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'
import type { ContractPaymentPlanView } from '@/types/res/paymentPlanRes'

// Cột phải của trang hợp đồng 30/70 phía kỹ thuật viên (thiết kế 26/11/2026): thông tin hợp đồng / hiện trường, việc làm nhanh theo
// chặng của hợp đồng (quickActions), đầu mối liên hệ, các phiên bản

type Tab = 'admin' | 'site'

const actionClass =
  'press tap flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-body font-medium text-fg hover:bg-hover lg:min-h-10'

function ActionItem({ action }: { action: QuickAction }) {
  const body = (
    <>
      <Icon name={action.icon} className="shrink-0 text-[20px] text-fg-2" />
      <span className="min-w-0 flex-1">{action.label}</span>
      <Icon name="chevron_right" className="shrink-0 text-[20px] text-fg-3" />
    </>
  )
  return 'to' in action ? (
    <Link to={action.to} className={actionClass}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={action.onClick} className={actionClass}>
      {body}
    </button>
  )
}

function AsideHeading({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-body font-bold text-fg">
      <Icon name={icon} className="shrink-0 text-[20px] text-fg-2" />
      {children}
    </h2>
  )
}

export function TechContractAside({
  contract: c,
  versions,
  live,
  actions,
}: {
  contract: ContractView & { paymentPlan: ContractPaymentPlanView }
  versions: ContractView[]
  live: InstallationScheduleView | null
  /** null: người xem chỉ đọc, không có việc làm nhanh */
  actions: QuickAction[] | null
}) {
  const [tab, setTab] = useState<Tab>('admin')
  const panelId = useId()
  const plan = c.paymentPlan
  const s = readContractSnapshot(c.pricingSnapshot, c.customerSnapshot)
  const latest = !versions.some((v) => v.version > c.version)
  const schedule = live ? scheduleStatusMeta(live.status, 'staff') : null

  return (
    <aside aria-label="Thông tin hợp đồng" className="min-w-0 space-y-6 self-start">
      <TechCard>
        <CardTabs
          label="Thông tin"
          panelId={panelId}
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'admin', label: 'Thông tin quản trị' },
            { value: 'site', label: 'Hiện trường' },
          ]}
        />
        <dl id={panelId} role="tabpanel" className="mt-4 divide-y divide-line text-meta">
          {tab === 'admin' ? (
            <>
              <InfoRow
                stack
                k="Mã hợp đồng"
                v={<span className="ct-code text-body break-all">{c.contractNumber}</span>}
              />
              <InfoRow k="Phiên bản lưu hành" v={`${versionLabel(c)}${latest ? ' (mới nhất)' : ''}`} />
              <InfoRow k="Yêu cầu khảo sát" v={<span className="tnum">{shortCode(c.surveyRequestId)}</span>} />
              <InfoRow stack k="Cách trả" v="30% trước khi ký giấy, 70% sau nghiệm thu" />
              <InfoRow
                stack
                k="Mã phiên bản điều khoản"
                v={<span className="ct-code break-all">{plan.termsVersion ?? '—'}</span>}
              />
              <InfoRow
                k="Đã trả đủ"
                v={
                  plan.fullyPaid ? (
                    <span className="tnum">{formatMoment(c.paidAt)}</span>
                  ) : (
                    <span className="tnum">Chưa (đã trả {paidPercent(plan)}%)</span>
                  )
                }
              />
            </>
          ) : (
            <>
              <InfoRow stack k="Công trình" v={s.customer.propertyName ?? '—'} />
              <InfoRow stack k="Địa chỉ" v={s.customer.address ?? '—'} />
              <InfoRow
                stack
                k="Lịch thi công"
                v={live ? <span className="tnum">{scheduleWhen(live)}</span> : 'Chưa hẹn'}
              />
              {schedule && <InfoRow k="Trạng thái lịch" v={schedule.label} />}
              <InfoRow k="Kỹ thuật viên" v={live?.technicianName ?? '—'} />
              <InfoRow
                k="Ngày ký giấy"
                v={
                  plan.signature?.signedOn ? (
                    <span className="tnum">{plan.signature.signedOn.split('-').reverse().join('/')}</span>
                  ) : (
                    '—'
                  )
                }
              />
            </>
          )}
        </dl>
      </TechCard>

      {actions && actions.length > 0 && (
        <TechCard aria-label="Tác nghiệp nhanh">
          <AsideHeading icon="bolt">Tác nghiệp nhanh</AsideHeading>
          <div className="-mx-3 space-y-1">
            {actions.map((a) => (
              <ActionItem key={a.label} action={a} />
            ))}
          </div>
        </TechCard>
      )}

      <TechCard aria-label="Đầu mối liên hệ">
        <AsideHeading icon="support_agent">Đầu mối liên hệ</AsideHeading>
        <p className="text-meta text-fg-2">Cần trao đổi về thi công, nghiệm thu hay bàn giao:</p>
        <dl className="mt-3 divide-y divide-line text-meta">
          <InfoRow k="Khách hàng" v={s.customer.name ?? '—'} />
          {s.customer.phone && (
            <InfoRow
              k="Số điện thoại"
              v={
                <a className="tnum ui-link" href={`tel:${s.customer.phone.replace(/\s+/g, '')}`}>
                  {s.customer.phone}
                </a>
              }
            />
          )}
          <InfoRow k="Kỹ thuật viên phụ trách" v={live?.technicianName ?? '—'} />
        </dl>
      </TechCard>

      {versions.length > 1 && (
        <TechCard aria-label="Các phiên bản">
          <AsideHeading icon="history">Các phiên bản</AsideHeading>
          <ContractVersionList versions={versions} detailPattern={ROUTES.tech.contract} currentId={c.contractId} />
        </TechCard>
      )}
    </aside>
  )
}
