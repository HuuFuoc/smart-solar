// Ô "Tủ điện" của biên bản khảo sát: tách / ghép một đoạn chữ của backend. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  cabinetNoteBudget,
  composeCabinetNotes,
  emptyCabinetParts,
  parseCabinetNotes,
} from '../src/features/onsite-survey/electricalCabinet.ts'

const parts = (patch) => ({ ...emptyCabinetParts(), ...patch })

describe('electricalCabinet', () => {
  test('ghép từng dòng theo thứ tự cố định, ghi chú ở cuối', () => {
    assert.equal(
      composeCabinetNotes(parts({ mainBreaker: '63 A', location: 'Nhà xe, gara', note: 'Tủ cũ' })),
      'Vị trí: Nhà xe, gara\nAptomat tổng: 63 A\nGhi chú: Tủ cũ',
    )
    assert.equal(composeCabinetNotes(emptyCabinetParts()), '')
  })

  test('chỉ có ghi chú thì giữ nguyên chữ', () => {
    assert.equal(composeCabinetNotes(parts({ note: 'Tủ ở sau nhà' })), 'Tủ ở sau nhà')
  })

  test('đọc ngược ra đúng từng ô, kể cả khoảng trắng đang gõ dở và ghi chú nhiều dòng', () => {
    const cases = [
      parts({ location: 'Ngoài ', phase: '3 pha' }),
      parts({ phase: '1 pha', spareSpace: 'Hết chỗ, cần lắp tủ phụ', note: 'dòng 1\ndòng 2' }),
      parts({ location: 'A', note: '\nbắt đầu bằng dòng trống' }),
      parts({ note: 'Ghi chú: tự gõ' }),
      parts({ mainBreaker: '40 A', note: 'Ghi chú: lặp nhãn' }),
    ]
    for (const p of cases) assert.deepEqual(parseCabinetNotes(composeCabinetNotes(p)), p)
  })

  test('biên bản cũ gõ tự do vào ghi chú', () => {
    assert.deepEqual(parseCabinetNotes('Tủ điện trong nhà, CB 50A'), parts({ note: 'Tủ điện trong nhà, CB 50A' }))
  })

  test('ghi chú không làm cả đoạn quá giới hạn', () => {
    const p = parts({ phase: '1 pha' })
    const budget = cabinetNoteBudget(p, 100)
    assert.equal(composeCabinetNotes({ ...p, note: 'x'.repeat(budget) }).length, 100)
    assert.equal(cabinetNoteBudget(emptyCabinetParts(), 100), 100)
  })
})
