import type { QuotationView } from '@/types/res/quotationsRes'

// Luật báo giá lắp đặt bám QuotationHandlers.AttachDocumentAsync của backend. Không import giá trị qua "@/" để chạy được
// bằng node --test

/** Gắn PDF báo giá: bản nháp thay tệp được; bản đã gửi khách chỉ gắn được khi chưa có tệp */
export function canAttachQuotationDocument(q: Pick<QuotationView, 'status' | 'documentFileId'>) {
  return q.status === 'DRAFT' || (q.status === 'ISSUED' && q.documentFileId === null)
}
