// Chuỗi tiền đề nhiều bước gọi API nghiệp vụ THẬT của stack kiểm thử (stack-api.mjs), dùng lại ở nhiều giai đoạn. Các bước ở đây nằm
// ngoài 76 endpoint (hoặc đã có bằng chứng giao diện ở giai đoạn trước), không tính là bằng chứng giao diện. Không sửa DB tay: mọi
// trạng thái (đã thanh toán, đã bàn giao…) đều do backend chuyển qua đúng lệnh của từng vai trò.
import assert from 'node:assert/strict'
import * as S from './stack-api.mjs'

export const FAKE_PAYOS = (process.env.AUDIT_FAKE_PAYOS ?? 'http://127.0.0.1:58090').replace(/\/$/, '')
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/** Giờ Việt Nam sau `ms` mili giây, cắt tới phút: "2026-11-04T10:30:00+07:00" */
export const vnAt = (ms) => new Date(Date.now() + 7 * 3600_000 + ms).toISOString().slice(0, 16) + ':00+07:00'
/** Ngày theo giờ Việt Nam sau `days` ngày: "2026-11-12" */
export const vnDate = (days) => new Date(Date.now() + 7 * 3600_000 + days * 86_400_000).toISOString().slice(0, 10)

export async function poll(check, label, ms = 120_000, every = 2000) {
  const end = Date.now() + ms
  for (;;) {
    const v = await check()
    if (v) return v
    if (Date.now() > end) assert.fail(`hết giờ chờ: ${label}`)
    await sleep(every)
  }
}

/** Người dùng trả tiền trên trang PayOS GIẢ LẬP: giả lập gửi webhook có chữ ký tới backend thật */
export async function payFake(orderCode) {
  const res = await fetch(`${FAKE_PAYOS}/checkout/${orderCode}/pay`, { method: 'POST', redirect: 'manual' })
  assert.equal(res.status, 303, `PayOS giả lập trả ${res.status}`)
}

/** Cài đặt sau bán cho kiểm thử: bảo vệ thiên tai không chờ, nhắc khách sau 1 giờ (mức nhỏ nhất), báo trước bảo trì 60 ngày */
export async function setAfterSalesSettings() {
  const wanted = {
    'afterSales.disasterWaitingDays': [0, 'DAYS'],
    'afterSales.customerResponseHours': [1, 'HOURS'],
    'afterSales.maintenanceNoticeLeadDays': [60, 'DAYS'],
  }
  const current = await S.must('ADMIN', 'GET', '/admin/system-settings/scheduling')
  const changes = Object.entries(wanted)
    .filter(([key, [value]]) => current.settings.find((s) => s.key === key)?.value !== value)
    .map(([key, [value, unit]]) => ({ key, value, unit }))
  if (changes.length)
    await S.must('ADMIN', 'PUT', '/admin/system-settings/scheduling', {
      settings: changes,
      expectedVersion: current.version,
      reason: 'Kiểm thử sau bán trên stack riêng',
    })
}

/** Quản trị tạo một gói đang bán; trả packageId */
export async function createPackage(kind, name, price) {
  const maintenance = kind === 'MAINTENANCE'
  const p = await S.must('ADMIN', 'POST', '/admin/after-sales/packages', {
    kind,
    name,
    description: null,
    price,
    durationMonths: 12,
    visitMonths: maintenance ? [1, 2] : [],
    coveredDisasterTypes: maintenance ? [] : ['STORM'],
    coveragePercent: maintenance ? null : 50,
    perIncidentLimit: maintenance ? null : 10_000_000,
    termLimit: maintenance ? null : 20_000_000,
    isActive: true,
    revision: 0,
  })
  return p.packageId
}

/** Khách mua gói trên hợp đồng đã thanh toán rồi trả tiền qua PayOS giả lập; chờ backend ghi nhận tiền. Trả các SubscriptionView */
export async function buyPackages(customer, contractId, packages) {
  const buy = await S.must(customer, 'POST', '/customers/me/after-sales/purchases', {
    contractId,
    maintenancePackageId: packages.maintenancePackageId ?? null,
    disasterPackageId: packages.disasterPackageId ?? null,
    includeContract: false,
  })
  await payFake(buy.checkout.orderCode)
  return poll(async () => {
    const subs = await S.must(customer, 'GET', '/customers/me/after-sales/subscriptions')
    const mine = subs.filter((s) => buy.subscriptionIds.includes(s.subscriptionId))
    return (
      mine.length === buy.subscriptionIds.length &&
      mine.every((s) => s.status === 'PAID' || s.status === 'ACTIVE') &&
      mine
    )
  }, 'gói được ghi nhận đã trả tiền')
}

/** Sản phẩm inverter đang bán (tạo mới nếu chưa có) để kỹ thuật viên ghi thiết bị theo danh mục */
export async function inverterProductId() {
  const list = await S.must('ADMIN', 'GET', '/products?PageSize=100')
  const found = list.items.find((p) => p.productType === 'INVERTER' && p.status === 'ACTIVE')
  if (found) return found.id
  const created = await S.must('ADMIN', 'POST', '/admin/products', {
    sku: `INV-AUDIT-${Date.now()}`,
    productType: 'INVERTER',
    category: 'INVERTER',
    name: 'Inverter kiểm thử 5 kW',
    brand: 'Audit',
    model: 'INV5',
    unit: 'bộ',
    unitPrice: 15_000_000,
    currency: 'VND',
    ratedPowerW: 5000,
    warrantyMonth: 60,
    status: 'ACTIVE',
  })
  return created.id
}

/**
 * Hợp đồng đã thanh toán → dự án → phân công → checklist → kỹ thuật viên lắp, ghi thiết bị → quản lý và khách đồng ý thiết bị khác hợp
 * đồng (inverter không có trong báo giá) → báo cáo → khách nghiệm thu → bàn giao. Trả { projectId, assets }
 */
export async function installAndHandOver(contractId, panelProductId) {
  const tech = await S.userId('TECH')
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  await S.must('ADMIN', 'PUT', `/admin/technicians/${tech}/working-schedule`, {
    useDefault: false,
    periods: days.map((day) => ({ day, start: '00:00', end: '23:59' })),
  })
  const created = await S.call('MANAGER', 'POST', `/contracts/${contractId}/installation-project`)
  const projectId =
    created.data?.projectId ??
    (await S.must('MANAGER', 'GET', '/installation-projects')).find((p) => p.contractId === contractId)?.projectId
  assert.ok(projectId, `không tạo được dự án: ${created.status} ${created.error?.code}`)
  let p = await S.must('MANAGER', 'GET', `/installation-projects/${projectId}`)
  const startsAt = vnAt(70_000)
  const endsAt = vnAt(8 * 3600_000)
  await S.must(
    'MANAGER',
    'GET',
    `/installation-projects/${projectId}/technician-candidates?startsAt=${encodeURIComponent(startsAt)}&endsAt=${encodeURIComponent(endsAt)}`,
  )
  await S.must('MANAGER', 'PUT', `/installation-projects/${projectId}/assignment`, {
    technicianUserId: tech,
    scheduledStartsAt: startsAt,
    scheduledEndsAt: endsAt,
    reason: null,
    expectedRevision: p.revision,
    crossZoneAuthorized: false,
  })
  p = await S.must('MANAGER', 'GET', `/installation-projects/${projectId}`)
  for (const item of p.checklist ?? []) {
    if (!item.isRequired || item.status === 'SATISFIED') continue
    const doc = await S.uploadFile(
      'MANAGER',
      'PROJECT_DOCUMENT',
      'bien-ban.pdf',
      'application/pdf',
      S.tinyPdf('Checklist dat'),
    )
    const fresh = await S.must('MANAGER', 'GET', `/installation-projects/${projectId}`)
    await S.must('MANAGER', 'PUT', `/installation-projects/${projectId}/checklist/${item.itemId}`, {
      revision: fresh.revision,
      isRequired: true,
      status: 'SATISFIED',
      evidenceFileId: doc,
      note: 'Kiểm thử',
    })
  }
  // Kỹ thuật viên chỉ bắt đầu được từ giờ đã giao
  await sleep(Math.max(0, Date.parse(startsAt) - Date.now()) + 5000)
  const tv = await S.must('TECH', 'GET', `/technicians/me/installation-projects/${projectId}`)
  await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/accept`, {
    expectedRevision: tv.revision,
  })
  await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/start`)
  const photo = await S.uploadFile('TECH', 'INSTALLATION_EVIDENCE', 'lap-dat.png', 'image/png', S.tinyPng())
  await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/evidence`, {
    fileId: photo,
    caption: 'Đã lắp xong',
  })
  const stamp = Date.now()
  await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/assets`, {
    assets: [
      {
        assetType: 'PANEL',
        productId: panelProductId,
        manufacturer: 'Audit',
        model: 'A550',
        serialNumber: `PV-${stamp}`,
        positionCode: 'R1',
        warrantyMonths: null,
      },
      {
        assetType: 'INVERTER',
        productId: await inverterProductId(),
        manufacturer: 'Audit',
        model: 'INV5',
        serialNumber: `INV-${stamp}`,
        positionCode: 'T1',
        warrantyMonths: null,
      },
    ],
  })
  p = await S.must('MANAGER', 'GET', `/installation-projects/${projectId}`)
  const approve = await S.call(
    'MANAGER',
    'POST',
    `/installation-projects/${projectId}/equipment-substitution/approve`,
    {
      reason: 'Kiểm thử: lắp thêm inverter ngoài báo giá',
      expectedRevision: p.revision,
    },
  )
  // Không lệch thiết bị thì backend từ chối lệnh duyệt; báo cáo bên dưới sẽ hỏng nếu thật ra cần duyệt
  const tv2 = await S.must('TECH', 'GET', `/technicians/me/installation-projects/${projectId}`)
  await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/completion-report`, {
    completionReport: 'Lắp đặt hoàn tất, chạy thử đạt.',
    expectedRevision: tv2.revision,
  })
  if (approve.status < 300)
    await S.must('CUSTOMER', 'POST', `/customers/me/installation-projects/${projectId}/equipment-substitution/approve`)
  await S.must('CUSTOMER', 'POST', `/customers/me/installation-projects/${projectId}/acceptance`, {
    decision: 'ACCEPT',
    reason: null,
  })
  await S.must('CUSTOMER', 'GET', `/customers/me/installation-projects/${projectId}/handover`)
  const view = await S.must('CUSTOMER', 'GET', `/customers/me/installation-projects/${projectId}`)
  assert.equal(view.status, 'COMPLETED')
  return { projectId, assets: view.assets }
}

/** Khách báo lỗi một thiết bị (FAULT, ngoài 76) */
export const reportFault = (projectId, description, extra = {}) =>
  S.must('CUSTOMER', 'POST', '/customers/me/after-sales/fault-requests', {
    projectId,
    description,
    suspectedAssetId: null,
    evidenceFileIds: [],
    warrantySourceRequestId: null,
    disasterType: null,
    incidentOccurredAt: null,
    ...extra,
  })

/** Quản lý xếp buổi (ngoài 76) cho kỹ thuật viên TECH; trả visitId của buổi mới */
export async function scheduleVisit(requestId, startsAt, endsAt) {
  const r = await S.must('MANAGER', 'GET', `/manager/after-sales/requests/${requestId}`)
  const view = await S.must('MANAGER', 'POST', `/manager/after-sales/requests/${requestId}/visits`, {
    technicianUserId: await S.userId('TECH'),
    startsAt,
    endsAt,
    reason: null,
    expectedRevision: r.revision,
    crossZoneAuthorized: false,
    companyCaused: false,
  })
  return view.visits.at(-1).visitId
}

/** Kỹ thuật viên nhận buổi, bắt đầu, chụp ảnh hiện trường (ngoài 76) */
export async function startVisit(visitId) {
  await S.must('TECH', 'POST', `/technicians/me/after-sales/visits/${visitId}/respond`, { accept: true, reason: null })
  await S.must('TECH', 'POST', `/technicians/me/after-sales/visits/${visitId}/start`)
  const photo = await S.uploadFile('TECH', 'SERVICE_EVIDENCE', 'hien-truong.png', 'image/png', S.tinyPng())
  await S.must('TECH', 'POST', `/technicians/me/after-sales/visits/${visitId}/evidence`, {
    fileId: photo,
    caption: 'Hiện trường',
  })
}

/** Báo cáo kiểm tra có một hạng mục và ở lại công trình để sửa luôn (ngoài 76) */
export const inspectAndWait = (visitId, assetId, description) =>
  S.must('TECH', 'POST', `/technicians/me/after-sales/visits/${visitId}/inspection`, {
    report: `Kiểm tra: ${description}`,
    noFaultFound: false,
    stayOnSite: true,
    items: [{ assetId, description, diagnosis: 'Hỏng do hao mòn', requiredParts: null }],
  })

/** Quản lý quyết định ai chịu chi phí cho mọi hạng mục đang chờ (ngoài 76) */
export async function decideCoverage(requestId, coverage) {
  const r = await S.must('MANAGER', 'GET', `/manager/after-sales/requests/${requestId}`)
  return S.must('MANAGER', 'POST', `/manager/after-sales/requests/${requestId}/coverage`, {
    decisions: r.items
      .filter((i) => i.coverage === 'PENDING')
      .map((i) => ({
        itemId: i.itemId,
        coverage,
        reason: coverage === 'CHARGEABLE' ? 'Hư hỏng do sử dụng, ngoài bảo hành' : null,
      })),
  })
}

/**
 * Một khách khác đi trọn luồng 1–2 bằng API tới hợp đồng ĐÃ THANH TOÁN (PayOS giả lập): đánh giá sơ bộ ở Bến Thành, đặt giờ, kỹ thuật
 * viên nhận và hoàn thành khảo sát, kinh doanh báo giá, khách đồng ý, hợp đồng phát hành + PDF + ký + quản lý duyệt, thanh toán.
 * Trả { contractId, surveyRequestId }
 */
export async function paidContract(customer, label, productId) {
  await S.call(customer, 'POST', '/customers/me', {
    customerType: 'INDIVIDUAL',
    companyName: null,
    taxCode: null,
    note: null,
  })
  const communes = await S.must(null, 'GET', '/administrative-units/communes?provinceCode=79')
  const benThanh = communes.find((c) => c.name === 'Phường Bến Thành')
  const site = await S.must(customer, 'POST', '/customers/me/sites', {
    name: label,
    province: 'Thành phố Hồ Chí Minh',
    district: null,
    ward: benThanh.name,
    streetLine: '45 Lê Thánh Tôn',
    latitude: 10.7745,
    longitude: 106.7004,
    installationSurfaceType: 'ROOFTOP',
    surfaceMaterial: 'Bê tông',
    note: null,
    provinceCode: '79',
    communeCode: benThanh.code,
  })
  const pre = await S.must(customer, 'POST', '/pre-surveys', {
    propertySiteId: site.propertySiteId,
    totalAreaM2: 40,
    usableAreaM2: 32,
    tiltDegree: 10,
    azimuthDegree: 180,
    hasObstruction: false,
  })
  const surf = await S.must(customer, 'GET', `/pre-surveys/${pre.preSurveyId}/surface`)
  await S.must(customer, 'PUT', `/pre-surveys/${pre.preSurveyId}/surface`, {
    expectedRevision: surf.revision,
    surfaceLengthM: 8,
    surfaceWidthM: 5,
    surfaceTiltDegree: 10,
    surfaceAzimuthDegree: 180,
    obstacles: [],
  })
  const surveyRequestId = (await S.must(customer, 'POST', `/pre-surveys/${pre.preSurveyId}/submit`)).surveyRequestId
  const day = new Date(Date.now() + 31 * 3600_000).toISOString().slice(0, 10)
  const slots = await S.must(customer, 'GET', `/survey-slots?propertySiteId=${site.propertySiteId}&date=${day}`)
  const slot = slots.slots.find((x) => x.canBook)
  assert.ok(slot, `không còn giờ trống ngày ${day}: ${slots.coverageStatus}`)
  const { appointmentId } = await S.must(customer, 'POST', `/customers/me/survey-requests/${surveyRequestId}/booking`, {
    startsAt: slot.startsAt,
    note: null,
  })
  const open = await S.must('TECH', 'GET', `/technicians/me/open-appointments/${appointmentId}`)
  await S.must('TECH', 'POST', `/technicians/me/appointments/${appointmentId}/accept`, {
    expectedRevision: open.revision,
  })
  const start = await S.must('TECH', 'POST', `/technicians/me/appointments/${appointmentId}/onsite-survey/start`)
  await S.must('TECH', 'PUT', `/technicians/me/appointments/${appointmentId}/onsite-survey`, {
    revision: start.revision,
    roofType: 'METAL_SHEET',
    roofMaterial: 'Tôn lạnh',
    roofLengthM: 8,
    roofWidthM: 5,
    usableAreaM2: 32,
    tiltDegree: 10,
    azimuthDegree: 180,
    roofCondition: 'GOOD',
    electricalCabinetNotes: 'Tủ điện 1 pha',
    electricalConnectionNotes: null,
    installationFeasibility: 'FEASIBLE',
    proposedInverterLocation: 'Tầng trệt',
    proposedPanelLayoutNotes: null,
    measuredLatitude: null,
    measuredLongitude: null,
    notes: null,
    obstacles: [],
    billOfMaterials: null,
  })
  const roof = await S.uploadFile('TECH', 'ONSITE_SURVEY_EVIDENCE', 'mai.png', 'image/png', S.tinyPng())
  const att = await S.must('TECH', 'POST', `/technicians/me/appointments/${appointmentId}/onsite-survey/attachments`, {
    fileId: roof,
    category: 'ROOF',
    caption: 'Mái',
  })
  await S.must('TECH', 'POST', `/technicians/me/appointments/${appointmentId}/onsite-survey/complete`, {
    revision: att.revision,
  })

  await S.call('SALES', 'POST', `/survey-requests/${surveyRequestId}/claim`)
  let q = await S.must('SALES', 'POST', `/survey-requests/${surveyRequestId}/quotations`, {
    revision: null,
    laborCost: 3_000_000,
    transportCost: 300_000,
    otherServiceCost: 0,
    discountAmount: 0,
    taxRatePercent: 8,
    validUntil: `${vnDate(20)}T23:59:59+07:00`,
    terms: 'Bảo hành theo hợp đồng.',
    notes: null,
  })
  q = await S.must('SALES', 'POST', `/quotations/${q.quotationId}/lines`, {
    revision: q.revision,
    productId,
    name: null,
    unit: null,
    quantity: 8,
    unitPrice: null,
    description: null,
  })
  q = await S.must('SALES', 'POST', `/quotations/${q.quotationId}/issue`, { revision: q.revision, reviewNote: null })
  await S.must(customer, 'POST', `/customers/me/quotations/${q.quotationId}/accept`)

  let c = await S.must('SALES', 'POST', `/quotations/${q.quotationId}/contracts`, { terms: null, warrantyMonths: 60 })
  c = await S.must('SALES', 'POST', `/contracts/${c.contractId}/issue`, { revision: c.revision })
  const official = S.tinyPdf(`Hop dong ${label}`)
  const officialId = await S.uploadFile('SALES', 'CONTRACT_DOCUMENT', 'hop-dong.pdf', 'application/pdf', official)
  c = await S.must('SALES', 'PUT', `/contracts/${c.contractId}/official-document`, {
    revision: c.revision,
    fileId: officialId,
    canonicalHash: c.canonicalHash,
  })
  c = await S.must('SALES', 'POST', `/contracts/${c.contractId}/publish`, { revision: c.revision })
  const signedId = await S.uploadFile(
    customer,
    'SIGNED_CONTRACT',
    'ban-ky.pdf',
    'application/pdf',
    S.tinyPdf(`Ban ky ${label}`),
  )
  await S.must(customer, 'POST', `/customers/me/contracts/${c.contractId}/signed-document`, {
    fileId: signedId,
    officialDocumentSha256: S.sha256(official),
  })
  c = await S.must('MANAGER', 'GET', `/contracts/${c.contractId}`)
  await S.must('MANAGER', 'POST', `/contracts/${c.contractId}/review`, {
    revision: c.revision,
    decision: 'APPROVE',
    reason: null,
  })
  const link = await S.must(customer, 'POST', `/customers/me/contracts/${c.contractId}/payments`)
  await payFake(link.orderCode)
  await poll(
    async () => (await S.must(customer, 'GET', `/customers/me/contracts/${c.contractId}`)).status === 'PAID',
    'hợp đồng thứ hai đã thanh toán',
  )
  return { contractId: c.contractId, surveyRequestId }
}
