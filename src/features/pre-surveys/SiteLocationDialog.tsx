import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { LegacyWardLookup } from '@/features/pre-surveys/LegacyWardLookup'
import { coverageText } from '@/features/scheduling/schedulingDisplay'
import { useHcmCommunesQuery } from '@/hooks/useCommunes'
import { useSetSiteLocationMutation } from '@/hooks/usePreSurveys'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import { errorMessage, isApiError } from '@/services/api/errors'

// Bổ sung phường, xã cho địa điểm cũ chưa có mã (khai trước khi có danh mục hành chính 2 cấp), ngay trên địa điểm đó: không
// tạo địa điểm mới. Tỉnh cố định TP.HCM. Xong thì giờ trống khảo sát tải lại theo khu vực phục vụ của phường, xã vừa chọn

export function SiteLocationDialog({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const communes = useHcmCommunesQuery()
  const save = useSetSiteLocationMutation()
  const names = useMemo(() => (communes.data ?? []).map((c) => c.name), [communes.data])
  const [ward, setWard] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const commune = communes.data?.find((c) => c.name === ward)

  async function submit() {
    if (!commune) return setFieldError('Chọn phường, xã trong danh sách.')
    setFieldError(null)
    setError(null)
    try {
      const location = await save.mutateAsync({ siteId, communeCode: commune.code })
      const coverage = location.coverageStatus === 'COVERED' ? null : coverageText(location.coverageStatus)
      toast.success(
        coverage
          ? `Đã bổ sung ${location.communeName ?? ward}. ${coverage}`
          : `Đã bổ sung ${location.communeName ?? ward}. Chọn giờ khảo sát bên dưới.`,
      )
      onClose()
    } catch (e) {
      if (isApiError(e) && e.code?.startsWith('ADMINISTRATIVE_LOCATION_')) setFieldError(errorMessage(e))
      else setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !save.isPending && onClose()}
      dismissible={!save.isPending}
      aria-label="Bổ sung phường, xã"
      className="max-w-lg"
    >
      <DialogTitle>Bổ sung phường, xã</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Địa điểm này khai trước khi TP.HCM bỏ cấp quận, huyện nên chưa có phường, xã. Chọn phường, xã hiện tại của công
        trình ({HCM_PROVINCE.name}) để Smart Solar biết khu vực nào phục vụ.
      </p>
      <Field
        label="Phường, xã"
        htmlFor="site-ward"
        required
        className="mt-4"
        error={fieldError ?? undefined}
        hint={communes.isPending ? 'Đang tải danh sách phường, xã…' : 'Gõ tên để tìm, không cần dấu.'}
      >
        <Combobox
          id="site-ward"
          value={ward}
          onChange={(next) => {
            setWard(next)
            setFieldError(null)
          }}
          options={names}
          listLabel="Phường, xã của TP.HCM"
          emptyText={communes.isPending ? 'Đang tải danh sách…' : 'Không có phường, xã nào khớp.'}
          invalid={Boolean(fieldError)}
          required
          describedBy={fieldMessageId('site-ward')}
        />
      </Field>
      <div className="mt-3">
        <LegacyWardLookup
          returnFocusTo="site-ward"
          disabled={save.isPending}
          onPick={(pick) => {
            setWard(pick.ward)
            setFieldError(null)
          }}
        />
      </div>
      {communes.isError && (
        <Notice tone="danger" className="mt-4">
          Không tải được danh sách phường, xã.{' '}
          <button type="button" className="tap ui-link font-medium" onClick={() => void communes.refetch()}>
            Thử lại
          </button>
        </Notice>
      )}
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={save.isPending} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="save" variant="primary" disabled={save.isPending || !ward} onClick={() => void submit()}>
          {save.isPending ? 'Đang lưu…' : 'Lưu phường, xã'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
