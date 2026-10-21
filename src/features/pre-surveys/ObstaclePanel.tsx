import { useEffect, useEffectEvent, useRef, type Ref } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { Field, Input, WithUnit } from '@/components/common/ui/field'
import {
  OBSTACLE_NAME_SUGGESTIONS,
  SURFACE_LIMITS,
  hasObstacleError,
  obstacleErrorKey,
  type ObstacleField,
  type ObstacleForm,
  type SurfaceErrors,
} from '@/features/pre-surveys/surfaceForm'
import { cx } from '@/utils/cx'
import { keepInView } from '@/utils/scroll'

type Props = {
  obstacles: ObstacleForm[]
  errors: SurfaceErrors
  /** Vị trí của vật cản đang mở ở ô sửa */
  selected: number | null
  onSelect: (index: number) => void
  onAdd: () => void
  onDuplicate: (index: number) => void
  onRemove: (index: number) => void
  onChange: (index: number, patch: Partial<ObstacleForm>) => void
  /** Key của vật cản vừa thêm: ô tên của nó được focus một lần */
  focusKey: string | null
  onFocused: () => void
  addRef: Ref<HTMLButtonElement>
}

// Cột sửa vật cản đặt cạnh hình mặt lắp:
// - Danh sách gọn mọi vật cản (số thứ tự trùng số trên hình, tên, cỡ, dấu lỗi). Dài thì cuộn trong khung.
// - Ô sửa của một vật cản đang chọn (chọn ở danh sách hay bấm trên hình đều được).
export function ObstaclePanel({
  obstacles,
  errors,
  selected,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onChange,
  focusKey,
  onFocused,
  addRef,
}: Props) {
  const listRef = useRef<HTMLOListElement>(null)
  const full = obstacles.length >= SURFACE_LIMITS.maxObstacles
  const current = selected !== null ? obstacles[selected] : undefined

  // Bấm vật cản trên hình thì cuộn khung danh sách tới dòng của nó (không cuộn cả trang)
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>('[aria-current="true"]')
    if (list && item) keepInView(list, item)
  }, [selected])

  let editor = null
  if (current && selected !== null) {
    editor = (
      <ObstacleInspector
        key={current.key}
        index={selected}
        obstacle={current}
        errors={errors}
        full={full}
        onChange={(patch) => onChange(selected, patch)}
        onDuplicate={() => onDuplicate(selected)}
        onRemove={() => onRemove(selected)}
        autoFocus={focusKey === current.key}
        onFocused={onFocused}
      />
    )
  } else if (obstacles.length > 0) {
    editor = (
      <p className="border-t border-line pt-3 text-meta text-fg-3">
        Chọn một vật cản trong danh sách hoặc bấm vào nó trên hình để sửa.
      </p>
    )
  }

  return (
    <div className="min-w-0 space-y-3 rounded-container border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body font-semibold text-fg">
          {obstacles.length > 0 ? `${obstacles.length} vật cản` : 'Chưa có vật cản'}
        </p>
        <Button ref={addRef} size="sm" variant="soft" icon="add" onClick={onAdd} disabled={full}>
          Thêm vật cản
        </Button>
      </div>

      {obstacles.length === 0 && <p className="text-body text-fg-2">Mái không có vật cản thì bỏ qua phần này.</p>}
      {obstacles.length > 0 && (
        <ol
          ref={listRef}
          aria-label="Danh sách vật cản"
          className="-mx-2 max-h-36 space-y-0.5 overflow-y-auto overscroll-contain scrollbar-thin"
        >
          {obstacles.map((obstacle, index) => (
            <ObstacleRow
              key={obstacle.key}
              obstacle={obstacle}
              index={index}
              active={index === selected}
              broken={hasObstacleError(errors, index)}
              onSelect={() => onSelect(index)}
            />
          ))}
        </ol>
      )}

      {full && (
        <p className="text-meta text-fg-3">Đã đủ {SURFACE_LIMITS.maxObstacles} vật cản, mức tối đa của một mặt lắp.</p>
      )}
      {errors.obstacles && (
        <p className="text-meta text-danger" role="alert">
          {errors.obstacles}
        </p>
      )}

      {editor}
    </div>
  )
}

function NumberBadge({ number, active }: { number: number; active: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'tnum inline-flex size-6 shrink-0 items-center justify-center rounded-control text-meta font-semibold',
        active ? 'bg-accent text-on-accent' : 'bg-fg/8 text-fg-2',
      )}
    >
      {number}
    </span>
  )
}

/** "2 × 1,5 m", ô còn trống thì ghi "—" */
function sizeText(obstacle: ObstacleForm) {
  const width = obstacle.widthM.trim() || '—'
  const length = obstacle.lengthM.trim() || '—'
  return `${width} × ${length} m`
}

function ObstacleRow({
  obstacle,
  index,
  active,
  broken,
  onSelect,
}: {
  obstacle: ObstacleForm
  index: number
  active: boolean
  broken: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        onClick={onSelect}
        className={cx(
          'press flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left',
          active ? 'bg-accent-soft' : 'hover:bg-hover',
          // Vòng focus vẽ vào trong vì khung cuộn sẽ cắt mất vòng vẽ ra ngoài
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <NumberBadge number={index + 1} active={active} />
        <span className={cx('min-w-0 flex-1 truncate text-body text-fg', active && 'font-semibold')}>
          {obstacle.name.trim() || 'Chưa đặt tên'}
        </span>
        {/* Cắt bớt số quá dài để không tràn dòng, ô sửa vẫn báo lỗi đúng số */}
        <span className="tnum max-w-[45%] truncate text-meta text-fg-2">{sizeText(obstacle)}</span>
        {broken && (
          <>
            <Icon name="error" className="shrink-0 text-[20px] text-danger" />
            <span className="sr-only">, có ô cần sửa</span>
          </>
        )}
      </button>
    </li>
  )
}

type InspectorProps = {
  index: number
  obstacle: ObstacleForm
  errors: SurfaceErrors
  full: boolean
  onChange: (patch: Partial<ObstacleForm>) => void
  onDuplicate: () => void
  onRemove: () => void
  autoFocus: boolean
  onFocused: () => void
}

/** id của ô nhập, để gắn với nhãn và để focus ô tên */
function inputId(obstacle: ObstacleForm, field: ObstacleField) {
  return `obstacle-${obstacle.key}-${field}`
}

// Ô sửa của một vật cản
function ObstacleInspector({
  index,
  obstacle,
  errors,
  full,
  onChange,
  onDuplicate,
  onRemove,
  autoFocus,
  onFocused,
}: InspectorProps) {
  const fieldError = (field: ObstacleField) => errors[obstacleErrorKey(index, field)]
  const label = obstacle.name.trim() || `vật cản ${index + 1}`
  const nameInputId = inputId(obstacle, 'name')

  // Vật cản vừa thêm / nhân bản: focus và bôi đen ô tên để gõ đè ngay
  const markFocused = useEffectEvent(() => onFocused())
  useEffect(() => {
    if (!autoFocus) return
    const input = document.getElementById(nameInputId)
    if (input instanceof HTMLInputElement) {
      input.focus()
      input.select()
    }
    markFocused()
  }, [autoFocus, nameInputId])

  return (
    <fieldset className="space-y-4 border-t border-line pt-3">
      <legend className="sr-only">Sửa vật cản {index + 1}</legend>
      <Field label={`Tên vật cản ${index + 1}`} htmlFor={nameInputId} error={fieldError('name')}>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <Combobox
              id={nameInputId}
              value={obstacle.name}
              onChange={(name) => onChange({ name })}
              options={OBSTACLE_NAME_SUGGESTIONS}
              listLabel="Gợi ý tên vật cản"
              emptyText="Không có gợi ý; giữ tên đang gõ."
              invalid={Boolean(fieldError('name'))}
            />
          </div>
          <IconButton
            icon="content_copy"
            label={`Nhân bản ${label}`}
            tooltip="Nhân bản"
            onClick={onDuplicate}
            disabled={full}
          />
          <IconButton icon="delete" variant="danger" label={`Xoá ${label}`} tooltip="Xoá" onClick={onRemove} />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <NumberField
          obstacle={obstacle}
          field="xM"
          label="Cách mép trái"
          error={fieldError('xM')}
          onChange={onChange}
        />
        <NumberField obstacle={obstacle} field="yM" label="Cách mép cao" error={fieldError('yM')} onChange={onChange} />
        <p className="col-span-2 -mt-2 text-meta text-fg-3">Đo tới góc trên bên trái của vật cản, như trên hình.</p>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        <NumberField
          obstacle={obstacle}
          field="widthM"
          label="Bề ngang"
          error={fieldError('widthM')}
          onChange={onChange}
        />
        <NumberField
          obstacle={obstacle}
          field="lengthM"
          label="Bề dọc"
          error={fieldError('lengthM')}
          onChange={onChange}
        />
        <NumberField
          obstacle={obstacle}
          field="heightM"
          label="Chiều cao"
          hint="Tuỳ chọn"
          error={fieldError('heightM')}
          onChange={onChange}
        />
      </div>
    </fieldset>
  )
}

/** Một ô số (mét) của vật cản */
function NumberField({
  obstacle,
  field,
  label,
  hint,
  error,
  onChange,
}: {
  obstacle: ObstacleForm
  field: Exclude<ObstacleField, 'name'>
  label: string
  hint?: string
  error: string | undefined
  onChange: (patch: Partial<ObstacleForm>) => void
}) {
  const id = inputId(obstacle, field)
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <WithUnit unit="m">
        <Input
          id={id}
          inputMode="decimal"
          value={obstacle[field]}
          onChange={(e) => onChange({ [field]: e.target.value })}
          aria-invalid={Boolean(error)}
        />
      </WithUnit>
    </Field>
  )
}
