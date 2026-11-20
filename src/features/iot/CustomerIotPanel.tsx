import type { UseQueryResult } from '@tanstack/react-query'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { IotMonitoring } from '@/features/iot/IotMonitoring'
import type { EnergyMonitoringView } from '@/types/res/customerInstallationsRes'

// Số đo thực tế của thiết bị IoT trên trang công trình của khách. Tách hẳn khối "Sản lượng dự kiến" (mô phỏng): số ở đây chỉ là
// số thiết bị đo được, không bao giờ lấy số mô phỏng thay vào. Khách chỉ xem, không gắn / tháo thiết bị
export function CustomerIotPanel({
  projectId,
  energy,
}: {
  projectId: string
  /** Query energy-monitoring trang đã tải: lấy khối `measured` để hiện các đại lượng chưa đo được, không gọi thêm */
  energy: UseQueryResult<EnergyMonitoringView>
}) {
  return (
    <Panel id="iot-monitoring" className="scroll-mt-6">
      <PanelHeader title="Đo thực tế (thiết bị IoT)" description="Dòng điện do cảm biến lắp tại công trình đo được." />
      <PanelBody>
        <IotMonitoring viewer="customer" projectId={projectId} measured={energy.data?.measured ?? null} />
      </PanelBody>
    </Panel>
  )
}
