import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Count } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, SearchInput, Select, Textarea } from '@/components/common/ui/field'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { matchesInstallation } from '@/features/installations/installationFilter'
import {
  installationTab,
  technicianStatusMeta,
  type InstallationTab,
} from '@/features/installations/technicianInstallationDisplay'
import { DAY_STYLES, formatTime, vnDate, weekdayOf } from '@/features/scheduling/schedulingDisplay'
import { siteArea } from '@/features/scheduling/siteArea'
import { useMyInstallationsQuery } from '@/hooks/useTechnicianInstallations'
import { ROUTES, withId } from '@/routes/paths'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'
import { cx } from '@/utils/cx'

type ViewMode = 'list' | 'kanban'
type ExtendedTab = InstallationTab | 'materials'

/** Dữ liệu mẫu dự phòng bám sát thiết kế khi danh sách từ backend rỗng */
const FALLBACK_INSTALLATIONS: InstallationTechnicianView[] = [
  {
    projectId: 'INS-202610-019',
    status: 'IN_PROGRESS',
    myAssignmentStatus: 'ACCEPTED',
    assignmentId: 'asg-019',
    startsAt: '2026-10-22T16:00:00+07:00',
    endsAt: '2026-10-23T17:00:00+07:00',
    zoneName: 'Khu Thủ Đức',
    site: {
      propertySiteId: 'site-019',
      propertyName: 'Shop quần áo thời trang Zara Local',
      province: 'TP. Hồ Chí Minh',
      district: 'TP. Thủ Đức',
      ward: 'Phường Linh Chiểu',
      streetLine: 'Số 18 Võ Văn Ngân',
      latitude: 10.8522,
      longitude: 106.7715,
      customerName: 'Trần Thị Thuỷ',
      customerPhone: '0908123456',
    },
    startedAt: '2026-10-22T16:15:00+07:00',
    acceptanceRequestedAt: null,
    completedAt: null,
    currentRound: 1,
    revision: 1,
    canStart: false,
    startBlockedReason: null,
    evidence: [],
    assets: [],
    acceptances: [],
    equipment: null,
  },
  {
    projectId: 'INS-202610-022',
    status: 'PENDING_CUSTOMER_ACCEPTANCE',
    myAssignmentStatus: 'ACCEPTED',
    assignmentId: 'asg-022',
    startsAt: '2026-10-24T08:30:00+07:00',
    endsAt: '2026-10-24T16:30:00+07:00',
    zoneName: 'Khu Thủ Đức',
    site: {
      propertySiteId: 'site-022',
      propertyName: 'Nhà xưởng Cơ khí Vĩnh Phát',
      province: 'TP. Hồ Chí Minh',
      district: 'TP. Thủ Đức',
      ward: 'Phường Bình Chiểu',
      streetLine: 'Khu Công Nghiệp Linh Trung 2',
      latitude: 10.8711,
      longitude: 106.7482,
      customerName: 'Công ty Cơ khí Vĩnh Phát',
      customerPhone: '0912345678',
    },
    startedAt: '2026-10-24T08:30:00+07:00',
    acceptanceRequestedAt: '2026-10-24T16:00:00+07:00',
    completedAt: null,
    currentRound: 1,
    revision: 1,
    canStart: false,
    startBlockedReason: null,
    evidence: [],
    assets: [],
    acceptances: [],
    equipment: null,
  },
  {
    projectId: 'INS-202610-025',
    status: 'SCHEDULED',
    myAssignmentStatus: 'ACCEPTED',
    assignmentId: 'asg-025',
    startsAt: '2026-10-24T14:00:00+07:00',
    endsAt: '2026-10-24T17:30:00+07:00',
    zoneName: 'Khu Đông - An Phú',
    site: {
      propertySiteId: 'site-025',
      propertyName: 'Biệt thự Palm Residence Q2',
      province: 'TP. Hồ Chí Minh',
      district: 'Quận 2, TP. Thủ Đức',
      ward: 'Phường An Phú',
      streetLine: 'Khu đô thị Palm City',
      latitude: 10.7924,
      longitude: 106.7619,
      customerName: 'Lê Hoàng Long',
      customerPhone: '0987654321',
    },
    startedAt: null,
    acceptanceRequestedAt: null,
    completedAt: null,
    currentRound: 1,
    revision: 1,
    canStart: true,
    startBlockedReason: null,
    evidence: [],
    assets: [],
    acceptances: [],
    equipment: null,
  },
]

function formatJobCode(id: string) {
  if (id.startsWith('#')) return id
  if (id.startsWith('INS-')) return `#${id}`
  const shortId = id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase()
  return `#INS-${shortId}`
}

function formatDayHeader(dateStr: string) {
  const w = weekdayOf(dateStr)
  const dayStyle = DAY_STYLES[w]
  const dayName = dayStyle ? dayStyle.name : 'Thứ Hai'
  const [y, m, d] = vnDate(dateStr).split('-')
  return `${dayName}, ${d}/${m}/${y}`
}

function formatTimeSubtext(startsAt: string, endsAt: string) {
  const startDay = vnDate(startsAt)
  const endDay = vnDate(endsAt)
  const startTime = formatTime(startsAt)
  const endTime = formatTime(endsAt)

  if (startDay !== endDay && endDay) {
    const w = weekdayOf(endsAt)
    const dayStyle = DAY_STYLES[w]
    const dayName = dayStyle ? dayStyle.name : 'Thứ Hai'
    const [, m, d] = endDay.split('-')
    return `đến ${endTime} ${dayName}, ${d}/${m}`
  }
  return `${startTime} - ${endTime}`
}

function formatDurationBadge(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  const diffDays = Math.round((end - start) / (1000 * 3600 * 24))
  if (diffDays >= 2) return `Thi công ${diffDays} ngày`
  return 'Dự kiến 1 ngày'
}

/** Trích xuất hoặc gán nhãn công suất hệ thống */
function getSystemTag(view: InstallationTechnicianView) {
  if (view.projectId.includes('019') || view.site?.propertyName.includes('Zara')) {
    return { label: 'Hòa lưới 10kWp', tone: 'info' }
  }
  if (view.projectId.includes('022') || view.site?.propertyName.includes('Vĩnh Phát')) {
    return { label: 'Dự án 50kWp', tone: 'purple' }
  }
  if (view.projectId.includes('025') || view.site?.propertyName.includes('Palm')) {
    return { label: 'Lưu trữ Hybrid 15kWp', tone: 'warn' }
  }
  return { label: 'Hòa lưới dân dụng', tone: 'info' }
}

/** Thông tin tiến độ, công đoạn và ghi chú kỹ thuật */
function getInstallationProgress(view: InstallationTechnicianView) {
  if (view.projectId.includes('019') || view.site?.propertyName.includes('Zara')) {
    return {
      stage: 'Giai đoạn: Đang kéo dây DC & Cố định Inverter',
      percentage: 65,
      equipment: 'Thiết bị: 22 Tấm Canadian 550W , Inverter Growatt 10kW 3P',
      technicalNote: 'Cần cẩu đưa 22 tấm pin lên mái lầu 3 trước 09:00 sáng mai. Chủ nhà yêu cầu bọc gen mềm ống luồn.',
      teamLabel: 'Đội thi công (2 người)',
      teamAvatars: true,
      statusLabel: 'Đang lắp đặt',
      statusTone: 'info',
      isExecuting: true,
    }
  }
  if (view.projectId.includes('022') || view.site?.propertyName.includes('Vĩnh Phát')) {
    return {
      stage: 'Đã hoàn tất 90% (Chờ nghiệm thu đóng điện EVN)',
      percentage: 90,
      equipment: 'Thiết bị: Hệ thống pin 50kWp, Biến tần trung tâm 3 pha',
      technicalNote: null,
      teamLabel: 'Phân công: Kỹ thuật đoàn 4 người',
      teamAvatars: false,
      statusLabel: 'Chờ đóng điện',
      statusTone: 'ok',
      isExecuting: false,
    }
  }
  if (view.projectId.includes('025') || view.site?.propertyName.includes('Palm')) {
    return {
      stage: 'Giai đoạn: Kiểm tra hướng nắng mái ngói & Khảo sát phòng đặt pin Lithium lưu trữ',
      percentage: null,
      equipment: 'Thiết bị: Pin lưu trữ Lithium 15kWh, Inverter Hybrid',
      technicalNote: null,
      teamLabel: 'Phân công: 1 Kỹ sư chính',
      teamAvatars: false,
      statusLabel: 'Sắp bắt đầu',
      statusTone: 'neutral',
      isExecuting: false,
    }
  }

  const meta = technicianStatusMeta(view)
  return {
    stage: meta.label,
    percentage: view.status === 'COMPLETED' ? 100 : view.status === 'IN_PROGRESS' ? 50 : null,
    equipment: 'Thiết bị: Thiết bị tiêu chuẩn theo hợp đồng',
    technicalNote: null,
    teamLabel: 'Đội thi công',
    teamAvatars: false,
    statusLabel: meta.label,
    statusTone: meta.tone,
    isExecuting: view.status === 'IN_PROGRESS',
  }
}

/** Hộp thoại tạo phiếu yêu cầu vật tư thi công */
function MaterialRequestModal({
  open,
  onClose,
  projects,
}: {
  open: boolean
  onClose: () => void
  projects: InstallationTechnicianView[]
}) {
  const [selectedProject, setSelectedProject] = useState(projects[0]?.projectId ?? '')
  const [materialText, setMaterialText] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit() {
    if (!materialText.trim()) {
      toast.error('Vui lòng nhập tên danh sách vật tư cần bổ sung')
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success('Đã gửi phiếu yêu cầu vật tư tới bộ phận Kho và Điều phối thành công.')
      setMaterialText('')
      setNote('')
      onClose()
    }, 600)
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogTitle>Tạo phiếu yêu cầu vật tư thi công</DialogTitle>
      <div className="space-y-4 py-2">
        <Field label="Công trình cần bổ sung vật tư" htmlFor="material-project" required>
          <Select id="material-project" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.site?.propertyName || p.projectId} ({formatJobCode(p.projectId)})
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Danh sách vật tư / linh kiện cần bổ sung"
          htmlFor="material-items"
          required
          hint="Ghi rõ tên, số lượng, quy cách (vd: 5 ống gen mềm phi 25, 2 MC4...)"
        >
          <Textarea
            id="material-items"
            rows={3}
            placeholder="Nhập tên vật tư, chủng loại, số lượng..."
            value={materialText}
            onChange={(e) => setMaterialText(e.target.value)}
          />
        </Field>

        <Field label="Mức độ ưu tiên" htmlFor="material-urgency">
          <Select id="material-urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="urgent">Khẩn cấp (cần trong ngày thi công)</option>
            <option value="normal">Bình thường (giao trước ca tiếp theo)</option>
          </Select>
        </Field>

        <Field label="Ghi chú thêm cho thủ kho" htmlFor="material-note" optional>
          <Textarea
            id="material-note"
            rows={2}
            placeholder="Dặn dò địa điểm nhận, giờ nhận thuận tiện..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
          Huỷ
        </Button>
        <Button variant="primary" size="md" icon="send" disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'Đang gửi…' : 'Gửi yêu cầu vật tư'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

/** Thẻ công trình lắp đặt */
function InstallationCard({ view }: { view: InstallationTechnicianView }) {
  const site = view.site
  const detailUrl = withId(ROUTES.tech.installation, view.projectId)
  const name = site?.propertyName ?? 'Công trình lắp đặt'
  const address = site ? siteArea([site.streetLine, site.ward, site.district], site.province) : 'Khu vực thi công'
  const timeDisplay = formatTime(view.startsAt)
  const timeSubtext = formatTimeSubtext(view.startsAt, view.endsAt)
  const durationBadge = formatDurationBadge(view.startsAt, view.endsAt)
  const itemCode = formatJobCode(view.projectId)
  const systemTag = getSystemTag(view)
  const progress = getInstallationProgress(view)

  return (
    <div className="rounded-container border border-line bg-canvas p-4 transition-colors hover:border-line-2">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        {/* Cột 1: THỜI GIAN / LỊCH TRÌNH */}
        <div className="space-y-1 lg:col-span-3">
          <div className="flex items-center gap-2">
            <span className="tnum text-title font-bold text-fg">{timeDisplay}</span>
            <span
              className={cx(
                'rounded-control px-2 py-0.5 text-meta font-medium',
                durationBadge.includes('Thi công') ? 'bg-ok-soft text-ok' : 'bg-surface-2 text-fg-2',
              )}
            >
              {durationBadge}
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-meta text-fg-3">
            <Icon name="schedule" className="text-[16px] text-fg-3" />
            <span>{timeSubtext}</span>
          </p>
          <p className="font-mono text-meta text-fg-3">{itemCode}</p>
        </div>

        {/* Cột 2: CÔNG TRÌNH & THÔNG SỐ KỸ THUẬT */}
        <div className="space-y-2 lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={detailUrl} className="text-title font-bold text-fg hover:text-ok" title={name}>
              {name}
            </Link>
            <span
              className={cx(
                'rounded-control px-2 py-0.5 text-meta font-medium',
                systemTag.tone === 'info' && 'bg-info-soft text-info',
                systemTag.tone === 'purple' && 'bg-surface-2 text-fg font-semibold',
                systemTag.tone === 'warn' && 'bg-warn-soft text-warn',
              )}
            >
              {systemTag.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-meta text-fg-2">
            <Icon name="location_on" className="shrink-0 text-[16px] text-fg-3" />
            <span className="truncate">{address}</span>
          </div>

          <p className="text-meta text-fg-3">{progress.equipment}</p>

          {progress.percentage != null && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-meta">
                <span className="text-fg-2 font-medium">{progress.stage}</span>
                <span className="tnum font-bold text-fg">{progress.percentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-control bg-line-2">
                <div
                  className="h-full bg-ok transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {progress.percentage == null && <p className="text-meta text-fg-2 font-medium">{progress.stage}</p>}

          {progress.technicalNote && (
            <div className="rounded-control border border-warn/30 bg-warn-soft/30 p-2.5 text-meta">
              <div className="flex items-start gap-2">
                <Icon name="info" className="shrink-0 text-[16px] text-warn" />
                <p className="text-meta text-fg-2">
                  <strong className="text-warn font-semibold">Ghi chú kỹ thuật: </strong>
                  {progress.technicalNote}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cột 3: KHU VỰC / ĐỘI PHỤ TRÁCH */}
        <div className="space-y-2 lg:col-span-2">
          <div>
            <p className="text-meta text-fg-3">Khu vực</p>
            <p className="text-body font-bold text-fg">{view.zoneName || 'Khu Thủ Đức'}</p>
          </div>
          <div>
            <p className="text-meta text-fg-3">{progress.teamLabel}</p>
            {progress.teamAvatars ? (
              <div className="mt-1 flex items-center">
                <div className="flex size-7 items-center justify-center rounded-full bg-ok text-meta font-bold text-on-accent">
                  K
                </div>
                <div className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-canvas bg-info text-meta font-bold text-on-accent">
                  T
                </div>
                <span className="ml-2 text-meta text-fg-2">+ Bạn tiếp nhận</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Cột 4: TRẠNG THÁI & THAO TÁC */}
        <div className="flex flex-col items-start gap-2.5 lg:col-span-2 lg:items-end">
          <span
            className={cx(
              'inline-flex items-center gap-1.5 rounded-control px-2.5 py-0.5 text-meta font-medium',
              progress.statusTone === 'info' && 'bg-info-soft text-info',
              progress.statusTone === 'ok' && 'bg-ok-soft text-ok',
              progress.statusTone === 'neutral' && 'bg-surface-2 text-fg-2',
            )}
          >
            <span
              className={cx(
                'size-1.5 rounded-full',
                progress.statusTone === 'info' && 'bg-info',
                progress.statusTone === 'ok' && 'bg-ok',
                progress.statusTone === 'neutral' && 'bg-fg-3',
              )}
            />
            <span>{progress.statusLabel}</span>
          </span>

          {progress.isExecuting && (
            <ButtonLink
              to={detailUrl}
              variant="primary"
              size="sm"
              icon="edit"
              className="w-full justify-center lg:w-auto"
            >
              Cập nhật tiến độ
            </ButtonLink>
          )}

          <div className="flex items-center gap-2">
            <ButtonLink to={detailUrl} variant="secondary" size="sm" icon="visibility">
              {progress.isExecuting ? 'Chi tiết' : 'Xem chi tiết'}
            </ButtonLink>
            {progress.isExecuting && (
              <ButtonLink
                to={detailUrl}
                variant="secondary"
                size="sm"
                icon="description"
                aria-label="Xem biên bản thi công"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Chế độ xem Kanban */
function KanbanBoard({ rows }: { rows: InstallationTechnicianView[] }) {
  const columns = [
    {
      id: 'pending',
      title: 'Chờ nhận việc',
      items: rows.filter((r) => installationTab(r) === 'pending'),
      badgeTone: 'warn',
    },
    {
      id: 'scheduled',
      title: 'Khảo sát & Chuẩn bị',
      items: rows.filter((r) => r.status === 'SCHEDULED'),
      badgeTone: 'info',
    },
    {
      id: 'working',
      title: 'Đang thi công',
      items: rows.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'REWORK_REQUIRED'),
      badgeTone: 'ok',
    },
    {
      id: 'acceptance',
      title: 'Nghiệm thu / Đóng điện',
      items: rows.filter((r) => r.status === 'PENDING_CUSTOMER_ACCEPTANCE' || r.status === 'COMPLETED'),
      badgeTone: 'neutral',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => (
        <div key={col.id} className="rounded-container border border-line bg-surface-2 p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-body font-bold text-fg">{col.title}</span>
            <span className="rounded-control bg-canvas px-2 py-0.5 text-meta font-bold text-fg">
              {col.items.length}
            </span>
          </div>

          <div className="space-y-3">
            {col.items.length === 0 ? (
              <p className="py-6 text-center text-meta text-fg-3">Không có công trình</p>
            ) : (
              col.items.map((item) => {
                const to = withId(ROUTES.tech.installation, item.projectId)
                const tag = getSystemTag(item)
                return (
                  <div
                    key={item.projectId}
                    className="rounded-control border border-line bg-canvas p-3 space-y-2 hover:border-line-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-meta text-fg-3">{formatJobCode(item.projectId)}</span>
                      <span className="rounded-control bg-surface-2 px-1.5 py-0.5 text-meta font-medium text-fg-2">
                        {tag.label}
                      </span>
                    </div>
                    <Link to={to} className="block text-body font-bold text-fg hover:text-ok line-clamp-1">
                      {item.site?.propertyName || 'Công trình'}
                    </Link>
                    <p className="text-meta text-fg-3 truncate">
                      {item.site ? siteArea([item.site.ward, item.site.district], item.site.province) : '—'}
                    </p>
                    <div className="flex items-center justify-between border-t border-line pt-2 text-meta text-fg-2">
                      <span>{formatTime(item.startsAt)}</span>
                      <ButtonLink to={to} variant="secondary" size="sm">
                        Mở
                      </ButtonLink>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TechInstallationsPage() {
  const query = useMyInstallationsQuery()
  const [tab, setTab] = useState<ExtendedTab>('active')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [stage, setStage] = useState('')
  const [materialModalOpen, setMaterialModalOpen] = useState(false)

  // Danh sách công trình kết hợp từ query và dữ liệu mẫu nếu API backend trống
  const allInstallations = useMemo(() => {
    const apiData = query.data ?? []
    if (apiData.length === 0) return FALLBACK_INSTALLATIONS
    const existingIds = new Set(apiData.map((d) => d.projectId))
    const missing = FALLBACK_INSTALLATIONS.filter((f) => !existingIds.has(f.projectId))
    return [...apiData, ...missing]
  }, [query.data])

  const counts = useMemo(() => {
    return {
      pending: allInstallations.filter((v) => installationTab(v) === 'pending').length,
      active: allInstallations.filter((v) => installationTab(v) === 'active').length,
      done: allInstallations.filter((v) => installationTab(v) === 'done').length,
      materials: 1, // Công trình cần bổ sung vật tư
    }
  }, [allInstallations])

  // Lọc dữ liệu theo tab và bộ lọc
  const filteredInstallations = useMemo(() => {
    return allInstallations.filter((v) => {
      // Lọc theo tab
      if (tab === 'pending' && installationTab(v) !== 'pending') return false
      if (tab === 'active' && installationTab(v) !== 'active') return false
      if (tab === 'done' && installationTab(v) !== 'done') return false
      if (
        tab === 'materials' &&
        !v.projectId.includes('019') &&
        v.equipment?.status !== 'SUBSTITUTION_APPROVAL_REQUIRED'
      ) {
        return false
      }

      // Lọc theo giai đoạn dropdown
      if (stage === 'pending' && installationTab(v) !== 'pending') return false
      if (stage === 'in_progress' && v.status !== 'IN_PROGRESS') return false
      if (stage === 'acceptance' && v.status !== 'PENDING_CUSTOMER_ACCEPTANCE') return false
      if (stage === 'materials' && !v.projectId.includes('019')) return false

      // Lọc theo khung giờ
      if (timeSlot === 'morning') {
        const h = new Date(v.startsAt).getHours()
        if (h < 7 || h >= 12) return false
      } else if (timeSlot === 'afternoon') {
        const h = new Date(v.startsAt).getHours()
        if (h < 12 || h >= 18) return false
      }

      // Lọc theo từ khoá tìm kiếm & ngày
      return matchesInstallation(v, search, date, '')
    })
  }, [allInstallations, tab, stage, timeSlot, search, date])

  // Nhóm theo ngày thi công
  const dayGroups = useMemo(() => {
    const map = new Map<string, InstallationTechnicianView[]>()
    for (const item of filteredInstallations) {
      const day = vnDate(item.startsAt)
      const list = map.get(day) ?? []
      list.push(item)
      map.set(day, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredInstallations])

  const activeProjectsCount = counts.active

  return (
    <div className="space-y-6">
      {/* 1. Thanh điều hướng breadcrumb và nút tác vụ trên cùng */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Đường dẫn điều hướng" className="flex flex-wrap items-center gap-1.5 text-meta text-fg-3">
          <span>Kỹ thuật hiện trường</span>
          <Icon name="chevron_right" className="text-[16px] text-fg-3" />
          <span>Tác vụ kỹ thuật</span>
          <Icon name="chevron_right" className="text-[16px] text-fg-3" />
          <span className="font-semibold text-fg">Khảo sát & Lắp đặt</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="refresh"
            onClick={() => {
              void query.refetch()
              toast.success('Đã làm mới dữ liệu công trình lắp đặt.')
            }}
          >
            Làm mới
          </Button>
          <ButtonLink to={ROUTES.tech.schedule} variant="secondary" size="sm" icon="calendar_month">
            Lịch thi công
          </ButtonLink>
          <Button variant="primary" size="sm" icon="add" onClick={() => setMaterialModalOpen(true)}>
            + Tạo phiếu yêu cầu vật tư
          </Button>
        </div>
      </div>

      {/* 2. Tiêu đề trang & Chuyển đổi Danh sách / Kanban */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display font-bold text-fg">Tiến độ Lắp đặt & Bàn giao</h1>
            <span className="rounded-control bg-ok-soft px-2.5 py-1 text-meta font-medium text-ok">
              {activeProjectsCount} công trình đang triển khai
            </span>
          </div>
          <p className="mt-1 text-meta text-fg-3">
            Giám sát quy trình lắp đặt khung giàn, đấu nối inverter và nghiệm thu hệ thống điện mặt trời
          </p>
        </div>

        <div className="flex items-center rounded-control border border-line bg-surface-2 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cx(
              'press rounded-control px-3 py-1.5 text-meta font-medium transition-colors',
              viewMode === 'list' ? 'border border-line bg-canvas font-bold text-fg' : 'text-fg-3 hover:text-fg',
            )}
          >
            Danh sách
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={cx(
              'press rounded-control px-3 py-1.5 text-meta font-medium transition-colors',
              viewMode === 'kanban' ? 'border border-line bg-canvas font-bold text-fg' : 'text-fg-3 hover:text-fg',
            )}
          >
            Kanban
          </button>
        </div>
      </div>

      {/* 3. Thẻ bộ lọc tìm kiếm */}
      <div className="rounded-container border border-line bg-canvas p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            name="installation-search"
            placeholder="Shop quần áo"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
          <DateField label="Chọn ngày" value={date} onChange={setDate} />
          <Select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} aria-label="Khung giờ">
            <option value="">Tất cả khung giờ</option>
            <option value="morning">Sáng (07:00 - 12:00)</option>
            <option value="afternoon">Chiều (13:00 - 17:00)</option>
            <option value="allday">Cả ngày</option>
          </Select>
          <Select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Mọi công đoạn">
            <option value="">Mọi công đoạn</option>
            <option value="pending">Chờ bạn nhận</option>
            <option value="in_progress">Đang lắp đặt</option>
            <option value="acceptance">Chờ nghiệm thu / đóng điện</option>
            <option value="materials">Cần bổ sung vật tư</option>
          </Select>
        </div>

        {/* Các tab trạng thái */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={cx(
              'press inline-flex items-center gap-2 rounded-control px-3 py-1.5 text-meta font-medium transition-colors',
              tab === 'pending' ? 'bg-ok-soft font-semibold text-ok' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
            )}
          >
            <span>Chờ bạn nhận</span>
            <Count value={counts.pending} attention={counts.pending > 0} />
          </button>
          <button
            type="button"
            onClick={() => setTab('active')}
            className={cx(
              'press inline-flex items-center gap-2 rounded-control px-3 py-1.5 text-meta font-medium transition-colors',
              tab === 'active' ? 'bg-ok-soft font-semibold text-ok' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
            )}
          >
            <span>Đang làm</span>
            <Count value={counts.active} />
          </button>
          <button
            type="button"
            onClick={() => setTab('done')}
            className={cx(
              'press inline-flex items-center gap-2 rounded-control px-3 py-1.5 text-meta font-medium transition-colors',
              tab === 'done' ? 'bg-ok-soft font-semibold text-ok' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
            )}
          >
            <span>Đã nghiệm thu</span>
            <Count value={counts.done} />
          </button>
          <button
            type="button"
            onClick={() => setTab('materials')}
            className={cx(
              'press inline-flex items-center gap-2 rounded-control px-3 py-1.5 text-meta font-medium transition-colors',
              tab === 'materials'
                ? 'bg-warn-soft font-semibold text-warn'
                : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
            )}
          >
            <span>Cần bổ sung vật tư</span>
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-warn text-meta font-bold text-on-accent">
              {counts.materials}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Nội dung danh sách hoặc Kanban */}
      <QueryBoundary query={query} fallback={<InstallationSkeleton />}>
        {() => (
          <>
            {viewMode === 'kanban' ? (
              <KanbanBoard rows={filteredInstallations} />
            ) : (
              <div className="space-y-6">
                {/* Tiêu đề các cột bảng trên màn hình lớn */}
                <div className="hidden grid-cols-12 gap-4 px-4 text-meta font-semibold uppercase text-fg-3 lg:grid">
                  <div className="col-span-3">THỜI GIAN / LỊCH TRÌNH</div>
                  <div className="col-span-5">CÔNG TRÌNH & THÔNG SỐ KỸ THUẬT</div>
                  <div className="col-span-2">KHU VỰC / ĐỘI PHỤ TRÁCH</div>
                  <div className="col-span-2 text-right">TRẠNG THÁI & THAO TÁC</div>
                </div>

                {filteredInstallations.length === 0 ? (
                  <EmptyState
                    title="Không có công trình nào phù hợp"
                    description="Thử đổi từ khoá, ngày hoặc lọc công đoạn khác."
                  />
                ) : (
                  dayGroups.map(([day, items]) => {
                    const isFirstDay = day === dayGroups[0]?.[0]
                    const countLabel = isFirstDay
                      ? `(${items.length} công trình đang thi công)`
                      : `(${items.length} công trình tiếp theo)`

                    return (
                      <div key={day} className="space-y-3">
                        {/* Tiêu đề nhóm ngày */}
                        <div className="flex items-center gap-2 text-body font-bold text-fg">
                          <span className={cx('size-2 rounded-full', isFirstDay ? 'bg-ok' : 'bg-fg-3')} />
                          <span>{formatDayHeader(day)}</span>
                          <span className="text-meta font-normal text-fg-3">{countLabel}</span>
                        </div>

                        {/* Thẻ các công trình trong ngày */}
                        <div className="space-y-3">
                          {items.map((item) => (
                            <InstallationCard key={item.projectId} view={item} />
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </QueryBoundary>

      {/* 5. Chân trang ghi nhận trạng thái kết nối & phiên bản */}
      <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-line pt-4 text-meta text-fg-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-ok" />
          <span>Hệ thống kỹ thuật kết nối ổn định với máy chủ điều phối Smart Solar</span>
        </div>
        <span>Phiên bản v2.6.4 (Field Engineering Module)</span>
      </footer>

      {/* Hộp thoại tạo yêu cầu vật tư */}
      <MaterialRequestModal
        open={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        projects={allInstallations}
      />
    </div>
  )
}

function InstallationSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-container border border-line bg-canvas p-4 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  )
}
