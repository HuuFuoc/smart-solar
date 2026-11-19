import { CONTRACT_DOCUMENT_LINKS } from '@/common/contract'
import { DocumentPreviewButtons } from '@/components/common/ui/document-preview'
import { contractErrorMessage } from '@/features/contracts/contractDisplay'
import type { DocumentDisposition } from '@/services/contractService'
import type { ContractDocumentUrlView } from '@/types/res/customerContractsRes'

// Xem (trong hộp thoại) / tải một tài liệu hợp đồng (PDF chính thức, bản khách đã ký) bằng link ký sẵn xin đúng lúc bấm. Link hết
// hạn sau vài phút nên không giữ lại, không đưa vào cache hay log, và không bao giờ tự ghép từ mã tệp

type Props = {
  /** Tên tài liệu cho nhãn đọc bằng trình đọc màn hình, vd. "PDF chính thức" */
  name: string
  request: (disposition: DocumentDisposition) => Promise<ContractDocumentUrlView>
}

export const ContractDocumentButtons = (props: Props) =>
  CONTRACT_DOCUMENT_LINKS ? <DocumentButtons {...props} /> : null

function DocumentButtons({ name, request }: Props) {
  return <DocumentPreviewButtons name={name} request={request} errorText={contractErrorMessage} />
}
