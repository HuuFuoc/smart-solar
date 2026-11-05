import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Checkbox, SearchInput, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { Pagination } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { formatDateTime, formatRelative } from '@/features/pre-surveys/preSurveyDisplay'
import { AccountFormDialog } from '@/features/users/AccountFormDialog'
import { ROLE_CODES, USER_STATUSES } from '@/common/user'
import { activationMessage, userStatusMeta } from '@/features/users/userDisplay'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import type { AdminUserListParams } from '@/services/adminUserService'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import { cx } from '@/utils/cx'

const PAGE_SIZE = 20

/* Sắp xếp backend nhận: createdAt (mặc định mới trước), name, status (mặc định tăng dần). */
const SORTS = [
  { value: 'createdAt:desc', label: 'Mới tạo trước' },
  { value: 'createdAt:asc', label: 'Cũ trước' },
  { value: 'name:asc', label: 'Tên A→Z' },
  { value: 'name:desc', label: 'Tên Z→A' },
  { value: 'status:asc', label: 'Theo trạng thái' },
] as const

type Filter = { search: string; role: string; status: string; sort: string; includeDeleted: boolean }
const defaultFilter: Filter = { search: '', role: '', status: '', sort: SORTS[0].value, includeDeleted: false }

// Cấu hình màu sắc, icon và chú thích riêng biệt cho từng vai trò
export const ROLE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; text: string; border: string; desc: string }
> = {
  ADMIN: {
    label: 'Quản trị viên',
    icon: 'admin_panel_settings',
    bg: 'bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    desc: 'Toàn quyền quản trị tham số và cấu hình hệ thống',
  },
  MANAGER: {
    label: 'Quản lý',
    icon: 'shield_person',
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    desc: 'Điều hành, duyệt hợp đồng, dự án và bảo hành',
  },
  SALES: {
    label: 'Kinh doanh',
    icon: 'point_of_sale',
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    desc: 'Tư vấn, tiếp nhận khảo sát và lập báo giá',
  },
  TECHNICIAN: {
    label: 'Kỹ thuật viên',
    icon: 'engineering',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    desc: 'Khảo sát thực địa, thi công lắp đặt và sửa chữa',
  },
  CUSTOMER: {
    label: 'Khách hàng',
    icon: 'person',
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/30',
    desc: 'Chủ sở hữu công trình điện mặt trời',
  },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? {
    label: role,
    icon: 'badge',
    bg: 'bg-surface-3',
    text: 'text-fg-2',
    border: 'border-line',
    desc: '',
  }

  return (
    <span
      title={cfg.desc || undefined}
      className={cx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs transition-transform hover:scale-105',
        cfg.bg,
        cfg.text,
        cfg.border,
      )}
    >
      <Icon name={cfg.icon} className="text-[13px]" />
      <span>{cfg.label}</span>
    </span>
  )
}

// Danh sách tài khoản (tìm, lọc, sắp xếp, phân trang phía server). Bấm dòng để mở chi tiết
export function AdminUsersPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>(defaultFilter)
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const search = useDebouncedValue(filter.search.trim())
  const [sort, direction] = filter.sort.split(':') as [AdminUserListParams['sort'], AdminUserListParams['direction']]
  const query = useAdminUsersQuery({
    page,
    pageSize: PAGE_SIZE,
    search,
    role: filter.role,
    status: filter.status,
    sort,
    direction,
    includeDeleted: filter.includeDeleted,
  })
  const users = query.data?.items ?? []
  const total = query.data?.totalItems ?? 0
  const pages = query.data?.totalPages ?? 0
  const isFiltering = filter.search.trim() !== '' || filter.role !== '' || filter.status !== '' || filter.includeDeleted
  const updateFilter = (patch: Partial<Filter>) => {
    setFilter((f) => ({ ...f, ...patch }))
    setPage(1)
  }
  const from = (page - 1) * PAGE_SIZE + 1

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tài khoản"
        actions={
          <Button variant="primary" icon="person_add" onClick={() => setCreating(true)}>
            Tạo tài khoản
          </Button>
        }
      />

      {/* Thanh bộ lọc */}
      <FilterBar>
        <label className="min-w-0 flex-1 basis-64">
          <span className="sr-only">Tìm tài khoản</span>
          <SearchInput
            placeholder="Tìm tên, email, điện thoại"
            maxLength={100}
            value={filter.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
          />
        </label>
        <label className="w-full sm:w-44">
          <span className="sr-only">Vai trò</span>
          <Select
            active={filter.role !== ''}
            value={filter.role}
            onChange={(e) => updateFilter({ role: e.target.value })}
          >
            <option value="">Tất cả vai trò</option>
            {ROLE_CODES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-full sm:w-44">
          <span className="sr-only">Trạng thái</span>
          <Select
            active={filter.status !== ''}
            value={filter.status}
            onChange={(e) => updateFilter({ status: e.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            {USER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-full sm:w-44">
          <span className="sr-only">Sắp xếp</span>
          <Select value={filter.sort} onChange={(e) => updateFilter({ sort: e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <Checkbox
          label="Gồm tài khoản đã xoá"
          checked={filter.includeDeleted}
          onChange={(e) => updateFilter({ includeDeleted: e.target.checked })}
        />
        {isFiltering && (
          <Button variant="ghost" bleed={false} icon="filter_alt_off" onClick={() => updateFilter(defaultFilter)}>
            Xoá bộ lọc
          </Button>
        )}
      </FilterBar>

      {/* Chú thích màu sắc vai trò người dùng (Legend Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-2 p-3 sm:px-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-meta">
          <span className="font-semibold text-fg flex items-center gap-1.5 pr-2.5 border-r border-line/70">
            <Icon name="palette" className="text-primary text-[18px]" />
            Chú thích vai trò:
          </span>
          {ROLE_CODES.map((r) => {
            const cfg = ROLE_CONFIG[r.value]
            if (!cfg) return null
            return (
              <span
                key={r.value}
                title={cfg.desc}
                className={cx(
                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-help shadow-2xs',
                  cfg.bg,
                  cfg.text,
                  cfg.border,
                )}
              >
                <Icon name={cfg.icon} className="text-[13px]" />
                <span>{cfg.label}</span>
              </span>
            );
          })}
        </div>
        <div className="text-meta text-fg-2">
          Tổng số: <strong className="font-semibold text-fg">{total}</strong> tài khoản
        </div>
      </div>

      {/* Danh sách bảng tài khoản với cột dọc chia ngăn cách */}
      <section aria-label="Danh sách tài khoản" aria-live="polite" aria-busy={query.isFetching}>
        {query.isError && !query.data ? (
          <ErrorState
            message={errorMessage(query.error, 'Không tải được danh sách tài khoản.')}
            onRetry={() => query.refetch()}
          />
        ) : query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title={isFiltering ? 'Không có tài khoản nào khớp bộ lọc' : 'Chưa có tài khoản nào'}
            action={
              isFiltering ? (
                <Button icon="filter_alt_off" onClick={() => updateFilter(defaultFilter)}>
                  Xoá bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={cx('overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm', query.isPlaceholderData && 'opacity-70')}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-meta border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-fg-2 font-medium">
                    <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                      Tài khoản
                    </th>
                    <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                      Vai trò
                    </th>
                    <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                      Trạng thái
                    </th>
                    <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                      Đăng nhập gần nhất
                    </th>
                    <th className="py-3 px-3.5 text-left text-meta font-semibold">
                      Tạo lúc
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {users.map((u) => {
                    const status = userStatusMeta(u)
                    return (
                      <tr
                        key={u.id}
                        onClick={() => navigate(withId(ROUTES.admin.user, u.id))}
                        className="group hover:bg-surface-2/60 transition-colors cursor-pointer"
                      >
                        {/* Cột 1: Tài khoản */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top">
                          <Link
                            to={withId(ROUTES.admin.user, u.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-fg group-hover:text-primary transition-colors hover:underline"
                          >
                            {u.fullName || u.email}
                          </Link>
                          <p className="text-[12px] text-fg-2 break-all mt-0.5">{u.email}</p>
                        </td>

                        {/* Cột 2: Vai trò có màu sắc và icon riêng biệt */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top">
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles.length > 0 ? (
                              u.roles.map((r) => <RoleBadge key={r} role={r} />)
                            ) : (
                              <span className="text-fg-muted italic text-xs">Chưa có vai trò</span>
                            )}
                          </div>
                        </td>

                        {/* Cột 3: Trạng thái */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top">
                          <span
                            className={cx(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                              status.tone === 'ok' && 'bg-ok-soft text-ok border-ok/20',
                              status.tone === 'info' && 'bg-info-soft text-info border-info/20',
                              status.tone === 'warn' && 'bg-warn-soft text-warn border-warn/20',
                              status.tone === 'danger' && 'bg-danger-soft text-danger border-danger/20',
                              status.tone === 'neutral' && 'bg-surface-3 text-fg-2 border-line',
                            )}
                          >
                            <span
                              className={cx(
                                'size-1.5 rounded-full',
                                status.tone === 'ok' && 'bg-ok',
                                status.tone === 'info' && 'bg-info',
                                status.tone === 'warn' && 'bg-warn',
                                status.tone === 'danger' && 'bg-danger',
                                status.tone === 'neutral' && 'bg-fg-muted',
                              )}
                            />
                            {status.label}
                          </span>
                        </td>

                        {/* Cột 4: Đăng nhập gần nhất */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top text-meta whitespace-nowrap">
                          {u.lastLoginAt ? (
                            <time title={formatDateTime(u.lastLoginAt)} className="font-medium text-fg">
                              {formatRelative(u.lastLoginAt)}
                            </time>
                          ) : (
                            <span className="text-fg-3 italic">Chưa đăng nhập</span>
                          )}
                        </td>

                        {/* Cột 5: Tạo lúc */}
                        <td className="py-3.5 px-3.5 align-top text-meta text-fg-2 tnum whitespace-nowrap">
                          {formatDateTime(u.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer bảng */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-3.5 py-2.5 text-meta text-fg-2">
              <p className="tnum text-xs">
                Hiển thị <strong className="text-fg">{from}</strong> – <strong className="text-fg">{from + users.length - 1}</strong> trên <strong className="text-fg">{total}</strong> tài khoản
              </p>
              {pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
            </div>
          </div>
        )}
      </section>

      <AccountFormDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(result) => {
          const sent = activationMessage(result.activation)
          const text = `Đã tạo tài khoản ${result.user.email}. ${sent.text}`
          if (sent.ok) toast.success(text)
          else toast.warning(text)
          navigate(withId(ROUTES.admin.user, result.user.id))
        }}
      />
    </div>
  )
}

export default AdminUsersPage
