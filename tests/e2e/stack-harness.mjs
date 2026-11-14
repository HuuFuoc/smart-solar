// Khung chung cho E2E trên BACKEND THẬT của stack kiểm thử riêng (stack-*.live.e2e.mjs). Mỗi file một giai đoạn, chạy theo thứ tự tên
// file; dữ liệu giữa các giai đoạn (mã khu, hợp đồng…) lưu ở <AUDIT_EVIDENCE_DIR>/stack-state.json để chạy lại được từng giai đoạn.
// Giao diện thật (Vite dev, proxy /api → AUDIT_STACK_API), đăng nhập bằng form. Endpoint thuộc 76 endpoint luôn đi QUA GIAO DIỆN; bước
// tiền đề ngoài 76 gọi API nghiệp vụ thật (stack-api.mjs). Mọi response /api/ của trình duyệt được ghi vào
// <AUDIT_EVIDENCE_DIR>/stack-<giai đoạn>-<thời điểm>.json (method, đường dẫn đã thay id, status, traceId; không token, không body).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, before } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import * as S from './stack-api.mjs'

export const ROLES = ['ADMIN', 'CUSTOMER', 'CUSTOMER2', 'SALES', 'SALES2', 'TECH', 'MANAGER']

export async function setupStack(phase) {
  const skip = await S.stackSkipReason(ROLES)
  const dir = process.env.AUDIT_EVIDENCE_DIR
  const statePath = dir ? path.join(dir, 'stack-state.json') : null
  const state = statePath && fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {}
  const evidence = []
  const runAt = new Date().toISOString().replace(/[:.]/g, '-')
  const pages = new Map()
  let server
  let browser
  let baseUrl

  before(async () => {
    if (skip) return
    process.env.API_PROXY_TARGET = S.STACK_API
    // Stack chạy bản vá backend có API link PDF hợp đồng, nên bật nút Xem / Tải về (stack-3 tải PDF qua giao diện)
    process.env.VITE_CONTRACT_DOCUMENT_LINKS ??= 'true'
    // Nghe thẳng IPv4: `localhost` có máy phân giải ra ::1 cho Vite nhưng 127.0.0.1 cho Chromium, module tải lỗi ngẫu nhiên
    server = await createServer({
      server: { host: '127.0.0.1', port: 3301, strictPort: false, hmr: false, watch: null },
      logLevel: 'error',
    })
    await server.listen()
    baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
    browser = await chromium.launch({ channel: 'chromium' })
  })

  after(async () => {
    if (skip) return
    if (dir) {
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(statePath, JSON.stringify(state, null, 1))
      fs.writeFileSync(
        path.join(dir, `stack-${phase}-${runAt}.json`),
        JSON.stringify({ phase, runAt, api: S.STACK_API, state, evidence }, null, 1),
      )
    }
    await browser?.close()
    await server?.close()
  })

  /** Trang đã đăng nhập bằng form với `role` (mỗi vai trò một trình duyệt, dùng lại trong giai đoạn) */
  async function as(role, pathname) {
    let page = pages.get(role)
    if (!page) {
      const context = await browser.newContext({
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
        acceptDownloads: true,
      })
      page = await context.newPage()
      page.setDefaultTimeout(30_000)
      S.recordApi(page, evidence, role)
      const { email, password } = S.account(role)
      await page.goto(`${baseUrl}/login`, { timeout: 180_000, waitUntil: 'domcontentloaded' })
      await page.locator('#login-email').fill(email)
      await page.locator('#login-password').fill(password)
      await page.locator('button[type=submit]').click()
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 })
      pages.set(role, page)
    }
    if (pathname) await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' })
    return page
  }

  const mark = () => evidence.length
  const seen = (id, since = 0) => evidence.slice(since).filter((e) => e.id === id)
  async function until(check, label, ms = 30_000, every = 250) {
    const end = Date.now() + ms
    for (;;) {
      const v = await check()
      if (v) return v
      if (Date.now() > end) assert.fail(`hết giờ chờ: ${label}`)
      await new Promise((r) => setTimeout(r, every))
    }
  }
  /** Chờ trình duyệt gọi endpoint baseline `id` với status `status` (mặc định 2xx) sau mốc `since` */
  const expectCall = (id, since, status) =>
    until(
      () => seen(id, since).find((e) => (status ? e.status === status : e.status >= 200 && e.status < 300)),
      `${id} ${status ?? '2xx'}`,
    )
  const url = (p) => `${baseUrl}${p}`

  return { skip, state, evidence, as, mark, seen, until, expectCall, url }
}
