import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Select } from '@/components/common/ui/field'
import { Photo, Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { operations } from '@/data/manage'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function ManageOperationsPage() {
  const query = useMockQuery(['manage', 'operations'], operations)
  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            title="Năng suất vận hành và tốc độ đội thi công"
            actions={
              <>
                <Button>Xuất CSV</Button>
                <Button variant="primary">Tải báo cáo tóm tắt</Button>
              </>
            }
          />

          <div className="mb-12 flex flex-wrap items-center gap-3">
            <Select size="sm" aria-label="Khoảng thời gian phân tích" className="w-auto">
              {data.filters.horizon.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
            <Select size="sm" aria-label="Khu vực" className="w-auto">
              {data.filters.territory.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
            <Select size="sm" aria-label="Loại công trình" className="w-auto">
              {data.filters.asset.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
            <span className="tnum text-body text-fg-2">{data.feeds} nguồn dữ liệu trực tiếp</span>
          </div>

          <StatRow className="mb-12 md:grid-cols-3 xl:grid-cols-5">
            {data.kpis.map((k) => (
              <Stat key={k.label} label={k.label} value={k.value} unit={k.unit} note={k.note} />
            ))}
          </StatRow>

          <Panel className="mb-12">
            <PanelHeader
              title="Năng suất toàn quy trình"
              action={<Badge tone="ok">{data.throughput.handshakes} PTO trong tháng</Badge>}
            />
            <PanelBody>
              <ol className="grid grid-cols-2 gap-y-6 sm:grid-cols-4 lg:grid-cols-7">
                {data.throughput.phases.map((p, i) => (
                  <li key={p.label} className="min-w-0 pr-3">
                    <p className="tnum text-title font-semibold">{p.count}</p>
                    <p className="text-body">{p.label}</p>
                    <p className="text-meta text-fg-3">{p.note}</p>
                    <p
                      className={
                        i === data.throughput.phases.length - 1
                          ? 'tnum mt-1 text-meta font-medium text-fg'
                          : 'tnum mt-1 text-meta text-fg-2'
                      }
                    >
                      {i === data.throughput.phases.length - 1 ? p.avg : `TB ${p.avg}`}
                    </p>
                  </li>
                ))}
              </ol>
            </PanelBody>
            <PanelFooter className="justify-between text-body text-fg-2">
              <span>Phân bổ theo giai đoạn, tổng 142 dự án đang chạy</span>
              <span>
                Tỷ lệ chuyển đổi <span className="tnum font-medium text-fg">{data.throughput.conversion}</span>
              </span>
            </PanelFooter>
          </Panel>

          <div className="mb-12 grid gap-x-12 gap-y-12 lg:grid-cols-5 lg:items-start">
            <Panel className="lg:col-span-3">
              <PanelHeader title="Hoạt động của các đội" action={<Badge>Trung bình {data.squads.avgSpeed}</Badge>} />
              <Table stack>
                <thead>
                  <tr>
                    <Th>Đội</Th>
                    <Th className="text-right">Thời gian hoàn thành</Th>
                    <Th className="text-right">Đạt nghiệm thu lần đầu</Th>
                    <Th className="text-right">Đang lắp</Th>
                    <Th className="hidden text-right wide:table-cell">Hiệu suất sử dụng</Th>
                    <Th className="hidden text-right wide:table-cell">Số ngày không sự cố</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.squads.rows.map((s) => (
                    <Tr key={s.name}>
                      <Td label="Đội">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-meta text-fg-3">
                          {s.metro}. {s.lead}.
                        </p>
                      </Td>
                      <Td label="Thời gian hoàn thành" className="tnum text-right font-medium">
                        {s.turnaround}
                      </Td>
                      <Td label="Đạt nghiệm thu lần đầu" className="tnum text-right">
                        {s.pass}
                      </Td>
                      <Td label="Đang lắp" className="tnum text-right">
                        {s.installs} công trình
                      </Td>
                      <Td label="Hiệu suất sử dụng" className="tnum hidden text-right wide:table-cell">
                        {s.utilization}
                      </Td>
                      <Td label="Số ngày không sự cố" className="tnum hidden text-right wide:table-cell">
                        {s.safety}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <PanelBody>
                <Photo
                  src={data.squads.benchmark.src}
                  alt={data.squads.benchmark.title}
                  ratio="aspect-[21/9]"
                  caption={`Công trình mẫu: ${data.squads.benchmark.title}`}
                  meta={data.squads.benchmark.meta}
                />
              </PanelBody>
            </Panel>

            <Panel className="lg:col-span-2">
              <PanelHeader title="Độ tin cậy sau PTO" action={<Badge tone="ok">{data.reliability.uptime}</Badge>} />
              <PanelBody className="space-y-6">
                <ul className="divide-y divide-line border-t border-line">
                  {data.reliability.incidents.map((i) => (
                    <li key={i.label}>
                      <div className="mb-1 flex justify-between gap-3 text-body">
                        <span className="font-medium">{i.label}</span>
                        <span className="tnum text-fg-2">{i.pct}%</span>
                      </div>
                      <Progress value={i.pct} label={`Tỷ lệ sự cố: ${i.label}`} />
                      <p className="mt-1 text-meta text-fg-3">{i.note}</p>
                    </li>
                  ))}
                </ul>
                <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4">
                  <div>
                    <dt className="text-meta text-fg-2">Đã xử lý xong</dt>
                    <dd className="tnum text-figure font-semibold">{data.reliability.closed} phiếu</dd>
                  </div>
                  <div>
                    <dt className="text-meta text-fg-2">Đang mở</dt>
                    <dd className="tnum text-figure font-semibold">{data.reliability.open} trong hạn SLA</dd>
                  </div>
                </dl>
                <p className="text-meta text-fg-3">Xu hướng thời gian sửa trung bình: {data.reliability.mttrTrend}.</p>
              </PanelBody>
              <PanelFooter>
                <Button size="sm">Cử đội bảo hành chuyên trách</Button>
              </PanelFooter>
            </Panel>
          </div>

          <Panel>
            <PanelHeader title="Vướng mắc với cơ quan cấp phép (AHJ)" />
            <Table stack>
              <thead>
                <tr>
                  <Th>Cơ quan hoặc điện lực</Th>
                  <Th className="hidden md:table-cell">Khu vực</Th>
                  <Th className="text-right">Thời gian xử lý TB</Th>
                  <Th className="text-right">Tỷ lệ đạt</Th>
                  <Th className="text-right">Hồ sơ đang xét</Th>
                  <Th>Rủi ro SLA</Th>
                </tr>
              </thead>
              <tbody>
                {data.ahj.rows.map((r) => (
                  <Tr key={r.authority}>
                    <Td label="Cơ quan hoặc điện lực">
                      <p className="font-medium">{r.authority}</p>
                      <p className="text-meta text-fg-3">{r.note}</p>
                    </Td>
                    <Td label="Khu vực" className="hidden md:table-cell">
                      {r.region}
                    </Td>
                    <Td label="Thời gian xử lý TB" className="tnum text-right">
                      {r.days} ngày
                    </Td>
                    <Td label="Tỷ lệ đạt" className="tnum text-right">
                      {r.pass}
                    </Td>
                    <Td label="Hồ sơ đang xét" className="tnum text-right">
                      {r.audits} giấy phép
                    </Td>
                    <Td label="Rủi ro SLA">
                      <Badge tone={r.tone}>{r.risk}</Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <PanelFooter className="justify-between text-body text-fg-2">
              <span>Hiển thị 3 cơ quan hàng đầu, {data.ahj.share}.</span>
              <PlaceholderLink className="text-accent-fg hover:underline">
                Xem tất cả {data.ahj.total} cơ quan cấp phép trong khu vực
              </PlaceholderLink>
            </PanelFooter>
          </Panel>
        </>
      )}
    </QueryBoundary>
  )
}
