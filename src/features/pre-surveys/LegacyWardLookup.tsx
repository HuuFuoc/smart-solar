import { useId, useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { Field, SearchInput, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { LEGACY_LOOKUP_LIMITS, LEGACY_MERGE_TYPES } from '@/common/administrativeUnit'
import {
  legacyGroups,
  legacyQueryProblem,
  legacySearchKey,
  verifiedChoice,
  type LegacyChoice,
} from '@/features/pre-surveys/legacyLookup'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useHcmCommunesQuery, useLegacyLookupQuery } from '@/hooks/useCommunes'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import { rateLimitedMessage } from '@/services/api/errors'

// "Chỉ biết địa chỉ cũ": tra tên phường, xã hoặc quận, huyện trước 01/07/2025 ra phường, xã hiện tại của TP.HCM.
// Không bao giờ chọn hộ, kể cả khi chỉ có một kết quả: người dùng bấm "Chọn" ở đúng phường mới. Mã đổ vào form là mã mới
// đã đối chiếu với danh mục phường, xã đang hiệu lực. Chờ ngừng gõ 400 ms mới gọi (giới hạn đọc danh mục 60 lần / phút)

export type WardPick = { ward: string; communeCode: string }

export function LegacyWardLookup({
  onPick,
  returnFocusTo,
  disabled,
}: {
  onPick: (pick: WardPick) => void
  /** Id ô phường, xã: chọn xong thì đưa focus về đó */
  returnFocusTo: string
  disabled?: boolean
}) {
  const panelId = useId()
  const inputId = `${panelId}-q`
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)
  const debounced = useDebouncedValue(q, 400)
  const communes = useHcmCommunesQuery()

  function close() {
    setOpen(false)
    setQ('')
    setPickError(null)
  }

  function choose(choice: LegacyChoice, from: string) {
    const verified = verifiedChoice(choice, communes.data)
    if (!verified)
      return setPickError(
        communes.isError
          ? 'Chưa tải được danh sách phường, xã hiện tại nên chưa chọn được. Thử lại danh sách ở ô phường, xã.'
          : `${choice.name} không có trong danh sách phường, xã hiện tại.`,
      )
    onPick(verified)
    setPicked(`Đã chọn ${verified.ward} theo địa chỉ cũ ${from}.`)
    close()
    // Chờ panel đóng rồi mới đưa focus về ô phường, xã
    window.setTimeout(() => document.getElementById(returnFocusTo)?.focus(), 0)
  }

  if (!open)
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          variant="ghost"
          size="sm"
          icon="manage_search"
          disabled={disabled}
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => {
            setOpen(true)
            setPicked(null)
            window.setTimeout(() => document.getElementById(inputId)?.focus(), 0)
          }}
        >
          Chỉ biết địa chỉ cũ?
        </Button>
        {picked && (
          <p role="status" className="text-meta text-fg-2">
            {picked}
          </p>
        )}
      </div>
    )

  return (
    <div id={panelId} className="space-y-3 rounded-container bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body font-semibold text-fg">Tra theo địa chỉ cũ</p>
        <Button variant="ghost" size="sm" icon="close" bleed={false} onClick={close}>
          Đóng
        </Button>
      </div>
      <Field
        label="Tên phường, xã hoặc quận, huyện cũ"
        htmlFor={inputId}
        hint="Gõ một trong hai, không cần dấu. Ví dụ: Phường 9 hoặc Gò Vấp."
      >
        <SearchInput
          id={inputId}
          value={q}
          maxLength={LEGACY_LOOKUP_LIMITS.queryMax}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value)
            setPickError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close()
            }
          }}
          aria-describedby={fieldMessageId(inputId)}
        />
      </Field>
      {pickError && (
        <p role="alert" className="text-meta text-danger">
          {pickError}
        </p>
      )}
      <LegacyResults q={q} debounced={debounced} onChoose={choose} />
    </div>
  )
}

function LegacyResults({
  q,
  debounced,
  onChoose,
}: {
  q: string
  debounced: string
  onChoose: (choice: LegacyChoice, from: string) => void
}) {
  const lookup = useLegacyLookupQuery(debounced)
  // Còn đang gõ: kết quả trên màn hình là của từ khoá cũ, không cho chọn
  const typing = legacySearchKey(q) !== legacySearchKey(debounced)
  const problem = legacyQueryProblem(q)

  let status: string | null = null
  if (problem) status = q.trim() ? problem : null
  else if (typing || lookup.isPending) status = 'Đang tìm…'

  if (status !== null || problem || (!lookup.data && !lookup.isError))
    return (
      <p role="status" aria-live="polite" className="text-meta text-fg-2">
        {status}
      </p>
    )

  if (lookup.isError || !lookup.data)
    return (
      <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-danger">
        {rateLimitedMessage(lookup.error)}
        <Button size="sm" variant="secondary" icon="refresh" onClick={() => void lookup.refetch()}>
          Thử lại
        </Button>
      </div>
    )

  const groups = legacyGroups(lookup.data, HCM_PROVINCE.code)
  if (groups.length === 0)
    return (
      <p role="status" aria-live="polite" className="text-meta text-fg-2">
        Không tìm thấy phường, xã hay quận, huyện cũ nào khớp. Kiểm tra lại tên hoặc chọn thẳng ở ô phường, xã.
      </p>
    )

  return (
    <div className="space-y-3">
      <p role="status" aria-live="polite" className="text-meta text-fg-2">
        {groups.length} địa chỉ cũ khớp. Chọn đúng phường, xã hiện tại của công trình.
      </p>
      {lookup.data.truncated && (
        <Notice tone="warn">
          Có hơn {LEGACY_LOOKUP_LIMITS.matchesMax} kết quả, chỉ hiện {LEGACY_LOOKUP_LIMITS.matchesMax}. Gõ cụ thể hơn để
          tìm đúng địa chỉ.
        </Notice>
      )}
      <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => (
          <li key={g.key} className="rounded-control border border-line bg-canvas p-3">
            <p className="text-body font-medium text-fg">{g.title}</p>
            {g.province && <p className="text-meta text-fg-2">Trước thuộc {g.province}</p>}
            <ul className="mt-2 divide-y divide-line">
              {g.choices.map((c) => (
                <li key={c.code} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
                  <div className="min-w-0">
                    <p className="text-body text-fg">{c.name}</p>
                    {c.fromLegacy.length > 0 && <p className="text-meta text-fg-2">Gồm {c.fromLegacy.join(', ')} cũ</p>}
                    {c.partial && <p className="text-meta text-warn">{LEGACY_MERGE_TYPES.PARTIAL!.hint}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="soft"
                    icon="check"
                    aria-label={`Chọn ${c.name} (địa chỉ cũ ${g.title})`}
                    onClick={() => onChoose(c, g.title)}
                  >
                    Chọn
                  </Button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
