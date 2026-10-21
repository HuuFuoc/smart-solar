import { Button } from '@/components/common/ui/button'
import { KeyValueList, Notice, type KV } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import type { AssessmentDraft } from '@/features/pre-surveys/assessmentDraft'
import {
  customerTypeLabel,
  directionLabel,
  formatAddress,
  surfaceTypeLabel,
} from '@/features/pre-surveys/preSurveyDisplay'
import { formatKwh, formatM2, formatOne, formatTwo, mountingLabel } from '@/features/pre-surveys/simulationDisplay'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'
import type { PreSurveySurfaceView } from '@/types/res/preSurveySurfaceRes'
import type { SelectedSimulation } from '@/types/res/simulationsRes'

type Props = {
  draft: AssessmentDraft
  /** Mặt lắp đã lưu trên server */
  surface: PreSurveySurfaceView | undefined
  /** Mô phỏng chính (null khi chưa chọn) */
  selectedRun: SelectedSimulation | null
  /** Đã có lần chạy mô phỏng nào còn hạn chưa */
  hasRuns: boolean
  /** Đã gửi thì không cho sửa nữa */
  disabled: boolean
  onEditSite: () => void
  onEditSurface: () => void
  onOpenSimulation: () => void
}

// Bước "Xem lại và gửi": tóm tắt mọi thứ khách đã khai, mỗi phần có nút quay lại sửa
export function ReviewStep({
  draft,
  surface,
  selectedRun,
  hasRuns,
  disabled,
  onEditSite,
  onEditSurface,
  onOpenSimulation,
}: Props) {
  return (
    <>
      <ProfileReview profile={draft.profile} />
      <SiteReview site={draft.site} disabled={disabled} onEdit={onEditSite} />
      {surface && <SurfaceReview surface={surface} disabled={disabled} onEdit={onEditSurface} />}
      <SimulationReview run={selectedRun} hasRuns={hasRuns} disabled={disabled} onOpen={onOpenSimulation} />
    </>
  )
}

function ProfileReview({ profile }: { profile: CreateCustomerProfileRequest | undefined }) {
  // Tài khoản đã có hồ sơ từ trước thì máy này không có thông tin hồ sơ để hiện
  if (!profile) {
    return (
      <Panel>
        <PanelHeader title="Thông tin khách hàng" />
        <PanelBody>
          <p className="text-body text-fg-2">Dùng hồ sơ khách hàng đã có của tài khoản.</p>
        </PanelBody>
      </Panel>
    )
  }

  const items: KV[] = [{ k: 'Loại khách hàng', v: customerTypeLabel(profile.customerType) }]
  if (profile.companyName) items.push({ k: 'Doanh nghiệp', v: profile.companyName })
  if (profile.taxCode) items.push({ k: 'Mã số thuế', v: profile.taxCode })

  return (
    <Panel>
      <PanelHeader title="Thông tin khách hàng" />
      <PanelBody>
        <KeyValueList columns={2} items={items} />
      </PanelBody>
    </Panel>
  )
}

function EditButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant="soft" icon="edit" disabled={disabled} onClick={onClick}>
      Sửa
    </Button>
  )
}

function SiteReview({
  site,
  disabled,
  onEdit,
}: {
  site: CreatePropertySiteRequest | undefined
  disabled: boolean
  onEdit: () => void
}) {
  let content = <p className="text-body text-fg-2">Địa điểm đã lưu cùng bản nháp.</p>
  if (site) {
    const items: KV[] = [
      { k: 'Tên địa điểm', v: site.name },
      { k: 'Địa chỉ', v: formatAddress(site) },
      { k: 'Bề mặt', v: surfaceTypeLabel(site.installationSurfaceType) },
      { k: 'Vật liệu', v: site.surfaceMaterial ?? '—' },
    ]
    if (site.latitude != null && site.longitude != null) {
      items.push({ k: 'Toạ độ', v: `${site.latitude}, ${site.longitude}` })
    }
    // Một cột vì địa chỉ dài, chia hai cột thì xuống dòng liên tục
    content = <KeyValueList items={items} />
  }

  return (
    <Panel>
      <PanelHeader title="Địa điểm lắp đặt" action={<EditButton disabled={disabled} onClick={onEdit} />} />
      <PanelBody>{content}</PanelBody>
    </Panel>
  )
}

function SurfaceReview({
  surface,
  disabled,
  onEdit,
}: {
  surface: PreSurveySurfaceView
  disabled: boolean
  onEdit: () => void
}) {
  const obstacleNames = surface.obstacles.map((obstacle) => obstacle.name)
  const items: KV[] = [
    { k: 'Kích thước', v: `${formatTwo(surface.surfaceWidthM)} × ${formatTwo(surface.surfaceLengthM)} m` },
    {
      k: 'Độ dốc, hướng',
      v: `${formatTwo(surface.surfaceTiltDegree)}°, ${directionLabel(surface.surfaceAzimuthDegree)}`,
    },
    { k: 'Vật cản', v: obstacleNames.length > 0 ? obstacleNames.join(', ') : 'Không' },
    { k: 'Tổng diện tích khai', v: formatM2(surface.declared.totalAreaM2) },
    { k: 'Dùng được', v: formatM2(surface.declared.usableAreaM2) },
  ]

  return (
    <Panel>
      <PanelHeader title="Mặt lắp" action={<EditButton disabled={disabled} onClick={onEdit} />} />
      <PanelBody>
        <KeyValueList columns={2} items={items} />
      </PanelBody>
    </Panel>
  )
}

/** Nhãn nút mở bước mô phỏng */
function simulationActionLabel(run: SelectedSimulation | null, hasRuns: boolean) {
  if (run) return 'Xem'
  if (hasRuns) return 'Chọn mô phỏng'
  return 'Chạy mô phỏng'
}

function SimulationReview({
  run,
  hasRuns,
  disabled,
  onOpen,
}: {
  run: SelectedSimulation | null
  hasRuns: boolean
  disabled: boolean
  onOpen: () => void
}) {
  const action = (
    <Button size="sm" disabled={disabled} onClick={onOpen}>
      {simulationActionLabel(run, hasRuns)}
    </Button>
  )

  // Gửi khi chưa có mô phỏng chính vẫn được, chỉ nhắc
  if (!run) {
    const message = hasRuns
      ? 'Bạn đã chạy mô phỏng nhưng chưa chọn lần nào làm mô phỏng chính, nên chuyên viên sẽ không thấy kết quả. Vẫn gửi được.'
      : 'Chưa chạy mô phỏng. Vẫn gửi được, nhưng chạy trước giúp chuyên viên thấy số tấm và sản lượng dự kiến khi gọi bạn.'
    return (
      <Panel>
        <PanelHeader title="Mô phỏng chính" action={action} />
        <PanelBody className="space-y-3">
          <Notice tone="warn">{message}</Notice>
        </PanelBody>
      </Panel>
    )
  }

  const annualEnergy = run.annualEnergyKwh == null ? 'Chưa có dữ liệu' : `${formatKwh(run.annualEnergyKwh)} kWh`
  const items: KV[] = [
    { k: 'Tấm pin', v: run.productName },
    { k: 'Kiểu lắp', v: mountingLabel(run.mountingType) },
    { k: 'Số tấm', v: `${run.panelCount} tấm` },
    { k: 'Công suất', v: `${formatOne(run.installedCapacityKwp)} kWp` },
    { k: 'Sản lượng năm', v: annualEnergy },
  ]

  return (
    <Panel>
      <PanelHeader title="Mô phỏng chính" action={action} />
      <PanelBody className="space-y-3">
        <KeyValueList columns={2} items={items} />
        {run.isStale && (
          <Notice tone="warn">
            Mô phỏng chính tính theo mặt lắp cũ. Chạy lại rồi chọn kết quả mới để chuyên viên thấy số liệu theo mặt lắp
            mới.
          </Notice>
        )}
      </PanelBody>
    </Panel>
  )
}
