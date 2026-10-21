import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ActionBar } from '@/components/common/ui/action-bar'
import { Button } from '@/components/common/ui/button'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice, Photo, Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ROUTES } from '@/routes/paths'
import { installJob } from '@/data/field'
import { cx } from '@/utils/cx'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function FieldInstallationPage() {
  const query = useMockQuery(['field', 'installation', installJob.id], installJob)
  const [doneSteps, setDoneSteps] = useState<boolean[]>(installJob.steps.map((s) => s.done))
  const [panels, setPanels] = useState(14)
  const [notes, setNotes] = useState(installJob.notes)
  const total = 18
  const completed = doneSteps.filter(Boolean).length
  const activeIndex = doneSteps.findIndex((d) => !d)

  function completeActive() {
    setPanels(total)
    setDoneSteps((s) => s.map((d, i) => (i === activeIndex ? true : d)))
  }

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            back={{ to: ROUTES.field.tasks, label: 'Việc của tôi' }}
            meta={
              <>
                <span className="text-fg-2">{data.id}</span>
                <span>{data.day}</span>
                <Badge tone="accent">{data.status}</Badge>
                <Badge tone="ok">{data.safetyBrief}</Badge>
              </>
            }
            title={data.title}
            description={`${data.customer}, ${data.address}`}
            actions={<Button>Gọi khách hàng</Button>}
          />

          <Panel className="mb-12">
            <PanelBody>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                {data.specs.map((s) => (
                  <div key={s.k} className="md:border-l md:border-line md:pl-6 md:first:border-0 md:first:pl-0">
                    <dt className="text-meta text-fg-2">{s.k}</dt>
                    <dd className="tnum text-title font-semibold">{s.v}</dd>
                    <dd className="text-meta text-fg-3">{s.note}</dd>
                  </div>
                ))}
              </dl>
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
              <Panel>
                <PanelHeader
                  title="Danh sách kiểm tra hiện trường"
                  action={
                    <Badge>
                      Xong {completed}/{data.steps.length}
                    </Badge>
                  }
                />
                <PanelBody>
                  <ol className="divide-y divide-line">
                    {data.steps.map((step, i) => {
                      const isDone = doneSteps[i]
                      const isActive = i === activeIndex
                      return (
                        <li
                          key={step.title}
                          className={cx('flex gap-3 py-4 first:pt-0 last:pb-0', !isDone && !isActive && 'opacity-70')}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Đã xong bước ${i + 1}`}
                            checked={isDone}
                            disabled={!isDone && !isActive}
                            onChange={(e) => setDoneSteps((s) => s.map((d, j) => (j === i ? e.target.checked : d)))}
                            className="mt-1 size-4 shrink-0 accent-accent"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium">
                                Bước {i + 1}: {step.title}
                              </p>
                              {isDone ? (
                                <Badge tone="ok">Đã xong</Badge>
                              ) : isActive ? (
                                <Badge tone="accent">Đang làm</Badge>
                              ) : (
                                <Badge>Chờ làm</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-body text-fg-2">{step.body}</p>
                            {'signed' in step && isDone && (
                              <p className="mt-2 text-meta text-fg-3">
                                Người ký: {step.signed}. Ghi nhận: {step.logged}.
                              </p>
                            )}
                            {'panels' in step && (
                              <div className="mt-3 rounded-container bg-surface-2 px-3 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-body font-medium">Tấm pin đã kẹp và đấu dây</p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      size="sm"
                                      aria-label="Bớt một tấm"
                                      onClick={() => setPanels((p) => Math.max(0, p - 1))}
                                      disabled={isDone}
                                    >
                                      Bớt một
                                    </Button>
                                    <span className="tnum min-w-20 text-center text-body font-semibold">
                                      {panels}/{total}
                                    </span>
                                    <Button
                                      size="sm"
                                      aria-label="Thêm một tấm"
                                      onClick={() => setPanels((p) => Math.min(total, p + 1))}
                                      disabled={isDone}
                                    >
                                      Thêm một
                                    </Button>
                                  </div>
                                </div>
                                <Progress value={(panels / total) * 100} label="Tấm pin đã lắp" className="mt-2" />
                                <p className="mt-2 text-meta text-fg-3">
                                  Trưởng nhóm: {step.lead}. Cập nhật {step.updated}.
                                </p>
                              </div>
                            )}
                            {'prerequisite' in step && (
                              <p className="mt-2 text-meta text-fg-3">
                                Điều kiện trước: {step.prerequisite}. Thời gian dự kiến: {step.duration}.
                              </p>
                            )}
                            {'requirement' in step && <p className="mt-2 text-meta text-fg-3">{step.requirement}.</p>}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Đo kiểm tại hiện trường" />
                <PanelBody className="grid gap-4 sm:grid-cols-2">
                  {data.diagnostics.map((d) => (
                    <div key={d.label} className="border-t border-line pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-meta text-fg-2">{d.label}</p>
                        <Badge tone={d.tone}>{d.status}</Badge>
                      </div>
                      <p className="tnum mt-1 text-figure font-semibold">
                        {d.value} <span className="text-body font-normal text-fg-2">{d.unit}</span>
                      </p>
                      <p className="text-meta text-fg-3">{d.note}</p>
                    </div>
                  ))}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelBody>
                  <Field
                    label="Ghi chú hiện trường cho cán bộ nghiệm thu và điện lực"
                    htmlFor="notes"
                    hint={`Tự lưu trên máy. ${notes.length} ký tự.`}
                  >
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </Field>
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:col-span-2">
              <Panel>
                <PanelHeader title="Ảnh hiện trường" action={<Button size="sm">Chụp ảnh</Button>} />
                <PanelBody className="space-y-6">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-body font-medium">Hiện trạng trước thi công ({data.before.length})</p>
                      <Badge tone="ok">QA đã xác minh</Badge>
                    </div>
                    <ul className="grid grid-cols-2 gap-3">
                      {data.before.map((p) => (
                        <li key={p.caption}>
                          <Photo src={p.src} alt={p.caption} ratio="aspect-[4/3]" caption={p.caption} meta={p.meta} />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-body font-medium">Đang thi công ({data.during.length + 2})</p>
                      <Badge tone="warn">Còn thiếu 1 ảnh sau thi công</Badge>
                    </div>
                    {data.during.map((p) => (
                      <Photo
                        key={p.caption}
                        src={p.src}
                        alt={p.caption}
                        ratio="aspect-[16/9]"
                        caption={p.caption}
                        meta={p.meta}
                      />
                    ))}
                    <button
                      type="button"
                      className="press mt-3 flex w-full flex-col items-center gap-1 rounded-container border border-dashed border-line-2 px-4 py-6 text-body text-fg-2 hover:bg-surface-2"
                    >
                      <span className="font-medium text-fg">Tải ảnh inverter và pin lưu trữ sau lắp đặt</span>
                      <span className="text-center text-meta text-fg-3">
                        Cầu dao cách ly AC, nhãn định mức inverter và dàn pin hoàn thiện để bàn giao nghiệm thu.
                      </span>
                    </button>
                  </div>
                </PanelBody>
              </Panel>

              <Notice tone={data.weather.tone} title={data.weather.summary}>
                {data.weather.detail}. An toàn để làm việc.
              </Notice>
            </div>
          </div>

          <ActionBar>
            <div className="text-body">
              <p className="font-medium">Đang làm: {data.session.tech}</p>
              <p className="tnum text-meta text-fg-3">
                {data.session.timer}. {data.session.wrap}.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
              <Button>Ghi tạm dừng</Button>
              <Button>Yêu cầu hỗ trợ</Button>
              <Button variant="ghost">Đồng bộ nhật ký</Button>
              <Button
                variant="primary"
                className="w-full sm:w-auto"
                disabled={activeIndex === -1}
                onClick={completeActive}
              >
                {activeIndex === -1 ? 'Đã xong tất cả các bước' : `Hoàn thành bước ${activeIndex + 1}`}
              </Button>
            </div>
          </ActionBar>
        </>
      )}
    </QueryBoundary>
  )
}
