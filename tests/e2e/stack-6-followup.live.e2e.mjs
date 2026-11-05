// Giai đoạn 6 trên backend thật (xem stack-harness.mjs): việc nhắc khách đặt lịch bảo trì do BACKEND tự mở. Lượt bảo trì chưa đặt của gói
// mua ở giai đoạn 4 được báo khách, sau `afterSales.customerResponseHours` (mức nhỏ nhất 1 giờ) mà khách chưa đặt thì lần quét tiếp theo
// mở việc MAINTENANCE_FOLLOW_UP. Vì vậy chạy giai đoạn này ít nhất ~1 giờ sau giai đoạn 4; không sửa DB hay đồng hồ để rút ngắn.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'
import * as F from './stack-flows.mjs'

const { skip, state, evidence, as, mark, expectCall } = await setupStack('6-followup')

describe('6. Việc nhắc khách của kinh doanh', { skip }, () => {
  test('M08 + S12 + S13: quản lý giao việc nhắc → kinh doanh bắt đầu → ghi liên hệ (giờ chưa tới bị chặn) → hẹn sau giữ việc mở → không liên lạc được đóng việc', async () => {
    assert.ok(state.followUpEntitlementId && state.maintenancePurchasedAt, 'cần chạy giai đoạn 4 trước')
    const due = Date.parse(state.maintenancePurchasedAt) + 3600_000
    assert.ok(
      Date.now() > due - 10 * 60_000,
      `chưa đủ 1 giờ kể từ giai đoạn 4 (chạy sau ${new Date(due).toISOString()})`,
    )
    const task = await F.poll(
      async () =>
        (await S.must('MANAGER', 'GET', '/manager/after-sales/tasks')).find(
          (t) => t.taskType === 'MAINTENANCE_FOLLOW_UP' && t.entitlementId === state.followUpEntitlementId,
        ),
      'backend mở việc nhắc đặt lịch bảo trì',
      Math.max(5 * 60_000, due + 5 * 60_000 - Date.now()),
      15_000,
    )
    assert.equal(task.status, 'OPEN')

    const manager = await as('MANAGER', '/manage/sales-tasks')
    const row = manager
      .locator('section li', { hasText: 'Nhắc khách đặt lịch bảo trì' })
      .filter({ has: manager.getByRole('button', { name: 'Giao việc' }) })
    await row.first().getByRole('button', { name: 'Giao việc' }).click()
    const assign = manager.getByRole('dialog', { name: 'Giao việc' })
    await assign.locator('#assign-sales').selectOption(await S.userId('SALES'))
    let t = mark()
    await assign.getByRole('button', { name: 'Giao việc' }).click()
    await expectCall('M08', t)

    // Hồi quy cổng quản trị: giao lại cùng lệnh M08, danh sách kinh doanh lấy từ cùng API; thiếu lý do bị chặn ở giao diện
    const admin = await as('ADMIN', '/admin/sales-tasks')
    const held = admin
      .locator('section li', { hasText: 'Nhắc khách đặt lịch bảo trì' })
      .filter({ has: admin.getByRole('button', { name: 'Giao lại' }) })
    await held.first().getByRole('button', { name: 'Giao lại' }).click()
    const reassign = admin.getByRole('dialog', { name: 'Giao việc' })
    await reassign.locator('#assign-sales').selectOption(await S.userId('SALES2'))
    t = mark()
    await reassign.getByRole('button', { name: 'Giao lại' }).click()
    await admin.waitForTimeout(500)
    assert.equal(evidence.slice(t).filter((e) => e.id === 'M08').length, 0, 'giao lại thiếu lý do thì không gửi')
    await reassign.locator('#assign-reason').fill('Kinh doanh Một nghỉ phép')
    await reassign.getByRole('button', { name: 'Giao lại' }).click()
    await expectCall('M08', t)
    assert.equal(evidence.slice(t).filter((e) => e.id === 'M08' && e.actor === 'ADMIN').length, 1)
    const notMine = await S.call('SALES', 'POST', `/sales/after-sales/tasks/${task.taskId}/start`)
    assert.equal(
      notMine.error?.code,
      'AFTER_SALES_INVALID_STATE',
      'người cũ không bắt đầu được việc đã giao cho người khác',
    )

    const sales = await as('SALES2', '/ops/after-sales')
    const mine = sales
      .locator('main li', { hasText: 'Nhắc khách đặt lịch bảo trì' })
      .filter({ hasText: 'Lượt bảo trì của gói' })
    t = mark()
    await mine.getByRole('button', { name: 'Bắt đầu' }).click()
    await expectCall('S12', t)

    await mine.getByRole('button', { name: 'Ghi liên hệ' }).click()
    let follow = sales.getByRole('dialog', { name: 'Ghi liên hệ khách' })
    await follow.getByLabel('Kết quả liên hệ').fill('Khách bận, hẹn gọi lại cuối tuần')
    const nowSlot = await follow.getByLabel('Giờ liên hệ').inputValue()
    const vnHour = new Date(Date.now() + 7 * 3600_000).getUTCHours()
    if (vnHour < 23) {
      await follow.getByLabel('Giờ liên hệ').selectOption('23:45')
      t = mark()
      await follow.getByRole('button', { name: 'Lưu liên hệ' }).click()
      await follow.getByText('Thời điểm liên hệ chưa tới; chọn lúc đã gọi xong.').waitFor()
      assert.equal(evidence.slice(t).filter((e) => e.id === 'S13').length, 0, 'giờ chưa tới thì không gửi')
      await follow.getByLabel('Giờ liên hệ').selectOption(nowSlot)
    }
    await follow.getByLabel('Khách hẹn làm sau').check()
    t = mark()
    await follow.getByRole('button', { name: 'Lưu liên hệ' }).click()
    await expectCall('S13', t)
    let current = (await S.must('SALES2', 'GET', '/sales/after-sales/tasks/mine')).find((x) => x.taskId === task.taskId)
    assert.equal(current.status, 'IN_PROGRESS', 'hẹn sau: việc còn mở')

    await mine.getByRole('button', { name: 'Ghi liên hệ' }).click()
    follow = sales.getByRole('dialog', { name: 'Ghi liên hệ khách' })
    await follow.getByLabel('Kết quả liên hệ').fill('Gọi 3 lần không bắt máy')
    await follow.getByLabel('Không liên lạc được').check()
    t = mark()
    await follow.getByRole('button', { name: 'Lưu liên hệ' }).click()
    await expectCall('S13', t)
    current = (await S.must('MANAGER', 'GET', '/manager/after-sales/tasks?status=DONE')).find(
      (x) => x.taskId === task.taskId,
    )
    assert.deepEqual([current.status, current.outcome], ['DONE', 'UNREACHABLE'])
    const entitlement = (await S.must('CUSTOMER', 'GET', '/customers/me/after-sales/subscriptions'))
      .flatMap((s) => s.entitlements ?? [])
      .find((e) => e.entitlementId === state.followUpEntitlementId)
    assert.equal(entitlement.status, 'NOT_COMPLETED', 'không liên lạc được: lượt chưa thực hiện, không bị trừ')

    const closed = await S.call('SALES2', 'POST', `/sales/after-sales/tasks/${task.taskId}/follow-up`, {
      contactedAt: new Date().toISOString(),
      result: 'Gọi thêm',
      note: null,
      outcome: null,
    })
    assert.equal(closed.error?.code, 'AFTER_SALES_INVALID_STATE', 'việc đã đóng thì không ghi thêm')
    if (state.quotationTaskId) {
      const quote = await S.call('SALES', 'POST', `/sales/after-sales/tasks/${state.quotationTaskId}/follow-up`, {
        contactedAt: new Date().toISOString(),
        result: 'Thử ghi liên hệ cho việc báo giá',
        note: null,
        outcome: 'BOOKED',
      })
      assert.equal(quote.error?.code, 'AFTER_SALES_INVALID_STATE', 'việc báo giá không ghi liên hệ')
    }
  })
})
