import { useState } from 'react'
import { Link } from 'react-router'
import { AdvisoryCard } from '@/features/dashboard/components/AdvisoryCard'
import { AuditTrailTable } from '@/features/dashboard/components/AuditTrailTable'
import { DistributionBar } from '@/features/dashboard/components/DistributionBar'
import { KeyValueList, KeyValueRow } from '@/features/dashboard/components/KeyValueList'
import { QuickLaunchCard } from '@/features/dashboard/components/QuickLaunchCard'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Icon,
  IconButton,
  MetricCard,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from '@/components/common/stitch-ui'
import { ROUTES } from '@/routes/paths'
import {
  adminDashboardHeader,
  adminKpis,
  auditTrail,
  engineDefaults,
  launchpads,
  maintenanceAdvisory,
  quickCreateItems,
  userDistribution,
  type KpiFooter,
} from '@/data/adminDashboard'

/* Dựng từ admin_dashboard/code.html + screen.png. */

function KpiFooterBlock({ footer }: { footer: KpiFooter }) {
  switch (footer.kind) {
    case 'chips':
      return (
        // Phân rã theo nhóm: đọc như một dòng chữ, không phải một dãy huy hiệu.
        <p className="text-label-sm text-on-surface-variant">
          {footer.chips.map((chip, i) => (
            <span key={chip.label} className={chip.active ? 'text-on-surface' : undefined}>
              {i > 0 && ', '}
              {chip.label}
            </span>
          ))}
        </p>
      )
    case 'progress':
      return (
        <div className="flex flex-col gap-1.5 rounded-xl bg-surface-container-low p-space-xs">
          <div className="flex justify-between text-label-sm text-on-surface">
            <span>{footer.title}</span>
            <span className="font-semibold text-primary">{footer.percent}%</span>
          </div>
          <ProgressBar value={footer.percent} size="sm" label={footer.title} />
          <div className="flex justify-between text-label-sm text-outline">
            <span>{footer.left}</span>
            <span>{footer.right}</span>
          </div>
        </div>
      )
    case 'stat':
      return (
        <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-space-xs">
          <div className="flex items-center gap-space-xs">
            <Icon name={footer.icon} className="text-[18px] text-tertiary-container" />
            <div className="flex flex-col">
              <span className="text-label-sm font-semibold text-on-surface">{footer.label}</span>
              <span className="text-label-sm text-outline">{footer.sublabel}</span>
            </div>
          </div>
          <StatusBadge variant="warning" dot={false} size="sm" className="py-1 text-label-sm font-semibold">
            {footer.badge}
          </StatusBadge>
        </div>
      )
    case 'status':
      return (
        <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-space-xs text-label-sm">
          <div className="flex items-center gap-1.5 text-on-surface">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-tertiary-container" />
            <span>{footer.label}</span>
          </div>
          <span className="text-label-sm text-outline">{footer.note}</span>
        </div>
      )
  }
}

function QuickCreateMenu({
  label,
  items,
}: {
  label: string
  items: { key: string; icon: string; label: string; href: string }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button
        iconLeft="add_circle"
        iconRight="expand_more"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </Button>
      {open && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-56 rounded-xl bg-surface-container-lowest p-space-xs shadow-level-3"
          >
            {items.map((item) => (
              <Link
                key={item.key}
                role="menuitem"
                to={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-space-sm rounded-lg px-space-sm py-2 text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name={item.icon} className="text-[18px] text-primary" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function AdminDashboardPage() {
  const header = adminDashboardHeader

  return (
    <>
      <PageHeader
        breadcrumb={header.breadcrumb}
        meta={
          <>
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-tertiary-container" />
            <span>{header.clusterNode}</span>
            <span className="text-outline">/</span>
            <span>{header.engineVersion}</span>
          </>
        }
        title={header.title}
        actions={
          <>
            <Button variant="tonal" iconLeft="health_and_safety">
              {header.actions.healthCheck}
            </Button>
            <Button variant="tonal" iconLeft="download" className="text-on-surface-variant">
              {header.actions.exportLogs}
            </Button>
            <QuickCreateMenu label={header.actions.quickCreate} items={quickCreateItems} />
          </>
        }
      />

      {/* KPI */}
      <section className="mb-space-2xl grid grid-cols-1 gap-space-lg md:grid-cols-2 xl:grid-cols-4">
        {adminKpis.map(({ key, footer, ...kpi }) => (
          <MetricCard key={key} layout="inline" {...kpi}>
            <KpiFooterBlock footer={footer} />
          </MetricCard>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-12">
        {/* Cột trái: audit trail + launchpads */}
        <div className="flex flex-col gap-space-xl lg:col-span-8">
          <Card className="flex flex-col">
            <div className="mb-space-lg flex flex-col justify-between gap-space-sm sm:flex-row sm:items-center">
              <CardTitle icon="history_edu">{auditTrail.title}</CardTitle>
              <div className="flex items-center gap-space-xs self-start sm:self-auto">
                <span className="text-label-sm text-on-surface-variant">{auditTrail.streamLabel}</span>
                <IconButton icon="filter_list" label="Lọc nhật ký" />
              </div>
            </div>
            <AuditTrailTable entries={auditTrail.entries} />
            <div className="mt-space-md flex flex-col justify-between gap-space-xs pt-space-xs text-body-sm text-outline sm:flex-row sm:items-center">
              <span>
                Hiển thị {auditTrail.entries.length} trên {auditTrail.total.toLocaleString()}{' '}
                {auditTrail.periodLabel}
              </span>
              <Link
                to={ROUTES.admin.reports}
                className="flex items-center gap-1 text-label-md text-primary hover:underline"
              >
                {auditTrail.linkLabel}
              </Link>
            </div>
          </Card>

          <div>
            <h2 className="mb-space-md text-headline-md text-on-surface">{launchpads.title}</h2>
            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              {launchpads.items.map((item) => (
                <QuickLaunchCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </div>

        {/* Cột phải: engine defaults, phân bố user, advisory */}
        <div className="flex flex-col gap-space-xl lg:col-span-4">
          <Card>
            <CardHeader className="mb-space-md">
              <CardTitle icon="display_settings">{engineDefaults.title}</CardTitle>
              <Link
                to={ROUTES.admin.techConfig}
                className="text-label-sm font-semibold text-primary hover:underline"
              >
                {engineDefaults.editLabel}
              </Link>
            </CardHeader>
            <KeyValueList>
              {engineDefaults.rows.map((row) => (
                <KeyValueRow key={row.label} {...row} />
              ))}
              <KeyValueRow
                icon={engineDefaults.vectorHub.icon}
                label={engineDefaults.vectorHub.label}
                sublabel={engineDefaults.vectorHub.sublabel}
                sublabelClassName="font-semibold text-tertiary-container"
                trailing={
                  <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-tertiary-container" />
                }
              />
            </KeyValueList>
          </Card>

          <Card>
            <CardHeader className="mb-space-sm">
              <CardTitle icon="pie_chart">{userDistribution.title}</CardTitle>
              <span className="text-label-sm text-outline">Tổng {userDistribution.total.toLocaleString()}</span>
            </CardHeader>
            <DistributionBar segments={userDistribution.segments} />
            <div className="mt-space-md pt-space-xs text-center">
              <Link
                to={userDistribution.linkHref}
                className="inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline"
              >
                {userDistribution.linkLabel}
                <Icon name="chevron_right" className="text-[16px]" />
              </Link>
            </div>
          </Card>

          <AdvisoryCard
            icon={maintenanceAdvisory.icon}
            eyebrow={maintenanceAdvisory.eyebrow}
            title={maintenanceAdvisory.title}
            reference={maintenanceAdvisory.reference}
            actionLabel={maintenanceAdvisory.actionLabel}
          >
            {maintenanceAdvisory.bodyBefore}
            <strong>{maintenanceAdvisory.bodyStrong}</strong>
            {maintenanceAdvisory.bodyAfter}
          </AdvisoryCard>
        </div>
      </div>
    </>
  )
}
