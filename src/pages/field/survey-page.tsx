import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ActionBar } from '@/components/common/ui/action-bar'
import { Button } from '@/components/common/ui/button'
import { Checkbox, Field, Input } from '@/components/common/ui/field'
import { KeyValueList, Notice, Photo } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ROUTES } from '@/routes/paths'
import { surveyJob } from '@/data/field'
import { cx } from '@/utils/cx'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function FieldSurveyPage() {
  const query = useMockQuery(['field', 'survey', surveyJob.id], surveyJob)
  const [length, setLength] = useState('12.2')
  const [width, setWidth] = useState('7.4')
  const [profile, setProfile] = useState('Mái hai mái')
  const [tilt, setTilt] = useState(28)
  const [access, setAccess] = useState('Trung bình')
  const [obstacles, setObstacles] = useState<Set<string>>(new Set(surveyJob.obstacles.map((o) => o.label)))
  const [done, setDone] = useState(false)

  const area = Number(length) * Number(width)
  const claimed = 90
  const delta = ((area - claimed) / claimed) * 100

  function toggleObstacle(label: string) {
    setObstacles((s) => {
      const next = new Set(s)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
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
                <Badge tone={done ? 'ok' : 'accent'}>{done ? 'Đã gửi kinh doanh' : data.status}</Badge>
                <span>{data.autosave}</span>
              </>
            }
            title={data.customer}
            description={data.address}
            actions={
              <>
                <Button>Gọi khách hàng</Button>
                <Button>Mở bản đồ</Button>
              </>
            }
          />

          <Panel className="mb-12">
            <PanelBody>
              <KeyValueList
                columns={2}
                items={[
                  { k: 'Khung giờ hẹn', v: data.window },
                  { k: 'Hệ thống mục tiêu', v: data.target },
                ]}
              />
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
              <Panel>
                <PanelHeader title="Đánh giá sơ bộ của khách" />
                <PanelBody className="space-y-4">
                  <KeyValueList columns={2} items={data.baseline} />
                  <div>
                    <p className="mb-2 text-body font-medium">Ảnh tham khảo chủ nhà gửi</p>
                    <ul className="grid grid-cols-2 gap-4">
                      {data.referencePhotos.map((p) => (
                        <li key={p.caption}>
                          <Photo src={p.src} alt={p.caption} ratio="aspect-[3/2]" caption={p.caption} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Xác minh & đo đạc tại chỗ" />
                <PanelBody className="space-y-6">
                  <fieldset>
                    <legend className="mb-2 text-body font-medium">Kích thước mặt mái</legend>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Chiều dài đo được" htmlFor="len">
                        <div className="flex items-center gap-2">
                          <Input
                            id="len"
                            inputMode="decimal"
                            value={length}
                            onChange={(e) => setLength(e.target.value)}
                          />
                          <span className="text-body text-fg-2">m</span>
                        </div>
                      </Field>
                      <Field label="Chiều rộng đo được" htmlFor="wid">
                        <div className="flex items-center gap-2">
                          <Input
                            id="wid"
                            inputMode="decimal"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                          />
                          <span className="text-body text-fg-2">m</span>
                        </div>
                      </Field>
                      <div className="rounded-container bg-surface-2 px-3 py-2">
                        <p className="text-meta text-fg-2">Diện tích đã xác minh</p>
                        <p className="tnum text-figure font-semibold">
                          {Number.isFinite(area) ? area.toFixed(2) : '0.00'}{' '}
                          <span className="text-meta font-normal text-fg-2">m²</span>
                        </p>
                        <p className="tnum text-meta text-fg-3">
                          {delta >= 0 ? '+' : ''}
                          {Number.isFinite(delta) ? delta.toFixed(1) : '0.0'}% so với khách khai
                        </p>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="mb-2 text-body font-medium">Dạng mái</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {data.profiles.map((p) => (
                        <label
                          key={p}
                          className={cx(
                            'press flex h-10 cursor-pointer items-center justify-center rounded-control border text-body',
                            profile === p
                              ? 'border-accent bg-accent-soft font-medium text-accent-fg'
                              : 'border-line-2 hover:bg-surface-2',
                          )}
                        >
                          <input
                            type="radio"
                            name="profile"
                            value={p}
                            checked={profile === p}
                            onChange={() => setProfile(p)}
                            className="sr-only"
                          />
                          {p}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <label htmlFor="tilt" className="text-body font-medium">
                        Độ nghiêng đo bằng thước đo nghiêng
                      </label>
                      <span className="tnum text-body">
                        <span className="text-title font-semibold">{tilt}°</span>{' '}
                        <span className="text-fg-3">khách khai 25°</span>
                      </span>
                    </div>
                    <input
                      id="tilt"
                      type="range"
                      min={10}
                      max={50}
                      value={tilt}
                      onChange={(e) => setTilt(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="tnum flex justify-between text-meta text-fg-3">
                      <span>10° dốc thấp</span>
                      <span>28° tối ưu</span>
                      <span>50° mái dốc đứng</span>
                    </div>
                  </div>

                  <fieldset>
                    <legend className="mb-2 text-body font-medium">Mức độ tiếp cận</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {data.access.map((a) => (
                        <label
                          key={a.label}
                          className={cx(
                            'press cursor-pointer rounded-control border px-3 py-2 text-left',
                            access === a.label ? 'border-accent bg-accent-soft' : 'border-line-2 hover:bg-surface-2',
                          )}
                        >
                          <input
                            type="radio"
                            name="access"
                            value={a.label}
                            checked={access === a.label}
                            onChange={() => setAccess(a.label)}
                            className="sr-only"
                          />
                          <span className={cx('block text-body font-medium', access === a.label && 'text-accent-fg')}>
                            {a.label}
                          </span>
                          <span className="block text-meta text-fg-3">{a.note}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="mb-2 text-body font-medium">Bóng che và vật cản đã xác định</legend>
                    <ul className="divide-y divide-line border-t border-b border-line">
                      {data.obstacles.map((o) => (
                        <li key={o.label} className="flex items-center justify-between gap-3 py-3">
                          <Checkbox
                            checked={obstacles.has(o.label)}
                            onChange={() => toggleObstacle(o.label)}
                            label={o.label}
                          />
                          <Badge>{o.note}</Badge>
                        </li>
                      ))}
                    </ul>
                  </fieldset>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-body font-medium">Khả năng đấu nối tủ điện</p>
                      <Badge tone="ok">{data.panelNote}</Badge>
                    </div>
                    <KeyValueList columns={2} items={data.panel} />
                  </div>

                  <Notice tone="ok" title="Khuyến nghị sau khảo sát">
                    {data.recommendation}
                  </Notice>
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:col-span-2">
              <Panel>
                <PanelHeader
                  title="Ảnh khảo sát"
                  description={`Đã chụp ${data.photos.length}/${data.photos.length} vị trí bắt buộc`}
                  action={<Button size="sm">Chụp ảnh</Button>}
                />
                <PanelBody className="space-y-4">
                  <button
                    type="button"
                    className="press flex w-full flex-col items-center gap-1 rounded-container border border-dashed border-line-2 px-4 py-6 text-body text-fg-2 hover:bg-surface-2"
                  >
                    <span>Chụp hoặc kéo thả ảnh mới</span>
                    <span className="text-meta text-fg-3">JPEG độ phân giải cao hoặc RAW có kèm toạ độ GPS</span>
                  </button>
                  <ol className="grid gap-4 sm:grid-cols-2">
                    {data.photos.map((p, i) => (
                      <li key={p.title}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-body font-medium">
                            {i + 1}. {p.title}
                          </p>
                          <Badge tone="ok">{p.status}</Badge>
                        </div>
                        <Photo src={p.src} alt={p.title} ratio="aspect-[4/3]" meta={p.note} />
                      </li>
                    ))}
                  </ol>
                </PanelBody>
              </Panel>
            </div>
          </div>

          <ActionBar>
            <Button>Lưu nháp</Button>
            <Button variant="danger">Báo trở ngại</Button>
            <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
              <span className="tnum text-body text-fg-2">
                {done
                  ? 'Đã gửi khảo sát cho kinh doanh'
                  : `Đã kiểm tra ${data.mandatory.done}/${data.mandatory.total} trường bắt buộc`}
              </span>
              <Button variant="primary" className="w-full sm:w-auto" disabled={done} onClick={() => setDone(true)}>
                Hoàn thành khảo sát và gửi kinh doanh
              </Button>
            </div>
          </ActionBar>
        </>
      )}
    </QueryBoundary>
  )
}
