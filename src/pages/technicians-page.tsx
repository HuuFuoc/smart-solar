import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { SearchInput } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { technicianReadiness } from '@/features/scheduling/schedulingDisplay'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { ROUTES, withId } from '@/routes/paths'
import type { TechnicianProfileView } from '@/types/res/adminTechniciansRes'

// Danh sách kỹ thuật viên. Người chưa thuộc khu vực nào lên đầu và tô đỏ

const rank = (t: TechnicianProfileView) => (t.readyForScheduling ? 2 : technicianReadiness(t).tone === 'danger' ? 0 : 1)

function TechniciansPage({ detailPattern, usersLink }: { detailPattern: string; usersLink?: string }) {
  const query = useTechniciansQuery()
  const [search, setSearch] = useState('')
  const missing = query.data?.filter((t) => technicianReadiness(t).tone === 'danger').length ?? 0
  const term = search.trim().toLocaleLowerCase('vi')

  return (
    <>
      <PageHeader
        title="Kỹ thuật viên"
        description={
          missing > 0 ? (
            <Badge tone="danger" icon="wrong_location">
              {missing} kỹ thuật viên chưa thuộc khu vực nào nên chưa nhận lịch được
            </Badge>
          ) : (
            'Khu vực phục vụ, giờ làm và lịch nghỉ quyết định giờ khảo sát khách đặt được.'
          )
        }
        actions={
          usersLink ? (
            <ButtonLink variant="info" to={usersLink} icon="manage_accounts">
              Tài khoản
            </ButtonLink>
          ) : undefined
        }
      />
      <FilterBar>
        <label className="min-w-0 flex-1 basis-64">
          <span className="sr-only">Tìm kỹ thuật viên</span>
          <SearchInput
            placeholder="Tìm theo tên, số điện thoại"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </FilterBar>
      <QueryBoundary query={query}>
        {(rows) => {
          const shown = rows
            .filter((t) => !term || t.fullName.toLocaleLowerCase('vi').includes(term) || (t.phone ?? '').includes(term))
            .sort((a, b) => rank(a) - rank(b) || a.fullName.localeCompare(b.fullName, 'vi'))
          if (rows.length === 0)
            return (
              <EmptyState
                title="Chưa có tài khoản kỹ thuật viên"
                description="Tạo tài khoản với vai trò Kỹ thuật viên rồi chọn khu vực phục vụ ở đây."
                action={
                  usersLink ? (
                    <ButtonLink icon="manage_accounts" variant="info" to={usersLink}>
                      Mở trang tài khoản
                    </ButtonLink>
                  ) : undefined
                }
              />
            )
          if (shown.length === 0)
            return <EmptyState title="Không có kỹ thuật viên nào khớp" description="Thử từ khoá khác." />
          return (
            <Table stack>
              <thead>
                <tr>
                  <Th>Kỹ thuật viên</Th>
                  <Th>Nhận lịch</Th>
                  <Th>Khu vực phục vụ</Th>
                  <Th className="text-right">Lịch / ngày</Th>
                  <Th>Giờ làm</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => {
                  const ready = technicianReadiness(t)
                  return (
                    <Tr key={t.technicianUserId} className="group relative cursor-pointer">
                      <Td label="Kỹ thuật viên">
                        <Link
                          to={withId(detailPattern, t.technicianUserId)}
                          className="font-medium text-fg underline-offset-4 after:absolute after:inset-0 group-hover:text-accent-fg group-hover:underline"
                        >
                          {t.fullName}
                        </Link>
                        {t.phone && <p className="tnum text-meta text-fg-2">{t.phone}</p>}
                      </Td>
                      <Td label="Nhận lịch">
                        <Badge tone={ready.tone}>{ready.label}</Badge>
                      </Td>
                      <Td label="Khu vực phục vụ">
                        {t.zones.length > 0 ? (
                          t.zones.map((zone) => zone.name).join(', ')
                        ) : (
                          <span className="text-fg-3">Chưa có</span>
                        )}
                      </Td>
                      <Td label="Lịch / ngày" className="tnum lg:text-right">
                        {t.maxAppointmentsPerDay ?? <span className="text-fg-2">Mặc định</span>}
                      </Td>
                      <Td label="Giờ làm">
                        {t.hasCustomWorkingSchedule ? 'Giờ riêng' : <span className="text-fg-2">Giờ chung</span>}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          )
        }}
      </QueryBoundary>
    </>
  )
}

export function AdminTechniciansPage() {
  return <TechniciansPage detailPattern={ROUTES.admin.technician} usersLink={ROUTES.admin.users} />
}

export function ManageTechniciansPage() {
  return <TechniciansPage detailPattern={ROUTES.manage.technician} />
}
