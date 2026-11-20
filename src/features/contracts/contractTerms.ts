// Điều khoản hợp đồng là chữ thuần do backend dựng. Tách thành các mục để hiển thị: dòng IN HOA (có chữ cái, không có chữ
// thường) là tiêu đề mục; dòng bắt đầu bằng "1." / "2)" là một điều, các dòng ngay sau (không trống, không phải tiêu đề hay điều
// mới) nối vào điều đó; còn lại là đoạn văn. Không thêm, bớt hay đổi chữ nào: chữ không theo khuôn này vẫn hiện đủ dạng đoạn văn.
// Không import qua "@/" để chạy được bằng node --test

export type TermsLine = { kind: 'item'; number: string; text: string } | { kind: 'text'; text: string }
export type TermsSection = { heading: string | null; lines: TermsLine[] }

const ITEM = /^(\d+(?:\.\d+)*)[.)]\s+(.+)$/

const isHeading = (line: string) =>
  line.length >= 3 && /\p{Lu}/u.test(line) && !/\p{Ll}/u.test(line) && !ITEM.test(line)

export function parseTerms(terms: string | null | undefined): TermsSection[] {
  const sections: TermsSection[] = []
  let section: TermsSection | null = null
  // Điều / đoạn đang mở để nối dòng tiếp theo; dòng trống thì đóng
  let open: TermsLine | null = null
  for (const raw of (terms ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      open = null
      continue
    }
    if (isHeading(line)) {
      section = { heading: line, lines: [] }
      sections.push(section)
      open = null
      continue
    }
    if (!section) {
      section = { heading: null, lines: [] }
      sections.push(section)
    }
    const item = ITEM.exec(line)
    if (item) {
      open = { kind: 'item', number: item[1]!, text: item[2]! }
      section.lines.push(open)
    } else if (open) {
      open.text += `\n${line}`
    } else {
      open = { kind: 'text', text: line }
      section.lines.push(open)
    }
  }
  return sections
}
