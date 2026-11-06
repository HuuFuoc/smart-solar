import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink } from '@/components/common/ui/button'
import { ROUTES } from '@/routes/paths'

export function DashboardEmptyState() {
  return (
    <div className="rounded-container border border-line bg-surface-2 p-6 sm:p-10 shadow-sm">
      <div className="mx-auto max-w-2xl text-center space-y-4">
        {/* Minh họa Icon nổi bật */}
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-sm sm:size-20">
          <Icon name="solar_power" className="text-[36px] sm:text-[44px]" />
        </div>

        <div>
          <h2 className="text-title font-bold text-fg sm:text-display">
            Chào mừng bạn đến với Hệ sinh thái SmartSolar
          </h2>
          <p className="mt-2 text-meta text-fg-2 sm:text-body">
            Bạn chưa có công trình lắp đặt nào. Hãy bắt đầu hành trình chuyển đổi năng lượng xanh với 3 bước đơn giản
            dưới đây:
          </p>
        </div>

        {/* 3 Bước hướng dẫn trực quan */}
        <div className="grid gap-3 pt-3 text-left sm:grid-cols-3">
          <div className="rounded-control border border-line bg-canvas/60 p-3.5 space-y-1.5">
            <div className="flex size-7 items-center justify-center rounded-control bg-accent-soft text-accent-fg font-bold text-meta">
              1
            </div>
            <p className="font-semibold text-fg text-meta">Ước tính công suất</p>
            <p className="text-meta text-fg-3">
              Vẽ mái 3D trực tuyến để tính sản lượng điện và số tiền tiết kiệm hàng tháng.
            </p>
          </div>

          <div className="rounded-control border border-line bg-canvas/60 p-3.5 space-y-1.5">
            <div className="flex size-7 items-center justify-center rounded-control bg-info-soft text-info font-bold text-meta">
              2
            </div>
            <p className="font-semibold text-fg text-meta">Khảo sát tận nơi</p>
            <p className="text-meta text-fg-3">
              Đặt lịch để kỹ thuật viên SmartSolar đến tận nơi đo đạc và tư vấn hoàn toàn miễn phí.
            </p>
          </div>

          <div className="rounded-control border border-line bg-canvas/60 p-3.5 space-y-1.5">
            <div className="flex size-7 items-center justify-center rounded-control bg-ok-soft text-ok font-bold text-meta">
              3
            </div>
            <p className="font-semibold text-fg text-meta">Thi công & Bàn giao</p>
            <p className="text-meta text-fg-3">
              Phê duyệt báo giá, theo dõi tiến độ lắp đặt và giám sát sản lượng điện trực tiếp.
            </p>
          </div>
        </div>

        {/* Nút Call-to-action chính */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <ButtonLink to={ROUTES.customer.assessment} size="md" variant="primary" icon="roofing">
            Khảo sát sơ bộ mái ngay
          </ButtonLink>
          <ButtonLink to={ROUTES.customer.products} size="md" variant="secondary" icon="grid_view">
            Xem danh mục thiết bị & giải pháp
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
