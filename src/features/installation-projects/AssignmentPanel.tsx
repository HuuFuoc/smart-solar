import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, DateField, Field, TimeSelect } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { Facts } from '@/features/pre-surveys/Facts'
import { ErrorLine, ReasonField } from '@/features/installation-projects/formParts'
import {
  assignmentStatusMeta,
  canAssign,
  formatInterval,
  hasStarted,
  installationErrorMessage,
} from '@/features/installation-projects/projectDisplay'
import {
  addDays,
  formatMoment,
  formatTime,
  ineligibleLabel,
  todayVn,
  vnDate,
  vnTimestamp,
} from '@/features/scheduling/schedulingDisplay'
import { useAssignInstallationMutation, useTechnicianCandidatesQuery } from '@/hooks/useManagerInstallations'
import type { InstallationCandidateView, InstallationStaffView } from '@/types/res/managerInstallationsRes'
import { cx } from '@/utils/cx'

// Kỹ thuật viên phụ trách và lịch thi công. Phân công, đổi người, đổi lịch đều là PUT .../assignment:
// chọn khoảng thời gian, bấm tìm để backend kiểm tra ai nhận được, chọn một người rồi gửi kèm revision của dự án.
// Người ngoài khu vực (crossZone) chỉ gửi được khi người dùng tự đánh dấu cho phép và ghi lý do

type Interval = { startsAt: string; endsAt: string }

const ms = (iso: string) => new Date(iso).getTime()

/** Mở form từ lịch hiện tại nếu còn ở tương lai, không thì ngày mai 08:00–17:00 */
function initialInterval(project: InstallationStaffView, now: number) {
  const { scheduledStartsAt: start, scheduledEndsAt: end } = project
  if (start && end && ms(start) > now)
    return { startDate: vnDate(start), startTime: formatTime(start), endDate: vnDate(end), endTime: formatTime(end) }
  const tomorrow = addDays(todayVn(), 1)
  return { startDate: tomorrow, startTime: '08:00', endDate: tomorrow, endTime: '17:00' }
}

function CandidateList({
  candidates,
  zoneName,
  currentId,
  value,
  onChange,
}: {
  candidates: InstallationCandidateView[]
  zoneName: string | null
  currentId: string | null
  value: string | null
  onChange: (id: string) => void
}) {
  const name = useId()
  // Backend xếp người trong khu vực trước, người ngoài khu vực sau
  const groups = [
    { title: zoneName ? `Trong khu vực ${zoneName}` : 'Trong khu vực', items: candidates.filter((c) => !c.crossZone) },
    { title: 'Ngoài khu vực của công trình', items: candidates.filter((c) => c.crossZone) },
  ].filter((group) => group.items.length > 0)
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Kỹ thuật viên phụ trách</legend>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-meta font-medium text-fg-2">{group.title}</p>
          <div className="space-y-2">
            {group.items.map((c) => (
              <label
                key={c.technicianUserId}
                className={cx(
                  'flex gap-3 rounded-control border border-line-2 bg-canvas px-4 py-3',
                  c.isEligible
                    ? 'press cursor-pointer [&:not(:has(:checked)):hover]:border-fg-3 has-checked:border-accent-line has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ring'
                    : 'cursor-not-allowed bg-surface-2',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={c.technicianUserId}
                  disabled={!c.isEligible}
                  checked={value === c.technicianUserId}
                  onChange={() => onChange(c.technicianUserId)}
                  className="mt-1 size-4 shrink-0 accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cx('font-semibold', c.isEligible ? 'text-fg' : 'text-fg-2')}>{c.fullName}</span>
                    {c.technicianUserId === currentId && <Badge tone="info">Đang phụ trách</Badge>}
                  </span>
                  <span className="mt-1 block text-meta text-fg-2">
                    {c.isEligible ? 'Nhận được khoảng thời gian này' : `Không nhận được: ${ineligibleLabel(c.reason)}`}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}

function AssignDialog({ project, onClose }: { project: InstallationStaffView; onClose: () => void }) {
  // Mốc "bây giờ" lấy lúc mở hộp thoại; backend vẫn kiểm tra lại giờ bắt đầu khi gửi
  const [openedAt] = useState(() => Date.now())
  const [initial] = useState(() => initialInterval(project, openedAt))
  const [startDate, setStartDate] = useState(initial.startDate)
  const [startTime, setStartTime] = useState(initial.startTime)
  const [endDate, setEndDate] = useState(initial.endDate)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [searched, setSearched] = useState<Interval | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [crossZoneOk, setCrossZoneOk] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const candidates = useTechnicianCandidatesQuery(project.projectId, searched)
  const assign = useAssignInstallationMutation(project.projectId)

  const today = todayVn()
  const interval: Interval = { startsAt: vnTimestamp(startDate, startTime), endsAt: vnTimestamp(endDate, endTime) }
  const intervalError =
    ms(interval.endsAt) <= ms(interval.startsAt)
      ? 'Giờ kết thúc phải sau giờ bắt đầu.'
      : ms(interval.startsAt) <= openedAt
        ? 'Giờ bắt đầu phải ở tương lai.'
        : null
  const searchedCurrent =
    searched !== null && ms(searched.startsAt) === ms(interval.startsAt) && ms(searched.endsAt) === ms(interval.endsAt)

  const current = project.responsibleTechnician
  const list = searched && candidates.data ? candidates.data : []
  const selected = list.find((c) => c.technicianUserId === picked && c.isEligible) ?? null
  const reasonRequired = current !== null || hasStarted(project.status) || selected?.crossZone === true
  const unchanged =
    selected !== null &&
    current?.technicianUserId === selected.technicianUserId &&
    !!project.scheduledStartsAt &&
    !!project.scheduledEndsAt &&
    ms(project.scheduledStartsAt) === ms(interval.startsAt) &&
    ms(project.scheduledEndsAt) === ms(interval.endsAt)

  const blocker = !searchedCurrent
    ? null
    : !selected
      ? null
      : unchanged
        ? 'Người và thời gian giống phân công hiện tại.'
        : selected.crossZone && !crossZoneOk
          ? 'Đánh dấu cho phép phân công ngoài khu vực trước khi gửi.'
          : null

  function search() {
    if (intervalError) return
    setError(null)
    setPicked(null)
    setCrossZoneOk(false)
    if (searchedCurrent) void candidates.refetch()
    else setSearched(interval)
  }

  async function submit() {
    if (!selected || !searched || !searchedCurrent || blocker) return
    if (reasonRequired && !reason.trim()) {
      setError('Ghi lý do phân công.')
      return
    }
    setError(null)
    try {
      await assign.mutateAsync({
        technicianUserId: selected.technicianUserId,
        scheduledStartsAt: searched.startsAt,
        scheduledEndsAt: searched.endsAt,
        reason: reason.trim() || null,
        expectedRevision: project.revision,
        ...(selected.crossZone ? { crossZoneAuthorized: crossZoneOk } : {}),
      })
      toast.success(`Đã giao dự án cho ${selected.fullName}, chờ kỹ thuật viên nhận việc.`)
      onClose()
    } catch (e) {
      // Dữ liệu dự án và danh sách đã được tải lại; người dùng kiểm tra rồi tự gửi lại
      setError(installationErrorMessage(e))
    }
  }

  const busy = assign.isPending
  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && onClose()}
      dismissible={!busy}
      className="max-w-2xl"
      aria-label={current ? 'Đổi kỹ thuật viên hoặc lịch thi công' : 'Phân công kỹ thuật viên'}
    >
      <DialogTitle>{current ? 'Đổi kỹ thuật viên hoặc lịch thi công' : 'Phân công kỹ thuật viên'}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        {current
          ? `Đang giao cho ${current.fullName}, ${formatInterval(project.scheduledStartsAt, project.scheduledEndsAt)}. Sau khi đổi, kỹ thuật viên phải nhận việc lại.`
          : 'Kỹ thuật viên được chọn phải nhận việc thì dự án mới lên lịch.'}
      </p>

      <div className="mt-4 max-h-[60dvh] space-y-5 overflow-y-auto scrollbar-thin">
        <fieldset className="space-y-3">
          <legend className="mb-2 text-body font-medium text-fg">Thời gian thi công (giờ Việt Nam)</legend>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Ngày bắt đầu" htmlFor="install-start-date" className="w-full sm:w-44">
              <DateField id="install-start-date" min={today} value={startDate} onChange={(v) => v && setStartDate(v)} />
            </Field>
            <Field label="Giờ bắt đầu" htmlFor="install-start-time" className="w-full sm:w-32">
              <TimeSelect id="install-start-time" from="05:00" to="22:00" value={startTime} onChange={setStartTime} />
            </Field>
            <Field label="Ngày kết thúc" htmlFor="install-end-date" className="w-full sm:w-44">
              <DateField id="install-end-date" min={startDate} value={endDate} onChange={(v) => v && setEndDate(v)} />
            </Field>
            <Field label="Giờ kết thúc" htmlFor="install-end-time" className="w-full sm:w-32">
              <TimeSelect id="install-end-time" from="05:00" to="22:00" value={endTime} onChange={setEndTime} />
            </Field>
          </div>
          <p className="text-meta text-fg-2">
            Giờ bắt đầu và kết thúc phải nằm trong giờ làm của kỹ thuật viên. Mỗi lần phân công có số ngày tối đa.
          </p>
          {intervalError ? (
            <p className="text-meta text-danger" role="alert">
              {intervalError}
            </p>
          ) : (
            <Button size="sm" icon="search" disabled={candidates.isFetching} onClick={search}>
              {candidates.isFetching ? 'Đang kiểm tra…' : 'Tìm kỹ thuật viên'}
            </Button>
          )}
        </fieldset>

        {searched && !searchedCurrent && (
          <Notice tone="warn">Thời gian đã đổi sau lần tìm. Bấm Tìm kỹ thuật viên để kiểm tra lại.</Notice>
        )}

        {searched && searchedCurrent && (
          <div aria-busy={candidates.isFetching}>
            {candidates.isPending ? (
              <div aria-label="Đang kiểm tra kỹ thuật viên" className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : candidates.isError ? (
              <ErrorState
                title="Không kiểm tra được kỹ thuật viên."
                message={installationErrorMessage(candidates.error)}
                onRetry={() => void candidates.refetch()}
              />
            ) : list.length === 0 ? (
              <Notice tone="warn" title="Không có kỹ thuật viên nào">
                Hệ thống chưa có kỹ thuật viên để phân công.
              </Notice>
            ) : (
              <div className="space-y-3">
                {!list.some((c) => c.isEligible) && (
                  <Notice tone="warn">Không ai nhận được khoảng thời gian này. Đổi thời gian rồi tìm lại.</Notice>
                )}
                <CandidateList
                  candidates={list}
                  zoneName={project.zone?.name ?? null}
                  currentId={current?.technicianUserId ?? null}
                  value={selected?.technicianUserId ?? null}
                  onChange={(id) => {
                    setPicked(id)
                    setCrossZoneOk(false)
                    setError(null)
                  }}
                />
              </div>
            )}
          </div>
        )}

        {selected?.crossZone && searchedCurrent && (
          <Checkbox
            checked={crossZoneOk}
            onChange={(e) => setCrossZoneOk(e.target.checked)}
            label="Cho phép phân công ngoài khu vực"
            description={`${selected.fullName} không thuộc khu vực ${project.zone?.name ?? 'của công trình'}. Lý do được lưu thành một lần cho phép ngoài khu vực.`}
          />
        )}

        <ReasonField
          id="install-assign-reason"
          required={reasonRequired}
          hint={
            reasonRequired
              ? 'Bắt buộc khi đổi người, đổi lịch, dự án đã thi công hoặc người ngoài khu vực. Tối đa 500 ký tự.'
              : undefined
          }
          value={reason}
          onChange={(value) => {
            setReason(value)
            setError(null)
          }}
        />
      </div>

      <DialogFooter className="items-center">
        <ErrorLine message={error ?? blocker} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Huỷ
        </Button>
        <Button
          icon="how_to_reg"
          variant="primary"
          disabled={!selected || !searchedCurrent || !!blocker || busy}
          onClick={() => void submit()}
        >
          {busy ? 'Đang gửi…' : selected ? `Giao cho ${selected.fullName}` : 'Chọn kỹ thuật viên'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function AssignmentPanel({ project }: { project: InstallationStaffView }) {
  const [open, setOpen] = useState(false)
  const current = project.responsibleTechnician
  const assignable = canAssign(project.status)
  const latest = project.assignments.at(-1)
  const declined = !current && latest?.status === 'DECLINED' ? latest : null
  const history = [...project.assignments].reverse()

  return (
    <Panel>
      <PanelHeader
        title="Kỹ thuật viên và lịch thi công"
        action={
          assignable ? (
            current ? (
              <Button variant="soft" size="sm" icon="edit_calendar" onClick={() => setOpen(true)}>
                Đổi người hoặc lịch
              </Button>
            ) : (
              <Button size="sm" variant="primary" icon="person_add" onClick={() => setOpen(true)}>
                Phân công kỹ thuật viên
              </Button>
            )
          ) : undefined
        }
      />
      <PanelBody className="space-y-4">
        {current ? (
          <div>
            <p className="text-title font-semibold text-fg">{current.fullName}</p>
            <p className="tnum mt-1 text-body text-fg">
              {formatInterval(project.scheduledStartsAt, project.scheduledEndsAt)}
            </p>
            <p className="mt-2">
              <Badge tone={assignmentStatusMeta(current.assignmentStatus).tone}>
                {assignmentStatusMeta(current.assignmentStatus).label}
              </Badge>
              {current.acceptedAt && (
                <span className="tnum ml-2 text-meta text-fg-2">lúc {formatMoment(current.acceptedAt)}</span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-body text-fg-2">
            {project.status === 'CANCELLED' ? 'Dự án đã huỷ.' : 'Chưa có kỹ thuật viên phụ trách.'}
          </p>
        )}
        <Facts
          items={[
            { k: 'Khu vực', v: project.zone?.name ?? 'Chưa thuộc khu vực nào' },
            ...(project.startedAt ? [{ k: 'Bắt đầu thi công', v: formatMoment(project.startedAt) }] : []),
          ]}
        />
        {!project.zone && assignable && (
          <Notice>Công trình chưa thuộc khu vực nào nên mọi kỹ thuật viên đều là người ngoài khu vực.</Notice>
        )}
        {declined && (
          <Notice title={`${declined.technicianName || 'Kỹ thuật viên'} đã từ chối việc`}>
            {declined.responseReason || 'Không ghi lý do.'}
          </Notice>
        )}
        {history.length > 0 && (
          <div>
            <h3 className="mb-2 text-body font-semibold text-fg">Lịch sử phân công</h3>
            <ol className="divide-y divide-line">
              {history.map((a) => {
                const status = assignmentStatusMeta(a.status)
                return (
                  <li key={a.assignmentId} className="py-3 first:pt-0 last:pb-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg">{a.technicianName || 'Kỹ thuật viên'}</span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </p>
                    <p className="tnum mt-1 text-meta text-fg-2">
                      {formatInterval(a.startsAt, a.endsAt)}. Giao lúc {formatMoment(a.assignedAt)}
                    </p>
                    {a.assignmentReason && (
                      <p className="mt-1 text-body text-fg-2">Lý do phân công: {a.assignmentReason}</p>
                    )}
                    {a.responseReason && <p className="mt-1 text-body text-fg-2">Lý do từ chối: {a.responseReason}</p>}
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </PanelBody>
      {/* Dữ liệu tải lại sau lỗi 409 không làm mất form: dialog luôn đọc revision mới nhất từ props */}
      {open && <AssignDialog project={project} onClose={() => setOpen(false)} />}
    </Panel>
  )
}
