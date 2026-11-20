// Tách điều khoản hợp đồng thành mục / điều để hiển thị trên trang hợp đồng của khách. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseTerms } from '../src/features/contracts/contractTerms.ts'

describe('parseTerms', () => {
  test('dòng IN HOA mở mục mới, dòng "N." là một điều, dòng tiếp theo nối vào điều đang mở', () => {
    const terms = [
      'ĐIỀU KHOẢN THANH TOÁN (PAYMENT_30_70_DRAFT_PENDING_LEGAL_REVIEW)',
      '1. Tổng giá trị hợp đồng: 2,182 VND, thanh toán 2 đợt.',
      '2. Đợt 1 (30%): 655 VND,',
      'thanh toán trước khi ký hợp đồng giấy.',
      '',
      'ĐIỀU KIỆN NGHIỆM THU',
      '5. Khách hàng nghiệm thu trên ứng dụng.',
    ].join('\n')
    assert.deepEqual(parseTerms(terms), [
      {
        heading: 'ĐIỀU KHOẢN THANH TOÁN (PAYMENT_30_70_DRAFT_PENDING_LEGAL_REVIEW)',
        lines: [
          { kind: 'item', number: '1', text: 'Tổng giá trị hợp đồng: 2,182 VND, thanh toán 2 đợt.' },
          { kind: 'item', number: '2', text: 'Đợt 1 (30%): 655 VND,\nthanh toán trước khi ký hợp đồng giấy.' },
        ],
      },
      {
        heading: 'ĐIỀU KIỆN NGHIỆM THU',
        lines: [{ kind: 'item', number: '5', text: 'Khách hàng nghiệm thu trên ứng dụng.' }],
      },
    ])
  })

  test('chữ tự do không theo khuôn vẫn giữ đủ, thành đoạn văn của mục không tiêu đề', () => {
    assert.deepEqual(parseTerms('Bảo hành 24 tháng.\nKhông áp dụng khi tự ý sửa.\n\nĐiều 2. Thanh toán một lần.'), [
      {
        heading: null,
        lines: [
          { kind: 'text', text: 'Bảo hành 24 tháng.\nKhông áp dụng khi tự ý sửa.' },
          { kind: 'text', text: 'Điều 2. Thanh toán một lần.' },
        ],
      },
    ])
  })

  test('"1. ĐIỀU KHOẢN CHUNG" là một điều, không phải tiêu đề; điều khoản trống thì không có mục nào', () => {
    assert.deepEqual(parseTerms('1. ĐIỀU KHOẢN CHUNG'), [
      { heading: null, lines: [{ kind: 'item', number: '1', text: 'ĐIỀU KHOẢN CHUNG' }] },
    ])
    assert.deepEqual(parseTerms(null), [])
    assert.deepEqual(parseTerms('  \n '), [])
  })
})
