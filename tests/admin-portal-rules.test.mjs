import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  activeDefault,
  dashboardCsvName,
  dashboardParams,
  defaultDashboardRanges,
  installationWarrantyGap,
  parseWarrantyMonths,
  rangeError,
  refundedAtError,
  refundedAtValue,
  sortWarrantyOptions,
  warrantyMonthsError,
} from '../src/features/after-sales/adminAfterSalesRules.ts'
import {
  canPublishVersion,
  canReindexVersion,
  canRetryJob,
  canUnpublish,
  needsPolling,
  parseTags,
  tagsError,
  titleError,
  titleFromFileName,
} from '../src/features/knowledge/knowledgeRules.ts'
import { altTextError, imageUrlError, moveImage, sortImages } from '../src/features/products/productImageRules.ts'
import {
  communeDiff,
  communeSetError,
  normalizeZoneCode,
  stopsNewWork,
  zoneCodeError,
  zoneNameError,
  zoneState,
} from '../src/features/zones/zoneRules.ts'
import {
  ApiError,
  isFeatureUnavailable,
  pendingMigrationsOf,
  rateLimitedMessage,
  toApiError,
} from '../src/services/api/errors.ts'

const option = (kind, months, isActive, isDefault) => ({
  optionId: `${kind}-${months}`,
  kind,
  months,
  isActive,
  isDefault,
})

describe('thời hạn bảo hành', () => {
  test('nhận số tháng nguyên từ 1 đến 240', () => {
    assert.equal(parseWarrantyMonths('24'), 24)
    assert.equal(parseWarrantyMonths(' 240 '), 240)
    assert.equal(warrantyMonthsError('12'), undefined)
  })

  test('từ chối số tháng ngoài khoảng, số lẻ, ô trống', () => {
    for (const bad of ['0', '241', '1.5', '-3', 'abc']) assert.equal(parseWarrantyMonths(bad), null, bad)
    assert.match(warrantyMonthsError(''), /Nhập số tháng/)
    assert.match(warrantyMonthsError('241'), /từ 1 đến 240/)
  })

  test('hợp đồng chỉ phát hành được khi có thời hạn lắp đặt đang dùng; báo thiếu mặc định', () => {
    assert.equal(installationWarrantyGap([]), 'none')
    // Thời hạn sửa chữa không thay được thời hạn lắp đặt
    assert.equal(installationWarrantyGap([option('REPAIR', 12, true, true)]), 'none')
    assert.equal(installationWarrantyGap([option('INSTALLATION', 24, false, false)]), 'none')
    assert.equal(installationWarrantyGap([option('INSTALLATION', 24, true, false)]), 'no-default')
    assert.equal(installationWarrantyGap([option('INSTALLATION', 24, true, true)]), null)
  })

  test('mặc định đã tắt không được tính, sắp đang dùng lên trước rồi theo số tháng', () => {
    const list = [
      option('INSTALLATION', 60, true, false),
      option('INSTALLATION', 12, false, true),
      option('INSTALLATION', 24, true, false),
    ]
    assert.equal(activeDefault(list, 'INSTALLATION'), null)
    assert.deepEqual(
      sortWarrantyOptions(list).map((o) => o.months),
      [24, 60, 12],
    )
  })
})

describe('ghi nhận hoàn tiền', () => {
  const now = new Date('2026-11-03T03:00:00Z') // 10:00 giờ Việt Nam

  test('gửi ngày giờ kèm múi giờ Việt Nam', () => {
    assert.equal(refundedAtValue('2026-11-03', '09:30'), '2026-11-03T09:30:00+07:00')
    assert.equal(refundedAtError('2026-11-03', '09:30', now), undefined)
  })

  test('không nhận ngày giờ ở tương lai (backend cũng từ chối)', () => {
    assert.match(refundedAtError('2026-11-03', '10:15', now), /tương lai/)
    assert.match(refundedAtError('2026-11-04', '00:00', now), /tương lai/)
  })

  test('bắt buộc chọn ngày và giờ', () => {
    assert.match(refundedAtError('', '09:00', now), /Chọn ngày và giờ/)
    assert.match(refundedAtError('2026-11-03', '', now), /Chọn ngày và giờ/)
  })
})

describe('bộ lọc báo cáo sau bán', () => {
  test('mặc định tháng này so với tháng trước, như backend', () => {
    assert.deepEqual(defaultDashboardRanges('2026-11-03'), {
      from: '2026-11-01',
      to: '2026-11-30',
      compareFrom: '2026-10-01',
      compareTo: '2026-10-31',
    })
    // Qua năm và tháng 2 năm nhuận
    assert.deepEqual(defaultDashboardRanges('2027-01-15'), {
      from: '2027-01-01',
      to: '2027-01-31',
      compareFrom: '2026-12-01',
      compareTo: '2026-12-31',
    })
    assert.equal(defaultDashboardRanges('2028-03-01').compareTo, '2028-02-29')
  })

  test('khoảng ngày: kết thúc không trước bắt đầu, tối đa 367 ngày', () => {
    assert.equal(rangeError('2026-01-01', '2026-01-01'), undefined)
    assert.equal(rangeError('2026-01-01', '2027-01-02'), undefined) // 367 ngày
    assert.match(rangeError('2026-01-01', '2027-01-03'), /367/)
    assert.match(rangeError('2026-02-10', '2026-02-01'), /từ ngày bắt đầu/)
    assert.match(rangeError('', '2026-02-01'), /Chọn đủ/)
  })

  test('query đúng tên tham số swagger, bỏ ô trống; bản CSV dùng đúng bộ lọc đó', () => {
    const filter = {
      from: '2026-11-01',
      to: '2026-11-30',
      compareFrom: '2026-10-01',
      compareTo: '2026-10-31',
      zoneId: 'z1',
      serviceType: '',
      status: 'COMPLETED',
    }
    assert.deepEqual(dashboardParams(filter), {
      From: '2026-11-01',
      To: '2026-11-30',
      CompareFrom: '2026-10-01',
      CompareTo: '2026-10-31',
      ZoneId: 'z1',
      Status: 'COMPLETED',
    })
    assert.equal(dashboardCsvName(filter), 'bao-cao-sau-ban_2026-11-01_2026-11-30_so-voi_2026-10-01_2026-10-31.csv')
  })
})

describe('khu vực phục vụ', () => {
  test('mã khu được viết hoa như backend và hợp lệ theo mẫu', () => {
    assert.equal(normalizeZoneCode('  khu-thu-duc '), 'KHU-THU-DUC')
    assert.equal(zoneCodeError('khu-thu-duc'), undefined)
    assert.equal(zoneCodeError('Q1'), undefined)
  })

  test('từ chối mã sai mẫu và tên trống / quá dài', () => {
    for (const bad of ['', 'A', '-KHU', 'KHU_1', 'KHU 1', 'Đ1', 'A'.repeat(51)]) assert.ok(zoneCodeError(bad), bad)
    assert.match(zoneNameError('  '), /Nhập tên/)
    assert.match(zoneNameError('x'.repeat(151)), /150/)
  })

  test('thay cả danh sách: tính phần thêm và phần gỡ, kiểm mã phường xã', () => {
    assert.deepEqual(communeDiff(['26740', '26743'], ['26743', '27007']), { added: ['27007'], removed: ['26740'] })
    assert.deepEqual(communeDiff(['26740'], ['26740']), { added: [], removed: [] })
    assert.equal(communeSetError(['26740', '00123']), undefined)
    assert.match(communeSetError(['2674', 'abcde']), /2674, abcde/)
    assert.match(communeSetError(Array.from({ length: 501 }, (_, i) => String(10000 + i))), /500/)
  })

  test('tắt khu hay tạm ngừng nhận lịch là thay đổi bị chặn khi còn việc; ngừng hoạt động khác tạm ngừng', () => {
    const open = { isActive: true, isServiceable: true }
    assert.equal(stopsNewWork(open, { isActive: false, isServiceable: true }), true)
    assert.equal(stopsNewWork(open, { isActive: true, isServiceable: false }), true)
    assert.equal(stopsNewWork({ isActive: false, isServiceable: false }, open), false)
    assert.equal(zoneState(open), 'open')
    assert.equal(zoneState({ isActive: true, isServiceable: false }), 'paused')
    assert.equal(zoneState({ isActive: false, isServiceable: true }), 'inactive')
  })
})

describe('kho tri thức', () => {
  const doc = (status, versions = [], jobs = []) => ({ documentId: 'd', status, versions, jobs, revision: 3 })
  const version = (versionId, status) => ({ versionId, status, versionNumber: 1 })

  test('thẻ: cắt khoảng trắng, chữ thường, bỏ trùng; giới hạn số thẻ và độ dài', () => {
    assert.deepEqual(parseTags(' Inverter, inverter ,  Bảo hành,'), ['inverter', 'bảo hành'])
    assert.equal(tagsError('a, b'), undefined)
    assert.match(tagsError(Array.from({ length: 21 }, (_, i) => `t${i}`).join(',')), /20 thẻ/)
    assert.match(tagsError('x'.repeat(41)), /40 ký tự/)
  })

  test('tên tài liệu bắt buộc, tối đa 200 ký tự; gợi ý từ tên tệp', () => {
    assert.match(titleError(' '), /Nhập tên/)
    assert.match(titleError('x'.repeat(201)), /200/)
    assert.equal(titleFromFileName('chinh_sach-bao-hanh.v2.pdf'), 'chinh sach bao hanh.v2')
  })

  test('chỉ công bố được phiên bản đã nạp xong hoặc từng gỡ; không công bố bản đang nạp hay tài liệu đã lưu trữ', () => {
    assert.equal(canPublishVersion(doc('READY_FOR_REVIEW'), version('v1', 'READY_FOR_REVIEW')), true)
    assert.equal(canPublishVersion(doc('UNPUBLISHED'), version('v1', 'WITHDRAWN')), true)
    assert.equal(canPublishVersion(doc('PROCESSING'), version('v1', 'PROCESSING')), false)
    assert.equal(canPublishVersion(doc('FAILED'), version('v1', 'FAILED')), false)
    assert.equal(canPublishVersion(doc('ARCHIVED'), version('v1', 'READY_FOR_REVIEW')), false)
    assert.equal(canUnpublish(doc('PUBLISHED')), true)
    assert.equal(canUnpublish(doc('UNPUBLISHED')), false)
  })

  test('không nạp lại khi phiên bản còn lượt nạp chờ; chỉ chạy lại lượt lỗi; hỏi lại khi còn việc chạy nền', () => {
    const busy = doc('PROCESSING', [version('v1', 'PROCESSING')], [{ jobId: 'j', versionId: 'v1', status: 'RUNNING' }])
    assert.equal(canReindexVersion(busy, version('v1', 'PROCESSING')), false)
    assert.equal(canReindexVersion(doc('PUBLISHED', [], []), version('v1', 'PUBLISHED')), true)
    assert.equal(canRetryJob({ status: 'FAILED' }), true)
    assert.equal(canRetryJob({ status: 'COMPLETED' }), false)
    assert.equal(needsPolling(busy), true)
    assert.equal(
      needsPolling(doc('PUBLISHED', [version('v1', 'PUBLISHED')], [{ versionId: 'v1', status: 'COMPLETED' }])),
      false,
    )
  })
})

describe('ảnh sản phẩm', () => {
  test('chỉ nhận link https tuyệt đối, không kèm tài khoản', () => {
    assert.equal(imageUrlError('https://cdn.example.com/a.jpg'), undefined)
    assert.match(imageUrlError('http://cdn.example.com/a.jpg'), /https/)
    assert.match(imageUrlError('https://user:pass@cdn.example.com/a.jpg'), /mật khẩu/)
    assert.match(imageUrlError('anh.jpg'), /đúng dạng/)
    assert.match(imageUrlError(`https://x.com/${'a'.repeat(1000)}`), /1000/)
    assert.match(imageUrlError(''), /Nhập link/)
  })

  test('mô tả ảnh tối đa 255 ký tự', () => {
    assert.equal(altTextError('Mặt trước'), undefined)
    assert.match(altTextError('x'.repeat(256)), /255/)
  })

  test('đổi thứ tự gửi đủ mọi ảnh; ra ngoài danh sách thì giữ nguyên', () => {
    assert.deepEqual(moveImage(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b'])
    assert.deepEqual(moveImage(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c'])
    assert.deepEqual(moveImage(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c'])
    assert.deepEqual(
      sortImages([
        { id: 'b', sortOrder: 2 },
        { id: 'a', sortOrder: 0 },
      ]).map((i) => i.id),
      ['a', 'b'],
    )
  })
})

describe('lỗi backend dùng chung', () => {
  test('dịch mã lỗi mới của khu vực, kho tri thức, ảnh sản phẩm', () => {
    const stale = toApiError(409, {
      isSuccess: false,
      error: { code: 'ZONE_STALE_REVISION', message: 'The zone changed' },
    })
    assert.match(stale.message, /Khu vực vừa được sửa/)
    assert.match(toApiError(409, { error: { code: 'COMMUNE_ALREADY_MAPPED' } }).message, /khu khác/)
    assert.match(toApiError(409, { error: { code: 'RAG_CONFIG_INVALID_STATE' } }).message, /đang dùng/)
    assert.match(toApiError(409, { error: { code: 'PRODUCT_IMAGE_LIMIT_REACHED' } }).message, /tối đa/)
  })

  test('chức năng tắt / DB thiếu migration không phải lỗi thường, đọc được danh sách migration', () => {
    const off = toApiError(503, { error: { code: 'FEATURE_PENDING_MIGRATION', message: 'not enabled' } })
    assert.equal(isFeatureUnavailable(off), true)
    assert.doesNotMatch(off.message, /lắp đặt/)
    const schema = toApiError(503, {
      error: {
        code: 'SCHEMA_NOT_READY',
        details: { pendingMigrations: ['20261030201618_KnowledgeDocumentAudience', 7] },
      },
    })
    assert.equal(isFeatureUnavailable(schema), true)
    assert.deepEqual(pendingMigrationsOf(schema), ['20261030201618_KnowledgeDocumentAudience'])
    assert.equal(isFeatureUnavailable(toApiError(500, {})), false)
    assert.deepEqual(pendingMigrationsOf(new Error('x')), [])
  })

  test('429 báo số giây phải chờ theo Retry-After', () => {
    assert.match(rateLimitedMessage(new ApiError({ status: 429, message: 'x', retryAfter: 42 })), /42 giây/)
    assert.equal(rateLimitedMessage(new ApiError({ status: 403, message: 'Không có quyền' })), 'Không có quyền')
  })
})
