import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Checkbox, SearchInput, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { Pagination } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { formatDateTime, formatRelative } from '@/features/pre-surveys/preSurveyDisplay'
import { AccountFormDialog } from '@/features/users/AccountFormDialog'
import { ROLE_CODES, USER_STATUSES } from '@/common/user'
import { activationMessage, rolesText, userStatusMeta } from '@/features/users/userDisplay'
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
  { value: 'name:asc', label: 'Tên A–Z' },
  { value: 'name:desc', label: 'Tên Z–A' },
  { value: 'status:asc', label: 'Theo trạng thái' },
] as const

type Filter = { search: string; role: string; status: string; sort: string; includeDeleted: boolean }
const defaultFilter: Filter = { search: '', role: '', status: '', sort: SORTS[0].value, includeDeleted: false }

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
    <>
      <PageHeader
        title="Tài khoản"
        actions={
          <Button variant="primary" icon="person_add" onClick={() => setCreating(true)}>
            Tạo tài khoản
          </Button>
        }
      />

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
            action={isFiltering ? <Button onClick={() => updateFilter(defaultFilter)}>Xoá bộ lọc</Button> : undefined}
          />
        ) : (
          <div className={cx(query.isPlaceholderData && 'opacity-70')}>
            <Table stack>
              <thead>
                <tr>
                  <Th>Tài khoản</Th>
                  <Th>Vai trò</Th>
                  <Th>Trạng thái</Th>
                  <Th>Đăng nhập gần nhất</Th>
                  <Th>Tạo lúc</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const status = userStatusMeta(u)
                  return (
                    <Tr key={u.id} className="group relative cursor-pointer">
                      <Td label="Tài khoản">
                        <Link
                          to={withId(ROUTES.admin.user, u.id)}
                          className="font-medium text-fg underline-offset-4 after:absolute after:inset-0 group-hover:text-accent-fg group-hover:underline"
                        >
                          {u.fullName || u.email}
                        </Link>
                        <p className="text-meta text-fg-2 wrap-anywhere">{u.email}</p>
                      </Td>
                      <Td label="Vai trò">{rolesText(u.roles)}</Td>
                      <Td label="Trạng thái">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </Td>
                      <Td label="Đăng nhập gần nhất" className="whitespace-nowrap">
                        {u.lastLoginAt ? (
                          <time title={formatDateTime(u.lastLoginAt)}>{formatRelative(u.lastLoginAt)}</time>
                        ) : (
                          <span className="text-fg-3">Chưa đăng nhập</span>
                        )}
                      </Td>
                      <Td label="Tạo lúc" className="tnum whitespace-nowrap">
                        {formatDateTime(u.createdAt)}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      {users.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="tnum text-meta text-fg-2">
            Hiển thị {from}–{from + users.length - 1} trên {total} tài khoản
          </p>
          {pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
        </div>
      )}

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
    </>
  )
}
