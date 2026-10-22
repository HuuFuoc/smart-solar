import { ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ROUTES } from '@/routes/paths'

export function DashboardEmptyState() {
  return (
    <Panel className="border-accent/20 bg-accent-soft/30 p-2">
      <PanelHeader
        title="Bắt đầu hành trình chuyển đổi năng lượng xanh"
        description="Bạn chưa có công trình hoặc yêu cầu nào đang hoạt động. Hãy bắt đầu với 3 bước đơn giản:"
      />
      <PanelBody className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-control border border-line bg-canvas p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-title font-bold text-accent-fg">
              1
            </span>
            <h4 className="mt-3 font-semibold text-fg-1">Khảo sát sơ bộ mái</h4>
            <p className="mt-1 text-meta text-fg-3">
              Khai báo diện tích, hướng và độ dốc mái nhà để xem mô phỏng 3D sản lượng điện.
            </p>
          </div>

          <div className="rounded-control border border-line bg-canvas p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-title font-bold text-fg-2">
              2
            </span>
            <h4 className="mt-3 font-semibold text-fg-1">Đặt lịch khảo sát</h4>
            <p className="mt-1 text-meta text-fg-3">
              Chủ động chọn ngày giờ để kỹ thuật viên chuyên nghiệp đến tận nơi đo đạc thực tế.
            </p>
          </div>

          <div className="rounded-control border border-line bg-canvas p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-title font-bold text-fg-2">
              3
            </span>
            <h4 className="mt-3 font-semibold text-fg-1">Lắp đặt & Nghiệm thu</h4>
            <p className="mt-1 text-meta text-fg-3">
              Theo dõi tiến trình thi công theo từng đợt, xem ảnh thực địa và bấm nghiệm thu online.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <ButtonLink to={ROUTES.customer.assessment} variant="primary">
            Khảo sát sơ bộ mái nhà ngay
          </ButtonLink>
        </div>
      </PanelBody>
    </Panel>
  )
}
