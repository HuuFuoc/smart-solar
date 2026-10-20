import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Checkbox, Field, Input } from '@/components/common/ui/field'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState } from '@/components/common/ui/states'
import { CompassPicker, WithUnit } from '@/features/pre-surveys/components/AssessmentFields'
import { Facts } from '@/features/pre-surveys/components/Facts'
import { ObstaclePanel } from '@/features/pre-surveys/components/ObstaclePanel'
import { directionLabel } from '@/features/pre-surveys/components/preSurveyDisplay'
import { formatM2 } from '@/features/pre-surveys/components/simulationDisplay'
import { SurfacePlan } from '@/features/pre-surveys/components/SurfacePlan'
import {
  SURFACE_LIMITS,
  autoDeclared,
  duplicateObstacle,
  hasObstacleError,
  liveObstacleErrors,
  meterText,
  newObstacle,
  num,
  obstacleErrorKey,
  type ObstacleField,
  type ObstacleForm,
  type SurfaceErrors,
  type SurfaceForm,
} from '@/features/pre-surveys/components/surfaceForm'

/*
  Bước "Mặt lắp" của đánh giá sơ bộ: kích thước, độ dốc, hướng, vật cản. Ô nhập là nguồn chính; trên hình chọn và kéo
  thả vật cản (người dùng chốt 09/10/2026). Số liệu khai (tổng, dùng được, có vật cản) tự tính từ mặt lắp, khách vẫn
  sửa được hai ô diện tích. Trang giữ state; `onChange` nhận form mới và các khoá lỗi cần xoá.
  Bố cục (người dùng 10/10/2026: hình phải to và nằm giữa): kích thước + hướng chiếm 2/3 hàng đầu, cạnh cột phụ của trang
  (`aside`); hình mặt lắp và số liệu khai rộng hết trang. Thứ tự DOM là thứ tự trên điện thoại (cột phụ xuống cuối), từ lg
  cột phụ mới được đặt lên hàng đầu.
  Vật cản (người dùng chọn 10/10/2026): hình bên trái, cột sửa `ObstaclePanel` bên phải (danh sách + ô của một vật cản đang
  chọn), nên vừa sửa số vừa thấy hình. Điện thoại: hình ở trên, cột sửa ở dưới.
*/

type Props = {
  value: SurfaceForm
  errors: SurfaceErrors
  onChange: (next: SurfaceForm, touched: string[]) => void
  /** Cột phụ của trang (ghi chú), đặt cạnh khối kích thước. */
  aside?: ReactNode
}

export function SurfaceEditor({ value, errors, onChange, aside }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  /** Vật cản vừa thêm / nhân bản: ô tên của nó được focus một lần. */
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const clearFocusKey = useCallback(() => setFocusKey(null), [])
  const addRef = useRef<HTMLButtonElement>(null)
  // "Hoàn tác" trong toast chạy sau nhiều lần vẽ lại: phải ghi vào form và hàm xoá lỗi MỚI NHẤT, không phải bản lúc xoá.
  const latest = useRef({ value, onChange, errors })
  useEffect(() => {
    latest.current = { value, onChange, errors }
  })
  const width = num(value.widthM)
  const length = num(value.lengthM)
  const size =
    width !== null && length !== null && width > 0 && length > 0 && width <= SURFACE_LIMITS.maxSideM && length <= SURFACE_LIMITS.maxSideM
      ? { width, length }
      : null
  const auto = autoDeclared(value)

  // Hình chỉ vẽ vật cản đọc được thành số; chỉ số trong mảng này trùng chỉ số của form (ô sai vẽ thành 0 × 0 thì bỏ qua).
  const planObstacles = useMemo(
    () =>
      value.obstacles.map((o) => ({
        name: o.name.trim(),
        xM: num(o.xM) ?? 0,
        yM: num(o.yM) ?? 0,
        widthM: Math.max(0, num(o.widthM) ?? 0),
        lengthM: Math.max(0, num(o.lengthM) ?? 0),
      })),
    [value.obstacles],
  )

  const set = (patch: Partial<SurfaceForm>) => onChange({ ...value, ...patch }, Object.keys(patch))

  function setObstacle(index: number, patch: Partial<ObstacleForm>) {
    const obstacles = value.obstacles.map((o, i) => (i === index ? { ...o, ...patch } : o))
    onChange({ ...value, obstacles }, Object.keys(patch).map((f) => obstacleErrorKey(index, f as ObstacleField)))
  }

  /** Thêm vào CUỐI danh sách (cả khi nhân bản) để số thứ tự các vật cản đang có trên hình không đổi. */
  function appendObstacle(obstacle: ObstacleForm) {
    onChange({ ...value, obstacles: [...value.obstacles, obstacle] }, ['obstacles'])
    setSelected(value.obstacles.length)
    setFocusKey(obstacle.key)
  }

  /** Lỗi gắn theo chỉ số: thêm / bớt ở giữa làm lệch chỉ số các vật cản sau, nên xoá hết lỗi vật cản. */
  const obstacleErrorKeys = (all: SurfaceErrors) => Object.keys(all).filter((k) => k.startsWith('obstacles'))

  function removeObstacle(index: number) {
    const removed = value.obstacles[index]!
    const remaining = value.obstacles.filter((_, i) => i !== index)
    onChange({ ...value, obstacles: remaining }, obstacleErrorKeys(errors))
    setSelected(remaining.length > 0 ? Math.min(index, remaining.length - 1) : null)
    // Nút xoá biến mất cùng ô sửa: đưa focus về nút thêm thay vì để rơi về <body>.
    addRef.current?.focus()
    toast(`Đã xoá ${removed.name.trim() || `vật cản ${index + 1}`}.`, {
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          const now = latest.current
          const obstacles = [...now.value.obstacles]
          const at = Math.min(index, obstacles.length)
          obstacles.splice(at, 0, removed)
          now.onChange({ ...now.value, obstacles }, obstacleErrorKeys(now.errors))
          setSelected(at)
        },
      },
    })
  }

  const obstacleCount = value.obstacles.length
  // Chưa chọn gì mà có vật cản báo lỗi (vừa bấm Tiếp tục): mở sẵn vật cản lỗi đầu tiên để thấy ô cần sửa.
  // Lỗi số của vật cản báo ngay khi gõ; lỗi từ lần bấm Tiếp tục (page) đè lên nếu cùng ô.
  const obstacleErrors = useMemo(() => ({ ...liveObstacleErrors(value), ...errors }), [value, errors])
  const firstBroken = value.obstacles.findIndex((_, i) => hasObstacleError(errors, i))
  const current = selected !== null && selected < obstacleCount ? selected : firstBroken >= 0 ? firstBroken : null

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="min-w-0 lg:col-span-2">
        <PanelHeader
          title="Kích thước và hướng"
          description="Đo trên mặt mái (theo mặt nghiêng). Mái có nhiều mặt thì nhập mặt lớn nhất định lắp."
        />
        <PanelBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Chiều rộng" htmlFor="surfaceWidth" hint="Dọc theo mép cao (nóc) của mái." error={errors.widthM}>
            <WithUnit unit="m">
              <Input
                id="surfaceWidth"
                inputMode="decimal"
                value={value.widthM}
                onChange={(e) => set({ widthM: e.target.value })}
                aria-invalid={Boolean(errors.widthM)}
              />
            </WithUnit>
          </Field>
          <Field label="Chiều dài theo dốc" htmlFor="surfaceLength" hint="Từ mép cao xuống mép thấp." error={errors.lengthM}>
            <WithUnit unit="m">
              <Input
                id="surfaceLength"
                inputMode="decimal"
                value={value.lengthM}
                onChange={(e) => set({ lengthM: e.target.value })}
                aria-invalid={Boolean(errors.lengthM)}
              />
            </WithUnit>
          </Field>
          <Field label="Độ dốc mái" htmlFor="surfaceTilt" hint="Mái bằng là 0°. Không chắc thì ước lượng." error={errors.tiltDegree}>
            <WithUnit unit="độ">
              <Input
                id="surfaceTilt"
                inputMode="decimal"
                value={value.tiltDegree}
                onChange={(e) => set({ tiltDegree: e.target.value })}
                aria-invalid={Boolean(errors.tiltDegree)}
              />
            </WithUnit>
          </Field>
          <CompassPicker
            className="sm:col-span-3"
            value={value.azimuthDegree}
            error={errors.azimuthDegree}
            onChange={(azimuthDegree) => set({ azimuthDegree })}
          />
        </PanelBody>
      </Panel>

      <Panel className="min-w-0 lg:col-span-3">
        <PanelHeader
          title="Vật cản trên mặt lắp"
          description="Bồn nước, ống thông gió, cửa mái, cục nóng máy lạnh, lối đi… Không có thì bỏ qua."
        />
        <PanelBody className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0">
            {size ? (
              <SurfacePlan
                widthM={size.width}
                lengthM={size.length}
                obstacles={planObstacles}
                selected={current}
                onSelect={setSelected}
                onMove={(i, xM, yM) => setObstacle(i, { xM: meterText(xM), yM: meterText(yM) })}
                label={`Mặt bằng mặt lắp ${meterText(size.width)} × ${meterText(size.length)} m, ${obstacleCount} vật cản.`}
                caption={
                  value.azimuthDegree && (
                    <p className="text-meta text-fg-3">
                      Hình vẽ nhìn từ trên xuống theo mặt mái: mép trên là mép cao, mái dốc xuống phía dưới hình và quay về hướng{' '}
                      {directionLabel(Number(value.azimuthDegree))}.
                    </p>
                  )
                }
              />
            ) : (
              <EmptyState title="Nhập chiều rộng và chiều dài để vẽ mặt lắp" description="Hình vẽ giúp đặt vật cản đúng chỗ trên mái." />
            )}
          </div>
          <ObstaclePanel
            obstacles={value.obstacles}
            errors={obstacleErrors}
            selected={current}
            onSelect={setSelected}
            onAdd={() => appendObstacle(newObstacle(value))}
            onDuplicate={(i) => appendObstacle(duplicateObstacle(value, i))}
            onRemove={removeObstacle}
            onChange={setObstacle}
            focusKey={focusKey}
            onFocused={clearFocusKey}
            addRef={addRef}
          />
        </PanelBody>
      </Panel>

      <Panel className="min-w-0 lg:col-span-3">
        <PanelHeader title="Số liệu khai báo" description="Tính từ mặt lắp ở trên; dùng để chuyên viên đối chiếu khi khảo sát." />
        <PanelBody className="space-y-4">
          <Facts
            items={[
              { k: 'Tổng diện tích', v: value.declaredManual ? '—' : formatM2(auto?.totalAreaM2) },
              { k: 'Diện tích dùng được', v: value.declaredManual ? '—' : formatM2(auto?.usableAreaM2) },
              { k: 'Vật cản', v: obstacleCount > 0 ? `Có (${obstacleCount})` : 'Không' },
            ]}
          />
          <Checkbox
            label="Tự khai diện tích"
            description="Khi diện tích thực tế khác hình chữ nhật đã vẽ, ví dụ mái có phần khuyết."
            checked={value.declaredManual}
            onChange={(e) =>
              set({
                declaredManual: e.target.checked,
                // Mở chế độ tự khai lần đầu: điền sẵn số đang tính để khách chỉ sửa phần khác.
                ...(e.target.checked && !value.totalAreaM2 && auto
                  ? { totalAreaM2: meterText(auto.totalAreaM2), usableAreaM2: meterText(auto.usableAreaM2) }
                  : {}),
              })
            }
          />
          {value.declaredManual && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tổng diện tích" htmlFor="declaredTotal" error={errors.totalAreaM2}>
                <WithUnit unit="m²">
                  <Input
                    id="declaredTotal"
                    inputMode="decimal"
                    value={value.totalAreaM2}
                    onChange={(e) => set({ totalAreaM2: e.target.value })}
                    aria-invalid={Boolean(errors.totalAreaM2)}
                  />
                </WithUnit>
              </Field>
              <Field label="Diện tích dùng được" htmlFor="declaredUsable" hint="Trừ lối đi, bồn nước, chỗ bị che." error={errors.usableAreaM2}>
                <WithUnit unit="m²">
                  <Input
                    id="declaredUsable"
                    inputMode="decimal"
                    value={value.usableAreaM2}
                    onChange={(e) => set({ usableAreaM2: e.target.value })}
                    aria-invalid={Boolean(errors.usableAreaM2)}
                  />
                </WithUnit>
              </Field>
            </div>
          )}
        </PanelBody>
      </Panel>

      {aside && <div className="min-w-0 space-y-4 self-start lg:col-start-3 lg:row-start-1">{aside}</div>}
    </div>
  )
}
