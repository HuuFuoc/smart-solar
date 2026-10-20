import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice, Photo } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { ROUTES } from '@/routes/paths'
import { estimate, property } from '@/data/customer'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function EstimatePage() {
  const query = useMockQuery(['customer', 'estimate'], estimate)
  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            back={{ to: ROUTES.customer.assessment, label: 'Đánh giá sơ bộ' }}
            title={`Giá ước tính sơ bộ cho ${property.name}`}
            meta={<Badge tone="ok">Điểm khả thi {data.viabilityScore} / 100</Badge>}
            actions={
              <>
                <Button>Tải bản tóm tắt</Button>
                <ButtonLink to={ROUTES.customer.consultations} variant="primary">
                  Yêu cầu khảo sát tại nhà
                </ButtonLink>
              </>
            }
          />

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Panel>
                <PanelHeader title="Chi phí đầu tư ước tính" />
                <PanelBody>
                  <p className="tnum text-figure font-semibold md:text-display">
                    {fmt.usd(data.grossRange[0])} đến {fmt.usd(data.grossRange[1])}
                  </p>
                  <p className="mt-1 text-meta text-fg-3">Khoảng giá trước ưu đãi</p>
                  <p className="tnum mt-4 text-title font-semibold">
                    {fmt.usd(data.netRange[0])} đến {fmt.usd(data.netRange[1])}{' '}
                    <span className="text-body font-normal text-fg-2">
                      sau khi trừ tín dụng thuế điện mặt trời liên bang 30%
                    </span>
                  </p>
                  <StatRow className="mt-6 border-t border-line pt-6 md:grid-cols-3">
                    <Stat label="Thời gian hoàn vốn ước tính" value={data.paybackYears} unit="năm" />
                    <Stat label="Tiết kiệm năm đầu" value={`~${fmt.usd(data.year1Savings)}`} unit="/ năm" />
                    <Stat label="Giảm CO₂ cả vòng đời" value={data.lifetimeCo2Tons} unit="tấn" />
                  </StatRow>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title={data.system.name} description={data.system.summary} />
                <PanelBody className="space-y-6">
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {data.system.parts.map((p) => (
                      <div key={p.name}>
                        <dt className="font-medium">{p.name}</dt>
                        <dd className="text-meta text-fg-3">{p.detail}</dd>
                      </div>
                    ))}
                  </dl>
                  <Photo
                    src={data.system.render}
                    alt="Mô phỏng bố trí tấm pin trên mái"
                    ratio="aspect-[3/2]"
                    caption="Mô phỏng bố trí tấm pin trên mái"
                    meta={`Đã bố trí ${data.system.panelsMapped} tấm`}
                  />
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:border-l lg:border-line lg:pl-8">
              <Panel>
                <PanelHeader title="Giả định tính toán" />
                <PanelBody>
                  <dl className="divide-y divide-line">
                    {data.assumptions.map((a) => (
                      <div key={a.k} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div>
                          <dt className="text-body">{a.k}</dt>
                          <dd className="text-meta text-fg-3">{a.note}</dd>
                        </div>
                        <dd className="tnum shrink-0 text-right text-body font-semibold">{a.v}</dd>
                      </div>
                    ))}
                  </dl>
                </PanelBody>
              </Panel>
              <Notice title="Lưu ý về giá ước tính">{data.disclaimer}</Notice>
              <p className="text-body text-fg-2">
                Số liệu chưa đúng?{' '}
                <Link to={ROUTES.customer.assessment} className="text-accent-fg hover:underline">
                  Tính lại với số liệu khác
                </Link>
              </p>
            </div>
          </div>
        </>
      )}
    </QueryBoundary>
  )
}
