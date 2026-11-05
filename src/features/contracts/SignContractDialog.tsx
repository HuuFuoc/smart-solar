import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice, Progress } from '@/components/common/ui/lists'
import { contractTitle } from '@/features/contracts/contractDisplay'
import { shortHash } from '@/features/contracts/contractRules'
import { customerContractError } from '@/features/contracts/customerContractDisplay'
import {
  REUPLOAD_ERROR_CODES,
  RESIGN_ERROR_CODES,
  sameHash,
  signedDocumentBody,
  signingSnapshot,
  snapshotStillCurrent,
} from '@/features/contracts/customerContractRules'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { useSubmitSignedDocumentMutation } from '@/hooks/useCustomerContracts'
import { useFileUpload } from '@/hooks/useFiles'
import { isApiError } from '@/services/api/errors'
import { sha256Hex } from '@/services/fileService'
import type { ContractView } from '@/types/res/customerContractsRes'

// Khách gửi bản hợp đồng đã ký tay (quét thành PDF, mục đích SIGNED_CONTRACT). SHA-256 của PDF chính thức được chụp lúc mở
// hộp thoại và gửi đúng mã đó: hợp đồng đổi phiên bản trong lúc khách ký thì backend từ chối, khách xem lại bản mới rồi ký
// lại. Không tự gửi lại với mã mới. Khách tự kiểm tệp PDF chính thức đang giữ bằng SHA-256 tính trên máy

const PURPOSE = 'SIGNED_CONTRACT'

type LocalCheck = { name: string; result: 'match' | 'mismatch' | 'unsupported' }

export function SignContractDialog({ contract, onClose }: { contract: ContractView; onClose: () => void }) {
  // Bản khách đang xác nhận, không đổi theo cache trong lúc hộp thoại mở
  const [snapshot] = useState(() => signingSnapshot(contract))
  const [chosen, setChosen] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  // Tệp đã tải và xác minh: gửi lỗi vì lý do khác thì lần sau chỉ gửi, không tải lại
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [check, setCheck] = useState<LocalCheck | null>(null)
  const [checking, setChecking] = useState(false)
  // Backend báo bản chính thức không còn khớp: phải đóng, xem bản mới rồi ký lại
  const [mustReopen, setMustReopen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const upload = useFileUpload(PURPOSE)
  const submit = useSubmitSignedDocumentMutation()
  const busy = upload.uploading || submit.isPending
  const uploadPercent = upload.progress === null ? null : Math.round(upload.progress * 100)
  // Hợp đồng vừa tải lại có PDF chính thức khác bản lúc mở
  const changed = snapshot !== null && !snapshotStillCurrent(snapshot, contract)
  const blocked = snapshot === null || changed || mustReopen

  function pick(files: File[]) {
    const file = files[0]!
    setChosen(file)
    setUploadedId(null)
    setFileError(fileProblem(file, PURPOSE))
    setError(null)
  }

  async function verifyLocal(files: File[]) {
    const file = files[0]!
    if (!snapshot) return
    setChecking(true)
    try {
      const hash = await sha256Hex(await file.arrayBuffer())
      const result = hash === null ? 'unsupported' : sameHash(hash, snapshot.officialSha256) ? 'match' : 'mismatch'
      setCheck({ name: file.name, result })
      if (result === 'match') setConfirmed(true)
    } finally {
      setChecking(false)
    }
  }

  async function send() {
    setError(null)
    if (!snapshot || blocked) return
    if (!chosen && !uploadedId) return setFileError('Chọn tệp PDF bản bạn đã ký.')
    if (fileError) return
    if (!confirmed) return setError('Xác nhận bạn đã ký đúng bản có mã nội dung này.')
    let fileId = uploadedId
    try {
      if (!fileId) {
        fileId = (await upload.upload(chosen!)).fileId
        setUploadedId(fileId)
      }
    } catch (e) {
      return setError(`Chưa tải được tệp lên: ${customerContractError(e)}`)
    }
    try {
      await submit.mutateAsync({ contractId: snapshot.contractId, body: signedDocumentBody(snapshot, fileId) })
      toast.success('Đã gửi bản ký. Smart Solar sẽ kiểm tra rồi báo kết quả ở trang này.')
      onClose()
    } catch (e) {
      const code = isApiError(e) ? e.code : null
      if (code && REUPLOAD_ERROR_CODES.includes(code)) {
        setUploadedId(null)
        setChosen(null)
      }
      if (code && RESIGN_ERROR_CODES.includes(code)) {
        setMustReopen(true)
        setConfirmed(false)
      }
      setError(customerContractError(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-2xl"
      aria-label="Gửi bản hợp đồng đã ký"
    >
      <DialogTitle>Gửi bản hợp đồng đã ký</DialogTitle>
      {snapshot === null ? (
        <Notice tone="warn" className="mt-4">
          Hợp đồng này không còn chờ bản ký. Đóng hộp thoại để xem trạng thái mới.
        </Notice>
      ) : (
        <>
          <p className="mt-2 text-body text-fg-2">
            In PDF chính thức của {contractTitle(snapshot)}, ký tay, quét lại thành một tệp PDF rồi gửi ở đây. Smart
            Solar kiểm tra bản ký trước khi mở thanh toán.
          </p>

          <div className="mt-4 space-y-5">
            {(changed || mustReopen) && (
              <div role="alert">
                <Notice tone="danger" title="Bản chính thức đã thay đổi hoặc không còn chờ ký">
                  Đóng hộp thoại, xem mã nội dung của bản hiện tại rồi ký lại đúng bản đó. Bản ký cũ không gửi được.
                </Notice>
              </div>
            )}

            <section className="space-y-2">
              <h3 className="text-body font-medium text-fg">Bản bạn ký</h3>
              <p className="text-body text-fg-2">Mã nội dung in trên PDF chính thức phải trùng với mã này:</p>
              <code className="block rounded-control bg-surface-2 px-3 py-2 font-mono text-meta break-all text-fg">
                {snapshot.canonicalHash ?? '—'}
              </code>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <FileButton
                  size="sm"
                  variant="info"
                  icon="fact_check"
                  accept={acceptFor(PURPOSE)}
                  disabled={busy || checking || blocked}
                  onFiles={(files) => void verifyLocal(files)}
                >
                  Kiểm tra tệp PDF chính thức
                </FileButton>
                <span className="text-meta text-fg-2">
                  {checking ? 'Đang kiểm tra…' : 'Tệp chỉ được đọc trên máy của bạn, không tải lên.'}
                </span>
              </div>
              {check && (
                <p
                  className={check.result === 'match' ? 'text-meta text-ok' : 'text-meta text-danger'}
                  role={check.result === 'match' ? 'status' : 'alert'}
                >
                  {check.result === 'match'
                    ? `${check.name} đúng là PDF chính thức của phiên bản này.`
                    : check.result === 'mismatch'
                      ? `${check.name} không phải PDF chính thức hiện tại. Liên hệ nhân viên kinh doanh để nhận đúng tệp.`
                      : 'Trình duyệt này không kiểm tra được tệp. Đối chiếu mã nội dung bằng mắt.'}
                </p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-body font-medium text-fg">
                Tệp PDF bản đã ký
                <span aria-hidden className="text-danger">
                  {' *'}
                </span>
              </h3>
              <p className="text-body text-fg-2">
                {chosen ? (
                  <>
                    Tải lên khi gửi: <span className="font-medium text-fg">{chosen.name}</span>
                    <span className="tnum">, {formatFileSize(chosen.size)}</span>.
                  </>
                ) : uploadedId ? (
                  'Đã tải lên, chưa gửi.'
                ) : (
                  'Chưa chọn tệp.'
                )}
              </p>
              <FileButton
                size="sm"
                icon="upload_file"
                accept={acceptFor(PURPOSE)}
                disabled={busy || blocked}
                onFiles={pick}
              >
                {chosen ? 'Chọn tệp khác' : 'Chọn tệp PDF'}
              </FileButton>
              {uploadPercent !== null && <Progress value={uploadPercent} label="Đang tải bản ký lên" />}
              {fileError ? (
                <p className="text-meta text-danger" role="alert">
                  {fileError}
                </p>
              ) : (
                <p className="text-meta text-fg-3">
                  {fileTypesText(PURPOSE)}, tối đa {maxSizeText(PURPOSE)}.
                </p>
              )}
            </section>

            <Checkbox
              checked={confirmed}
              disabled={busy || blocked}
              onChange={(e) => setConfirmed(e.target.checked)}
              label={`Tôi đã ký đúng PDF chính thức có mã nội dung ${shortHash(snapshot.canonicalHash)}`}
              description="Bản ký của PDF khác (phiên bản cũ, tệp đã sửa) sẽ bị từ chối."
            />
          </div>
        </>
      )}

      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        {snapshot && (
          <Button
            icon="send"
            variant="primary"
            disabled={busy || blocked || (!chosen && !uploadedId)}
            onClick={() => void send()}
          >
            {uploadPercent !== null ? `Đang tải ${uploadPercent}%` : submit.isPending ? 'Đang gửi…' : 'Gửi bản ký'}
          </Button>
        )}
      </DialogFooter>
    </ModalDialog>
  )
}
