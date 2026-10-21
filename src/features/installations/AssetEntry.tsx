import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ASSET_TYPES } from '@/common/installation'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { Input, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  ASSET_LIMITS,
  hasErrors,
  newAssetRow,
  toAssetRequests,
  validateAssetRows,
  type AssetField,
  type AssetRow,
  type AssetRowErrors,
} from '@/features/installations/assetForm'
import { useRegisterAssetsMutation } from '@/hooks/useTechnicianInstallations'
import { errorMessage } from '@/services/api/errors'
import type { AssetView } from '@/types/res/customerInstallationsRes'
import { cx } from '@/utils/cx'

// Từ xl mỗi thiết bị là một hàng thẳng cột với dòng tiêu đề; màn hẹp hơn thì mỗi thiết bị một khối có nhãn
const COLUMNS = 'xl:grid-cols-[2rem_9rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_7rem_7rem_2.5rem]'
const HEADERS = ['', 'Loại', 'Hãng', 'Model', 'Số serial', 'Vị trí', 'Bảo hành (tháng)', '']

const fieldId = (row: AssetRow, field: AssetField) => `asset-${row.key}-${field}`

function Cell({
  row,
  field,
  label,
  error,
  className,
  children,
}: {
  row: AssetRow
  field: AssetField
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={fieldId(row, field)} className="text-meta text-fg-2 xl:sr-only">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${fieldId(row, field)}-error`} className="text-meta text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Ghi thiết bị đã lắp, nhiều dòng một lần. Thiết bị đã lưu không sửa hay xoá được nên báo lỗi trước khi gửi
export function AssetEntry({
  projectId,
  saved,
  onClose,
}: {
  projectId: string
  saved: AssetView[]
  onClose: () => void
}) {
  const register = useRegisterAssetsMutation()
  const [rows, setRows] = useState<AssetRow[]>(() => [newAssetRow()])
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const focusKey = useRef<number | null>(null)
  const errors: AssetRowErrors[] = checked ? validateAssetRows(rows, saved) : rows.map(() => ({}))

  // Dòng vừa thêm đã chép loại / hãng / model, nên đưa con trỏ vào ô serial
  useEffect(() => {
    if (focusKey.current === null) return
    document.getElementById(`asset-${focusKey.current}-serialNumber`)?.focus()
    focusKey.current = null
  }, [rows])

  const update = (key: number, field: AssetField, value: string) => {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
    setError(null)
  }

  const addRow = () => {
    const row = newAssetRow(rows.at(-1))
    focusKey.current = row.key
    setRows((current) => [...current, row])
  }

  const removeRow = (key: number) => setRows((current) => current.filter((r) => r.key !== key))

  async function submit() {
    if (register.isPending) return
    setChecked(true)
    const found = validateAssetRows(rows, saved)
    if (hasErrors(found)) {
      const i = found.findIndex((e) => Object.keys(e).length > 0)
      const field = Object.keys(found[i]!)[0] as AssetField
      document.getElementById(fieldId(rows[i]!, field))?.focus()
      return
    }
    try {
      await register.mutateAsync({ id: projectId, assets: toAssetRequests(rows) })
      toast.success(`Đã lưu ${rows.length} thiết bị.`)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const invalid = (row: AssetRow, field: AssetField, i: number) => {
    const message = errors[i]?.[field]
    return message
      ? { 'aria-invalid': true as const, 'aria-describedby': `${fieldId(row, field)}-error` }
      : { 'aria-invalid': undefined }
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Notice tone="warn">
        Thiết bị đã lưu không sửa hay xoá được trên hệ thống. Kiểm tra số serial trước khi lưu.
      </Notice>
      <div aria-hidden className={cx('hidden gap-x-3 border-b border-line pb-2 text-meta text-fg-2 xl:grid', COLUMNS)}>
        {HEADERS.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      <ol className="space-y-4 xl:space-y-3">
        {rows.map((row, i) => (
          <li
            key={row.key}
            aria-label={`Thiết bị ${i + 1}`}
            className={cx(
              'grid grid-cols-2 gap-x-3 gap-y-3 max-xl:rounded-container max-xl:border max-xl:border-line max-xl:p-4 xl:items-start',
              COLUMNS,
            )}
          >
            <span className="tnum col-span-2 text-body font-semibold xl:col-span-1 xl:pt-2.5 xl:font-normal xl:text-fg-2">
              <span className="xl:hidden">Thiết bị </span>
              {i + 1}
            </span>
            <Cell row={row} field="assetType" label="Loại" error={errors[i]?.assetType}>
              <Select
                id={fieldId(row, 'assetType')}
                value={row.assetType}
                onChange={(e) => update(row.key, 'assetType', e.target.value)}
                {...invalid(row, 'assetType', i)}
              >
                {Object.entries(ASSET_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Cell>
            <Cell row={row} field="manufacturer" label="Hãng" error={errors[i]?.manufacturer}>
              <Input
                id={fieldId(row, 'manufacturer')}
                value={row.manufacturer}
                maxLength={ASSET_LIMITS.text}
                autoComplete="off"
                aria-required
                onChange={(e) => update(row.key, 'manufacturer', e.target.value)}
                {...invalid(row, 'manufacturer', i)}
              />
            </Cell>
            <Cell row={row} field="model" label="Model" error={errors[i]?.model}>
              <Input
                id={fieldId(row, 'model')}
                value={row.model}
                maxLength={ASSET_LIMITS.text}
                autoComplete="off"
                aria-required
                onChange={(e) => update(row.key, 'model', e.target.value)}
                {...invalid(row, 'model', i)}
              />
            </Cell>
            <Cell
              row={row}
              field="serialNumber"
              label="Số serial"
              error={errors[i]?.serialNumber}
              className="col-span-2 xl:col-span-1"
            >
              <Input
                id={fieldId(row, 'serialNumber')}
                value={row.serialNumber}
                maxLength={ASSET_LIMITS.text}
                autoComplete="off"
                spellCheck={false}
                aria-required
                className="tnum"
                onChange={(e) => update(row.key, 'serialNumber', e.target.value)}
                {...invalid(row, 'serialNumber', i)}
              />
            </Cell>
            <Cell row={row} field="positionCode" label="Vị trí (không bắt buộc)" error={errors[i]?.positionCode}>
              <Input
                id={fieldId(row, 'positionCode')}
                value={row.positionCode}
                maxLength={ASSET_LIMITS.position}
                autoComplete="off"
                placeholder="R1-C1"
                onChange={(e) => update(row.key, 'positionCode', e.target.value)}
                {...invalid(row, 'positionCode', i)}
              />
            </Cell>
            <Cell
              row={row}
              field="warrantyMonths"
              label="Bảo hành, tháng (không bắt buộc)"
              error={errors[i]?.warrantyMonths}
            >
              <Input
                id={fieldId(row, 'warrantyMonths')}
                value={row.warrantyMonths}
                inputMode="numeric"
                autoComplete="off"
                className="tnum"
                onChange={(e) => update(row.key, 'warrantyMonths', e.target.value)}
                {...invalid(row, 'warrantyMonths', i)}
              />
            </Cell>
            <div className="col-span-2 flex justify-end xl:col-span-1 xl:pt-0.5">
              {rows.length > 1 && (
                <IconButton
                  icon="delete"
                  label={`Bỏ thiết bị ${i + 1}`}
                  tooltip="Bỏ dòng"
                  variant="danger-quiet"
                  onClick={() => removeRow(row.key)}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" icon="add" disabled={rows.length >= ASSET_LIMITS.perRequest} onClick={addRow}>
          Thêm dòng
        </Button>
        <span className="ml-auto flex flex-wrap items-center gap-3">
          <Button size="sm" variant="ghost" bleed={false} disabled={register.isPending} onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" variant="soft" disabled={register.isPending}>
            {register.isPending ? 'Đang lưu…' : `Lưu ${rows.length} thiết bị`}
          </Button>
        </span>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
          <Icon name="error" className="shrink-0 text-[20px]" />
          {error}
        </p>
      )}
    </form>
  )
}
