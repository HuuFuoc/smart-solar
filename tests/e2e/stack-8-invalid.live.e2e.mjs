// Giai đoạn 8 trên backend thật (xem stack-harness.mjs): ca KHÔNG HỢP LỆ cho các lệnh ghi mà giai đoạn 1–7 mới đi đường đúng.
// Gọi API thật bằng đúng vai trò, trên dữ liệu đã tạo ở các giai đoạn trước (hợp đồng đã thanh toán, tài liệu đã công bố…), và
// khẳng định backend từ chối (4xx, không phải 5xx) mà không đổi trạng thái. Đây là kiểm luật của backend qua API, KHÔNG phải thao tác
// giao diện; phần FE chặn trước khi gửi nằm ở test mock (tests/e2e/*.e2e.mjs) và unit test luật (tests/*.test.mjs).
// Mỗi lời gọi được ghi vào file bằng chứng của giai đoạn với `via: 'api'`.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'

const { skip, state, evidence } = await setupStack('8-invalid')
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')

/** Gọi lệnh sai, ghi bằng chứng, khẳng định bị từ chối có kiểm soát */
async function reject(id, role, method, path, body, label) {
  const r = await S.call(role, method, path, body)
  evidence.push({
    at: new Date().toISOString(),
    actor: role,
    id,
    via: 'api',
    case: label,
    method,
    path: `/api${path}`.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{id}'),
    status: r.status,
    traceId: r.traceId ?? null,
    code: r.error?.code ?? null,
  })
  assert.ok(r.status >= 400 && r.status < 500, `${id} ${label}: ${r.status} ${r.error?.code ?? ''}`)
  return r
}

/** Ghi lại kết quả của một lời gọi lẽ ra bị từ chối nhưng backend cho qua (phát hiện, báo cáo riêng); không khẳng định */
async function observe(id, role, method, path, body, label) {
  const r = await S.call(role, method, path, body)
  evidence.push({
    at: new Date().toISOString(),
    actor: role,
    id,
    via: 'api',
    case: `${label} (phát hiện: backend cho qua)`,
    method,
    path: `/api${path}`.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{id}'),
    status: r.status,
    traceId: r.traceId ?? null,
    code: r.error?.code ?? null,
  })
  state.findings = { ...state.findings, [`${id} ${label}`]: r.status }
  return r
}

describe('8. Ca không hợp lệ của lệnh ghi (API thật)', { skip }, () => {
  test('quản trị: thời hạn bảo hành, khu vực, ảnh sản phẩm', async () => {
    await reject(
      'A02',
      'ADMIN',
      'PUT',
      '/admin/after-sales/warranty-options',
      { kind: 'INSTALLATION', months: 0, isActive: true, isDefault: false },
      '0 tháng',
    )
    const zone = await S.must('ADMIN', 'GET', `/admin/operational-zones/${state.zoneId}`)
    await reject(
      'A06',
      'ADMIN',
      'POST',
      '/admin/operational-zones',
      { code: zone.zone.code, name: 'Trùng mã', isActive: true, isServiceable: true, responsibleManagerUserId: null },
      'trùng mã khu',
    )
    await reject(
      'A08',
      'ADMIN',
      'PUT',
      `/admin/operational-zones/${state.zoneId}`,
      {
        name: 'Đổi tên với revision cũ',
        isActive: null,
        isServiceable: null,
        responsibleManagerUserId: null,
        revision: zone.zone.revision - 1,
      },
      'revision cũ',
    )
    await reject(
      'A09',
      'ADMIN',
      'PUT',
      `/admin/operational-zones/${state.zoneId}/communes`,
      { communeCodes: zone.communes.map((c) => c.code), reason: 'revision cũ', revision: zone.zone.revision - 1 },
      'revision cũ',
    )
    await reject(
      'A09',
      'ADMIN',
      'PUT',
      `/admin/operational-zones/${state.zoneId}/communes`,
      {
        communeCodes: zone.communes.map((c) => c.code).filter((c) => c !== state.legacyCommuneCode),
        reason: 'gỡ phường còn lịch',
        revision: zone.zone.revision,
      },
      'gỡ phường còn lịch hẹn',
    )
    const unknown = '00000000-0000-0000-0000-000000000001'
    await reject(
      'A27',
      'ADMIN',
      'POST',
      `/admin/products/${state.productId}/images`,
      { url: 'không-phải-url', altText: null, makePrimary: false },
      'URL ảnh không hợp lệ',
    )
    await reject(
      'A28',
      'ADMIN',
      'DELETE',
      `/admin/products/${state.productId}/images/${unknown}`,
      undefined,
      'ảnh không tồn tại',
    )
    await reject(
      'A29',
      'ADMIN',
      'PUT',
      `/admin/products/${state.productId}/images/order`,
      { imageIds: [unknown] },
      'thứ tự có ảnh lạ',
    )
    await reject(
      'A30',
      'ADMIN',
      'PUT',
      `/admin/products/${state.productId}/images/${unknown}/primary`,
      undefined,
      'ảnh không tồn tại',
    )
    await reject('A26', 'SALES', 'GET', `/admin/products/${state.productId}`, undefined, 'sai vai trò')
  })

  test('kho tri thức + cấu hình RAG: tài liệu chưa nạp xong, đã lưu trữ, revision cũ, job đã xong, cấu hình không có', async () => {
    const doc = await S.must('ADMIN', 'GET', `/admin/knowledge-documents/${state.kbDocId}`)
    await reject(
      'A15',
      'ADMIN',
      'PUT',
      `/admin/knowledge-documents/${state.kbDocId}`,
      { revision: doc.revision - 1, title: 'Revision cũ', category: doc.category, tags: doc.tags },
      'revision cũ',
    )
    const done = doc.jobs.find((j) => j.status === 'COMPLETED')
    assert.ok(done, 'tài liệu đã công bố phải có job COMPLETED')
    await reject(
      'A20',
      'ADMIN',
      'POST',
      `/admin/knowledge-documents/${state.kbDocId}/jobs/${done.jobId}/retry`,
      undefined,
      'chạy lại job đã xong',
    )
    await reject('A14', 'CUSTOMER', 'GET', `/admin/knowledge-documents/${state.kbDocId}`, undefined, 'sai vai trò')
    await reject('A25', 'SALES', 'POST', '/admin/rag-configuration/reindex-stale', undefined, 'sai vai trò')
    // Tài liệu mới: chưa nạp xong thì không công bố được; lưu trữ rồi thì không thêm phiên bản / nạp lại / công bố
    const fileId = await S.uploadFile(
      'ADMIN',
      'KNOWLEDGE_DOCUMENT',
      'ca-sai.txt',
      'text/plain',
      Buffer.from(`Tai lieu ca sai ${tag}.\n`),
    )
    const fresh = await S.must('ADMIN', 'POST', '/admin/knowledge-documents', {
      fileId,
      title: `Ca sai ${tag}`,
      category: 'OTHER',
      tags: [],
    })
    const created = await S.must('ADMIN', 'GET', `/admin/knowledge-documents/${fresh.documentId}`)
    await reject(
      'A17',
      'ADMIN',
      'POST',
      `/admin/knowledge-documents/${fresh.documentId}/publish`,
      { versionId: created.latestVersionId, revision: created.revision },
      'công bố khi chưa nạp xong',
    )
    await reject(
      'A18',
      'ADMIN',
      'POST',
      `/admin/knowledge-documents/${fresh.documentId}/unpublish`,
      { revision: created.revision },
      'gỡ khi chưa công bố',
    )
    await reject(
      'A21',
      'ADMIN',
      'POST',
      `/admin/knowledge-documents/${fresh.documentId}/archive`,
      { revision: created.revision + 5 },
      'revision không khớp',
    )
    await S.must('ADMIN', 'POST', `/admin/knowledge-documents/${fresh.documentId}/archive`, {
      revision: created.revision,
    })
    const more = await S.uploadFile(
      'ADMIN',
      'KNOWLEDGE_DOCUMENT',
      'ca-sai-2.txt',
      'text/plain',
      Buffer.from(`Phien ban 2 ${tag}.\n`),
    )
    await reject(
      'A16',
      'ADMIN',
      'POST',
      `/admin/knowledge-documents/${fresh.documentId}/versions`,
      { fileId: more },
      'thêm phiên bản cho tài liệu đã lưu trữ',
    )
    await reject(
      'A19',
      'ADMIN',
      'POST',
      `/admin/knowledge-documents/${fresh.documentId}/reindex`,
      { versionId: created.latestVersionId },
      'nạp lại tài liệu đã lưu trữ',
    )
    await reject(
      'A13',
      'ADMIN',
      'POST',
      '/admin/knowledge-documents',
      { fileId, title: `Dùng lại tệp ${tag}`, category: 'OTHER', tags: [] },
      'đăng ký lại tệp đã dùng',
    )
    await reject(
      'A23',
      'ADMIN',
      'POST',
      '/admin/rag-configuration/rollback',
      { version: 9999 },
      'phiên bản cấu hình không có',
    )
    await reject('A24', 'ADMIN', 'DELETE', '/admin/rag-configuration/draft', undefined, 'bỏ nháp khi không có nháp')
    await reject(
      'A22',
      'ADMIN',
      'POST',
      '/admin/rag-configuration/draft/validate',
      undefined,
      'kiểm tra khi không có nháp',
    )
    await reject('A12', 'CUSTOMER', 'GET', '/admin/knowledge-documents', undefined, 'sai vai trò')
    await reject(
      'G01',
      'CUSTOMER',
      'POST',
      '/chat/messages',
      { sessionId: null, message: '   ', clientMessageId: null },
      'câu hỏi trống',
    )
  })

  test('hợp đồng đã thanh toán: không sửa, phát hành, gắn PDF, gửi ký, duyệt, lập phụ lục, gửi bản ký hay tạo link nữa', async () => {
    const c = await S.must('SALES', 'GET', `/contracts/${state.contractId}`)
    assert.equal(c.status, 'PAID')
    await reject(
      'S01',
      'SALES',
      'POST',
      `/quotations/${state.quotationId}/contracts`,
      { terms: null, warrantyMonths: 60 },
      'báo giá đã có hợp đồng',
    )
    await reject(
      'S04',
      'SALES',
      'PUT',
      `/contracts/${state.contractId}`,
      { revision: c.revision, terms: 'Sửa sau khi trả tiền', warrantyMonths: null },
      'sửa hợp đồng PAID',
    )
    await reject(
      'S05',
      'SALES',
      'POST',
      `/contracts/${state.contractId}/issue`,
      { revision: c.revision },
      'phát hành hợp đồng PAID',
    )
    const pdf = await S.uploadFile(
      'SALES',
      'CONTRACT_DOCUMENT',
      'ca-sai.pdf',
      'application/pdf',
      S.tinyPdf(`Ca sai ${tag}`),
    )
    await reject(
      'S06',
      'SALES',
      'PUT',
      `/contracts/${state.contractId}/official-document`,
      { revision: c.revision, fileId: pdf, canonicalHash: c.canonicalHash },
      'gắn PDF cho hợp đồng PAID',
    )
    await reject(
      'S07',
      'SALES',
      'POST',
      `/contracts/${state.contractId}/publish`,
      { revision: c.revision },
      'gửi ký hợp đồng PAID',
    )
    await reject(
      'S08',
      'MANAGER',
      'POST',
      `/contracts/${state.contractId}/review`,
      { revision: c.revision, decision: 'APPROVE', reason: null },
      'duyệt khi không có bản ký chờ',
    )
    await reject(
      'S08',
      'SALES2',
      'POST',
      `/contracts/${state.supersededContractId}/review`,
      { revision: 0, decision: 'APPROVE', reason: null },
      'kinh doanh không phụ trách',
    )
    await reject(
      'S09',
      'SALES',
      'POST',
      `/contracts/${state.contractId}/amendments`,
      { terms: 'Phụ lục sau khi trả tiền', warrantyMonths: null },
      'phụ lục hợp đồng PAID',
    )
    // GetForStaffAsync(contractId) không nhận người gọi: mọi kinh doanh đọc được thanh toán của mọi hợp đồng (GET /contracts/{id} thì có kiểm)
    await observe(
      'S10',
      'SALES2',
      'GET',
      `/contracts/${state.contractId}/payments`,
      undefined,
      'kinh doanh không phụ trách',
    )
    await reject('S10', 'CUSTOMER', 'GET', `/contracts/${state.contractId}/payments`, undefined, 'sai vai trò')
    await reject(
      'S02',
      'SALES2',
      'GET',
      `/survey-requests/${state.surveyRequestId}/contracts`,
      undefined,
      'kinh doanh không phụ trách',
    )
    await reject('S03', 'SALES2', 'GET', `/contracts/${state.contractId}`, undefined, 'kinh doanh không phụ trách')
    const doc = await S.uploadFile(
      'SALES',
      'QUOTATION_DOCUMENT',
      'bao-gia-2.pdf',
      'application/pdf',
      S.tinyPdf(`Bao gia lan 2 ${tag}`),
    )
    await reject(
      'S11',
      'SALES',
      'PUT',
      `/quotations/${state.quotationId}/document`,
      { fileId: doc },
      'thay PDF của báo giá đã đồng ý',
    )
    const signed = await S.uploadFile(
      'CUSTOMER',
      'SIGNED_CONTRACT',
      'ky-lai.pdf',
      'application/pdf',
      S.tinyPdf(`Ky lai ${tag}`),
    )
    await reject(
      'C02',
      'CUSTOMER',
      'POST',
      `/customers/me/contracts/${state.contractId}/signed-document`,
      { fileId: signed, officialDocumentSha256: c.officialDocument.sha256 },
      'gửi bản ký cho hợp đồng PAID',
    )
    await reject(
      'C03',
      'CUSTOMER',
      'POST',
      `/customers/me/contracts/${state.contractId}/payments`,
      undefined,
      'tạo link cho hợp đồng PAID',
    )
    await reject(
      'C05',
      'CUSTOMER',
      'POST',
      `/customers/me/contracts/${state.contractId}/payments/cancel`,
      undefined,
      'huỷ link khi không có link chờ',
    )
    await reject('C01', 'CUSTOMER2', 'GET', `/customers/me/contracts/${state.contractId}`, undefined, 'khách khác')
    await reject(
      'C04',
      'CUSTOMER2',
      'GET',
      `/customers/me/contracts/${state.contractId}/payments`,
      undefined,
      'khách khác',
    )
    const after = await S.must('SALES', 'GET', `/contracts/${state.contractId}`)
    assert.deepEqual([after.status, after.revision], ['PAID', c.revision], 'các lệnh sai không đổi hợp đồng')
  })

  test('kỹ thuật viên + đọc chung: bổ sung biên bản thiếu lý do, lịch không còn chờ nhận, phiên trò chuyện của người khác', async () => {
    await reject(
      'T02',
      'TECH',
      'POST',
      `/technicians/me/appointments/${state.appointmentId}/onsite-survey/amendments`,
      { revision: 2, reason: '  ', changes: null, additionalFileIds: [] },
      'thiếu lý do',
    )
    await reject(
      'T01',
      'TECH2',
      'GET',
      `/technicians/me/open-appointments/${state.appointmentId}`,
      undefined,
      'lịch đã có người nhận',
    )
    await reject('G03', 'CUSTOMER2', 'GET', `/chat/sessions/${state.chatSession}`, undefined, 'phiên của người khác')
    await reject(
      'G05',
      null,
      'GET',
      '/administrative-units/legacy-lookup?q=a&provinceCode=79',
      undefined,
      'từ khoá 1 ký tự',
    )
    await reject('A04', 'MANAGER', 'GET', '/admin/after-sales/dashboard', undefined, 'sai vai trò')
    await reject('A11', 'SALES', 'GET', '/admin/operational-zones/coverage?provinceCode=79', undefined, 'sai vai trò')
    await reject(
      'A01',
      'SALES',
      'GET',
      '/admin/after-sales/warranty-options',
      undefined,
      'sai vai trò (kinh doanh có API riêng)',
    )
    await reject('A05', 'MANAGER', 'GET', '/admin/after-sales/dashboard/export', undefined, 'sai vai trò')
    await reject('A07', 'SALES', 'GET', `/admin/operational-zones/${state.zoneId}`, undefined, 'sai vai trò')
    await reject('A10', 'TECH', 'GET', `/admin/operational-zones/${state.zoneId}/technicians`, undefined, 'sai vai trò')
    await reject('M07', 'SALES', 'GET', '/manager/after-sales/tasks', undefined, 'sai vai trò')
    await reject('M09', 'CUSTOMER', 'GET', '/manager/after-sales/refunds', undefined, 'sai vai trò')
  })

  test('khách báo lỗi từ một yêu cầu không phải bảo trì đã làm xong (C09)', async () => {
    // Yêu cầu hỗ trợ thiên tai là FAULT, không phải lần bảo trì có phát hiện
    await reject(
      'C09',
      'CUSTOMER',
      'POST',
      `/customers/me/after-sales/requests/${state.claimRequestId}/report-fault`,
      { description: 'Thử báo lỗi từ yêu cầu báo lỗi', evidenceFileIds: [] },
      'yêu cầu không phải bảo trì đã làm',
    )
    await reject(
      'C09',
      'CUSTOMER2',
      'POST',
      `/customers/me/after-sales/requests/${state.claimRequestId}/report-fault`,
      { description: null, evidenceFileIds: [] },
      'yêu cầu của khách khác',
    )
  })
})
