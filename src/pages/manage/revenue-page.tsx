import { useId } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Input, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { Pagination } from '@/components/common/ui/pagination'
import { Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { revenue } from '@/data/manage'
import { cx } from '@/utils/cx'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function ManageRevenuePage() {
  const query = useMockQuery(['manage', 'revenue'], revenue)
  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            title="Phân tích doanh thu và biên lợi nhuận"
            meta={<Badge>Phạm vi: {data.scope}</Badge>}
            actions={
              <>
                <Button>Hợp nhất đơn vị</Button>
                <Button variant="ghost">In</Button>
              </>
            }
          />

          <StatRow className="mb-12 md:grid-cols-3 xl:grid-cols-5">
            {data.kpis.map((k) => (
              <Stat key={k.label} label={k.label} value={k.value} note={k.note} tone={k.tone} />
            ))}
          </StatRow>

          <div className="mb-12 grid gap-x-12 gap-y-12 lg:grid-cols-3 lg:items-start">
            <Panel className="lg:col-span-2">
              <PanelHeader
                title="Dòng tiền theo mốc so với giá trị hợp đồng đã ký"
                description="Sáu tháng gần nhất, đơn vị triệu đô la."
              />
              <PanelBody>
                <LineChart months={data.series.months} booked={data.series.booked} realized={data.series.realized} />
                <p className="mt-3 text-meta text-fg-3">{data.series.note}</p>
              </PanelBody>
              <PanelFooter className="justify-between text-body">
                <span className="text-fg-2">{data.series.insight}</span>
                <Badge tone="ok">+14.2% so với cùng kỳ</Badge>
              </PanelFooter>
            </Panel>

            <Panel>
              <PanelHeader title="Phân bổ theo loại gói" />
              <PanelBody>
                <ul className="space-y-4">
                  {data.tiers.map((t) => (
                    <li key={t.label}>
                      <div className="mb-1 flex justify-between gap-3 text-body">
                        <span className="font-medium">{t.label}</span>
                        <span className="tnum">{fmt.usd(t.value)}</span>
                      </div>
                      <Progress value={t.pct} label={`Tỷ trọng ${t.label}`} />
                      <p className="tnum mt-1 text-meta text-fg-3">
                        {t.pct}%. {t.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </PanelBody>
              <PanelFooter className="text-body text-fg-2">Tình trạng thiết bị: {data.backlog}</PanelFooter>
            </Panel>
          </div>

          <Panel className="mb-12">
            <PanelHeader title="Sổ doanh thu và biên lợi nhuận" action={<Badge>{data.ledger.filters.range}</Badge>} />
            <FilterBar>
              <Input
                type="search"
                aria-label="Lọc dự án hoặc khách hàng"
                placeholder="Lọc dự án hoặc khách hàng"
                className="w-full sm:max-w-xs"
              />
              <Select aria-label="Nhân viên kinh doanh" className="w-auto">
                {data.ledger.filters.advisers.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
              <Select aria-label="Mức biên lợi nhuận" className="w-auto">
                {data.ledger.filters.margin.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </FilterBar>
            <Table stack>
              <thead>
                <tr>
                  <Th>Dự án & khách hàng</Th>
                  <Th className="hidden lg:table-cell">Kinh doanh</Th>
                  <Th className="hidden wide:table-cell">Hệ thống</Th>
                  <Th className="hidden text-right md:table-cell">Giá báo</Th>
                  <Th className="hidden text-right md:table-cell">Chiết khấu</Th>
                  <Th className="text-right">Giá trị hợp đồng</Th>
                  <Th className="text-right">Biên lợi nhuận gộp</Th>
                  <Th className="hidden lg:table-cell">Mốc thanh toán</Th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.rows.map((r) => (
                  <Tr key={r.id}>
                    <Td label="Dự án & khách hàng">
                      <p className="text-meta text-fg-3">{r.id}</p>
                      <p className="font-medium">{r.customer}</p>
                      <p className="text-meta text-fg-3">{r.city}</p>
                    </Td>
                    <Td label="Kinh doanh" className="hidden lg:table-cell">
                      <p className="whitespace-nowrap">{r.adviser}</p>
                      <p className="text-meta text-fg-3">{r.tier}</p>
                    </Td>
                    <Td label="Hệ thống" className="hidden wide:table-cell">
                      <p>{r.system}</p>
                      <p className="text-meta text-fg-3">{r.hardware}</p>
                    </Td>
                    <Td label="Giá báo" className="tnum hidden text-right whitespace-nowrap md:table-cell">
                      {fmt.usd(r.gross)}
                    </Td>
                    <Td
                      label="Chiết khấu"
                      className={cx(
                        'tnum hidden text-right whitespace-nowrap md:table-cell',
                        r.discount < 0 ? 'text-warn' : 'text-fg-3',
                      )}
                    >
                      {r.discount < 0 ? fmt.usd(r.discount) : 'Không có'}
                    </Td>
                    <Td label="Giá trị hợp đồng" className="tnum text-right font-medium whitespace-nowrap">
                      {fmt.usd(r.net)}
                    </Td>
                    <Td label="Biên lợi nhuận gộp" className="text-right">
                      <Badge tone={r.margin < 30 ? 'danger' : 'ok'}>{r.margin}%</Badge>
                    </Td>
                    <Td label="Mốc thanh toán" className="hidden whitespace-nowrap text-fg-2 lg:table-cell">
                      {r.stage}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <PanelFooter className="justify-between text-body text-fg-2">
              <span className="tnum">
                Hiển thị {data.ledger.rows.length} trên {data.ledger.total} hợp đồng đang chạy.{' '}
                <span className="text-warn">{data.ledger.flagged} hợp đồng cần xem lại biên lợi nhuận (dưới 30%).</span>
              </span>
              <Pagination page={1} pages={3} />
            </PanelFooter>
          </Panel>

          <Panel>
            <PanelHeader title="Các đợt thanh toán theo mốc" />
            <PanelBody>
              <dl className="grid gap-6 md:grid-cols-3 md:divide-x md:divide-line">
                {data.phases.map((p, i) => (
                  <div key={p.label} className={cx(i > 0 && 'md:pl-6')}>
                    <dt className="flex items-center justify-between gap-2 text-body font-medium">
                      {p.label}
                      <Badge tone={p.tone}>{p.note.split(',')[0]}</Badge>
                    </dt>
                    <dd className="tnum mt-1 text-figure font-semibold">{fmt.usd(p.amount)}</dd>
                    <dd className="text-body text-fg-2">{p.body}</dd>
                    <dd className="mt-1 text-meta text-fg-3">{p.note}</dd>
                  </div>
                ))}
              </dl>
            </PanelBody>
          </Panel>
        </>
      )}
    </QueryBoundary>
  )
}

/* Two-series line chart drawn from the revenue data. Axis scale derives from the data. */
function LineChart({ months, booked, realized }: { months: string[]; booked: number[]; realized: number[] }) {
  const id = useId()
  const w = 600
  const h = 200
  const padX = 8
  const padY = 12
  const max = Math.max(...booked, ...realized) * 1.08
  const min = Math.min(...booked, ...realized) * 0.85
  const x = (i: number) => padX + (i / (months.length - 1)) * (w - padX * 2)
  const y = (v: number) => h - padY - ((v - min) / (max - min)) * (h - padY * 2)
  const path = (s: number[]) => s.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>Giá trị hợp đồng đã ký so với tiền đã thu theo tháng</title>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={w - padX}
            y1={padY + t * (h - padY * 2)}
            y2={padY + t * (h - padY * 2)}
            className="stroke-line"
            strokeWidth={1}
          />
        ))}
        <path d={path(booked)} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" />
        <path
          d={path(realized)}
          fill="none"
          className="stroke-fg-3"
          strokeWidth={2}
          strokeDasharray="4 4"
          strokeLinejoin="round"
        />
        {booked.map((v, i) => (
          <circle key={`b${i}`} cx={x(i)} cy={y(v)} r={3.5} className="fill-accent" />
        ))}
        {realized.map((v, i) => (
          <circle key={`r${i}`} cx={x(i)} cy={y(v)} r={3.5} className="fill-fg-3" />
        ))}
      </svg>
      <div
        className="tnum mt-1 grid text-center text-meta text-fg-2"
        style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
      >
        {months.map((m, i) => (
          <span key={m}>
            <span className="block font-medium text-fg">{m}</span>
            <span className="block">${booked[i]!.toFixed(2)}M</span>
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-meta text-fg-2">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 bg-accent" /> Giá trị hợp đồng đã ký
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 border-t-2 border-dashed border-fg-3" /> Tiền đã thu
        </span>
      </figcaption>
    </figure>
  )
}
