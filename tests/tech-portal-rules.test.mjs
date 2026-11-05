// Luật của cổng kỹ thuật viên cho 5 endpoint còn lại (chi tiết lịch chờ nhận, bổ sung biên bản khảo sát, sửa luôn, kết
// thúc buổi chờ, hạng mục phát sinh) và field stayOnSite của báo cáo kiểm tra. Bám TechnicianServiceHandlers,
// AfterSalesWorkflow.NextStatus, OnSiteSurveyHandlers.AmendAsync của backend `main` (7c79fa8). Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  canAddSupplementary,
  canContinueRepair,
  canFinishOnSite,
  canReportInspection,
  canReportWork,
  continueRepairBody,
  continueRepairErrors,
  emptyItemDraft,
  finishBody,
  inspectionBody,
  inspectionError,
  minutesLeft,
  onSiteBlock,
  parseMinutes,
  readiness,
  repairTimeWarning,
  supplementaryBody,
  supplementaryErrors,
} from '../src/features/after-sales/technicianVisitRules.ts'
import {
  amendmentBody,
  amendmentDiff,
  amendmentEntries,
  amendmentErrors,
  amendmentFiles,
  amendmentsNewestFirst,
  canAmend,
} from '../src/features/onsite-survey/onSiteSurveyAmendment.ts'

const NOW = Date.parse('2026-11-04T09:00:00+07:00')
const visit = (over = {}) => ({
  visitId: 'v1',
  purpose: 'INSPECTION',
  status: 'IN_PROGRESS',
  assignmentStatus: 'ACCEPTED',
  startsAt: '2026-11-04T08:30:00+07:00',
  endsAt: '2026-11-04T10:30:00+07:00',
  waitingOnSite: false,
  items: [],
  assets: [],
  evidence: [],
  ...over,
})
const item = (coverage, status, over = {}) => ({ itemId: `${coverage}-${status}`, coverage, status, ...over })
const fault = { assetId: '', description: 'Quạt inverter kêu', diagnosis: 'Bạc đạn mòn', requiredParts: '' }

describe('báo cáo kiểm tra và stayOnSite', () => {
  test('có hạng mục và chọn ở lại thì gửi stayOnSite: true, assetId trống thành null', () => {
    const body = inspectionBody({ report: ' Kiểm tra inverter ', noFault: false, stayOnSite: true, items: [fault] })
    assert.deepEqual(body, {
      report: 'Kiểm tra inverter',
      noFaultFound: false,
      items: [{ assetId: null, description: 'Quạt inverter kêu', diagnosis: 'Bạc đạn mòn', requiredParts: null }],
      stayOnSite: true,
    })
  })
  test('không lỗi thì không bao giờ gửi stayOnSite: true (backend từ chối "Nothing to repair")', () => {
    const body = inspectionBody({ report: 'Chạy bình thường', noFault: true, stayOnSite: true, items: [fault] })
    assert.equal(body.stayOnSite, false)
    assert.deepEqual(body.items, [])
  })
  test('không chọn ở lại thì gửi stayOnSite: false', () => {
    assert.equal(inspectionBody({ report: 'x', noFault: false, stayOnSite: false, items: [fault] }).stayOnSite, false)
  })
  test('thiếu mô tả, thiếu chẩn đoán, không có hạng mục mà cũng không đánh dấu không lỗi đều bị chặn', () => {
    assert.match(inspectionError({ report: ' ', noFault: true, stayOnSite: false, items: [] }), /Ghi bạn đã kiểm tra/)
    assert.match(
      inspectionError({ report: 'x', noFault: false, stayOnSite: false, items: [{ ...fault, diagnosis: '' }] }),
      /tên và chẩn đoán/,
    )
    assert.match(inspectionError({ report: 'x', noFault: false, stayOnSite: false, items: [] }), /ít nhất một hạng mục/)
    assert.equal(inspectionError({ report: 'x', noFault: true, stayOnSite: false, items: [] }), null)
  })
  test('chỉ báo cáo kiểm tra được khi buổi kiểm tra đang làm và chưa gửi kết quả (đang chờ tại công trình là đã gửi)', () => {
    assert.equal(canReportInspection(visit()), true)
    assert.equal(canReportInspection(visit({ waitingOnSite: true })), false)
    assert.equal(canReportInspection(visit({ status: 'SCHEDULED' })), false)
    assert.equal(canReportInspection(visit({ purpose: 'REPAIR' })), false)
  })
})

describe('chờ tại công trình: sửa luôn và kết thúc buổi chờ', () => {
  test('sửa luôn / kết thúc chỉ khi đang chờ tại công trình; sửa luôn cần người đã nhận', () => {
    assert.equal(canContinueRepair(visit({ waitingOnSite: true })), true)
    assert.equal(canContinueRepair(visit({ waitingOnSite: true, assignmentStatus: 'COMPLETED' })), false)
    assert.equal(canContinueRepair(visit()), false)
    assert.equal(canFinishOnSite(visit({ waitingOnSite: true })), true)
    assert.equal(canFinishOnSite(visit({ status: 'REPORTED' })), false)
  })
  test('số phút: nguyên 1–480, bắt chọn có linh kiện hay không', () => {
    assert.deepEqual(continueRepairErrors({ minutes: '45', partsAvailable: true }), {})
    assert.match(continueRepairErrors({ minutes: '', partsAvailable: true }).minutes, /Ước tính/)
    for (const bad of ['0', '481', '1,5', '-3', 'abc'])
      assert.match(continueRepairErrors({ minutes: bad, partsAvailable: true }).minutes, /1 đến 480/, bad)
    assert.match(continueRepairErrors({ minutes: '45', partsAvailable: null }).parts, /linh kiện/)
    assert.equal(parseMinutes(' 30 '), 30)
    assert.ok(Number.isNaN(parseMinutes('3.5')))
  })
  test('body đúng ContinueRepairRequest; thiếu linh kiện vẫn gửi để backend quyết định', () => {
    assert.deepEqual(continueRepairBody({ minutes: '60', partsAvailable: true }), {
      estimatedMinutes: 60,
      partsAvailable: true,
    })
    assert.deepEqual(continueRepairBody({ minutes: '60', partsAvailable: false }), {
      estimatedMinutes: 60,
      partsAvailable: false,
    })
  })
  test('gợi ý thời gian theo khung giờ còn lại, không chặn', () => {
    const v = visit({ waitingOnSite: true })
    assert.equal(minutesLeft(v, NOW), 90)
    assert.equal(repairTimeWarning(v, 60, NOW), null)
    assert.match(repairTimeWarning(v, 120, NOW), /còn khoảng 90 phút/)
    assert.match(repairTimeWarning(v, 10, Date.parse('2026-11-04T11:00:00+07:00')), /đã hết/)
  })
  test('ba lỗi chặn sửa luôn có câu hướng dẫn kết thúc buổi chờ; lỗi khác thì không', () => {
    for (const code of [
      'AFTER_SALES_PAYMENT_REQUIRED',
      'AFTER_SALES_PARTS_UNAVAILABLE',
      'AFTER_SALES_REPAIR_TIME_INSUFFICIENT',
    ])
      assert.match(onSiteBlock(code).body, /[Kk]ết thúc buổi chờ/, code)
    assert.equal(onSiteBlock('AFTER_SALES_INVALID_STATE'), null)
    assert.equal(onSiteBlock(null), null)
  })
  test('tình hình hạng mục theo NextStatus: quyết định → báo giá → thanh toán → được làm', () => {
    assert.deepEqual(readiness([item('PENDING', 'OPEN'), item('CHARGEABLE', 'QUOTED')]), {
      state: 'decision',
      count: 1,
    })
    assert.deepEqual(readiness([item('CHARGEABLE', 'OPEN')]), { state: 'quotation', count: 1 })
    assert.deepEqual(readiness([item('DISASTER_PROTECTION', 'OPEN')]), { state: 'quotation', count: 1 })
    assert.deepEqual(readiness([item('CHARGEABLE', 'QUOTED'), item('INSTALLATION_WARRANTY', 'AUTHORIZED')]), {
      state: 'payment',
      count: 1,
    })
    assert.deepEqual(readiness([item('INSTALLATION_WARRANTY', 'AUTHORIZED'), item('CHARGEABLE', 'DECLINED')]), {
      state: 'ready',
      count: 1,
    })
    assert.deepEqual(readiness([item('CHARGEABLE', 'DECLINED')]), { state: 'none', count: 0 })
  })
  test('ghi chú kết thúc không bắt buộc: trống gửi null', () => {
    assert.deepEqual(finishBody('  '), { note: null })
    assert.deepEqual(finishBody(' Khách chưa trả tiền '), { note: 'Khách chưa trả tiền' })
  })
})

describe('hạng mục phát sinh', () => {
  test('chỉ trong buổi sửa / làm lại đang làm', () => {
    assert.equal(canAddSupplementary(visit({ purpose: 'REPAIR' })), true)
    assert.equal(canAddSupplementary(visit({ purpose: 'REWORK' })), true)
    assert.equal(canAddSupplementary(visit({ purpose: 'INSPECTION' })), false)
    assert.equal(canAddSupplementary(visit({ purpose: 'MAINTENANCE' })), false)
    assert.equal(canAddSupplementary(visit({ purpose: 'REPAIR', status: 'REPORTED' })), false)
    assert.equal(canReportWork(visit({ purpose: 'REPAIR' })), true)
    assert.equal(canReportWork(visit()), false)
  })
  test('tên và chẩn đoán bắt buộc, có giới hạn độ dài; requiredParts là chuỗi', () => {
    const errors = supplementaryErrors(emptyItemDraft())
    assert.ok(errors.description && errors.diagnosis)
    assert.match(supplementaryErrors({ ...fault, description: 'x'.repeat(501) }).description, /500/)
    assert.match(supplementaryErrors({ ...fault, requiredParts: 'x'.repeat(1001) }).requiredParts, /1000/)
    assert.deepEqual(supplementaryErrors(fault), {})
    assert.deepEqual(supplementaryBody({ ...fault, assetId: 'a1', requiredParts: ' 1 bạc đạn ' }), {
      assetId: 'a1',
      description: 'Quạt inverter kêu',
      diagnosis: 'Bạc đạn mòn',
      requiredParts: '1 bạc đạn',
    })
  })
})

const values = (over = {}) => ({
  roofType: 'Mái bằng',
  roofMaterial: 'Bê tông',
  roofLengthM: 10,
  roofWidthM: 8,
  usableAreaM2: 60,
  tiltDegree: 5,
  azimuthDegree: 180,
  roofCondition: 'GOOD',
  installationFeasibility: 'FEASIBLE',
  electricalCabinetNotes: 'Tủ tầng trệt',
  electricalConnectionNotes: null,
  proposedInverterLocation: 'Gara',
  proposedPanelLayoutNotes: null,
  notes: null,
  measuredLatitude: null,
  measuredLongitude: null,
  obstacles: [],
  ...over,
})

describe('bổ sung biên bản khảo sát', () => {
  test('chỉ gửi ô đã đổi, không gửi lại cả form', () => {
    const diff = amendmentDiff(values({ roofWidthM: 9, notes: 'Đo lại' }), values())
    assert.deepEqual(diff.changes, { roofWidthM: 9, notes: 'Đo lại' })
    assert.deepEqual(diff.changed, ['notes', 'roofWidthM'])
    assert.deepEqual(diff.uncleared, [])
  })
  test('xoá trắng ô chữ không bắt buộc gửi "" (backend lưu thành trống); ô chưa có giữ nguyên', () => {
    const diff = amendmentDiff(values({ proposedInverterLocation: null }), values())
    assert.deepEqual(diff.changes, { proposedInverterLocation: '' })
    assert.deepEqual(amendmentDiff(values({ notes: null }), values({ notes: null })).changed, [])
  })
  test('ô số / toạ độ bị xoá thì không gửi được (null là giữ nguyên ở backend)', () => {
    assert.deepEqual(amendmentDiff(values({ tiltDegree: null }), values()).uncleared, ['tiltDegree'])
    const gps = amendmentDiff(values(), values({ measuredLatitude: 10.7, measuredLongitude: 106.6 }))
    assert.deepEqual(gps.uncleared, ['measuredLatitude'])
    assert.match(amendmentErrors({ reason: 'x', diff: gps, fileCount: 0 }).form, /không xoá được/)
  })
  test('đổi toạ độ thì gửi cả vĩ độ và kinh độ', () => {
    const diff = amendmentDiff(
      values({ measuredLatitude: 10.71, measuredLongitude: 106.6 }),
      values({ measuredLatitude: 10.7, measuredLongitude: 106.6 }),
    )
    assert.deepEqual(diff.changes, { measuredLatitude: 10.71, measuredLongitude: 106.6 })
  })
  test('vật cản đổi thì gửi cả danh sách mới (kể cả rỗng)', () => {
    const tank = { kind: 'WATER_TANK', description: null, heightM: 1.5, areaM2: 2 }
    assert.deepEqual(amendmentDiff(values(), values({ obstacles: [tank] })).changes, { obstacles: [] })
    assert.deepEqual(amendmentDiff(values({ obstacles: [tank] }), values()).changes, { obstacles: [tank] })
  })
  test('lý do bắt buộc ≤ 1000; không đổi gì và không thêm tệp thì bị chặn; chỉ thêm tệp vẫn được', () => {
    const none = amendmentDiff(values(), values())
    assert.match(amendmentErrors({ reason: ' ', diff: none, fileCount: 1 }).reason, /Ghi lý do/)
    assert.match(amendmentErrors({ reason: 'x'.repeat(1001), diff: none, fileCount: 1 }).reason, /1000/)
    assert.match(amendmentErrors({ reason: 'Đo lại', diff: none, fileCount: 0 }).form, /Chưa có gì thay đổi/)
    assert.deepEqual(amendmentErrors({ reason: 'Thêm ảnh tủ điện', diff: none, fileCount: 1 }), {})
  })
  test('body gửi revision đang xem, lý do đã cắt khoảng trắng và fileId đã tải', () => {
    const diff = amendmentDiff(values({ roofWidthM: 9 }), values())
    assert.deepEqual(amendmentBody({ revision: 5, reason: ' Đo lại ', diff, fileIds: ['f1'] }), {
      revision: 5,
      reason: 'Đo lại',
      changes: { roofWidthM: 9 },
      additionalFileIds: ['f1'],
    })
  })
  test('chỉ bổ sung khi biên bản đã hoàn thành, đúng lịch và lịch còn là của mình', () => {
    const survey = { status: 'COMPLETED', appointmentId: 'a1' }
    assert.equal(canAmend(survey, { appointmentId: 'a1', status: 'COMPLETED' }), true)
    assert.equal(canAmend({ ...survey, status: 'IN_PROGRESS' }, { appointmentId: 'a1', status: 'ACCEPTED' }), false)
    assert.equal(canAmend(survey, { appointmentId: 'a2', status: 'COMPLETED' }), false)
    assert.equal(canAmend(survey, { appointmentId: 'a1', status: 'CANCELLED' }), false)
    assert.equal(canAmend(null, { appointmentId: 'a1', status: 'COMPLETED' }), false)
  })
  test('đọc lịch sử: { ô: { old, new } }, vật cản, bỏ qua dạng lạ; mới nhất lên đầu; tệp ghép theo mốc giờ', () => {
    const entries = amendmentEntries({
      roofWidthM: { old: 8, new: 9 },
      obstacles: { old: [], new: [{ kind: 'CHIMNEY', description: 'Ống khói', heightM: 2, areaM2: null }] },
      weird: 42,
    })
    assert.deepEqual(entries, [
      { field: 'roofWidthM', kind: 'value', old: 8, new: 9 },
      {
        field: 'obstacles',
        kind: 'obstacles',
        old: [],
        new: [{ kind: 'CHIMNEY', description: 'Ống khói', heightM: 2, areaM2: null }],
      },
    ])
    assert.deepEqual(amendmentEntries(null), [])
    const list = [{ amendmentNumber: 1 }, { amendmentNumber: 2 }]
    assert.deepEqual(
      amendmentsNewestFirst(list).map((a) => a.amendmentNumber),
      [2, 1],
    )
    const at = '2026-11-04T02:00:00Z'
    const files = [
      { attachmentId: 'x', amendmentId: 'am', addedAt: at },
      { attachmentId: 'y', amendmentId: null, addedAt: at },
      { attachmentId: 'z', amendmentId: 'am2', addedAt: '2026-11-04T03:00:00Z' },
    ]
    assert.deepEqual(
      amendmentFiles({ createdAt: at }, files).map((f) => f.attachmentId),
      ['x'],
    )
  })
})
