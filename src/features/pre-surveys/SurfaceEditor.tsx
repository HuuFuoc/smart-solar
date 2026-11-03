import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Checkbox, Field, Input, WithUnit } from '@/components/common/ui/field'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState } from '@/components/common/ui/states'
import { CompassPicker } from '@/features/pre-surveys/CompassPicker'
import { Facts } from '@/features/pre-surveys/Facts'
import { ObstaclePanel } from '@/features/pre-surveys/ObstaclePanel'
import { SurfacePlan } from '@/features/pre-surveys/SurfacePlan'
import { directionLabel } from '@/features/pre-surveys/preSurveyDisplay'
import { formatM2 } from '@/features/pre-surveys/simulationDisplay'
import {
  SURFACE_LIMITS,
  autoDeclared,
  duplicateObstacle,
  hasObstacleError,
  liveObstacleErrors,
  newObstacle,
  obstacleErrorKey,
  type ObstacleField,
  type ObstacleForm,
  type SurfaceErrors,
  type SurfaceForm,
} from '@/features/pre-surveys/surfaceForm'
import { readDecimal, toInputText } from '@/utils/number'

type Props = {
  value: SurfaceForm
  errors: SurfaceErrors
  /** Form mới và danh sách key lỗi cần xoá (các ô vừa sửa) */
  onChange: (next: SurfaceForm, touchedFields: string[]) => void
  /** Cột phụ của trang, đặt cạnh khối kích thước */
  aside?: ReactNode
}

// Bước "Mặt lắp": kích thước, độ dốc, hướng và vật cản. State nằm ở trang cha.
// Ô nhập là nguồn dữ liệu chính, trên hình chỉ chọn và kéo thả vật cản.
export function SurfaceEditor({ value, errors, onChange, aside }: Props) {
  /** Sửa các ô của mặt lắp (không phải ô của vật cản) */
  function setFields(patch: Partial<SurfaceForm>) {
    onChange({ ...value, ...patch }, Object.keys(patch))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <SizePanel value={value} errors={errors} onFieldsChange={setFields} />
      <ObstacleSection value={value} errors={errors} onChange={onChange} />
      <DeclaredAreaPanel value={value} errors={errors} onFieldsChange={setFields} />
      {/* Thứ tự DOM là thứ tự trên điện thoại (cột phụ ở cuối), từ lg cột phụ mới lên hàng đầu */}
      {aside && <div className="min-w-0 space-y-4 self-start lg:col-start-3 lg:row-start-1">{aside}</div>}
    </div>
  )
}

type FieldsPanelProps = {
  value: SurfaceForm
  errors: SurfaceErrors
  onFieldsChange: (patch: Partial<SurfaceForm>) => void
}

function SizePanel({ value, errors, onFieldsChange }: FieldsPanelProps) {
  return (
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
              onChange={(e) => onFieldsChange({ widthM: e.target.value })}
              aria-invalid={Boolean(errors.widthM)}
            />
          </WithUnit>
        </Field>
        <Field
          label="Chiều dài theo dốc"
          htmlFor="surfaceLength"
          hint="Từ mép cao xuống mép thấp."
          error={errors.lengthM}
        >
          <WithUnit unit="m">
            <Input
              id="surfaceLength"
              inputMode="decimal"
              value={value.lengthM}
              onChange={(e) => onFieldsChange({ lengthM: e.target.value })}
              aria-invalid={Boolean(errors.lengthM)}
            />
          </WithUnit>
        </Field>
        <Field
          label="Độ dốc mái"
          htmlFor="surfaceTilt"
          hint="Mái bằng là 0°. Không chắc thì ước lượng."
          error={errors.tiltDegree}
        >
          <WithUnit unit="độ">
            <Input
              id="surfaceTilt"
              inputMode="decimal"
              value={value.tiltDegree}
              onChange={(e) => onFieldsChange({ tiltDegree: e.target.value })}
              aria-invalid={Boolean(errors.tiltDegree)}
            />
          </WithUnit>
        </Field>
        <CompassPicker
          className="sm:col-span-3"
          value={value.azimuthDegree}
          error={errors.azimuthDegree}
          onChange={(azimuthDegree) => onFieldsChange({ azimuthDegree })}
        />
      </PanelBody>
    </Panel>
  )
}

/** Kích thước mặt lắp để vẽ hình. null khi chưa nhập đủ hoặc vượt giới hạn */
function drawableSize(form: SurfaceForm) {
  const width = readDecimal(form.widthM)
  const length = readDecimal(form.lengthM)
  if (width === null || length === null) return null
  if (width <= 0 || length <= 0) return null
  if (width > SURFACE_LIMITS.maxSideM || length > SURFACE_LIMITS.maxSideM) return null
  return { width, length }
}

/** Key lỗi của mọi vật cản. Lỗi gắn theo vị trí trong danh sách, nên thêm / xoá vật cản thì xoá hết */
function allObstacleErrorKeys(errors: SurfaceErrors) {
  return Object.keys(errors).filter((key) => key.startsWith('obstacles'))
}

// Khối vật cản: hình mặt lắp bên trái, cột sửa vật cản bên phải (điện thoại thì hình ở trên)
function ObstacleSection({ value, errors, onChange }: Omit<Props, 'aside'>) {
  // Vật cản đang chọn (vị trí trong danh sách)
  const [selected, setSelected] = useState<number | null>(null)
  // Vật cản vừa thêm: ô tên của nó được focus một lần
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  // "Hoàn tác" trong toast chạy sau nhiều lần render, nên phải đọc form và hàm onChange mới nhất qua ref
  const latestRef = useRef({ value, onChange, errors })
  useEffect(() => {
    latestRef.current = { value, onChange, errors }
  })

  const size = drawableSize(value)
  const obstacleCount = value.obstacles.length

  // Hình chỉ vẽ được số. Ô gõ sai vẽ thành 0, vị trí trong mảng vẫn khớp với form
  const planObstacles = useMemo(
    () =>
      value.obstacles.map((obstacle) => ({
        name: obstacle.name.trim(),
        xM: readDecimal(obstacle.xM) ?? 0,
        yM: readDecimal(obstacle.yM) ?? 0,
        widthM: Math.max(0, readDecimal(obstacle.widthM) ?? 0),
        lengthM: Math.max(0, readDecimal(obstacle.lengthM) ?? 0),
      })),
    [value.obstacles],
  )

  // Lỗi số của vật cản hiện ngay khi gõ, lỗi từ lần bấm Tiếp tục (trang cha) đè lên nếu cùng ô
  const obstacleErrors = useMemo(() => ({ ...liveObstacleErrors(value), ...errors }), [value, errors])

  // Vật cản mở ở cột sửa: vật cản đang chọn, hoặc vật cản lỗi đầu tiên nếu chưa chọn gì
  const firstBrokenIndex = value.obstacles.findIndex((_, index) => hasObstacleError(errors, index))
  let current: number | null = null
  if (selected !== null && selected < obstacleCount) current = selected
  else if (firstBrokenIndex >= 0) current = firstBrokenIndex

  function setObstacle(index: number, patch: Partial<ObstacleForm>) {
    const obstacles = value.obstacles.map((obstacle, i) => (i === index ? { ...obstacle, ...patch } : obstacle))
    const touched = Object.keys(patch).map((field) => obstacleErrorKey(index, field as ObstacleField))
    onChange({ ...value, obstacles }, touched)
  }

  /** Thêm vào cuối danh sách (cả khi nhân bản) để số thứ tự các vật cản cũ trên hình không đổi */
  function appendObstacle(obstacle: ObstacleForm) {
    onChange({ ...value, obstacles: [...value.obstacles, obstacle] }, ['obstacles'])
    setSelected(value.obstacles.length)
    setFocusKey(obstacle.key)
  }

  function removeObstacle(index: number) {
    const removed = value.obstacles[index]!
    const remaining = value.obstacles.filter((_, i) => i !== index)
    onChange({ ...value, obstacles: remaining }, allObstacleErrorKeys(errors))
    setSelected(remaining.length > 0 ? Math.min(index, remaining.length - 1) : null)
    // Nút xoá vừa biến mất cùng ô sửa, nên đưa focus về nút thêm thay vì để rơi về <body>
    addButtonRef.current?.focus()

    const removedName = removed.name.trim() || `vật cản ${index + 1}`
    toast(`Đã xoá ${removedName}.`, {
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          const latest = latestRef.current
          const obstacles = [...latest.value.obstacles]
          const position = Math.min(index, obstacles.length)
          obstacles.splice(position, 0, removed)
          latest.onChange({ ...latest.value, obstacles }, allObstacleErrorKeys(latest.errors))
          setSelected(position)
        },
      },
    })
  }

  const planLabel = size
    ? `Mặt bằng mặt lắp ${toInputText(size.width)} × ${toInputText(size.length)} m, ${obstacleCount} vật cản.`
    : ''
  const planCaption = value.azimuthDegree && (
    <p className="text-meta text-fg-3">
      Hình vẽ nhìn từ trên xuống theo mặt mái: mép trên là mép cao, mái dốc xuống phía dưới hình và quay về hướng{' '}
      {directionLabel(Number(value.azimuthDegree))}.
    </p>
  )

  return (
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
              onMove={(index, xM, yM) => setObstacle(index, { xM: toInputText(xM), yM: toInputText(yM) })}
              label={planLabel}
              caption={planCaption}
            />
          ) : (
            <EmptyState title="Nhập chiều rộng và chiều dài để vẽ mặt lắp" />
          )}
        </div>
        <ObstaclePanel
          obstacles={value.obstacles}
          errors={obstacleErrors}
          selected={current}
          onSelect={setSelected}
          onAdd={() => appendObstacle(newObstacle(value))}
          onDuplicate={(index) => appendObstacle(duplicateObstacle(value, index))}
          onRemove={removeObstacle}
          onChange={setObstacle}
          focusKey={focusKey}
          onFocused={() => setFocusKey(null)}
          addRef={addButtonRef}
        />
      </PanelBody>
    </Panel>
  )
}

// Số liệu khai báo (tổng diện tích, dùng được, có vật cản): tự tính từ mặt lắp, khách vẫn có thể tự khai
function DeclaredAreaPanel({ value, errors, onFieldsChange }: FieldsPanelProps) {
  const auto = autoDeclared(value)
  const obstacleCount = value.obstacles.length

  function toggleManualArea(checked: boolean) {
    // Bật tự khai lần đầu thì điền sẵn số đang tính, để khách chỉ sửa phần khác
    if (checked && !value.totalAreaM2 && auto) {
      onFieldsChange({
        declaredManual: true,
        totalAreaM2: toInputText(auto.totalAreaM2),
        usableAreaM2: toInputText(auto.usableAreaM2),
      })
      return
    }
    onFieldsChange({ declaredManual: checked })
  }

  const facts = [
    { k: 'Tổng diện tích', v: value.declaredManual ? '—' : formatM2(auto?.totalAreaM2) },
    { k: 'Diện tích dùng được', v: value.declaredManual ? '—' : formatM2(auto?.usableAreaM2) },
    { k: 'Vật cản', v: obstacleCount > 0 ? `Có (${obstacleCount})` : 'Không' },
  ]

  return (
    <Panel className="min-w-0 lg:col-span-3">
      <PanelHeader title="Số liệu khai báo" />
      <PanelBody className="space-y-4">
        <Facts items={facts} />
        <Checkbox
          label="Tự khai diện tích"
          description="Khi diện tích thực tế khác hình chữ nhật đã vẽ, ví dụ mái có phần khuyết."
          checked={value.declaredManual}
          onChange={(e) => toggleManualArea(e.target.checked)}
        />
        {value.declaredManual && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tổng diện tích" htmlFor="declaredTotal" error={errors.totalAreaM2}>
              <WithUnit unit="m²">
                <Input
                  id="declaredTotal"
                  inputMode="decimal"
                  value={value.totalAreaM2}
                  onChange={(e) => onFieldsChange({ totalAreaM2: e.target.value })}
                  aria-invalid={Boolean(errors.totalAreaM2)}
                />
              </WithUnit>
            </Field>
            <Field
              label="Diện tích dùng được"
              htmlFor="declaredUsable"
              hint="Trừ lối đi, bồn nước, chỗ bị che."
              error={errors.usableAreaM2}
            >
              <WithUnit unit="m²">
                <Input
                  id="declaredUsable"
                  inputMode="decimal"
                  value={value.usableAreaM2}
                  onChange={(e) => onFieldsChange({ usableAreaM2: e.target.value })}
                  aria-invalid={Boolean(errors.usableAreaM2)}
                />
              </WithUnit>
            </Field>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}
