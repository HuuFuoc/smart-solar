import { useEffect, useRef, type Ref } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { Field, Input } from '@/components/common/ui/field'
import { WithUnit } from '@/features/pre-surveys/components/AssessmentFields'
import {
  OBSTACLE_NAME_SUGGESTIONS,
  SURFACE_LIMITS,
  hasObstacleError,
  obstacleErrorKey,
  type ObstacleField,
  type ObstacleForm,
  type SurfaceErrors,
} from '@/features/pre-surveys/components/surfaceForm'
import { cx } from '@/utils/cx'
import { keepInView } from '@/utils/scroll'

/*
  Cột sửa vật cản đặt cạnh hình mặt lắp (người dùng chọn 10/10/2026 "hình + cột sửa bên phải", vì bản cũ mỗi vật cản lặp
  7 nhãn và nằm xa hình nên "rối"):
  - Danh sách gọn mọi vật cản để theo dõi: số thứ tự trùng số trên hình, tên, cỡ, dấu lỗi. Dài thì cuộn trong khung.
  - Ô sửa của MỘT vật cản đang chọn (chọn ở danh sách hay bấm trên hình đều được), nằm ngay cạnh hình nên sửa số là thấy
    vật cản dời theo. Nhân bản cho dãy vật cản giống nhau; xoá có "Hoàn tác" (ở trang).
*/

type Props = {
  obstacles: ObstacleForm[]
  errors: SurfaceErrors
  /** Vật cản đang hiện ở ô sửa: đang chọn, hoặc vật cản đầu tiên có lỗi khi chưa chọn gì. */
  selected: number | null
  onSelect: (index: number) => void
  onAdd: () => void
  onDuplicate: (index: number) => void
  onRemove: (index: number) => void
  onChange: (index: number, patch: Partial<ObstacleForm>) => void
  /** Khoá của vật cản vừa thêm / nhân bản: focus và bôi đen ô tên của nó một lần để gõ đè ngay. */
  focusKey: string | null
  onFocused: () => void
  addRef: Ref<HTMLButtonElement>
}

const sizeText = (o: ObstacleForm) => `${o.widthM.trim() || '—'} × ${o.lengthM.trim() || '—'} m`

function NumberBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'tnum inline-flex size-6 shrink-0 items-center justify-center rounded-control text-meta font-semibold',
        active ? 'bg-accent text-on-accent' : 'bg-fg/8 text-fg-2',
      )}
    >
      {n}
    </span>
  )
}

export function ObstaclePanel({ obstacles, errors, selected, onSelect, onAdd, onDuplicate, onRemove, onChange, focusKey, onFocused, addRef }: Props) {
  const listRef = useRef<HTMLOListElement>(null)
  const full = obstacles.length >= SURFACE_LIMITS.maxObstacles
  const current = selected !== null ? obstacles[selected] : undefined

  // Bấm vật cản trên hình: dòng của nó trong danh sách cuộn tới (cuộn khung danh sách, không cuộn trang).
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>('[aria-current="true"]')
    if (list && item) keepInView(list, item)
  }, [selected])

  return (
    <div className="min-w-0 space-y-3 rounded-container border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body font-semibold text-fg">{obstacles.length > 0 ? `${obstacles.length} vật cản` : 'Chưa có vật cản'}</p>
        <Button ref={addRef} size="sm" icon="add" onClick={onAdd} disabled={full}>
          Thêm vật cản
        </Button>
      </div>

      {obstacles.length === 0 ? (
        <p className="text-body text-fg-2">Mái không có vật cản thì bỏ qua phần này.</p>
      ) : (
        <ol ref={listRef} aria-label="Danh sách vật cản" className="-mx-2 max-h-36 space-y-0.5 overflow-y-auto overscroll-contain scrollbar-thin">
          {obstacles.map((o, i) => {
            const active = i === selected
            const broken = hasObstacleError(errors, i)
            return (
              <li key={o.key}>
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(i)}
                  className={cx(
                    'press flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left',
                    active ? 'bg-accent-soft' : 'hover:bg-hover',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  )}
                >
                  <NumberBadge n={i + 1} active={active} />
                  <span className={cx('min-w-0 flex-1 truncate text-body text-fg', active && 'font-semibold')}>{o.name.trim() || 'Chưa đặt tên'}</span>
                  {/* Cỡ gõ quá lớn (1000000000 m) không được đẩy tràn dòng: cắt bớt, ô sửa vẫn báo lỗi đúng số. */}
                  <span className="tnum max-w-[45%] truncate text-meta text-fg-2">{sizeText(o)}</span>
                  {broken && (
                    <>
                      <Icon name="error" className="shrink-0 text-[20px] text-danger" />
                      <span className="sr-only">, có ô cần sửa</span>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      )}
      {full && <p className="text-meta text-fg-3">Đã đủ {SURFACE_LIMITS.maxObstacles} vật cản, mức tối đa của một mặt lắp.</p>}
      {errors.obstacles && (
        <p className="text-meta text-danger" role="alert">
          {errors.obstacles}
        </p>
      )}

      {current && selected !== null ? (
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
      ) : (
        obstacles.length > 0 && (
          <p className="border-t border-line pt-3 text-meta text-fg-3">Chọn một vật cản trong danh sách hoặc bấm vào nó trên hình để sửa.</p>
        )
      )}
    </div>
  )
}

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
}: {
  index: number
  obstacle: ObstacleForm
  errors: SurfaceErrors
  full: boolean
  onChange: (patch: Partial<ObstacleForm>) => void
  onDuplicate: () => void
  onRemove: () => void
  autoFocus: boolean
  onFocused: () => void
}) {
  const id = (field: ObstacleField) => `obstacle-${obstacle.key}-${field}`
  const err = (field: ObstacleField) => errors[obstacleErrorKey(index, field)]
  const label = obstacle.name.trim() || `vật cản ${index + 1}`

  // Vật cản vừa thêm / nhân bản: focus ô tên một lần (trang tắt cờ qua onFocused).
  useEffect(() => {
    if (!autoFocus) return
    const input = document.getElementById(`obstacle-${obstacle.key}-name`)
    if (input instanceof HTMLInputElement) {
      input.focus()
      input.select()
    }
    onFocused()
  }, [autoFocus, obstacle.key, onFocused])

  const numberField = (field: Exclude<ObstacleField, 'name'>, text: string, hint?: string) => (
    <Field label={text} htmlFor={id(field)} hint={hint} error={err(field)}>
      <WithUnit unit="m">
        <Input
          id={id(field)}
          inputMode="decimal"
          value={obstacle[field]}
          onChange={(e) => onChange({ [field]: e.target.value })}
          aria-invalid={Boolean(err(field))}
        />
      </WithUnit>
    </Field>
  )

  return (
    // Không lặp dòng tiêu đề "Vật cản N": dòng đang chọn ngay phía trên (và ô trên hình) đã nói đang sửa vật cản nào.
    <fieldset className="space-y-4 border-t border-line pt-3">
      <legend className="sr-only">Sửa vật cản {index + 1}</legend>
      <Field label={`Tên vật cản ${index + 1}`} htmlFor={id('name')} error={err('name')}>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <Combobox
              id={id('name')}
              value={obstacle.name}
              onChange={(name) => onChange({ name })}
              options={OBSTACLE_NAME_SUGGESTIONS}
              listLabel="Gợi ý tên vật cản"
              emptyText="Không có gợi ý; giữ tên đang gõ."
              invalid={Boolean(err('name'))}
            />
          </div>
          <IconButton icon="content_copy" label={`Nhân bản ${label}`} tooltip="Nhân bản" onClick={onDuplicate} disabled={full} />
          <IconButton icon="delete" variant="danger-quiet" label={`Xoá ${label}`} tooltip="Xoá" onClick={onRemove} />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {numberField('xM', 'Cách mép trái')}
        {numberField('yM', 'Cách mép cao')}
        <p className="col-span-2 -mt-2 text-meta text-fg-3">Đo tới góc trên bên trái của vật cản, như trên hình.</p>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        {numberField('widthM', 'Bề ngang')}
        {numberField('lengthM', 'Bề dọc')}
        {/* "Tuỳ chọn" thay "Không bắt buộc": cột hẹp, câu dài bị bẻ hai dòng. */}
        {numberField('heightM', 'Chiều cao', 'Tuỳ chọn')}
      </div>
    </fieldset>
  )
}
