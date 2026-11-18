import type { ContractView } from '@/types/res/customerContractsRes'

// Bản in hợp đồng dựng từ dữ liệu phiên bản hợp đồng (A4, Times New Roman 13pt theo Nghị định 30/2020): khách chưa tải được
// PDF chính thức nên in bản này để ký; giấy khớp hệ thống nhờ mã nội dung in ở đầu và chân mỗi trang

type PriceLine = {
  lineNumber?: number
  name?: string
  sku?: string
  description?: string
  brand?: string
  model?: string
  unit?: string
  quantity?: number
  unitPrice?: number
  lineTotal?: number
}

type PricingSnapshot = {
  lines?: PriceLine[]
  quoteNumber?: string
  quotationVersion?: number
  equipmentSubtotal?: number
  laborCost?: number
  transportCost?: number
  otherServiceCost?: number
  subtotal?: number
  discountAmount?: number
  taxAmount?: number
  taxRatePercent?: number
}

type CustomerSnapshot = {
  customerName?: string
  fullName?: string
  customerEmail?: string
  email?: string
  customerPhone?: string
  propertyName?: string
  streetLine?: string
  district?: string
  province?: string
}

export type ContractPrintInput = {
  contract: ContractView
  /** Tên phường của yêu cầu khảo sát: customerSnapshot không có phường */
  ward?: string | null
  /** Lúc khách đồng ý báo giá (khách không còn đọc được báo giá nên thường để trống) */
  quotationAcceptedAt?: string | null
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

// Chuỗi trong `content:` của CSS
const cssText = (s: unknown) => `"${String(s ?? '').replace(/[\\"]/g, '\\$&')}"`

const money = (n: unknown) => new Intl.NumberFormat('vi-VN').format(Number(n ?? 0))

function vnParts(iso: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(iso))
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  return { d: get('day'), m: get('month'), y: get('year') }
}

/** "ngày 09 tháng 02 năm 2026": ngày dưới 10 và tháng 1, 2 thêm số 0 (Nghị định 30/2020/NĐ-CP) */
export function longDate(iso: string) {
  const { d, m, y } = vnParts(iso)
  return `ngày ${d < 10 ? `0${d}` : d} tháng ${m <= 2 ? `0${m}` : m} năm ${y}`
}

function shortDate(iso: string) {
  const { d, m, y } = vnParts(iso)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const GROUPS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ']

function readTriple(n: number, full: boolean) {
  const h = Math.floor(n / 100)
  const t = Math.floor(n / 10) % 10
  const u = n % 10
  const out: string[] = []
  if (h > 0 || full) out.push(`${DIGITS[h]} trăm`)
  if (t > 1) {
    out.push(`${DIGITS[t]} mươi`)
    if (u === 1) out.push('mốt')
    else if (u === 4) out.push('tư')
    else if (u === 5) out.push('lăm')
    else if (u > 0) out.push(DIGITS[u]!)
  } else if (t === 1) {
    out.push('mười')
    if (u === 5) out.push('lăm')
    else if (u > 0) out.push(DIGITS[u]!)
  } else if (u > 0) {
    if (h > 0 || full) out.push('linh')
    out.push(DIGITS[u]!)
  }
  return out.join(' ')
}

/** 405000000 → "Bốn trăm linh năm triệu đồng" */
export function moneyInWords(amount: number) {
  let n = Math.round(Number(amount))
  if (n === 0) return 'Không đồng'
  const groups: number[] = []
  while (n > 0) {
    groups.push(n % 1000)
    n = Math.floor(n / 1000)
  }
  const words: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue
    words.push(readTriple(groups[i]!, i < groups.length - 1), GROUPS[i]!)
  }
  const text = words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1) + ' đồng'
}

const warranty = (months: number | null) =>
  months == null ? null : months % 12 === 0 ? `${months} tháng (${months / 12} năm)` : `${months} tháng`

const dots = '<span class="dots"></span>'

export function contractPrintHtml({ contract: c, ward, quotationAcceptedAt }: ContractPrintInput) {
  const p = (c.pricingSnapshot ?? {}) as PricingSnapshot
  const cus = (c.customerSnapshot ?? {}) as CustomerSnapshot
  const lines = Array.isArray(p.lines) ? p.lines : []
  const customerName = cus.customerName ?? cus.fullName ?? ''
  const customerEmail = cus.customerEmail ?? cus.email ?? ''
  const address = [cus.streetLine, ward, cus.district, cus.province].filter(Boolean)
  const addressText = address.filter((x, i) => address.indexOf(x) === i).join(', ')
  const quoteNumber = p.quoteNumber ?? ''
  const quoteVersion = p.quotationVersion ?? c.quotationVersion
  const accepted = quotationAcceptedAt ? ` ngày ${shortDate(quotationAcceptedAt)}` : ''
  const tax = p.taxRatePercent ?? null
  const months = warranty(c.warrantyMonths)
  const hash = c.canonicalHash ?? ''

  const itemRows = lines
    .map((l, i) => {
      const sub = [
        l.sku ? `Mã hàng <span class="nowrap">${esc(l.sku)}</span>` : null,
        l.description ? esc(l.description) : null,
      ]
        .filter(Boolean)
        .map((x) => `<div class="sub">${x}</div>`)
        .join('')
      return `<tr>
        <td class="c">${l.lineNumber ?? i + 1}</td>
        <td>${esc(l.name)}${sub}</td>
        <td>${esc([l.brand, l.model].filter(Boolean).join(', '))}</td>
        <td class="c">${esc(l.unit)}</td>
        <td class="num">${money(l.quantity)}</td>
        <td class="num">${money(l.unitPrice)}</td>
        <td class="num">${money(l.lineTotal)}</td>
      </tr>`
    })
    .join('')

  const sumRow = (label: string, value: string, cls = '') =>
    `<tr class="${cls}"><td colspan="6">${label}</td><td class="num">${value}</td></tr>`
  const sums = [
    lines.length && p.equipmentSubtotal != null ? sumRow('Cộng thiết bị, vật tư', money(p.equipmentSubtotal)) : '',
    (p.laborCost ?? 0) > 0 ? sumRow('Chi phí nhân công lắp đặt', money(p.laborCost)) : '',
    (p.transportCost ?? 0) > 0 ? sumRow('Chi phí vận chuyển', money(p.transportCost)) : '',
    (p.otherServiceCost ?? 0) > 0 ? sumRow('Chi phí dịch vụ khác', money(p.otherServiceCost)) : '',
    p.subtotal != null ? sumRow('Cộng', money(p.subtotal)) : '',
    (p.discountAmount ?? 0) > 0 ? sumRow('Giảm giá', `-${money(p.discountAmount)}`) : '',
    p.taxAmount != null ? sumRow(`Thuế giá trị gia tăng${tax != null ? ` (${tax}%)` : ''}`, money(p.taxAmount)) : '',
    sumRow('Tổng giá trị hợp đồng', money(c.totalAmount), 'total'),
  ].join('')

  const terms = (c.terms ?? '').trim()
  const termsHtml = terms
    ? terms
        .split(/\n{2,}/)
        .map((para) => `<p>${esc(para).replaceAll('\n', '<br>')}</p>`)
        .join('')
    : '<p>Không có.</p>'

  const body = `
  <header class="motto">
    <div class="nation">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="slogan">Độc lập - Tự do - Hạnh phúc</div>
  </header>

  <h1>HỢP ĐỒNG<br>CUNG CẤP VÀ LẮP ĐẶT HỆ THỐNG ĐIỆN MẶT TRỜI</h1>
  <p class="number">Số: ${esc(c.contractNumber)}, phiên bản ${c.version}${c.previousContractId ? ' (phụ lục)' : ''}</p>

  <div class="code">
    <div><b>Mã nội dung</b> (hệ thống Smart Solar cấp khi phát hành hợp đồng):</div>
    <div class="hash">${esc(hash || 'chưa phát hành')}</div>
    <div class="code-note">Bản in chỉ dùng được khi mã này trùng với mã nội dung trên trang hợp đồng ở cổng khách
    hàng.</div>
  </div>

  <p class="lead">Căn cứ:</p>
  <ul class="basis">
    <li>Bộ luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015;</li>
    <li>Luật Thương mại số 36/2005/QH11 ngày 14 tháng 6 năm 2005;</li>
    <li>Báo giá số ${esc(quoteNumber)}, phiên bản ${quoteVersion}, Bên A đã đồng ý trên hệ thống Smart Solar${accepted};</li>
    <li>Nhu cầu và khả năng của hai bên.</li>
  </ul>

  <p>Hôm nay, ${c.issuedAt ? longDate(c.issuedAt) : 'ngày ..... tháng ..... năm .........'}, tại Thành phố Hồ Chí Minh, chúng tôi gồm:</p>

  <section class="party">
    <p class="party-title">BÊN A: KHÁCH HÀNG</p>
    <table>
      <tr><td>Họ và tên</td><td>${esc(customerName) || dots}</td></tr>
      <tr><td>Điện thoại</td><td>${esc(cus.customerPhone) || dots}</td></tr>
      <tr><td>Email</td><td>${esc(customerEmail) || dots}</td></tr>
      <tr><td>Số CCCD hoặc mã số thuế</td><td>${dots}</td></tr>
      <tr><td>Công trình</td><td>${esc(cus.propertyName) || dots}</td></tr>
      <tr><td>Địa chỉ công trình</td><td>${esc(addressText) || dots}</td></tr>
    </table>
  </section>

  <section class="party">
    <p class="party-title">BÊN B: SMART SOLAR (ĐƠN VỊ CUNG CẤP VÀ LẮP ĐẶT)</p>
    <table>
      <tr><td>Tên doanh nghiệp</td><td>${dots}</td></tr>
      <tr><td>Địa chỉ</td><td>${dots}</td></tr>
      <tr><td>Mã số thuế</td><td>${dots}</td></tr>
      <tr><td>Người đại diện</td><td>${dots}</td></tr>
      <tr><td>Chức vụ</td><td>${dots}</td></tr>
    </table>
  </section>

  <p>Hai bên thoả thuận ký hợp đồng này với các điều khoản sau:</p>

  <h2>Điều 1. Nội dung công việc</h2>
  <p>1.1. Bên B cung cấp thiết bị, vật tư và lắp đặt hệ thống điện mặt trời cho Bên A tại công trình nêu trên, theo báo
  giá số ${esc(quoteNumber)} (phiên bản ${quoteVersion}) và kết quả khảo sát tại công trình.</p>
  <p>1.2. Bên B cung cấp đúng hãng, model và số lượng thiết bị ghi tại Điều 2. Thiết bị chỉ được thay đổi khi Bên A đồng
  ý bằng phụ lục hợp đồng.</p>
  <p>1.3. Công việc gồm vận chuyển thiết bị tới công trình, lắp đặt, đấu nối, chạy thử và bàn giao hệ thống cho Bên A.</p>

  <h2>Điều 2. Giá trị hợp đồng</h2>
  <p>2.1. Danh mục thiết bị, chi phí và giá (đơn vị: đồng):</p>
  <table class="items">
    <thead>
      <tr><th class="stt">STT</th><th>Hạng mục</th><th class="brand">Hãng, model</th><th class="unit">ĐVT</th>
      <th class="qty">SL</th><th class="price">Đơn giá</th><th class="price">Thành tiền</th></tr>
    </thead>
    <tbody>${itemRows}${sums}</tbody>
  </table>
  <p>2.2. Tổng giá trị hợp đồng: <b>${money(c.totalAmount)} đồng</b> (bằng chữ: ${moneyInWords(c.totalAmount)}),
  đã gồm thuế giá trị gia tăng${tax != null ? ` ${tax}%` : ''}, chi phí nhân công và vận chuyển.</p>
  <p>2.3. Giá trị hợp đồng không thay đổi trong suốt thời gian thực hiện hợp đồng, kể cả khi lập phụ lục.</p>

  <h2>Điều 3. Thanh toán</h2>
  <p>3.1. Bên A thanh toán một lần toàn bộ giá trị hợp đồng theo báo giá đã đồng ý, bằng mã QR PayOS hoặc tiền mặt khi
  kỹ thuật viên của Bên B trình bày báo giá tại công trình. Khoản đã thanh toán trước khi ký được tính là thanh toán của hợp
  đồng này; Bên B không thu thêm lần nào khác.</p>
  <p>3.2. Nghĩa vụ thanh toán hoàn thành khi hệ thống Smart Solar ghi nhận Bên B đã nhận đủ tiền (PayOS xác nhận, hoặc
  Bên B xác nhận phiếu thu tiền mặt).</p>
  <p>3.3. Bên B xuất hoá đơn giá trị gia tăng cho Bên A theo quy định của pháp luật.</p>

  <h2>Điều 4. Thi công</h2>
  <p>4.1. Kỹ thuật viên của Bên B thống nhất ngày thi công trực tiếp với Bên A. Lịch được xác nhận khi hợp đồng đã thanh
  toán và đã ký; Bên A theo dõi lịch và tiến độ trên cổng khách hàng.</p>
  <p>4.2. Bên A bố trí mặt bằng, lối đi và điện thi công tại công trình trong thời gian thi công đã thông báo. Thời gian
  thi công chỉ thay đổi khi hai bên cùng đồng ý.</p>

  <h2>Điều 5. Nghiệm thu và bàn giao</h2>
  <p>5.1. Lắp đặt xong, Bên B gửi báo cáo hoàn thành kèm ảnh thi công lên hệ thống và cùng Bên A kiểm tra, bàn giao tại công
  trình. Bên B nghiệm thu trên hệ thống theo kết quả bàn giao đó; Bên A xem báo cáo, ảnh và hồ sơ bàn giao trên cổng khách
  hàng.</p>
  <p>5.2. Khi kết quả chưa đạt, Bên B khắc phục bằng chi phí của mình rồi nghiệm thu lại.</p>
  <p>5.3. Sau khi Bên A đồng ý nghiệm thu, Bên B bàn giao hệ thống kèm danh sách thiết bị đã lắp (hãng, model, số serial)
  và thời hạn bảo hành của từng thiết bị. Ngày bàn giao ghi trên hệ thống là ngày bắt đầu tính bảo hành.</p>

  <h2>Điều 6. Bảo hành</h2>
  <p>6.1. Bảo hành lắp đặt: ${months ? `<b>${months}</b> kể từ ngày bàn giao` : `${dots} tháng kể từ ngày bàn giao`}.</p>
  <p>6.2. Thiết bị được bảo hành theo chính sách của nhà sản xuất; thời hạn bảo hành của từng thiết bị ghi trong danh
  sách bàn giao.</p>
  <p>6.3. Khi hệ thống gặp sự cố, Bên A báo lỗi tại mục “Bảo hành, sửa chữa” trên cổng khách hàng. Bên B cử kỹ thuật
  viên kiểm tra; hạng mục thuộc bảo hành được sửa miễn phí, hạng mục ngoài bảo hành được báo giá để Bên A đồng ý trước
  khi sửa.</p>
  <p>6.4. Không thuộc bảo hành: hư hỏng do thiên tai, hoả hoạn, tác động từ bên ngoài, hoặc do người không thuộc Bên B tự
  ý sửa chữa, di dời hệ thống. Hư hỏng do thiên tai được hỗ trợ theo gói bảo vệ thiên tai nếu Bên A đã mua gói đó.</p>

  <h2>Điều 7. Quyền và nghĩa vụ của Bên A</h2>
  <p>7.1. Cung cấp đúng thông tin về công trình; tạo điều kiện để Bên B thi công, nghiệm thu và bảo hành.</p>
  <p>7.2. Thanh toán theo Điều 3 và nghiệm thu theo Điều 5.</p>
  <p>7.3. Không tự ý tháo dỡ, sửa chữa hệ thống trong thời hạn bảo hành.</p>

  <h2>Điều 8. Quyền và nghĩa vụ của Bên B</h2>
  <p>8.1. Cung cấp thiết bị mới, đúng chủng loại ghi tại Điều 2, có nguồn gốc xuất xứ rõ ràng.</p>
  <p>8.2. Thi công đúng kỹ thuật, bảo đảm an toàn lao động và an toàn điện, dọn dẹp mặt bằng sau khi thi công; bồi
  thường thiệt hại do lỗi của mình gây ra cho tài sản của Bên A.</p>
  <p>8.3. Bảo hành theo Điều 6; chỉ dùng thông tin của Bên A để thực hiện hợp đồng này.</p>

  <h2>Điều 9. Phụ lục hợp đồng</h2>
  <p>Thay đổi điều khoản hoặc thời hạn bảo hành sau khi hợp đồng đã phát hành được lập thành phụ lục. Mỗi phụ lục là một
  phiên bản mới của hợp đồng, có mã nội dung riêng và được ký như hợp đồng này.</p>

  <h2>Điều 10. Bất khả kháng</h2>
  <p>Bên gặp sự kiện bất khả kháng (thiên tai, dịch bệnh, quyết định của cơ quan nhà nước có thẩm quyền và các trường
  hợp khác theo Điều 156 Bộ luật Dân sự) phải thông báo ngay cho bên kia. Thời hạn thực hiện nghĩa vụ được kéo dài
  tương ứng với thời gian diễn ra sự kiện đó.</p>

  <h2>Điều 11. Giải quyết tranh chấp</h2>
  <p>Tranh chấp phát sinh từ hợp đồng được hai bên thương lượng giải quyết. Không thương lượng được thì một trong hai
  bên có quyền yêu cầu Toà án nhân dân có thẩm quyền tại Thành phố Hồ Chí Minh giải quyết.</p>

  <h2>Điều 12. Thoả thuận khác</h2>
  <div class="terms">${termsHtml}</div>

  <h2>Điều 13. Hiệu lực và cách ký</h2>
  <p>13.1. Hợp đồng có hiệu lực từ ngày Bên B xác nhận bản hợp đồng có chữ ký của Bên A trên hệ thống Smart Solar.</p>
  <p>13.2. Bên A in hợp đồng này, ký nháy từng trang, ký và ghi rõ họ tên ở phần chữ ký, rồi quét thành một tệp PDF và
  gửi lên mục “Hợp đồng” trên cổng khách hàng. Bản có chữ ký được lưu trên hệ thống và có giá trị như nhau với mỗi
  bên.</p>

  <section class="sign">
    <div>
      <p class="role">ĐẠI DIỆN BÊN A</p>
      <p class="hint">(Ký, ghi rõ họ tên)</p>
      <div class="space"></div>
      <p class="name">${esc(customerName)}</p>
    </div>
    <div>
      <p class="role">ĐẠI DIỆN BÊN B</p>
      <p class="hint">(Ký, ghi rõ họ tên, đóng dấu)</p>
      <div class="space"></div>
      <p class="name">&nbsp;</p>
    </div>
  </section>`

  const title = `Hợp đồng ${c.contractNumber}`
  // Chân trang bằng ô lề của @page (Chrome, Edge 131+); trình duyệt không hỗ trợ thì vẫn còn mã ở khung đầu trang
  const footerLeft = `${cssText(`Hợp đồng số ${c.contractNumber}, phiên bản ${c.version}`)} "\\A" ${cssText(`Mã nội dung: ${hash}`)}`
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 15mm 25mm 30mm;
    @bottom-left { content: ${footerLeft}; white-space: pre-wrap; font: 8.5pt 'Times New Roman', serif; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; }
    @bottom-right { content: "Bên A ký nháy: ..............\\A Trang " counter(page) "/" counter(pages); white-space: pre; text-align: right; font: 8.5pt 'Times New Roman', serif; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; }
  }
  body { margin: 0; font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.35; color: #000; background: #fff; }
  @media screen { body { max-width: 165mm; margin: 0 auto; padding: 16px; } }
  p { margin: 0 0 4pt; text-align: justify; }
  b { font-weight: bold; }
  .motto { text-align: center; font-weight: bold; }
  .motto .slogan { display: inline-block; padding-bottom: 2pt; border-bottom: 0.75pt solid #000; }
  h1 { margin: 20pt 0 4pt; text-align: center; font-size: 14pt; line-height: 1.35; }
  .number { text-align: center; margin-bottom: 10pt; }
  .code { border: 0.75pt solid #000; padding: 5pt 8pt; margin: 0 0 12pt; font-size: 11.5pt; }
  .code .hash { margin: 2pt 0; font-family: 'Courier New', monospace; font-size: 10.5pt; word-break: break-all; }
  .code-note { margin-top: 2pt; font-style: italic; text-align: justify; }
  .lead { margin-bottom: 0; font-style: italic; }
  .basis { margin: 0 0 6pt; padding-left: 0; list-style: none; font-style: italic; }
  .basis li::before { content: '- '; }
  .party { margin: 8pt 0 4pt; }
  .party-title { font-weight: bold; margin-bottom: 2pt; }
  .party table { border-collapse: collapse; width: 100%; }
  .party td { padding: 0 0 2pt; vertical-align: top; }
  .party td:first-child { width: 52mm; }
  .party td:first-child::after { content: ':'; }
  .party td:last-child { padding-left: 2mm; }
  .dots { display: inline-block; width: 100%; border-bottom: 0.75pt dotted #000; height: 12pt; }
  h2 { margin: 10pt 0 3pt; font-size: 13pt; break-after: avoid; }
  table.items { width: 100%; border-collapse: collapse; margin: 3pt 0 6pt; font-size: 11pt; line-height: 1.25; }
  table.items th, table.items td { border: 0.5pt solid #000; padding: 3pt 4pt; vertical-align: top; }
  table.items th { text-align: center; font-weight: bold; }
  table.items tr { break-inside: avoid; }
  table.items .stt { width: 8mm; } table.items .brand { width: 32mm; } table.items .unit { width: 11mm; }
  table.items .qty { width: 11mm; } table.items .price { width: 24mm; }
  table.items .c { text-align: center; }
  table.items .num { text-align: right; white-space: nowrap; }
  table.items .sub { font-size: 10pt; font-style: italic; }
  .nowrap { white-space: nowrap; }
  table.items tr.total td { font-weight: bold; }
  table.items td[colspan] { text-align: right; }
  .sign { display: flex; justify-content: space-between; margin-top: 14pt; text-align: center; break-inside: avoid; }
  .sign > div { width: 48%; }
  .sign p { text-align: center; margin: 0; }
  .sign .role { font-weight: bold; }
  .sign .hint { font-style: italic; font-size: 12pt; }
  .sign .space { height: 30mm; }
  .sign .name { font-weight: bold; }
</style>
</head>
<body>${body}</body>
</html>`
}

/** Mở bản in ở thẻ mới rồi bật hộp in (khách chọn máy in hoặc "Lưu thành PDF"). false khi trình duyệt chặn cửa sổ mới */
export function openContractPrint(input: ContractPrintInput) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open()
  w.document.write(contractPrintHtml(input))
  w.document.close()
  w.focus()
  // Đợi bố cục xong mới in, in ngay thì trang đầu có thể trống
  w.addEventListener('load', () => w.print(), { once: true })
  return true
}
