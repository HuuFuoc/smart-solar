// Bản chụp lúc lập hợp đồng (backend 7d27054, ContractUnitOfWork.GetQuotationAsync và QuotationHandlers.CustomerSnapshotOf): khách,
// công trình và các dòng báo giá đã đóng băng. Backend trả JSON không có kiểu cố định nên đọc từng trường, bỏ qua trường sai kiểu.
// Chỉ để hiển thị: tiền vẫn là số backend ghi, không tính lại. Không import giá trị qua "@/" để chạy được bằng node --test

export type SnapshotLine = {
  lineNumber: number | null
  name: string
  sku: string | null
  brand: string | null
  model: string | null
  /** Mã loại sản phẩm với báo giá của kỹ thuật viên */
  description: string | null
  unit: string | null
  quantity: number | null
  unitPrice: number | null
  lineTotal: number | null
}

export type ContractSnapshot = {
  customer: {
    name: string | null
    phone: string | null
    email: string | null
    propertyName: string | null
    address: string | null
  }
  quoteNumber: string | null
  quotationVersion: number | null
  lines: SnapshotLine[]
  totals: {
    equipmentSubtotal: number | null
    laborCost: number | null
    transportCost: number | null
    otherServiceCost: number | null
    subtotal: number | null
    discountAmount: number | null
    taxRatePercent: number | null
    taxAmount: number | null
    totalAmount: number | null
  }
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

export function readContractSnapshot(pricing: unknown, customer: unknown): ContractSnapshot {
  const p = record(pricing)
  const c = record(customer)
  const lines = Array.isArray(p.lines) ? p.lines : []
  return {
    customer: {
      name: text(c.customerName) ?? text(c.fullName),
      phone: text(c.customerPhone),
      email: text(c.customerEmail) ?? text(c.email),
      propertyName: text(c.propertyName),
      address: [text(c.streetLine), text(c.district), text(c.province)].filter(Boolean).join(', ') || null,
    },
    quoteNumber: text(p.quoteNumber),
    quotationVersion: num(p.quotationVersion),
    lines: lines
      .map(record)
      .map((l) => ({
        lineNumber: num(l.lineNumber),
        name: text(l.name) ?? text(l.sku) ?? 'Sản phẩm',
        sku: text(l.sku),
        brand: text(l.brand),
        model: text(l.model),
        description: text(l.description),
        unit: text(l.unit),
        quantity: num(l.quantity),
        unitPrice: num(l.unitPrice),
        lineTotal: num(l.lineTotal),
      }))
      .sort((a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0)),
    totals: {
      equipmentSubtotal: num(p.equipmentSubtotal),
      laborCost: num(p.laborCost),
      transportCost: num(p.transportCost),
      otherServiceCost: num(p.otherServiceCost),
      subtotal: num(p.subtotal),
      discountAmount: num(p.discountAmount),
      taxRatePercent: num(p.taxRatePercent),
      taxAmount: num(p.taxAmount),
      totalAmount: num(p.totalAmount),
    },
  }
}
