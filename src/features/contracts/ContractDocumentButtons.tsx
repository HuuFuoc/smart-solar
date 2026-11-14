import { useState } from 'react'
import { CONTRACT_DOCUMENT_LINKS } from '@/common/contract'
import { Button } from '@/components/common/ui/button'
import { contractErrorMessage } from '@/features/contracts/contractDisplay'
import type { DocumentDisposition } from '@/services/contractService'
import type { ContractDocumentUrlView } from '@/types/res/customerContractsRes'

// Xem / tải một tài liệu hợp đồng (PDF chính thức, bản khách đã ký) bằng link ký sẵn xin đúng lúc bấm. Link hết hạn sau vài
// phút nên không giữ lại, không đưa vào cache hay log, và không bao giờ tự ghép từ mã tệp

type Props = {
  /** Tên tài liệu cho nhãn đọc bằng trình đọc màn hình, vd. "PDF chính thức" */
  name: string
  request: (disposition: DocumentDisposition) => Promise<ContractDocumentUrlView>
}

export const ContractDocumentButtons = (props: Props) =>
  CONTRACT_DOCUMENT_LINKS ? <DocumentButtons {...props} /> : null

function DocumentButtons({ name, request }: Props) {
  const [busy, setBusy] = useState<DocumentDisposition | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function open(disposition: DocumentDisposition) {
    if (busy) return
    setBusy(disposition)
    setError(null)
    // Mở tab ngay trong lần bấm để trình chặn cửa sổ bật lên không chặn, rồi mới đổi địa chỉ khi có link
    const tab = disposition === 'inline' ? window.open('', '_blank') : null
    try {
      const link = await request(disposition)
      if (disposition === 'inline') {
        if (tab) {
          tab.opener = null
          tab.location.href = link.url
        } else window.open(link.url, '_blank', 'noopener')
      } else {
        const a = document.createElement('a')
        a.href = link.url
        a.rel = 'noopener'
        document.body.append(a)
        a.click()
        a.remove()
      }
    } catch (e) {
      tab?.close()
      setError(contractErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="info"
          icon="visibility"
          aria-label={`Xem ${name}`}
          disabled={busy !== null}
          onClick={() => void open('inline')}
        >
          {busy === 'inline' ? 'Đang mở…' : 'Xem'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon="download"
          aria-label={`Tải ${name}`}
          disabled={busy !== null}
          onClick={() => void open('attachment')}
        >
          {busy === 'attachment' ? 'Đang tải…' : 'Tải về'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
