// Backend chỉ có một ô chữ `electricalCabinetNotes`. Form tách thành vài ô chọn rồi ghép lại thành từng dòng
// "Nhãn: giá trị", phần còn lại là ghi chú; đọc ngược được nên mở lại biên bản vẫn về đúng từng ô.
// Biên bản cũ gõ tự do không khớp dòng nào thì cả đoạn vào ghi chú.

export type CabinetParts = {
  location: string
  phase: string
  mainBreaker: string
  spareSpace: string
  note: string
}

type CabinetKey = Exclude<keyof CabinetParts, 'note'>

const LABELS: [CabinetKey, string][] = [
  ['location', 'Vị trí'],
  ['phase', 'Nguồn điện'],
  ['mainBreaker', 'Aptomat tổng'],
  ['spareSpace', 'Chỗ trống trong tủ'],
]
const NOTE_PREFIX = 'Ghi chú: '

export const emptyCabinetParts = (): CabinetParts => ({
  location: '',
  phase: '',
  mainBreaker: '',
  spareSpace: '',
  note: '',
})

export function parseCabinetNotes(text: string): CabinetParts {
  const parts = emptyCabinetParts()
  if (!text) return parts
  const lines = text.split('\n')
  const seen = new Set<CabinetKey>()
  let i = 0
  for (; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const match = LABELS.find(([key, label]) => !seen.has(key) && line.startsWith(`${label}: `))
    if (!match) break
    const [key, label] = match
    seen.add(key)
    parts[key] = line.slice(label.length + 2)
  }
  let rest = lines.slice(i).join('\n')
  if (seen.size > 0 && rest.startsWith(NOTE_PREFIX)) rest = rest.slice(NOTE_PREFIX.length)
  parts.note = rest
  return parts
}

export function composeCabinetNotes(parts: CabinetParts): string {
  // Không cắt khoảng trắng ở đây: ô đang gõ dở "Ngoài " phải giữ dấu cách
  const lines = LABELS.filter(([key]) => parts[key] !== '').map(([key, label]) => `${label}: ${parts[key]}`)
  if (parts.note === '') return lines.join('\n')
  if (lines.length === 0) return parts.note
  return [...lines, NOTE_PREFIX + parts.note].join('\n')
}

/** Số ký tự còn lại cho ghi chú khi cả đoạn không được quá `limit` */
export function cabinetNoteBudget(parts: CabinetParts, limit: number) {
  const head = composeCabinetNotes({ ...parts, note: '' })
  const overhead = head === '' ? 0 : head.length + 1 + NOTE_PREFIX.length
  return Math.max(0, limit - overhead)
}
