import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Select, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { RescheduleForm } from '@/features/scheduling/RescheduleDialog'
import { TechnicianChoiceList } from '@/features/scheduling/TechnicianChoiceList'
import {
  appointmentStatusMeta,
  formatAppointment,
  formatTime,
  ineligibleLabel,
  isAppointmentOverdue,
  schedulingErrorMessage,
} from '@/features/scheduling/schedulingDisplay'
import {
  useOverrideSurveyTechnicianMutation,
  useSetSurveySalesOwnerMutation,
  useStaffRescheduleMutation,
} from '@/hooks/useAdminSurvey'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { useTechnicianAvailabilityQuery } from '@/hooks/useSurveyRequests'
import { isApiError } from '@/services/api/errors'

// Quản lý / quản trị can thiệp một yêu cầu khảo sát: phân công thẳng kỹ thuật viên cho lịch đang có, đổi giờ lịch đó (bỏ
// qua kinh doanh phụ trách) và đổi kinh doanh phụ trách. Kỹ thuật viên chọn trong danh sách backend tính được cho đúng giờ hẹn;
// kinh doanh chọn trong tài khoản kinh doanh đang hoạt động (API tài khoản chỉ cho quản trị, nên quản lý chưa đổi được kinh doanh)

const REASON_MAX = 500
const SALES_USERS = { role: 'SALES', status: 'ACTIVE', pageSize: 100, sort: 'name', direction: 'asc' } as const

function ReasonField({
  id,
  value,
  onChange,
  missing,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  missing: boolean
}) {
  return (
    <Field
      label="Lý do"
      required
      htmlFor={id}
      hint={`Bắt buộc, tối đa ${REASON_MAX} ký tự. Lưu vào lịch sử của yêu cầu.`}
      error={missing ? 'Ghi lý do.' : undefined}
    >
      <Textarea
        id={id}
        rows={3}
        maxLength={REASON_MAX}
        value={value}
        aria-required
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

function OverrideDialog({
  surveyRequestId,
  open,
  onOpenChange,
}: {
  surveyRequestId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const availability = useTechnicianAvailabilityQuery(surveyRequestId, { enabled: open })
  const assign = useOverrideSurveyTechnicianMutation()
  const [technicianId, setTechnicianId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const a = availability.data
  const current = a?.technicians.find((t) => t.isAssigned)?.technicianUserId ?? null
  const noBooking = isApiError(availability.error) && availability.error.code === 'SURVEY_BOOKING_NOT_FOUND'

  async function submit() {
    if (!a || assign.isPending) return
    setChecked(true)
    setError(null)
    if (!technicianId || !reason.trim()) return
    try {
      const result = await assign.mutateAsync({
        appointmentId: a.appointmentId,
        body: { technicianUserId: technicianId, reason: reason.trim(), expectedRevision: a.revision },
      })
      toast.success(
        result.changed
          ? `Đã phân công ${result.technicianName} cho lịch khảo sát.`
          : `${result.technicianName} đã phụ trách lịch này.`,
      )
      onOpenChange(false)
    } catch (e) {
      // Lịch vừa đổi ở nơi khác: danh sách đã tải lại, người dùng chọn lại rồi tự gửi
      if (isApiError(e) && (e.code === 'APPOINTMENT_CONCURRENCY_CONFLICT' || e.code === 'TECHNICIAN_NOT_AVAILABLE'))
        setTechnicianId(null)
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!assign.isPending}
      aria-label="Phân công kỹ thuật viên"
      className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
    >
      <DialogTitle>Phân công kỹ thuật viên</DialogTitle>
      <p className="mt-1 text-body text-fg-2">
        Giao thẳng lịch khảo sát cho một kỹ thuật viên, không cần kinh doanh phụ trách làm.
      </p>
      <div className="mt-4 space-y-4">
        {availability.isPending ? (
          <Skeleton className="h-24" />
        ) : noBooking ? (
          <Notice tone="info">Khách chưa đặt giờ khảo sát nên chưa có lịch để phân công.</Notice>
        ) : availability.isError ? (
          <ErrorState
            message={schedulingErrorMessage(availability.error)}
            onRetry={() => void availability.refetch()}
          />
        ) : a ? (
          <>
            <KeyValueList
              items={[
                { k: 'Giờ hẹn', v: formatAppointment(a.startsAt, a.endsAt) },
                { k: 'Trạng thái lịch', v: appointmentStatusMeta(a.appointmentStatus, 'staff').label },
                { k: 'Khu vực', v: a.zone?.name ?? 'Chưa thuộc khu nào' },
              ]}
            />
            {a.technicians.length === 0 ? (
              <Notice tone="warn">Không có kỹ thuật viên nào nhận được lịch vào giờ này.</Notice>
            ) : (
              <div>
                <p className="mb-2 text-body font-medium text-fg">
                  Kỹ thuật viên
                  <span aria-hidden className="text-danger">
                    {' *'}
                  </span>
                </p>
                <TechnicianChoiceList
                  technicians={a.technicians}
                  value={technicianId}
                  onChange={setTechnicianId}
                  currentAssigneeId={current}
                  label="Kỹ thuật viên"
                />
                {checked && !technicianId && (
                  <p className="mt-2 text-meta text-danger" role="alert">
                    Chọn một kỹ thuật viên.
                  </p>
                )}
              </div>
            )}
            {a.ineligible.length > 0 && (
              <details className="text-body text-fg-2">
                <summary className="tap cursor-pointer">
                  {a.ineligible.length} người trong khu không nhận được lịch này
                </summary>
                <ul className="mt-2 list-disc pl-5">
                  {a.ineligible.map((t) => (
                    <li key={t.technicianUserId}>
                      {t.fullName}: {ineligibleLabel(t.reason)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <ReasonField id="override-reason" value={reason} onChange={setReason} missing={checked && !reason.trim()} />
          </>
        ) : null}
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={assign.isPending} onClick={() => onOpenChange(false)}>
          Đóng
        </Button>
        {a && a.technicians.length > 0 && (
          <Button icon="person_add" variant="primary" disabled={assign.isPending} onClick={() => void submit()}>
            {assign.isPending ? 'Đang phân công…' : 'Phân công'}
          </Button>
        )}
      </DialogFooter>
    </ModalDialog>
  )
}

// Giờ hiện tại lấy từ cùng "lịch đang có" mà backend đổi; lịch đang diễn ra hoặc đã khảo sát thì backend từ chối nên chỉ báo
function RescheduleSurveyDialog({
  surveyRequestId,
  open,
  onOpenChange,
}: {
  surveyRequestId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const availability = useTechnicianAvailabilityQuery(surveyRequestId, { enabled: open })
  const reschedule = useStaffRescheduleMutation()
  const [now] = useState(() => Date.now())
  const a = availability.data
  const noBooking = isApiError(availability.error) && availability.error.code === 'SURVEY_BOOKING_NOT_FOUND'
  const target = a ? { startsAt: a.startsAt, endsAt: a.endsAt, status: a.appointmentStatus } : null
  const done = target?.status === 'COMPLETED'
  const running = target && new Date(target.startsAt).getTime() <= now && !isAppointmentOverdue(target, now)
  const close = () => onOpenChange(false)

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!reschedule.isPending}
      className="max-w-xl"
      aria-label="Đổi giờ khảo sát"
    >
      <DialogTitle>Đổi giờ khảo sát</DialogTitle>
      {a && target && !done && !running ? (
        <RescheduleForm
          key={a.appointmentId}
          appointment={target}
          pending={reschedule.isPending}
          onSubmit={(body) => reschedule.mutateAsync({ surveyRequestId, body })}
          onClose={close}
        />
      ) : (
        <>
          <div className="mt-4">
            {availability.isPending ? (
              <Skeleton className="h-24" />
            ) : noBooking ? (
              <Notice tone="info">Khách chưa đặt giờ khảo sát nên chưa có lịch để đổi.</Notice>
            ) : availability.isError ? (
              <ErrorState
                message={schedulingErrorMessage(availability.error)}
                onRetry={() => void availability.refetch()}
              />
            ) : done ? (
              <Notice tone="info">Đã khảo sát xong nên không đổi giờ được.</Notice>
            ) : a ? (
              <Notice tone="info">
                Buổi khảo sát đang diễn ra ({formatAppointment(a.startsAt, a.endsAt)}), đổi giờ được sau{' '}
                {formatTime(a.endsAt)}.
              </Notice>
            ) : null}
          </div>
          <DialogFooter>
            <Button icon="close" variant="secondary" onClick={close}>
              Đóng
            </Button>
          </DialogFooter>
        </>
      )}
    </ModalDialog>
  )
}

function SalesOwnerDialog({
  surveyRequestId,
  open,
  onOpenChange,
}: {
  surveyRequestId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const users = useAdminUsersQuery(SALES_USERS, { enabled: open })
  const save = useSetSurveySalesOwnerMutation()
  const [saleUserId, setSaleUserId] = useState('')
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const options = users.data?.items ?? []

  async function submit() {
    if (save.isPending) return
    setChecked(true)
    setError(null)
    if (!saleUserId || !reason.trim()) return
    try {
      const result = await save.mutateAsync({ surveyRequestId, body: { saleUserId, reason: reason.trim() } })
      const name = options.find((u) => u.id === result.saleUserId)
      const label = name ? name.fullName || name.email : 'nhân viên đã chọn'
      toast.success(result.changed ? `Đã giao yêu cầu cho ${label}.` : `${label} đã phụ trách yêu cầu này.`)
      onOpenChange(false)
    } catch (e) {
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!save.isPending}
      aria-label="Đổi kinh doanh phụ trách"
    >
      <DialogTitle>Đổi kinh doanh phụ trách</DialogTitle>
      <p className="mt-1 text-body text-fg-2">Nhân viên được chọn chăm sóc khách và lập báo giá cho yêu cầu này.</p>
      <div className="mt-4 space-y-4">
        <Field
          label="Nhân viên kinh doanh"
          required
          htmlFor="sales-owner"
          error={
            checked && !saleUserId
              ? 'Chọn một nhân viên.'
              : users.isError
                ? schedulingErrorMessage(users.error)
                : undefined
          }
        >
          <Select
            id="sales-owner"
            value={saleUserId}
            disabled={users.isPending}
            aria-required
            onChange={(e) => setSaleUserId(e.target.value)}
          >
            <option value="">{users.isPending ? 'Đang tải danh sách…' : 'Chọn nhân viên'}</option>
            {options.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName || u.email}
              </option>
            ))}
          </Select>
        </Field>
        {users.data && options.length === 0 && (
          <Notice tone="warn">Chưa có tài khoản kinh doanh nào đang hoạt động.</Notice>
        )}
        <ReasonField id="sales-owner-reason" value={reason} onChange={setReason} missing={checked && !reason.trim()} />
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={save.isPending} onClick={() => onOpenChange(false)}>
          Huỷ
        </Button>
        <Button icon="swap_horiz" variant="primary" disabled={save.isPending} onClick={() => void submit()}>
          {save.isPending ? 'Đang lưu…' : 'Đổi người phụ trách'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function SurveyStaffPanel({
  surveyRequestId,
  canChangeSales,
}: {
  surveyRequestId: string
  canChangeSales: boolean
}) {
  const [dialog, setDialog] = useState<'technician' | 'reschedule' | 'sales' | null>(null)
  return (
    <Panel>
      <PanelHeader
        title="Người phụ trách yêu cầu"
        description="Dùng khi cần giao thẳng hoặc đổi giờ lịch khảo sát, hoặc đổi nhân viên kinh doanh chăm sóc khách."
      />
      <PanelBody className="flex flex-wrap gap-3">
        <Button variant="soft" icon="person_add" onClick={() => setDialog('technician')}>
          Phân công kỹ thuật viên
        </Button>
        <Button variant="soft" icon="edit_calendar" onClick={() => setDialog('reschedule')}>
          Đổi giờ khảo sát
        </Button>
        {canChangeSales && (
          <Button variant="soft" icon="swap_horiz" onClick={() => setDialog('sales')}>
            Đổi kinh doanh phụ trách
          </Button>
        )}
      </PanelBody>
      <OverrideDialog
        key={dialog === 'technician' ? 'tech-open' : 'tech'}
        surveyRequestId={surveyRequestId}
        open={dialog === 'technician'}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <RescheduleSurveyDialog
        key={dialog === 'reschedule' ? 'reschedule-open' : 'reschedule'}
        surveyRequestId={surveyRequestId}
        open={dialog === 'reschedule'}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      {canChangeSales && (
        <SalesOwnerDialog
          key={dialog === 'sales' ? 'sales-open' : 'sales'}
          surveyRequestId={surveyRequestId}
          open={dialog === 'sales'}
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </Panel>
  )
}
