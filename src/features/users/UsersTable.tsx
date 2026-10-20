import { Avatar } from '@/components/common/stitch-ui/Avatar'
import { IconButton } from '@/components/common/stitch-ui/Button'
import { DataTable, type DataTableColumn } from '@/components/common/stitch-ui/DataTable'
import { Icon } from '@/components/common/stitch-ui/Icon'
import type { PaginationProps } from '@/components/common/stitch-ui/Pagination'
import { StatusBadge } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'
import { userRoleMap, userStatuses, type UserRecord } from '@/data/users'

/* Bảng "Enterprise Directory" trong user_management. */

function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) void navigator.clipboard.writeText(text)
}

const columns: DataTableColumn<UserRecord>[] = [
  {
    key: 'identity',
    header: 'Người dùng',
    render: (user) => {
      const locked = user.status === 'locked'
      return (
        <div className="flex items-center gap-space-sm">
          <Avatar
            src={user.avatarSrc}
            alt={user.name}
            initials={user.initials}
            icon={locked ? 'person_off' : undefined}
            tone={user.avatarTone}
          />
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-body-lg font-bold text-on-surface">{user.name}</span>
              {user.ssoVerified && (
                <Icon name="verified_user" title="Đã xác thực qua Azure AD SSO" className="text-[16px] text-tertiary-container" />
              )}
              {user.activeEditor && (
                <span title="Đang chỉnh sửa" className="h-2 w-2 rounded-full bg-tertiary-container" />
              )}
            </div>
            <div className={cn('flex items-center gap-2 text-body-sm', locked ? 'text-error' : 'text-outline')}>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-label-sm',
                  locked ? 'bg-error-container/40' : 'bg-surface-container-low text-on-surface-variant',
                )}
              >
                {user.employeeId}
              </span>
              <span>{user.department}</span>
            </div>
          </div>
        </div>
      )
    },
  },
  {
    key: 'contact',
    header: 'Liên hệ',
    render: (user) => (
      <div className="flex flex-col">
        <div className="group/mail flex items-center gap-1 font-medium text-on-surface">
          <span className="truncate">{user.email}</span>
          <button
            type="button"
            title="Sao chép email"
            aria-label={`Sao chép ${user.email}`}
            onClick={() => copyToClipboard(user.email)}
            className="text-outline opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover/mail:opacity-100"
          >
            <Icon name="content_copy" className="text-[14px]" />
          </button>
        </div>
        <span className="text-body-sm text-outline">{user.phone}</span>
      </div>
    ),
  },
  {
    key: 'role',
    header: 'Vai trò',
    render: (user) => {
      const role = userRoleMap[user.role]
      return (
        <StatusBadge variant={role.badgeVariant} dot={false} icon={role.icon} className="font-semibold">
          {role.shortLabel}
        </StatusBadge>
      )
    },
  },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (user) => {
      const status = userStatuses[user.status]
      return (
        <StatusBadge variant={status.badgeVariant} size="sm" className="px-3 font-semibold">
          {status.label}
        </StatusBadge>
      )
    },
  },
  {
    key: 'created',
    header: 'Ngày tạo',
    className: 'text-body-sm text-on-surface-variant',
    render: (user) => user.created,
  },
  {
    key: 'activity',
    header: 'Hoạt động gần nhất',
    render: (user) => (
      <div className="flex flex-col">
        <span
          className={cn('text-label-sm font-semibold', user.status === 'locked' ? 'text-error' : 'text-on-surface')}
        >
          {user.lastActivity}
        </span>
        <span className="text-label-sm text-outline">{user.lastDevice}</span>
      </div>
    ),
  },
]

export type UsersTableProps = {
  users: UserRecord[]
  selectedKeys: ReadonlySet<string>
  onSelectionChange: (keys: Set<string>) => void
  /** Hàng đang mở form chỉnh sửa: nút "tune" tô màu primary */
  activeUserId?: string
  onEdit: (user: UserRecord) => void
  pagination: PaginationProps
  className?: string
}

export function UsersTable({
  users,
  selectedKeys,
  onSelectionChange,
  activeUserId,
  onEdit,
  pagination,
  className,
}: UsersTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={users}
      rowKey={(user) => user.id}
      selectable
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
      emptyMessage="Không có người dùng nào khớp bộ lọc"
      actions={(user) => (
        <>
          {user.status === 'locked' ? (
            <IconButton icon="lock_reset" label="Mở khoá / đặt lại MFA" />
          ) : (
            <IconButton
              icon="tune"
              label="Sửa quyền"
              onClick={() => onEdit(user)}
              className={cn(
                user.id === activeUserId && 'bg-primary-container text-on-primary shadow-sm hover:bg-primary hover:text-on-primary',
              )}
            />
          )}
          <IconButton icon="visibility" label="Xem hồ sơ" />
          <IconButton icon="more_vert" label="Thao tác khác" className="hover:text-on-surface" />
        </>
      )}
      pagination={pagination}
      className={className}
    />
  )
}
