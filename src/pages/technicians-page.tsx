import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { SearchInput } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { technicianReadiness } from '@/features/scheduling/schedulingDisplay'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { ROUTES, withId } from '@/routes/paths'
import type { TechnicianProfileView } from '@/types/res/adminTechniciansRes'
import { cx } from '@/utils/cx'

// Danh sách kỹ thuật viên. Người chưa thuộc khu vực nào lên đầu và có cảnh báo

const rank = (t: TechnicianProfileView) => (t.readyForScheduling ? 2 : technicianReadiness(t).tone === 'danger' ? 0 : 1)

// Chú thích trạng thái sẵn sàng của KTV
const READINESS_LEGEND = [
  {
    label: 'Sẵn sàng nhận lịch',
    tone: 'ok',
    icon: 'check_circle',
    bg: 'bg-ok-soft text-ok border-ok/20',
    desc: 'Tài khoản hoạt động, đang bật nhận lịch và đã gán khu vực',
  },
  {
    label: 'Chưa có khu vực',
    tone: 'danger',
    icon: 'warning',
    bg: 'bg-danger-soft text-danger border-danger/20',
    desc: 'Chưa được phân công khu vực phục vụ (Zone)',
  },
  {
    label: 'Đang tắt nhận lịch',
    tone: 'neutral',
    icon: 'pause_circle',
    bg: 'bg-surface-3 text-fg-2 border-line',
    desc: 'KTV tạm dừng nhận các ca khảo sát mới',
  },
  {
    label: 'Chưa kích hoạt',
    tone: 'warn',
    icon: 'schedule',
    bg: 'bg-warn-soft text-warn border-warn/20',
    desc: 'Tài khoản chưa hoàn tất kích hoạt qua email',
  },
] as const

function TechniciansPage({ detailPattern, usersLink }: { detailPattern: string; usersLink?: string }) {
  const navigate = useNavigate()
  const query = useTechniciansQuery()
  const [search, setSearch] = useState('')
  const missing = query.data?.filter((t) => technicianReadiness(t).tone === 'danger').length ?? 0
  const readyCount = query.data?.filter((t) => t.readyForScheduling).length ?? 0
  const term = search.trim().toLocaleLowerCase('vi')

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kỹ thuật viên"
        description={
          missing > 0 ? (
            <Badge tone="danger">{missing} kỹ thuật viên chưa thuộc khu vực nào nên chưa nhận lịch được</Badge>
          ) : undefined
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

      {/* Chú thích trạng thái KTV (Legend Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-2 p-3 sm:px-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-meta">
          <span className="font-semibold text-fg flex items-center gap-1.5 pr-2.5 border-r border-line/70">
            <Icon name="palette" className="text-primary text-[18px]" />
            Chú thích trạng thái:
          </span>
          {READINESS_LEGEND.map((leg) => (
            <span
              key={leg.label}
              title={leg.desc}
              className={cx(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-help shadow-2xs',
                leg.bg,
              )}
            >
              <Icon name={leg.icon} className="text-[13px]" />
              <span>{leg.label}</span>
            </span>
          ))}
        </div>
        <div className="text-meta text-fg-2">
          Sẵn sàng: <strong className="text-ok">{readyCount}</strong> /{' '}
          <strong className="font-semibold text-fg">{query.data?.length ?? 0}</strong> KTV
        </div>
      </div>

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
            <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-meta border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface-2 text-fg-2 font-medium">
                      <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                        Kỹ thuật viên
                      </th>
                      <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                        Trạng thái nhận lịch
                      </th>
                      <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                        Khu vực phục vụ
                      </th>
                      <th className="py-3 px-3.5 border-r border-line text-right text-meta font-semibold">
                        Lịch / ngày
                      </th>
                      <th className="py-3 px-3.5 text-left text-meta font-semibold">Giờ làm việc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {shown.map((t) => {
                      const ready = technicianReadiness(t)
                      return (
                        <tr
                          key={t.technicianUserId}
                          onClick={() => navigate(withId(detailPattern, t.technicianUserId))}
                          className="group hover:bg-surface-2/60 transition-colors cursor-pointer"
                        >
                          {/* Cột 1: Thông tin KTV */}
                          <td className="py-3.5 px-3.5 border-r border-line align-top">
                            <Link
                              to={withId(detailPattern, t.technicianUserId)}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-fg group-hover:text-primary transition-colors hover:underline"
                            >
                              {t.fullName}
                            </Link>
                            {t.phone ? (
                              <p className="tnum text-[12px] text-fg-2 mt-0.5">{t.phone}</p>
                            ) : (
                              <p className="text-[12px] text-fg-muted italic mt-0.5">Chưa có SĐT</p>
                            )}
                          </td>

                          {/* Cột 2: Trạng thái nhận lịch với badge màu sắc riêng biệt */}
                          <td className="py-3.5 px-3.5 border-r border-line align-top">
                            <span
                              className={cx(
                                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                                ready.tone === 'ok' && 'bg-ok-soft text-ok border-ok/20',
                                ready.tone === 'danger' && 'bg-danger-soft text-danger border-danger/20',
                                ready.tone === 'warn' && 'bg-warn-soft text-warn border-warn/20',
                                ready.tone === 'neutral' && 'bg-surface-3 text-fg-2 border-line',
                              )}
                            >
                              <span
                                className={cx(
                                  'size-1.5 rounded-full',
                                  ready.tone === 'ok' && 'bg-ok',
                                  ready.tone === 'danger' && 'bg-danger animate-pulse',
                                  ready.tone === 'warn' && 'bg-warn',
                                  ready.tone === 'neutral' && 'bg-fg-muted',
                                )}
                              />
                              {ready.label}
                            </span>
                          </td>

                          {/* Cột 3: Danh sách khu vực phục vụ dạng tag */}
                          <td className="py-3.5 px-3.5 border-r border-line align-top">
                            {t.zones.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {t.zones.map((zone) => (
                                  <span
                                    key={zone.zoneId}
                                    className="inline-flex items-center gap-1 rounded-control bg-surface-2 border border-line px-2 py-0.5 text-xs text-fg font-medium"
                                  >
                                    <Icon name="location_on" className="text-[12px] text-primary" />
                                    <span>{zone.name}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-danger font-medium text-xs">
                                <Icon name="error_outline" className="text-[14px]" />
                                Chưa gán khu vực
                              </span>
                            )}
                          </td>

                          {/* Cột 4: Lịch / ngày */}
                          <td className="py-3.5 px-3.5 border-r border-line align-top text-right tnum">
                            {t.maxAppointmentsPerDay ? (
                              <span className="font-semibold text-fg px-2 py-0.5 rounded-control bg-surface-2 border border-line text-xs">
                                {t.maxAppointmentsPerDay} ca/ngày
                              </span>
                            ) : (
                              <span className="text-fg-muted text-xs">Mặc định</span>
                            )}
                          </td>

                          {/* Cột 5: Giờ làm việc */}
                          <td className="py-3.5 px-3.5 align-top text-meta">
                            {t.hasCustomWorkingSchedule ? (
                              <span className="inline-flex items-center gap-1 text-primary font-medium text-xs">
                                <Icon name="schedule" className="text-[13px]" />
                                Lịch riêng
                              </span>
                            ) : (
                              <span className="text-fg-muted text-xs">Giờ chung</span>
                            )}
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
                  Hiển thị <strong className="text-fg">{shown.length}</strong> trên{' '}
                  <strong className="text-fg">{rows.length}</strong> kỹ thuật viên
                </p>
                {missing > 0 && (
                  <span className="text-danger text-xs font-medium">
                    * Cần bổ sung khu vực cho {missing} KTV để bắt đầu nhận lịch
                  </span>
                )}
              </div>
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

export function AdminTechniciansPage() {
  return <TechniciansPage detailPattern={ROUTES.admin.technician} usersLink={ROUTES.admin.users} />
}

export function ManageTechniciansPage() {
  return <TechniciansPage detailPattern={ROUTES.manage.technician} />
}

export default TechniciansPage
