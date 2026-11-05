// Giai đoạn 2 trên backend thật (xem stack-harness.mjs): kho tri thức → lượt nạp thật của dịch vụ RAG (provider dev: embedding
// "hashing", LLM "extractive" – không phải OpenAI) → công bố → trợ lý trả lời có nguồn → lịch sử phiên; cấu hình RAG.
// Lượt nạp FAILED cho A20 được tạo bằng cách tạm dừng container RAG (stack đặt Rag__MaxIngestAttempts=2).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { describe, test } from 'node:test'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'

const { skip, state, as, mark, until, expectCall, url } = await setupStack('2-knowledge')
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')
const TITLE = `Chính sách bảo hành ${tag}`
const KB_TEXT =
  'Chinh sach bao hanh Smart Solar.\n\nTam pin duoc bao hanh san pham 12 nam va bao hanh hieu suat 25 nam ke tu ngay ban giao.\n' +
  'Inverter duoc bao hanh 5 nam. Khach bao loi qua cong khach hang, ky thuat vien den kiem tra trong 3 ngay lam viec.\n'

/** Chờ phiên bản mới nhất nạp xong (đọc API thật) */
const kbReady = (documentId, ms = 120_000) =>
  until(
    async () => {
      const d = await S.must('ADMIN', 'GET', `/admin/knowledge-documents/${documentId}`)
      const v = d.versions?.find((x) => x.versionId === d.latestVersionId)
      return v &&
        ['READY_FOR_REVIEW', 'PUBLISHED', 'WITHDRAWN'].includes(v.status) &&
        !d.jobs.some((j) => ['PENDING', 'RUNNING', 'RETRY_WAITING'].includes(j.status))
        ? d
        : null
    },
    `tài liệu ${documentId} nạp xong`,
    ms,
    3000,
  )

describe('2. Kho tri thức, RAG, trợ lý', { skip }, () => {
  test('A13/A12/A14: tải lên + đăng ký tài liệu qua giao diện; lượt nạp thật hoàn tất', async () => {
    const page = await as('ADMIN', '/admin/knowledge-base')
    const t = mark()
    await page.getByRole('button', { name: 'Thêm tài liệu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Thêm tài liệu' })
    await dialog
      .locator('input[type=file]')
      .setInputFiles({ name: 'chinh-sach-bao-hanh.txt', mimeType: 'text/plain', buffer: Buffer.from(KB_TEXT) })
    await dialog.getByLabel('Tên tài liệu').fill(TITLE)
    await dialog.getByLabel('Danh mục').selectOption('WARRANTY')
    await dialog.getByLabel('Thẻ').fill('bảo hành, tấm pin')
    await dialog.getByRole('button', { name: 'Thêm tài liệu' }).click()
    await expectCall('A13', t, 201)
    await expectCall('A12', t)
    const list = await S.must('ADMIN', 'GET', '/admin/knowledge-documents')
    state.kbDocId = list.find((d) => d.title === TITLE).documentId
    state.kbTitle = TITLE
    await kbReady(state.kbDocId)
    await page.goto(url(`/admin/knowledge-base/${state.kbDocId}`), { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: TITLE }).waitFor()
    await expectCall('A14', t)
  })

  test('A17/A15: công bố bản đã nạp, sửa thông tin; đọc lại đúng', async () => {
    const page = await as('ADMIN', `/admin/knowledge-base/${state.kbDocId}`)
    let t = mark()
    await page.getByRole('button', { name: 'Công bố', exact: true }).first().click()
    await page.getByRole('dialog', { name: 'Xác nhận' }).getByRole('button', { name: 'Công bố' }).click()
    await expectCall('A17', t)
    t = mark()
    await page.getByRole('button', { name: 'Sửa thông tin' }).click()
    const edit = page.getByRole('dialog', { name: 'Sửa thông tin' })
    await edit.getByLabel('Thẻ').fill('bảo hành, tấm pin, inverter')
    await edit.getByRole('button', { name: 'Lưu' }).click()
    await expectCall('A15', t)
    const d = await S.must('ADMIN', 'GET', `/admin/knowledge-documents/${state.kbDocId}`)
    assert.equal(d.status, 'PUBLISHED')
    assert.ok(d.tags.includes('inverter'))
  })

  test('G02/G01/G03: khách hỏi trợ lý, câu trả lời có nguồn, mở lại đúng phiên sau tải lại; người khác không mở được', async () => {
    // Ngoài 76 và chưa có trên FE: deddde8 mặc định tài liệu INTERNAL (chỉ nhân viên truy hồi). Đặt CUSTOMER bằng API của backend
    const doc = await S.must('ADMIN', 'GET', `/admin/knowledge-documents/${state.kbDocId}`)
    await S.must('ADMIN', 'PUT', `/admin/knowledge-documents/${state.kbDocId}/audience`, {
      revision: doc.revision,
      audience: 'CUSTOMER',
      reason: 'Tài liệu chính sách cho khách (kiểm thử)',
    })
    const page = await as('CUSTOMER', '/customer/assistant')
    const t = mark()
    await expectCall('G02', t)
    await page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý' }).fill('Tam pin duoc bao hanh bao lau?')
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await expectCall('G01', t)
    await page.waitForURL(/phien=/)
    const thread = page.getByRole('list', { name: 'Nội dung cuộc trò chuyện' })
    await thread
      .getByText(/Chinh sach bao hanh Smart Solar/)
      .first()
      .waitFor()
    await page.getByText(TITLE).first().waitFor()
    state.chatSession = new URL(page.url()).searchParams.get('phien')
    const t2 = mark()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectCall('G03', t2)
    await thread
      .getByText(/Chinh sach bao hanh Smart Solar/)
      .first()
      .waitFor()
    const other = await S.call('CUSTOMER2', 'GET', `/chat/sessions/${state.chatSession}`)
    assert.equal(other.status, 404)
  })

  test('A18/A19/A16/A20/A21: gỡ công bố, nạp lại, thêm phiên bản khi dịch vụ nạp ngừng → FAILED → chạy lại, lưu trữ', async () => {
    const page = await as('ADMIN', `/admin/knowledge-base/${state.kbDocId}`)
    let t = mark()
    await page.getByRole('button', { name: 'Gỡ công bố' }).click()
    await page.getByRole('dialog', { name: 'Xác nhận' }).getByRole('button', { name: 'Gỡ công bố' }).click()
    await expectCall('A18', t)
    const ask = await S.call('CUSTOMER', 'POST', '/chat/messages', {
      sessionId: null,
      message: 'Inverter bao hanh bao lau?',
      clientMessageId: null,
    })
    state.answerWithoutPublished = ask.data?.answer?.status
    assert.equal(ask.data?.answer?.status, 'INSUFFICIENT_CONTEXT')

    await page.reload({ waitUntil: 'domcontentloaded' })
    t = mark()
    await page.getByRole('button', { name: 'Nạp lại' }).first().click()
    await expectCall('A19', t, 202)
    await kbReady(state.kbDocId)

    execFileSync('docker', ['stop', 'ss-audit-rag-service-1'])
    try {
      await page.reload({ waitUntil: 'domcontentloaded' })
      t = mark()
      await page.getByRole('button', { name: 'Thêm phiên bản' }).click()
      const add = page.getByRole('dialog', { name: 'Thêm phiên bản' })
      await add.locator('input[type=file]').setInputFiles({
        name: 'chinh-sach-bao-hanh-v2.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(KB_TEXT + 'Ban cap nhat: inverter duoc bao hanh 7 nam.\n'),
      })
      await add.getByRole('button', { name: 'Thêm phiên bản' }).click()
      await expectCall('A16', t, 201)
      await until(
        async () =>
          (await S.must('ADMIN', 'GET', `/admin/knowledge-documents/${state.kbDocId}`)).jobs.some(
            (j) => j.status === 'FAILED',
          ),
        'lượt nạp FAILED',
        180_000,
        3000,
      )
    } finally {
      execFileSync('docker', ['start', 'ss-audit-rag-service-1'])
    }
    await until(
      async () => (await fetch('http://127.0.0.1:58000/health/live').catch(() => null))?.ok,
      'RAG sống lại',
      60_000,
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    t = mark()
    await page.getByRole('button', { name: 'Chạy lại' }).first().click()
    await expectCall('A20', t, 202)
    await kbReady(state.kbDocId)
    await page.reload({ waitUntil: 'domcontentloaded' })
    t = mark()
    await page.getByRole('button', { name: 'Công bố', exact: true }).first().click()
    await page.getByRole('dialog', { name: 'Xác nhận' }).getByRole('button', { name: 'Công bố' }).click()
    await expectCall('A17', t)

    const fileId = await S.uploadFile(
      'ADMIN',
      'KNOWLEDGE_DOCUMENT',
      'tam.txt',
      'text/plain',
      Buffer.from('Tai lieu tam de luu tru.\n'),
    )
    const temp = await S.must('ADMIN', 'POST', '/admin/knowledge-documents', {
      fileId,
      title: `Tài liệu tạm ${tag}`,
      category: 'OTHER',
      tags: [],
    })
    await page.goto(url(`/admin/knowledge-base/${temp.documentId}`), { waitUntil: 'domcontentloaded' })
    t = mark()
    await page.getByRole('button', { name: 'Lưu trữ' }).click()
    await page.getByRole('dialog', { name: 'Xác nhận' }).getByRole('button', { name: 'Lưu trữ' }).click()
    await expectCall('A21', t)
    assert.equal((await S.must('ADMIN', 'GET', `/admin/knowledge-documents/${temp.documentId}`)).status, 'ARCHIVED')
  })

  test('A22/A24/A25/A23: kiểm tra + bỏ bản nháp; áp dụng hai lần, nạp lại theo cấu hình mới, khôi phục bản cũ', async () => {
    const page = await as('ADMIN', '/admin/settings')
    await page.getByRole('button', { name: 'Cấu hình AI / RAG' }).click()
    let t = mark()
    await page.getByLabel('Số đoạn trích xuất (Top K)').fill('5')
    await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
    await page.getByRole('button', { name: 'Kiểm tra bản nháp' }).click()
    await expectCall('A22', t)
    await page.getByRole('button', { name: 'Bỏ bản nháp' }).click()
    await page.getByRole('dialog', { name: 'Bỏ bản nháp' }).getByRole('button', { name: 'Bỏ bản nháp' }).click()
    await expectCall('A24', t)
    for (const [topK, chunk] of [
      ['5', null],
      ['4', '1800'],
    ]) {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Cấu hình AI / RAG' }).click()
      await page.getByLabel('Số đoạn trích xuất (Top K)').fill(topK)
      if (chunk) await page.getByLabel('Kích thước đoạn văn bản').fill(chunk)
      await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
      await page.getByRole('button', { name: 'Áp dụng bản nháp' }).click()
      if (chunk)
        await page
          .getByRole('dialog', { name: 'Áp dụng bản nháp đổi cách cắt đoạn' })
          .getByRole('button', { name: 'Áp dụng' })
          .click()
      await page
        .getByText(/Cấu hình v\d+ đang được dùng/)
        .first()
        .waitFor()
    }
    t = mark()
    await page.getByRole('button', { name: 'Nạp lại tài liệu theo cấu hình mới' }).click()
    await expectCall('A25', t, 202)
    t = mark()
    await page.getByRole('button', { name: 'Nhật ký thay đổi' }).click()
    await page.getByRole('button', { name: 'Phiên bản AI / RAG' }).click()
    await page.getByRole('button', { name: 'Khôi phục' }).first().click()
    await page
      .getByRole('dialog', { name: 'Khôi phục phiên bản cấu hình' })
      .getByRole('button', { name: 'Khôi phục' })
      .click()
    await expectCall('A23', t)
    const cfg = await S.must('ADMIN', 'GET', '/admin/rag-configuration')
    state.ragActiveVersion = cfg.active?.version
    assert.ok(cfg.active?.version >= 3)
  })
})
