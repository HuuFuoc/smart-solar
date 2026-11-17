import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { Facts } from '@/features/pre-surveys/Facts'
import { PanelQuery } from '@/features/installation-projects/formParts'
import { assetTypeLabel } from '@/features/installation-projects/projectDisplay'
import { serialText } from '@/features/installations/installationDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useHandoverQuery } from '@/hooks/useManagerInstallations'
import type { AssetView, HandoverAssetView } from '@/types/res/managerInstallationsRes'

// Thiết bị kỹ thuật viên đã ghi, và biên bản bàn giao khi khách đã nghiệm thu. Không hiện `warrantyEndsOn` của biên bản:
// backend tính từ ngày bàn giao, còn hạn bảo hành của hãng tính từ ngày kích hoạt quản lý ghi (khách thấy ngày đó)

function AssetTable({ assets }: { assets: (AssetView | HandoverAssetView)[] }) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Thiết bị</Th>
          <Th className="text-right">Số lượng</Th>
          <Th>Số serial</Th>
          <Th>Vị trí</Th>
          <Th className="text-right">Bảo hành</Th>
        </tr>
      </thead>
      <tbody>
        {assets.map((a, i) => (
          // Dòng của biên bản bàn giao không có mã; lô không có serial nên dùng thứ tự
          <Tr key={'assetId' in a ? a.assetId : i}>
            <Td label="Thiết bị">
              <p className="font-medium text-fg">{assetTypeLabel(a.assetType)}</p>
              <p className="text-meta text-fg-2">
                {a.manufacturer} {a.model}
              </p>
            </Td>
            <Td label="Số lượng" className="tnum lg:text-right">
              {a.quantity.toLocaleString('vi-VN')}
            </Td>
            <Td label="Số serial" className="tnum wrap-anywhere">
              {serialText(a)}
            </Td>
            <Td label="Vị trí">{a.positionCode || <span className="text-fg-3">—</span>}</Td>
            <Td label="Bảo hành" className="tnum lg:text-right">
              {a.warrantyMonths != null ? `${a.warrantyMonths} tháng` : <span className="text-fg-3">Chưa ghi</span>}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

export function AssetsPanel({ assets }: { assets: AssetView[] }) {
  return (
    <Panel>
      <PanelHeader title="Thiết bị đã lắp" />
      <PanelBody>
        {assets.length === 0 ? (
          <p className="text-body text-fg-2">Kỹ thuật viên chưa ghi thiết bị nào.</p>
        ) : (
          <AssetTable assets={assets} />
        )}
      </PanelBody>
    </Panel>
  )
}

/** Chỉ gọi khi dự án đã hoàn thành; trước đó backend trả INSTALLATION_NOT_HANDED_OVER */
export function HandoverPanel({ projectId }: { projectId: string }) {
  const query = useHandoverQuery(projectId)
  return (
    <Panel>
      <PanelHeader title="Bàn giao" />
      <PanelBody>
        <PanelQuery query={query}>
          {(h) => (
            <div className="space-y-4">
              <Facts
                items={[
                  { k: 'Bàn giao lúc', v: formatMoment(h.handoverAt) },
                  { k: 'Kỹ thuật viên', v: h.technicianName || '—' },
                  { k: 'Ảnh nghiệm thu', v: `${h.evidence.length} ảnh` },
                  { k: 'Số lượt nghiệm thu', v: String(h.acceptances.length) },
                ]}
              />
              {h.assets.length === 0 ? (
                <p className="text-body text-fg-2">Biên bản không có thiết bị nào.</p>
              ) : (
                <AssetTable assets={h.assets} />
              )}
            </div>
          )}
        </PanelQuery>
      </PanelBody>
    </Panel>
  )
}
