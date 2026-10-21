import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { useAuth } from '@/context/AuthProvider'
import { formatDateTime } from '@/features/pre-surveys/preSurveyDisplay'
import { AccountFormDialog } from '@/features/users/AccountFormDialog'
import { DeleteAccountDialog, RecoveryPanel, RolesPanel, StatusPanel } from '@/features/users/AccountPanels'
import { activationMessage, rolesText, userStatusMeta } from '@/features/users/userDisplay'
import { useAdminUserQuery } from '@/hooks/useAdminUsers'
import { ROUTES, withId } from '@/routes/paths'
import type { AdminUserDetail } from '@/types/res/adminUsersRes'

function TechnicianSummary({ user }: { user: AdminUserDetail }) {
  const t = user.technician
  return (
    <Panel>
      <PanelHeader
        title="Lịch kỹ thuật viên"
        action={
          <ButtonLink variant="info" to={withId(ROUTES.admin.technician, user.id)} size="sm" icon="edit_calendar">
            Cấu hình lịch
          </ButtonLink>
        }
      />
      <PanelBody>
        {!t?.hasProfile ? (
          <p className="text-body text-fg-2">Chưa có hồ sơ nhận lịch nên chưa nhận lịch khảo sát.</p>
        ) : (
          <KeyValueList
            items={[
              { k: 'Nhận lịch', v: t.isSchedulingActive ? 'Đang nhận' : 'Đang tắt' },
              { k: 'Khu vực phục vụ', v: t.zoneCodes.length > 0 ? t.zoneCodes.join(', ') : 'Chưa có' },
              { k: 'Lịch / ngày', v: t.maxAppointmentsPerDay ?? 'Mặc định' },
              { k: 'Giờ làm', v: t.hasCustomWorkingSchedule ? 'Giờ riêng' : 'Giờ chung' },
            ]}
          />
        )}
      </PanelBody>
    </Panel>
  )
}

// Chi tiết một tài khoản. Quản trị không tự khoá hay xoá chính mình
export function AdminUserPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const query = useAdminUserQuery(id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  usePageCrumb(query.data ? query.data.fullName || query.data.email : null)

  return (
    <QueryBoundary query={query}>
      {(user) => {
        const status = userStatusMeta(user)
        const isSelf = Boolean(me?.userId && me.userId === user.id)
        const deleted = Boolean(user.deletedAt)
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span>{rolesText(user.roles)}</span>
                </>
              }
              title={user.fullName || user.email}
              description={user.email}
              actions={
                deleted ? undefined : (
                  <Button variant="soft" icon="edit" onClick={() => setEditing(true)}>
                    Sửa thông tin
                  </Button>
                )
              }
            />
            {deleted && (
              <Notice className="mb-6">
                Tài khoản đã bị xoá lúc {formatDateTime(user.deletedAt)}. Chỉ xem được, không sửa được.
              </Notice>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                <RolesPanel key={user.roles.join(',')} user={user} readOnly={deleted} />
                <StatusPanel user={user} isSelf={isSelf} />
                {!deleted && <RecoveryPanel user={user} />}
                {user.roles.includes('TECHNICIAN') && !deleted && <TechnicianSummary user={user} />}
                {!deleted && !isSelf && (
                  <Panel>
                    <PanelHeader
                      title="Xoá tài khoản"
                      description="Xoá mềm: lịch sử vẫn giữ, người dùng không đăng nhập được nữa."
                    />
                    <PanelBody>
                      <Button size="sm" variant="danger" icon="delete" onClick={() => setDeleting(true)}>
                        Xoá tài khoản
                      </Button>
                    </PanelBody>
                  </Panel>
                )}
              </div>

              <PanelAside aria-label="Thông tin tài khoản">
                <Panel>
                  <PanelHeader title="Thông tin" />
                  <PanelBody>
                    <KeyValueList
                      items={[
                        { k: 'Điện thoại', v: user.phone || '—' },
                        {
                          k: 'Email',
                          v: user.emailVerifiedAt
                            ? `Đã xác minh ${formatDateTime(user.emailVerifiedAt)}`
                            : 'Chưa xác minh',
                        },
                        { k: 'Mật khẩu', v: user.hasPassword ? 'Đã đặt' : 'Chưa đặt' },
                        {
                          k: 'Đăng nhập gần nhất',
                          v: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Chưa đăng nhập',
                        },
                        { k: 'Tạo lúc', v: formatDateTime(user.createdAt) },
                        { k: 'Cập nhật lúc', v: formatDateTime(user.updatedAt) },
                      ]}
                    />
                  </PanelBody>
                </Panel>
              </PanelAside>
            </div>

            <AccountFormDialog
              open={editing}
              onOpenChange={setEditing}
              user={user}
              onUpdated={(result) => {
                if (!result.activation) return void toast.success('Đã lưu thông tin tài khoản.')
                const sent = activationMessage(result.activation)
                if (sent.ok) toast.success(`Đã lưu. ${sent.text}`)
                else toast.warning(`Đã lưu. ${sent.text}`)
              }}
            />
            <DeleteAccountDialog
              user={user}
              open={deleting}
              onOpenChange={setDeleting}
              onDeleted={() => {
                setDeleting(false)
                navigate(ROUTES.admin.users)
              }}
            />
          </>
        )
      }}
    </QueryBoundary>
  )
}
