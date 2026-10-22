import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { ROLE_CODES } from '@/common/user'
import { activationMessage, rolesText, userStatusMeta } from '@/features/users/userDisplay'
import {
  useChangeUserStatusMutation,
  useDeleteUserMutation,
  useReplaceUserRolesMutation,
  useSendPasswordResetMutation,
} from '@/hooks/useAdminUsers'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { AccountActiveWork, AdminUserDetail } from '@/types/res/adminUsersRes'

const REASON_MAX = 300

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="flex basis-full items-center gap-1.5 text-body font-medium text-danger" role="alert">
      <Icon name="error" className="shrink-0 text-[20px]" />
      {message}
    </p>
  )
}

/** Việc còn dở trong `error.details` của 409 ACCOUNT_HAS_ACTIVE_WORK. */
function activeWorkOf(error: unknown): AccountActiveWork | null {
  if (!isApiError(error) || error.code !== 'ACCOUNT_HAS_ACTIVE_WORK') return null
  const d = error.details as Partial<AccountActiveWork> | null
  return {
    technicianAppointments: d?.technicianAppointments ?? [],
    ownedOpenSurveyRequestIds: d?.ownedOpenSurveyRequestIds ?? [],
  }
}

// Chỉ liệt kê, không tự chuyển việc
function ActiveWork({ work }: { work: AccountActiveWork }) {
  return (
    <Notice tone="danger" title="Tài khoản còn việc đang dở">
      {work.technicianAppointments.length > 0 && (
        <>
          <p>{work.technicianAppointments.length} lịch khảo sát sắp tới của kỹ thuật viên này:</p>
          <ul className="mt-1 list-disc pl-5">
            {work.technicianAppointments.map((a) => (
              <li key={a.appointmentId} className="tnum">
                {formatMoment(a.startsAt)}
              </li>
            ))}
          </ul>
        </>
      )}
      {work.ownedOpenSurveyRequestIds.length > 0 && (
        <p className="mt-1">{work.ownedOpenSurveyRequestIds.length} yêu cầu khảo sát đang do người này phụ trách.</p>
      )}
      <p className="mt-2">
        Nhờ kinh doanh chuyển các lịch cho kỹ thuật viên khác (Đổi kỹ thuật viên) rồi thử lại. Không việc nào bị chuyển
        tự động.
      </p>
    </Notice>
  )
}

// Tạm khoá mở lại được nên vàng; vô hiệu hoá đỏ; mở lại, kích hoạt xanh
const statusIcon = (status: string) =>
  status === 'SUSPENDED' ? 'pause_circle' : status === 'DISABLED' ? 'block' : 'lock_open'
const statusVariant = (status: string, danger?: boolean) =>
  status === 'SUSPENDED' ? 'warn' : danger ? 'danger' : 'soft'

export function RolesPanel({ user, readOnly }: { user: AdminUserDetail; readOnly: boolean }) {
  const [roles, setRoles] = useState<string[]>(() => [...user.roles])
  const [failure, setFailure] = useState<unknown>(null)
  const save = useReplaceUserRolesMutation()
  const changed = roles.length !== user.roles.length || roles.some((r) => !user.roles.includes(r))

  async function submit() {
    setFailure(null)
    try {
      await save.mutateAsync({ id: user.id, roles })
      toast.success(`Đã lưu vai trò: ${rolesText(roles)}.`)
    } catch (error) {
      setFailure(error)
    }
  }

  const work = activeWorkOf(failure)
  return (
    <Panel>
      <PanelHeader
        title="Vai trò"
        description="Đổi vai trò làm mọi phiên đang mở của tài khoản này hết hiệu lực ngay; người dùng đăng nhập lại."
      />
      <PanelBody className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLE_CODES.map((r) => (
            <Checkbox
              key={r.value}
              label={r.label}
              disabled={readOnly}
              checked={roles.includes(r.value)}
              onChange={(e) => {
                setRoles(e.target.checked ? [...roles, r.value] : roles.filter((x) => x !== r.value))
                setFailure(null)
              }}
            />
          ))}
        </div>
        {work && <ActiveWork work={work} />}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              icon="save"
              disabled={!changed || roles.length === 0 || save.isPending}
              onClick={() => void submit()}
            >
              {save.isPending ? 'Đang lưu…' : 'Lưu vai trò'}
            </Button>
            {roles.length === 0 && <span className="text-meta text-danger">Chọn ít nhất một vai trò.</span>}
            {failure !== null && !work && <ErrorLine message={errorMessage(failure)} />}
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

/** Màu nút theo việc: Tạm khoá vàng, Vô hiệu hoá đỏ, Mở khoá xanh */
type StatusAction = {
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
  label: string
  title: string
  text: string
  danger: boolean
}

// Chuyển được: ACTIVE sang SUSPENDED / DISABLED, SUSPENDED sang ACTIVE / DISABLED, DISABLED sang ACTIVE (cần email đã xác minh)
function actionsFor(user: AdminUserDetail): StatusAction[] {
  const suspend: StatusAction = {
    status: 'SUSPENDED',
    label: 'Tạm khoá',
    title: 'Tạm khoá tài khoản?',
    text: 'Người dùng bị đăng xuất ngay và không đăng nhập được cho tới khi mở khoá.',
    danger: true,
  }
  const disable: StatusAction = {
    status: 'DISABLED',
    label: 'Vô hiệu hoá',
    title: 'Vô hiệu hoá tài khoản?',
    text: 'Người dùng bị đăng xuất ngay và không đăng nhập được. Kích hoạt lại được khi cần.',
    danger: true,
  }
  const activate = (label: string): StatusAction => ({
    status: 'ACTIVE',
    label,
    title: `${label} tài khoản?`,
    text: 'Người dùng đăng nhập lại được ngay.',
    danger: false,
  })
  switch (user.status) {
    case 'ACTIVE':
      return [suspend, disable]
    case 'SUSPENDED':
      return [activate('Mở khoá'), disable]
    case 'DISABLED':
      return user.emailVerifiedAt ? [activate('Kích hoạt lại')] : []
    case 'PENDING_VERIFICATION':
      return [disable]
    default:
      return []
  }
}

// Dialog chỉ dựng nội dung khi mở nên mỗi lần mở là form mới
function StatusForm({
  user,
  action,
  change,
  onClose,
}: {
  user: AdminUserDetail
  action: StatusAction
  change: ReturnType<typeof useChangeUserStatusMutation>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [failure, setFailure] = useState<unknown>(null)

  async function confirm() {
    setFailure(null)
    try {
      await change.mutateAsync({ id: user.id, status: action.status, reason: reason.trim() || null })
      toast.success(`Đã ${action.label.toLowerCase()} tài khoản ${user.email}.`)
      onClose()
    } catch (error) {
      setFailure(error)
    }
  }

  const work = activeWorkOf(failure)
  return (
    <>
      <DialogTitle>{action.title}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        {user.fullName} ({user.email}). {action.text}
      </p>
      <Field
        label="Lý do"
        htmlFor="status-reason"
        hint={`Không bắt buộc, tối đa ${REASON_MAX} ký tự. Lưu vào nhật ký.`}
        className="mt-4"
      >
        <Textarea
          id="status-reason"
          rows={2}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      {work && <ActiveWork work={work} />}
      <DialogFooter className="items-center">
        {failure !== null && !work && <ErrorLine message={errorMessage(failure)} />}
        <Button icon="close" variant="secondary" disabled={change.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button
          icon={action.danger ? 'lock' : 'lock_open'}
          variant={action.danger ? 'danger' : 'primary'}
          disabled={change.isPending}
          onClick={() => void confirm()}
        >
          {change.isPending ? 'Đang lưu…' : action.label}
        </Button>
      </DialogFooter>
    </>
  )
}

export function StatusPanel({ user, isSelf }: { user: AdminUserDetail; isSelf: boolean }) {
  const [action, setAction] = useState<StatusAction | null>(null)
  const change = useChangeUserStatusMutation()
  const status = userStatusMeta(user)
  const actions = isSelf || user.deletedAt ? [] : actionsFor(user)
  return (
    <Panel>
      <PanelHeader title="Trạng thái" />
      <PanelBody className="space-y-4">
        <p className="flex flex-wrap items-center gap-3 text-body text-fg-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {user.status === 'PENDING_VERIFICATION' && 'Người dùng chưa đặt mật khẩu hoặc chưa xác minh email.'}
          {user.status === 'DISABLED' &&
            !user.emailVerifiedAt &&
            'Email chưa xác minh: gửi link kích hoạt thay vì kích hoạt tay.'}
        </p>
        {isSelf && <p className="text-meta text-fg-2">Đây là tài khoản của bạn: không tự khoá hay xoá được.</p>}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {actions.map((a) => (
              <Button
                key={a.status}
                size="sm"
                icon={statusIcon(a.status)}
                variant={statusVariant(a.status, a.danger)}
                onClick={() => setAction(a)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
        <ModalDialog
          open={action !== null}
          onOpenChange={(open) => !open && setAction(null)}
          dismissible={!change.isPending}
          className="max-w-lg"
          aria-label={action?.title ?? 'Đổi trạng thái'}
        >
          {action && <StatusForm user={user} action={action} change={change} onClose={() => setAction(null)} />}
        </ModalDialog>
      </PanelBody>
    </Panel>
  )
}

// Backend tự chọn loại link theo trạng thái tài khoản (đặt mật khẩu, xác minh, đặt lại)
export function RecoveryPanel({ user }: { user: AdminUserDetail }) {
  const send = useSendPasswordResetMutation()
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const blocked = user.status === 'SUSPENDED' || user.status === 'DISABLED' || Boolean(user.deletedAt)

  async function submit() {
    setResult(null)
    try {
      const issued = await send.mutateAsync(user.id)
      setResult(activationMessage(issued.activation))
    } catch (error) {
      setResult({ ok: false, text: errorMessage(error) })
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Mật khẩu"
        description={
          user.hasPassword
            ? 'Quản trị không xem hay đặt mật khẩu thay người dùng: gửi link để họ tự đặt lại.'
            : 'Tài khoản chưa có mật khẩu: người dùng đặt mật khẩu lần đầu qua link gửi tới email.'
        }
      />
      <PanelBody className="space-y-3">
        <Button size="sm" icon="mail" disabled={blocked || send.isPending} onClick={() => void submit()}>
          {send.isPending ? 'Đang gửi…' : user.hasPassword ? 'Gửi link đặt lại mật khẩu' : 'Gửi link đặt mật khẩu'}
        </Button>
        {blocked && !user.deletedAt && (
          <p className="text-meta text-fg-2">Tài khoản đang tạm khoá hoặc vô hiệu: kích hoạt lại trước khi gửi link.</p>
        )}
        {result && (
          <Notice tone={result.ok ? 'ok' : 'warn'} className="max-w-prose">
            {result.text}
          </Notice>
        )}
      </PanelBody>
    </Panel>
  )
}

export function DeleteAccountDialog({
  user,
  open,
  onOpenChange,
  onDeleted,
}: {
  user: AdminUserDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const [reason, setReason] = useState('')
  const [failure, setFailure] = useState<unknown>(null)
  const remove = useDeleteUserMutation()

  async function confirm() {
    setFailure(null)
    try {
      await remove.mutateAsync({ id: user.id, reason: reason.trim() || null })
      toast.success(`Đã xoá tài khoản ${user.email}.`)
      onDeleted()
    } catch (error) {
      setFailure(error)
    }
  }

  const work = activeWorkOf(failure)
  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!remove.isPending}
      className="max-w-lg"
      aria-label="Xoá tài khoản"
    >
      <DialogTitle>Xoá tài khoản {user.email}?</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Người dùng bị đăng xuất và không đăng nhập được nữa. Lịch sử (yêu cầu, lịch hẹn, nhật ký) vẫn giữ. Giao diện
        chưa có cách khôi phục tài khoản đã xoá.
      </p>
      <Field
        label="Lý do"
        htmlFor="delete-reason"
        hint={`Không bắt buộc, tối đa ${REASON_MAX} ký tự.`}
        className="mt-4"
      >
        <Textarea
          id="delete-reason"
          rows={2}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      {work && <ActiveWork work={work} />}
      <DialogFooter className="items-center">
        {failure !== null && !work && <ErrorLine message={errorMessage(failure)} />}
        <Button icon="close" variant="secondary" disabled={remove.isPending} onClick={() => onOpenChange(false)}>
          Huỷ
        </Button>
        <Button icon="delete" variant="danger-solid" disabled={remove.isPending} onClick={() => void confirm()}>
          {remove.isPending ? 'Đang xoá…' : 'Xoá tài khoản'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
