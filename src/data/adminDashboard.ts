import type { AuditEntry } from '@/features/dashboard/components/AuditTrailTable'
import type { DistributionSegment } from '@/features/dashboard/components/DistributionBar'
import type { KeyValueRowProps } from '@/features/dashboard/components/KeyValueList'
import type { QuickLaunchCardProps } from '@/features/dashboard/components/QuickLaunchCard'
import type { MetricCardProps } from '@/components/common/stitch-ui/MetricCard'
import type { Crumb } from '@/components/common/stitch-ui/PageHeader'
import { ROUTES } from '@/routes/paths'

/* Dữ liệu giả cho /admin, nội dung lấy từ admin_dashboard/screen.png. */

export const adminDashboardHeader = {
  breadcrumb: [{ label: 'Quản trị' }, { label: 'Tổng quan hệ thống' }] satisfies Crumb[],
  clusterNode: 'Cụm máy chủ: US-Central-Primary (đang chạy)',
  engineVersion: 'Bộ tính toán v3.4.2',
  title: 'Tổng quan hệ thống',
  actions: {
    healthCheck: 'Kiểm tra tình trạng hệ thống',
    exportLogs: 'Xuất nhật ký (CSV)',
    quickCreate: 'Tạo nhanh',
  },
}

export const quickCreateItems = [
  { key: 'user', icon: 'person_add', label: 'Tài khoản người dùng', href: ROUTES.admin.users },
  { key: 'sku', icon: 'inventory_2', label: 'Sản phẩm (SKU)', href: ROUTES.admin.products },
  { key: 'doc', icon: 'upload_file', label: 'Tài liệu tri thức', href: ROUTES.admin.knowledgeBase },
]

/** Footer của từng thẻ KPI khác nhau nên mô tả bằng union. */
export type KpiFooter =
  | { kind: 'chips'; chips: { label: string; active?: boolean }[] }
  | { kind: 'progress'; title: string; percent: number; left: string; right: string }
  | { kind: 'stat'; icon: string; label: string; sublabel: string; badge: string }
  | { kind: 'status'; label: string; note: string }

export type AdminKpi = Omit<MetricCardProps, 'children' | 'layout'> & { key: string; footer: KpiFooter }

export const adminKpis: AdminKpi[] = [
  {
    key: 'users',
    label: 'Tổng người dùng',
    value: '1,428',
    icon: 'group',
    tone: 'primary',
    delta: { text: '+14 tuần này', direction: 'up' },
    footer: {
      kind: 'chips',
      chips: [
        { label: '1.120 khách hàng' },
        { label: '84 kinh doanh' },
        { label: '42 kỹ thuật' },
        { label: '12 quản lý' },
        { label: '6 quản trị', active: true },
      ],
    },
  },
  {
    key: 'catalogue',
    label: 'Danh mục hàng hoá',
    value: '348',
    icon: 'solar_power',
    tone: 'secondary',
    delta: { text: 'SKU đang bán', direction: 'flat' },
    footer: {
      kind: 'progress',
      title: '214 sản phẩm phần cứng',
      percent: 61.5,
      left: '134 dịch vụ chuẩn',
      right: '8 nhóm hàng',
    },
  },
  {
    key: 'knowledge',
    label: 'Kho tri thức AI',
    value: '94',
    icon: 'neurology',
    tone: 'primary',
    delta: { text: 'tài liệu đã duyệt', direction: 'flat', tone: 'positive' },
    footer: {
      kind: 'stat',
      icon: 'dataset',
      label: '842 embedding',
      sublabel: 'Truy hồi đạt 99,8%',
      badge: '4 đang chờ',
    },
  },
  {
    key: 'engine',
    label: 'Bộ tính toán',
    value: 'Hoạt động tốt',
    valueSize: 'headline',
    valueTone: 'tertiary',
    icon: 'verified',
    tone: 'tertiary',
    footer: { kind: 'status', label: '6 gói bảo hành đang chạy', note: 'Đồng bộ 12 phút trước' },
  },
]

export const auditTrail = {
  title: 'Nhật ký thao tác',
  streamLabel: 'Trực tiếp',
  total: 1290,
  periodLabel: 'thao tác trong 7 ngày qua',
  linkLabel: 'Xem toàn bộ nhật ký',
  entries: [
    {
      id: 'a1',
      timestamp: 'Hôm nay, 14:32:10',
      actor: { initials: 'ES', name: 'Eleanor Sterling', tone: 'primary-container' },
      action: 'Sửa hệ số suy giảm tấm pin:',
      actionCode: '0,50% → 0,48%/năm',
      actionCodeTone: 'tertiary',
      target: 'Tham số sản lượng toàn hệ thống',
      origin: { ip: '192.168.4.12', site: 'Trụ sở Austin' },
      integrity: { label: 'Thành công', variant: 'positive' },
    },
    {
      id: 'a2',
      timestamp: 'Hôm nay, 13:18:04',
      actor: { initials: 'MV', name: 'Marcus Vance', tone: 'secondary' },
      action: 'Thu hồi quyền: Jack Reynolds (kỹ thuật)',
      target: 'Phân quyền người dùng (RBAC)',
      origin: { ip: '172.56.21.90', site: 'Trung tâm dữ liệu Denver' },
      integrity: { label: 'Đã xác minh', variant: 'neutral' },
    },
    {
      id: 'a3',
      timestamp: 'Hôm nay, 11:45:22',
      actor: { initials: 'ES', name: 'Eleanor Sterling', tone: 'primary' },
      action: 'Phát hành SKU:',
      actionCode: 'SE7600H-US HD-Wave',
      actionCodeTone: 'primary',
      target: 'Danh mục inverter',
      origin: { ip: '192.168.4.12', site: 'Trụ sở Austin' },
      integrity: { label: 'Thành công', variant: 'positive' },
    },
    {
      id: 'a4',
      timestamp: 'Hôm nay, 09:12:48',
      actor: { initials: 'AI', name: 'AutoIngest Bot', tone: 'neutral' },
      action: 'Tải tài liệu: NEC-2023-Solar-Compliance-V2.pdf',
      target: 'Kho vector (Pinecone)',
      origin: { ip: '10.0.8.214', site: 'Mạng nội bộ VPC' },
      integrity: { label: 'Cần xem lại (4 đoạn)', variant: 'warning' },
    },
    {
      id: 'a5',
      timestamp: 'Hôm qua, 18:05:01',
      actor: { initials: 'MV', name: 'Marcus Vance', tone: 'secondary' },
      action: 'Cập nhật biểu giá mua điện bậc 2 (ERCOT)',
      target: 'Bảng cấu hình biểu giá',
      origin: { ip: '172.56.21.90', site: 'Trung tâm dữ liệu Denver' },
      integrity: { label: 'Thành công', variant: 'positive' },
    },
  ] satisfies AuditEntry[],
}

export const engineDefaults = {
  title: 'Tham số mặc định',
  editLabel: 'Sửa',
  rows: [
    { icon: 'screen_rotation', label: 'Góc nghiêng mặc định', sublabel: 'Chuẩn CA/TX', value: '25.0°' },
    {
      icon: 'bolt',
      iconClassName: 'text-tertiary-container',
      label: 'Hiệu suất inverter',
      sublabel: 'Chuẩn CEC',
      value: '97.5%',
      valueClassName: 'text-tertiary-container',
    },
    {
      icon: 'verified_user',
      iconClassName: 'text-secondary',
      label: 'Thời hạn bảo hành',
      sublabel: 'Tấm pin / inverter',
      value: '25 năm / 10 năm',
      valueClassName: 'text-label-md',
    },
    {
      icon: 'event_repeat',
      iconClassName: 'text-on-surface-variant',
      label: 'Chu kỳ bảo trì',
      sublabel: 'Nhắc tự động',
      value: '12 tháng',
      valueClassName: 'text-label-md',
    },
  ] satisfies KeyValueRowProps[],
  vectorHub: {
    icon: 'hub',
    label: 'Kho vector Pinecone',
    sublabel: 'Đã kết nối (độ trễ 14ms)',
  },
}

export const userDistribution = {
  title: 'Cơ cấu người dùng',
  total: 1428,
  linkLabel: 'Mở danh sách người dùng',
  linkHref: ROUTES.admin.users,
  segments: [
    { key: 'homeowners', label: 'Khách hàng', count: 1120, percent: 78.4, colorClass: 'bg-primary' },
    { key: 'sales', label: 'Nhân viên kinh doanh', count: 84, percent: 5.8, colorClass: 'bg-secondary' },
    { key: 'techs', label: 'Kỹ thuật viên', count: 42, percent: 2.9, colorClass: 'bg-tertiary-container' },
    { key: 'managers', label: 'Quản lý vùng', count: 12, percent: 0.8, colorClass: 'bg-surface-tint' },
    { key: 'admins', label: 'Quản trị viên', count: 6, percent: 0.4, colorClass: 'bg-on-surface' },
  ] satisfies DistributionSegment[],
}

export const launchpads = {
  title: 'Tác vụ thường dùng',
  items: [
    {
      icon: 'person_add',
      tone: 'primary',
      title: 'Thêm nhân sự',
      ctaLabel: 'Mở trang người dùng',
      href: ROUTES.admin.users,
    },
    {
      icon: 'tune',
      tone: 'secondary',
      title: 'Cấu hình tham số sản lượng',
      ctaLabel: 'Mở cấu hình kỹ thuật',
      href: ROUTES.admin.techConfig,
    },
    {
      icon: 'auto_stories',
      tone: 'primary-container',
      title: 'Bổ sung tài liệu cho trợ lý AI',
      ctaLabel: 'Mở kho tri thức',
      href: ROUTES.admin.knowledgeBase,
    },
    {
      icon: 'policy',
      tone: 'tertiary',
      title: 'Rà soát quyền theo vai trò',
      ctaLabel: 'Mở bảng phân quyền',
      href: ROUTES.admin.roles,
    },
  ] satisfies QuickLaunchCardProps[],
}

export const maintenanceAdvisory = {
  icon: 'calendar_clock',
  eyebrow: 'Thông báo bảo trì',
  title: 'Đánh lại chỉ mục cơ sở dữ liệu',
  bodyBefore: 'Lần tối ưu chỉ mục kế tiếp sau ',
  bodyStrong: '3 ngày nữa, 02:00 UTC',
  bodyAfter: '. Truy vấn đọc/ghi lớn có thể chậm thêm dưới 120ms.',
  reference: 'Yêu cầu thay đổi #CR-8821',
  actionLabel: 'Xem lịch chi tiết',
}
