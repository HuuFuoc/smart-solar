// Câu lý do của khoản tiền chưa áp: backend ghi câu tiếng Anh nên dịch theo mẫu, câu lạ ghi chung

const REASONS: [RegExp, string][] = [
  [/already paid/i, 'Khoản này đã được trả bằng lần khác (khách trả trùng)'],
  [/not in SIGNED state|not payable/i, 'Nhận tiền khi khoản chưa / không còn chờ thanh toán'],
  [/amount/i, 'Số tiền nhận không khớp số cần thu'],
  [/expired|deadline|after/i, 'Khách trả sau hạn thanh toán'],
]

export function unappliedReasonText(reason: string | null | undefined) {
  if (reason) for (const [pattern, text] of REASONS) if (pattern.test(reason)) return text
  return 'Tiền đã nhận nhưng không áp được vào khoản nào'
}
