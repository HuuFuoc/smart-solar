// Chuỗi tiền đề nhiều bước gọi API nghiệp vụ THẬT của stack kiểm thử (stack-api.mjs), dùng lại ở nhiều giai đoạn. Các bước ở đây nằm
// ngoài 76 endpoint (hoặc đã có bằng chứng giao diện ở giai đoạn trước), không tính là bằng chứng giao diện. Không sửa DB tay: mọi
// trạng thái (đã thanh toán, đã bàn giao…) đều do backend chuyển qua đúng lệnh của từng vai trò. Luồng hợp đồng theo backend `main`
// 7d27054: hợp đồng 30/70 lập khi khách đồng ý, trả 30% → ký giấy (ảnh từng trang) → thi công → KHÁCH nghiệm thu → trả 70%.
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

/** Giờ làm cả ngày, mọi ngày cho TECH: giờ hẹn / giờ giao gần lúc chạy kiểm thử vẫn hợp lệ. Trả mã kỹ thuật viên */
export async function openTechnicianDay() {
  const tech = await S.userId('TECH')
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  await S.must('ADMIN', 'PUT', `/admin/technicians/${tech}/working-schedule`, {
    useDefault: false,
    periods: days.map((day) => ({ day, start: '00:00', end: '23:59' })),
  })
  return tech
}

/** Dự án thi công của hợp đồng: dự án backend tự lập khi xác nhận lịch, hoặc quản lý lập cho hợp đồng sẵn sàng thi công */
export async function projectOf(contractId) {
  const created = await S.call('MANAGER', 'POST', `/contracts/${contractId}/installation-project`)
  const projectId =
    created.data?.projectId ??
    (await S.must('MANAGER', 'GET', '/installation-projects')).find((p) => p.contractId === contractId)?.projectId
  assert.ok(projectId, `không có dự án: ${created.status} ${created.error?.code}`)
  return projectId
}

/** Quản lý xong mọi mục checklist bắt buộc (PROJECT_DOCUMENT đã xác minh) */
export async function satisfyChecklist(projectId) {
  const p = await S.must('MANAGER', 'GET', `/installation-projects/${projectId}`)
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
}

/**
 * Quản lý giao dự án cho TECH, bắt đầu sau khoảng 70 giây (dự án đã có người thì là đổi lịch, lý do bắt buộc); kỹ thuật viên phải
 * nhận lại việc. Trả giờ bắt đầu
 */
export async function assignSoon(projectId) {
  const tech = await openTechnicianDay()
  const p = await S.must('MANAGER', 'GET', `/installation-projects/${projectId}`)
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
    reason: p.responsibleTechnician ? 'Kiểm thử: dời giờ thi công sớm hơn theo khách' : null,
    expectedRevision: p.revision,
    crossZoneAuthorized: false,
  })
  return startsAt
}

/** Kỹ thuật viên nhận việc (khi đang chờ nhận) rồi đợi tới giờ được giao */
export async function acceptAndWait(projectId, startsAt) {
  const tv = await S.must('TECH', 'GET', `/technicians/me/installation-projects/${projectId}`)
  if (tv.status === 'PENDING_TECHNICIAN_ACCEPTANCE')
    await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/accept`, {
      expectedRevision: tv.revision,
    })
  await sleep(Math.max(0, Date.parse(startsAt) - Date.now()) + 5000)
}

/**
 * Kỹ thuật viên chụp ảnh lượt hiện tại, (lần đầu) ghi tấm pin + inverter ngoài báo giá và quản lý duyệt thiết bị khác hợp đồng, rồi
 * gửi báo cáo hoàn thành. Trả dự án phía quản lý sau khi báo cáo
 */
export async function reportCompletion(projectId, panelProductId, { registerAssets = true, report } = {}) {
  const photo = await S.uploadFile('TECH', 'INSTALLATION_EVIDENCE', 'lap-dat.png', 'image/png', S.tinyPng())
  await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/evidence`, {
    fileId: photo,
    caption: 'Đã lắp xong',
  })
  if (registerAssets) {
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
    const p = await S.must('MANAGER', 'GET', `/installation-projects/${projectId}`)
    // Không lệch thiết bị thì backend từ chối lệnh duyệt (không sao); lệch mà chưa duyệt thì khách không nghiệm thu được
    await S.call('MANAGER', 'POST', `/installation-projects/${projectId}/equipment-substitution/approve`, {
      reason: 'Kiểm thử: lắp thêm inverter ngoài báo giá',
      expectedRevision: p.revision,
    })
  }
  const tv = await S.must('TECH', 'GET', `/technicians/me/installation-projects/${projectId}`)
  await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/completion-report`, {
    completionReport: report ?? 'Lắp đặt hoàn tất, chạy thử đạt.',
    expectedRevision: tv.revision,
  })
  return S.must('MANAGER', 'GET', `/installation-projects/${projectId}`)
}

/** Khách nghiệm thu báo cáo đang chờ (API). Hợp đồng 30/70 thì khoản 70% đến hạn trong cùng giao dịch */
export async function customerAccept(customer, projectId) {
  const p = await S.must(customer, 'GET', `/customers/me/installation-projects/${projectId}`)
  return S.must(customer, 'POST', `/customers/me/installation-projects/${projectId}/acceptance`, {
    decision: 'ACCEPT',
    reason: null,
    evidenceFileIds: null,
    expectedRevision: p.revision,
  })
}

/** Khách trả một khoản của hợp đồng 30/70 qua PayOS giả lập rồi chờ backend ghi khoản đó PAID. Trả ContractView */
export async function payInstallment(customer, contractId, sequence) {
  const open = await S.must(
    customer,
    'POST',
    `/customers/me/contracts/${contractId}/installments/${sequence}/payment`,
    {
      method: 'ONLINE',
    },
  )
  await payFake(open.current.orderCode)
  return poll(async () => {
    const c = await S.must(customer, 'GET', `/customers/me/contracts/${contractId}`)
    return c.paymentPlan?.installments.find((i) => i.sequence === sequence)?.status === 'PAID' && c
  }, `khoản ${sequence} được xác minh`)
}

/**
 * Hợp đồng sẵn sàng thi công (30/70 SIGNED, hoặc hợp đồng cũ PAID) → dự án → phân công → checklist → kỹ thuật viên lắp, ghi thiết bị
 * → quản lý duyệt thiết bị khác hợp đồng → báo cáo → KHÁCH nghiệm thu (backend 7d27054; quản lý không nghiệm thu thay khách) → bàn
 * giao; hợp đồng 30/70 thì khách trả khoản 70% → PAID. Trả { projectId, assets }
 */
export async function installAndHandOver(contractId, panelProductId, customer = 'CUSTOMER') {
  const projectId = await projectOf(contractId)
  const startsAt = await assignSoon(projectId)
  await satisfyChecklist(projectId)
  await acceptAndWait(projectId, startsAt)
  await S.must('TECH', 'POST', `/technicians/me/installation-projects/${projectId}/start`)
  await reportCompletion(projectId, panelProductId)
  await customerAccept(customer, projectId)
  await S.must(customer, 'GET', `/customers/me/installation-projects/${projectId}/handover`)
  const view = await S.must(customer, 'GET', `/customers/me/installation-projects/${projectId}`)
  assert.equal(view.status, 'COMPLETED')
  const contract = await S.must(customer, 'GET', `/customers/me/contracts/${contractId}`)
  if (contract.paymentPlan && !contract.paymentPlan.fullyPaid) await payInstallment(customer, contractId, 2)
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
 * Một khách đi luồng 1–2 bằng API tới hợp đồng 30/70 (backend 7d27054): đánh giá sơ bộ ở Bến Thành, đặt giờ, kỹ thuật viên nhận
 * và hoàn thành khảo sát, lập giỏ, chốt giá, ghi khách đồng ý (backend lập ngay hợp đồng bản nháp + hai khoản). `through`: 'agreed'
 * dừng ở bản nháp; 'deposit' trả 30% qua PayOS giả lập (AWAITING_SIGNATURE); 'signed' thêm ảnh 1 trang hợp đồng giấy rồi chốt
 * (SIGNED, sẵn sàng thi công). Trả { contractId, surveyRequestId, quotationId }
 */
export async function planContract(customer, label, productId, { through = 'signed' } = {}) {
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

  // Kỹ thuật viên lập giỏ, chốt giá, ghi khách đồng ý: backend lập ngay hợp đồng 30/70 (bản nháp); không còn trả 100% báo giá
  let q = await S.must('TECH', 'POST', `/technician/survey-requests/${surveyRequestId}/quotation`, { notes: null })
  q = await S.must('TECH', 'POST', `/technician/quotations/${q.quotationId}/lines`, {
    revision: q.revision,
    productId,
    quantity: 8,
  })
  q = await S.must('TECH', 'POST', `/technician/quotations/${q.quotationId}/issue`, { revision: q.revision })
  q = await S.must('TECH', 'POST', `/technician/quotations/${q.quotationId}/on-site-decision`, {
    decision: 'AGREED',
    revision: q.revision,
    note: 'Kiểm thử: khách đồng ý tại nhà',
  })
  assert.ok(q.contractId, 'ghi khách đồng ý phải trả hợp đồng 30/70')
  const result = { contractId: q.contractId, surveyRequestId, quotationId: q.quotationId }
  if (through === 'agreed') return result

  const deposit = await S.must('TECH', 'POST', `/technician/contracts/${q.contractId}/installments/1/payment`, {
    method: 'ONLINE',
  })
  await payFake(deposit.current.orderCode)
  await poll(
    async () => (await S.must('MANAGER', 'GET', `/contracts/${q.contractId}`)).status === 'AWAITING_SIGNATURE',
    'khoản 30% được xác minh',
  )
  if (through === 'deposit') return result

  const page = await S.uploadFile('TECH', 'SIGNED_CONTRACT_PAGE', 'trang-1.png', 'image/png', S.tinyPng())
  await S.must('TECH', 'POST', `/technician/contracts/${q.contractId}/signature-set`, {
    expectedPageCount: 1,
    signedOn: vnDate(0),
    note: null,
  })
  const set = await S.must('TECH', 'PUT', `/technician/contracts/${q.contractId}/signature-set/pages/1`, {
    fileId: page,
  })
  await S.must('TECH', 'POST', `/technician/contracts/${q.contractId}/signature-set/finalize`, {
    expectedRevision: set.revision,
  })
  assert.equal((await S.must('MANAGER', 'GET', `/contracts/${q.contractId}`)).status, 'SIGNED')
  return result
}

/** Hợp đồng 30/70 đã trả đủ (PAID) và công trình đã bàn giao của một khách. Trả { contractId, surveyRequestId, quotationId, projectId } */
export async function paidContract(customer, label, productId) {
  const plan = await planContract(customer, label, productId, { through: 'signed' })
  const { projectId } = await installAndHandOver(plan.contractId, productId, customer)
  return { ...plan, projectId }
}
