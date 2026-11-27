// Backend GIẢ LẬP cho E2E phiếu thu tiền mặt (chỉ dùng trong test, không vào bundle). Mô phỏng đúng luật của backend `main`
// 9ae01e7 (PaymentService.SubmitCashReceiptAsync / AcceptCashReceiptAsync / RejectCashReceiptAsync, InstallmentPaymentHandlers,
// FilePolicies, SchemaReadinessMiddleware): vỏ { isSuccess, traceId, data, error }, mã lỗi, revision, quyền theo vai trò, kho S3 giả
// (PUT không được có Bearer token, link xem có hạn). Không thay cho test với backend thật: xem tests/e2e/*.live.e2e.mjs
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
/** JWT không ký: jwt-decode của web không kiểm chữ ký */
const jwt = (user) =>
  `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.mock`

export const USERS = {
  tech: { id: 'u-tech-1', role: 'Technician', email: 'ktv.binh@e2e.local', name: 'KTV Bình' },
  otherTech: { id: 'u-tech-2', role: 'Technician', email: 'ktv.khac@e2e.local', name: 'KTV Khác' },
  manager: { id: 'u-manager-1', role: 'Manager', email: 'quanly@e2e.local', name: 'Quản lý Hà' },
  admin: { id: 'u-admin-1', role: 'Admin', email: 'admin@e2e.local', name: 'Quản trị Minh' },
  customer: { id: 'u-customer-1', role: 'Customer', email: 'khach@e2e.local', name: 'Nguyễn Văn An' },
}

const MB = 1024 * 1024
const EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function startCashReceiptBackend() {
  const users = Object.values(USERS)
  const byId = new Map(users.map((u) => [u.id, u]))
  /** Mọi request /api nhận được (kèm header Authorization có hay không) để test kiểm */
  const requests = []
  /** Mọi PUT lên kho (kiểm không có Bearer token) */
  const storagePuts = []
  const unknown = []
  const state = {
    schemaNotReady: false,
    failNextStoragePut: false,
    evidenceTtlMs: 5 * 60_000,
  }
  /** Object trên kho: key -> { bytes, contentType } */
  const storage = new Map()
  /** Chữ ký link xem còn hạn: sig -> { key, expiresAt } */
  const signed = new Map()
  /** Tệp đã đăng ký */
  const files = new Map()
  const attempts = new Map()
  const receipts = []
  let orderCode = 3_000_001

  const contract = {
    contractId: 'c-e2e-1',
    contractNumber: 'HD-E2E-0001',
    surveyRequestId: 'sr-e2e-1',
    quotationId: 'q-e2e-1',
    status: 'DRAFT',
    totalAmount: 18_500_000,
    customerUserId: USERS.customer.id,
    technicianUserId: USERS.tech.id,
    installments: [
      { installmentId: 'i-e2e-1', sequence: 1, kind: 'DEPOSIT', percent: 30, amount: 5_550_000, status: 'DUE' },
      { installmentId: 'i-e2e-2', sequence: 2, kind: 'BALANCE', percent: 70, amount: 12_950_000, status: 'PENDING' },
    ].map((i) => ({
      ...i,
      openedAt: null,
      dueAt: null,
      paidAt: null,
      paidAmount: null,
      settledPaymentAttemptId: null,
    })),
  }

  const now = () => new Date().toISOString()
  const ok = (res, data, status = 200) => send(res, status, { isSuccess: true, traceId: randomUUID(), data })
  const fail = (res, status, code, message, details = null) =>
    send(res, status, { isSuccess: false, traceId: randomUUID(), data: null, error: { code, message, details } })
  function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
    res.end(JSON.stringify(body))
  }

  const installmentOf = (sequence) => contract.installments.find((i) => i.sequence === Number(sequence)) ?? null
  const attemptsOf = (inst) => [...attempts.values()].filter((a) => a.installmentId === inst.installmentId)
  const liveAttempt = (inst) => attemptsOf(inst).find((a) => a.status === 'PENDING') ?? null
  const receiptsOfAttempt = (attemptId) => receipts.filter((r) => r.paymentAttemptId === attemptId)
  const openReceipt = (attemptId) => receiptsOfAttempt(attemptId).find((r) => r.status === 'SUBMITTED') ?? null

  const attemptView = (a, staff = false) => ({
    paymentAttemptId: a.paymentAttemptId,
    contractId: null,
    orderCode: a.orderCode,
    amount: a.amount,
    currency: 'VND',
    status: a.status,
    checkoutUrl: null,
    qrCode: null,
    expiresAt: null,
    paidAt: a.paidAt,
    providerReference: a.providerReference,
    failureReason: null,
    createdAt: a.createdAt,
    method: a.method,
    amountPaid: a.amountPaid,
    confirmedByUserId: staff ? a.confirmedByUserId : null,
    evidenceFileId: staff ? a.evidenceFileId : null,
    confirmationNote: staff ? a.confirmationNote : null,
  })

  const payable = (inst) =>
    inst.status === 'DUE' &&
    ((inst.kind === 'DEPOSIT' && contract.status === 'DRAFT') ||
      (inst.kind === 'BALANCE' && contract.status === 'SIGNED'))

  /** InstallmentPaymentView; khách luôn null phiếu thu (backend withReceipts = false) */
  function paymentView(inst, { withReceipts }) {
    const all = attemptsOf(inst).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const paid = all.find((a) => a.status === 'PAID') ?? null
    const live = all.find((a) => a.status === 'PENDING') ?? null
    const current = paid ?? live
    const state = paid
      ? 'PAID'
      : live?.method === 'CASH'
        ? 'AWAITING_CASH_CONFIRMATION'
        : payable(inst)
          ? 'AWAITING_PAYMENT'
          : 'NOT_PAYABLE'
    const mine = withReceipts
      ? receipts.filter((r) => all.some((a) => a.paymentAttemptId === r.paymentAttemptId)).sort(bySubmitted)
      : null
    const ofCurrent = current && mine ? mine.filter((r) => r.paymentAttemptId === current.paymentAttemptId) : []
    const currentReceipt =
      ofCurrent.findLast((r) => r.status === 'SUBMITTED') ??
      ofCurrent.findLast((r) => r.status === 'ACCEPTED') ??
      ofCurrent.at(-1) ??
      null
    return {
      contractId: contract.contractId,
      contractNumber: contract.contractNumber,
      installmentId: inst.installmentId,
      sequence: inst.sequence,
      kind: inst.kind,
      amount: inst.amount,
      currency: 'VND',
      installmentStatus: inst.status,
      dueAt: inst.dueAt,
      overdue: false,
      paidAt: inst.paidAt,
      paidLate: false,
      paymentState: state,
      current: current ? attemptView(current) : null,
      attempts: all.map((a) => attemptView(a)),
      contractTotal: contract.totalAmount,
      installationTotal: null,
      servicePackagesTotal: null,
      allocation: null,
      currentCashReceipt: withReceipts ? (currentReceipt ? { ...currentReceipt } : null) : null,
      cashReceipts: withReceipts ? mine.map((r) => ({ ...r })) : null,
    }
  }
  const bySubmitted = (a, b) => a.submittedAt.localeCompare(b.submittedAt)

  function planView() {
    const paid = contract.installments.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0)
    const depositPaid = contract.installments[0].status === 'PAID'
    const fullyPaid = paid === contract.totalAmount
    const stage = fullyPaid
      ? 'FULLY_PAID'
      : contract.status === 'SIGNED' && contract.installments[1].status === 'DUE'
        ? 'BALANCE_DUE'
        : depositPaid
          ? 'DEPOSIT_VERIFIED'
          : 'DRAFT_CREATED'
    return {
      plan: 'DEPOSIT_30_BALANCE_70',
      termsVersion: null,
      stage,
      total: contract.totalAmount,
      paid,
      outstanding: contract.totalAmount - paid,
      depositPaid,
      paperSigned: contract.status === 'SIGNED' || contract.status === 'PAID',
      readyForInstallation: contract.status === 'SIGNED',
      fullyPaid,
      overdue: false,
      nextDueAt: contract.installments.find((i) => i.status === 'DUE')?.dueAt ?? null,
      ownershipStatus: fullyPaid ? 'OWNERSHIP_TRANSFER_ELIGIBLE' : 'OWNERSHIP_RETAINED',
      termsPendingLegalReview: false,
      legalReviewRequired: false,
      installments: contract.installments.map((i) => ({ ...i, overdue: false, paidLate: false, allocation: null })),
      signature: null,
      collection: null,
    }
  }

  function contractView() {
    return {
      contractId: contract.contractId,
      contractNumber: contract.contractNumber,
      version: 1,
      previousContractId: null,
      quotationId: contract.quotationId,
      quotationVersion: 1,
      surveyRequestId: contract.surveyRequestId,
      status: contract.status,
      currency: 'VND',
      totalAmount: contract.totalAmount,
      pricingSnapshot: {},
      customerSnapshot: { fullName: USERS.customer.name, email: USERS.customer.email, phone: '0900000000' },
      terms: null,
      canonicalHash: null,
      officialDocument: null,
      signedDocument: null,
      rejectionReason: null,
      issuedAt: null,
      publishedAt: null,
      signedAt: contract.status === 'SIGNED' ? now() : null,
      paidAt: null,
      revision: 1,
      submissions: [],
      events: [],
      warrantyMonths: 12,
      paymentCompleted: contract.installments.every((i) => i.status === 'PAID'),
      paymentAttemptId: null,
      paymentConfirmedAt: null,
      paymentPlan: planView(),
      installationTotal: null,
      servicePackagesTotal: null,
      servicePackages: null,
    }
  }

  function staffRow(r) {
    const inst = contract.installments.find((i) => i.installmentId === r.contractInstallmentId)
    const attempt = attempts.get(r.paymentAttemptId)
    return {
      receipt: { ...r },
      contractNumber: contract.contractNumber,
      installmentSequence: inst.sequence,
      installmentKind: inst.kind,
      customerUserId: USERS.customer.id,
      customerName: USERS.customer.name,
      collectedByName: byId.get(r.collectedByUserId)?.name ?? '',
      paymentStatus: attempt.status,
      context: inst.kind === 'BALANCE' ? 'INSTALLATION_BALANCE' : 'INSTALLATION_DEPOSIT',
      serviceRequestId: null,
      serviceRequestNumber: null,
      serviceRequestKind: null,
      serviceQuotationId: null,
      quotationVersion: null,
    }
  }

  function settle(inst, attempt) {
    inst.status = 'PAID'
    inst.paidAt = now()
    inst.paidAmount = inst.amount
    inst.settledPaymentAttemptId = attempt.paymentAttemptId
    if (inst.kind === 'DEPOSIT') contract.status = 'AWAITING_SIGNATURE'
    else contract.status = 'PAID'
  }

  function evidenceUrl(file, disposition) {
    const sig = randomUUID()
    const expiresAt = new Date(Date.now() + state.evidenceTtlMs).toISOString()
    signed.set(sig, { key: file.objectKey, expiresAt })
    return {
      id: file.fileId,
      url: `${origin()}/storage/${encodeURIComponent(file.objectKey)}?sig=${sig}`,
      expiresAt,
      disposition,
      contentType: file.contentType,
      fileName: file.fileName,
    }
  }

  let address = null
  const origin = () => `http://127.0.0.1:${address.port}`

  async function body(req) {
    const chunks = []
    for await (const c of req) chunks.push(c)
    return Buffer.concat(chunks)
  }

  function cors(res, req) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  async function storageRoute(req, res, url) {
    cors(res, req)
    if (req.method === 'OPTIONS') return res.writeHead(204).end()
    const key = decodeURIComponent(url.pathname.slice('/storage/'.length))
    if (req.method === 'PUT') {
      const bytes = await body(req)
      storagePuts.push({
        key,
        authorization: req.headers.authorization ?? null,
        contentType: req.headers['content-type'],
      })
      if (state.failNextStoragePut) {
        state.failNextStoragePut = false
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        return res.end('storage failure')
      }
      storage.set(key, { bytes, contentType: req.headers['content-type'] })
      return res.writeHead(200).end()
    }
    const grant = signed.get(url.searchParams.get('sig') ?? '')
    const object = storage.get(key)
    if (!grant || grant.key !== key || Date.parse(grant.expiresAt) <= Date.now() || !object) {
      res.writeHead(403, { 'Content-Type': 'text/plain' })
      return res.end('Request has expired')
    }
    res.writeHead(200, { 'Content-Type': object.contentType, 'Cache-Control': 'no-store' })
    return res.end(object.bytes)
  }

  /** Điều khiển kịch bản từ test (không có ở backend thật) */
  async function mockRoute(req, res, url) {
    const name = url.pathname.slice('/__mock/'.length)
    if (name === 'schema-not-ready') state.schemaNotReady = url.searchParams.get('on') !== 'false'
    else if (name === 'fail-next-storage-put') state.failNextStoragePut = true
    else if (name === 'evidence-ttl') state.evidenceTtlMs = Number(url.searchParams.get('ms'))
    else if (name === 'open-balance') {
      // Khách đã ký giấy và nghiệm thu: hợp đồng SIGNED, khoản 70% đến hạn (72 giờ)
      contract.status = 'SIGNED'
      const balance = contract.installments[1]
      balance.status = 'DUE'
      balance.openedAt = now()
      balance.dueAt = new Date(Date.now() + 72 * 3600_000).toISOString()
    } else if (name === 'state') return send(res, 200, { contract, receipts, attempts: [...attempts.values()] })
    else return send(res, 404, {})
    return send(res, 200, { ok: true })
  }

  function caller(req) {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return null
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
      return byId.get(payload.sub) ?? null
    } catch {
      return null
    }
  }

  async function apiRoute(req, res, url) {
    const path = url.pathname.replace(/^\/api/, '')
    const raw = req.method === 'GET' ? Buffer.alloc(0) : await body(req)
    const json = raw.length ? JSON.parse(raw.toString() || '{}') : {}
    requests.push({
      method: req.method,
      path,
      query: Object.fromEntries(url.searchParams),
      auth: Boolean(req.headers.authorization),
    })

    if (state.schemaNotReady)
      return send(
        res,
        503,
        {
          isSuccess: false,
          traceId: randomUUID(),
          data: null,
          error: {
            code: 'SCHEMA_NOT_READY',
            message: 'The database schema is not ready.',
            details: { pendingMigrations: ['20261127021802_TechnicianCashReceipts'] },
          },
        },
        { 'Retry-After': '30' },
      )

    if (path === '/auth/refresh' && req.method === 'POST') {
      const user = byId.get(String(json.refreshToken ?? '').replace(/^rt:/, ''))
      if (!user) return fail(res, 401, 'AUTH_REFRESH_TOKEN_INVALID', 'invalid')
      return ok(res, {
        accessToken: jwt(user),
        accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        refreshToken: `rt:${user.id}`,
        refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        tokenType: 'Bearer',
        userId: user.id,
      })
    }
    if (path === '/auth/logout') return ok(res, true)

    const user = caller(req)
    if (!user) return fail(res, 401, 'AUTH_UNAUTHORIZED', 'Not signed in.')
    const role = user.role
    const staffWriter = role === 'Manager' || role === 'Admin'

    // ---- Tệp (FilePolicies: PAYMENT_EVIDENCE cho Manager, Admin, Technician)
    if (path === '/files/presigned-upload' && req.method === 'POST') {
      if (json.purpose !== 'PAYMENT_EVIDENCE') return fail(res, 400, 'FILE_INVALID_PURPOSE', 'purpose')
      if (!['Manager', 'Admin', 'Technician'].includes(role)) return fail(res, 403, 'FILE_UPLOAD_NOT_ALLOWED', 'role')
      if (!EVIDENCE_TYPES.includes(json.contentType)) return fail(res, 400, 'FILE_TYPE_NOT_ALLOWED', 'type')
      if (!(json.sizeBytes > 0) || json.sizeBytes > 15 * MB) return fail(res, 400, 'FILE_TOO_LARGE', 'size')
      const objectKey = `payment-evidence/${user.id}/${randomUUID()}${json.fileName.slice(json.fileName.lastIndexOf('.'))}`
      return ok(res, {
        uploadUrl: `${origin()}/storage/${encodeURIComponent(objectKey)}`,
        method: 'PUT',
        bucket: 'e2e-bucket',
        objectKey,
        headers: { 'Content-Type': json.contentType },
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      })
    }
    if (path === '/files' && req.method === 'POST') {
      const object = storage.get(json.objectKey)
      const fileId = randomUUID()
      const status = object && object.bytes.length === json.sizeBytes ? 'VERIFIED' : 'REJECTED'
      const file = {
        fileId,
        purpose: json.purpose,
        bucket: json.bucket,
        objectKey: json.objectKey,
        originalFileName: json.fileName,
        fileName: json.fileName,
        status,
        rejectionReason: status === 'REJECTED' ? 'The object does not exist in storage.' : null,
        contentType: json.contentType,
        sizeBytes: json.sizeBytes,
        checksumSha256: json.checksumSha256 ?? null,
        objectVersionId: null,
        verifiedAt: status === 'VERIFIED' ? now() : null,
        createdAt: now(),
        ownerId: user.id,
      }
      files.set(fileId, file)
      const { ownerId: _owner, fileName: _name, ...view } = file
      return ok(res, view, 201)
    }

    // ---- Hợp đồng (nhân viên đọc mọi hợp đồng, kỹ thuật viên cũng đọc được)
    if (path === `/contracts/${contract.contractId}` && req.method === 'GET') {
      if (role === 'Customer') return fail(res, 403, 'FORBIDDEN', 'forbidden')
      return ok(res, contractView())
    }
    if (path === `/survey-requests/${contract.surveyRequestId}/contracts`) return ok(res, [contractView()])
    if (path === `/customers/me/contracts/${contract.contractId}` && role === 'Customer') return ok(res, contractView())
    if (path === `/contracts/${contract.contractId}/signature-sets`) return ok(res, [])
    if (path === `/customers/me/contracts/${contract.contractId}/signature-sets`) return ok(res, [])
    if (path === `/technicians/me/contracts/${contract.contractId}/installation-schedule`) return ok(res, [])
    if (path === `/customers/me/contracts/${contract.contractId}/installation-schedule`) return ok(res, null)

    // ---- Thanh toán một khoản
    let m = path.match(/^\/(technician|customers\/me)?\/?contracts\/([^/]+)\/installments\/(\d+)\/payment(\/.*)?$/)
    if (m) {
      const [, prefix, contractId, sequence, rest = ''] = m
      const actor = prefix === 'technician' ? 'technician' : prefix === 'customers/me' ? 'customer' : 'staff'
      if (actor === 'technician' && role !== 'Technician') return fail(res, 403, 'FORBIDDEN', 'forbidden')
      if (actor === 'customer' && role !== 'Customer') return fail(res, 403, 'FORBIDDEN', 'forbidden')
      // Đường chỉ đọc của nhân viên: mọi vai trò nội bộ (kỹ thuật viên khác đọc hợp đồng bằng đường này)
      if (actor === 'staff' && role === 'Customer') return fail(res, 403, 'FORBIDDEN', 'forbidden')
      // Kỹ thuật viên khác / khách khác: 404 như mọi lần đọc khoản
      if (
        contractId !== contract.contractId ||
        (actor === 'technician' && user.id !== contract.technicianUserId) ||
        (actor === 'customer' && user.id !== contract.customerUserId)
      )
        return fail(res, 404, 'CONTRACT_NOT_FOUND', 'The contract was not found.')
      const inst = installmentOf(sequence)
      if (!inst) return fail(res, 404, 'CONTRACT_INSTALLMENT_NOT_FOUND', 'no installment')
      const withReceipts = actor !== 'customer'

      if (rest === '' && req.method === 'GET') return ok(res, paymentView(inst, { withReceipts }))
      if (rest === '' && req.method === 'POST') {
        if (actor === 'staff') return fail(res, 405, 'METHOD', 'read only')
        const live = liveAttempt(inst)
        if (live) {
          if (live.method === json.method) return ok(res, paymentView(inst, { withReceipts }))
          return fail(
            res,
            409,
            live.method === 'CASH' ? 'PAYMENT_CASH_SELECTED' : 'PAYMENT_CHECKOUT_IN_PROGRESS',
            'open',
          )
        }
        if (!payable(inst)) return fail(res, 409, 'CONTRACT_INSTALLMENT_NOT_PAYABLE', 'not payable')
        if (json.method !== 'CASH') return fail(res, 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'PayOS off in E2E')
        const attempt = {
          paymentAttemptId: randomUUID(),
          installmentId: inst.installmentId,
          orderCode: orderCode++,
          amount: inst.amount,
          method: 'CASH',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 1000).toISOString(),
          paidAt: null,
          providerReference: null,
          amountPaid: null,
          confirmedByUserId: null,
          evidenceFileId: null,
          confirmationNote: null,
        }
        attempts.set(attempt.paymentAttemptId, attempt)
        return ok(res, paymentView(inst, { withReceipts }))
      }
      if (rest === '/cancel' && req.method === 'POST') {
        const live = liveAttempt(inst)
        if (!live) return fail(res, 404, 'PAYMENT_ATTEMPT_NOT_FOUND', 'no open payment')
        if (live.method === 'CASH' && openReceipt(live.paymentAttemptId))
          return fail(res, 409, 'PAYMENT_CASH_RECEIPT_UNDER_REVIEW', 'A Manager must review the receipt first.')
        live.status = 'CANCELLED'
        return ok(res, paymentView(inst, { withReceipts }))
      }
      if (rest === '/cash-receipt' && req.method === 'POST' && actor === 'technician') {
        if (inst.status === 'PAID') return fail(res, 409, 'CONTRACT_INSTALLMENT_ALREADY_PAID', 'paid')
        const live = liveAttempt(inst)
        if (!live || live.method !== 'CASH') return fail(res, 409, 'PAYMENT_CASH_NOT_SELECTED', 'Cash was not chosen.')
        const errors = {}
        const number = typeof json.receiptNumber === 'string' ? json.receiptNumber.trim() : ''
        if (!json.paymentAttemptId) errors.paymentAttemptId = ['The payment attempt id is required.']
        if (!number || number.length > 100) errors.receiptNumber = ['The physical receipt number is required.']
        if (!json.evidenceFileId) errors.evidenceFileId = ['The photo of the receipt is required.']
        if (typeof json.note === 'string' && json.note.length > 500) errors.note = ['At most 500 characters.']
        if (json.collectedAt && Date.parse(json.collectedAt) > Date.now() + 5 * 60_000)
          errors.collectedAt = ['The collection time cannot be in the future.']
        if (Object.keys(errors).length) return fail(res, 400, 'VALIDATION_FAILED', 'invalid', errors)
        if (json.paymentAttemptId !== live.paymentAttemptId)
          return fail(res, 409, 'PAYMENT_CASH_RECEIPT_ATTEMPT_MISMATCH', 'Reload the payment.')
        const collectedAt = json.collectedAt ? new Date(json.collectedAt).toISOString() : now()
        if (collectedAt < live.createdAt)
          return fail(res, 400, 'VALIDATION_FAILED', 'invalid', { collectedAt: ['Before cash was chosen.'] })
        const file = files.get(json.evidenceFileId)
        if (!file) return fail(res, 404, 'FILE_NOT_FOUND', 'Unknown file.')
        if (file.ownerId !== user.id) return fail(res, 403, 'FILE_NOT_OWNED', 'Registered by another user.')
        if (file.purpose !== 'PAYMENT_EVIDENCE') return fail(res, 400, 'FILE_WRONG_PURPOSE', 'Wrong purpose.')
        if (file.status !== 'VERIFIED') return fail(res, 409, 'FILE_NOT_VERIFIED', 'Not verified.')
        if (receipts.some((r) => r.receiptNumber === number && r.paymentAttemptId !== live.paymentAttemptId))
          return fail(res, 409, 'PAYMENT_CASH_RECEIPT_DUPLICATE', 'Number used by another payment.')
        if (receipts.some((r) => r.evidenceFileId === file.fileId && r.paymentAttemptId !== live.paymentAttemptId))
          return fail(res, 409, 'PAYMENT_CASH_RECEIPT_EVIDENCE_REUSED', 'Photo used by another payment.')
        if (openReceipt(live.paymentAttemptId))
          return fail(res, 409, 'PAYMENT_CASH_RECEIPT_ALREADY_SUBMITTED', 'Already waiting for review.')
        receipts.push({
          cashReceiptId: randomUUID(),
          paymentAttemptId: live.paymentAttemptId,
          contractId: contract.contractId,
          contractInstallmentId: inst.installmentId,
          amount: live.amount,
          receiptNumber: number,
          collectedByUserId: user.id,
          collectedAt,
          evidenceFileId: file.fileId,
          note: json.note?.trim() || null,
          status: 'SUBMITTED',
          submittedAt: now(),
          reviewedByUserId: null,
          reviewedAt: null,
          reviewReason: null,
          revision: 1,
          kind: 'INSTALLMENT',
          serviceQuotationId: null,
          serviceRequestId: null,
        })
        return ok(res, paymentView(inst, { withReceipts: true }))
      }
      m = rest.match(/^\/cash-receipts\/([^/]+)\/evidence\/url$/)
      if (m && actor === 'technician') {
        const receipt = receipts.find((r) => r.cashReceiptId === m[1] && r.contractInstallmentId === inst.installmentId)
        if (!receipt) return fail(res, 404, 'PAYMENT_CASH_RECEIPT_NOT_FOUND', 'not found')
        return ok(res, evidenceUrl(files.get(receipt.evidenceFileId), url.searchParams.get('disposition') ?? 'inline'))
      }
      return fail(res, 404, 'MOCK_NOT_FOUND', 'route')
    }

    // ---- Quản lý / quản trị
    if (path.startsWith('/manager/payments')) {
      if (!staffWriter) return fail(res, 403, 'FORBIDDEN', 'Manager or Admin only.')
      if (path === '/manager/payments/cash-receipts' && req.method === 'GET') {
        const status = url.searchParams.get('status')
        const page = Number(url.searchParams.get('page') ?? 1)
        const pageSize = Number(url.searchParams.get('pageSize') ?? 20)
        const list = receipts
          .filter((r) => !status || r.status === status)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        const items = list.slice((page - 1) * pageSize, page * pageSize).map(staffRow)
        return ok(res, {
          items,
          page,
          pageSize,
          totalItems: list.length,
          totalPages: Math.ceil(list.length / pageSize),
        })
      }
      m = path.match(/^\/manager\/payments\/cash-receipts\/([^/]+)(\/.*)?$/)
      if (m) {
        const [, id, action = ''] = m
        const receipt = receipts.find((r) => r.cashReceiptId === id)
        if (!receipt) return fail(res, 404, 'PAYMENT_CASH_RECEIPT_NOT_FOUND', 'The cash receipt was not found.')
        const attempt = attempts.get(receipt.paymentAttemptId)
        const inst = contract.installments.find((i) => i.installmentId === receipt.contractInstallmentId)
        if (action === '' && req.method === 'GET')
          return ok(res, {
            current: staffRow(receipt),
            history: receiptsOfAttempt(receipt.paymentAttemptId).sort(bySubmitted),
            lines: [
              {
                itemType: 'CONTRACT_INSTALLMENT',
                amount: attempt.amount,
                status: attempt.status === 'PAID' ? 'SETTLED' : 'PENDING',
                contractId: null,
                subscriptionId: null,
                quotationId: null,
                installationQuotationId: null,
                contractInstallmentId: inst.installmentId,
              },
            ],
          })
        if (action === '/evidence/url' && req.method === 'GET')
          return ok(
            res,
            evidenceUrl(files.get(receipt.evidenceFileId), url.searchParams.get('disposition') ?? 'inline'),
          )
        if (action === '/accept' && req.method === 'POST') {
          if (typeof json.revision !== 'number')
            return fail(res, 400, 'VALIDATION_FAILED', 'invalid', { revision: ['required'] })
          if (receipt.status !== 'SUBMITTED') return fail(res, 409, 'PAYMENT_CASH_RECEIPT_NOT_REVIEWABLE', 'reviewed')
          if (receipt.revision !== json.revision) return fail(res, 409, 'PAYMENT_CASH_RECEIPT_STALE', 'stale')
          if (attempt.status === 'PAID') return fail(res, 409, 'PAYMENT_ALREADY_PAID', 'paid')
          receipt.status = 'ACCEPTED'
          receipt.reviewedByUserId = user.id
          receipt.reviewedAt = now()
          receipt.reviewReason = json.note?.trim() || null
          receipt.revision++
          Object.assign(attempt, {
            status: 'PAID',
            paidAt: now(),
            providerReference: receipt.receiptNumber,
            amountPaid: attempt.amount,
            confirmedByUserId: user.id,
            evidenceFileId: receipt.evidenceFileId,
            confirmationNote: receipt.note,
          })
          settle(inst, attempt)
          return ok(res, attemptView(attempt, true))
        }
        if (action === '/reject' && req.method === 'POST') {
          const reason = typeof json.reason === 'string' ? json.reason.trim() : ''
          if (!reason || reason.length > 500)
            return fail(res, 400, 'VALIDATION_FAILED', 'invalid', { reason: ['required'] })
          if (typeof json.revision !== 'number')
            return fail(res, 400, 'VALIDATION_FAILED', 'invalid', { revision: ['required'] })
          if (receipt.status !== 'SUBMITTED') return fail(res, 409, 'PAYMENT_CASH_RECEIPT_NOT_REVIEWABLE', 'reviewed')
          if (receipt.revision !== json.revision) return fail(res, 409, 'PAYMENT_CASH_RECEIPT_STALE', 'stale')
          Object.assign(receipt, {
            status: 'REJECTED',
            reviewedByUserId: user.id,
            reviewedAt: now(),
            reviewReason: reason,
            revision: receipt.revision + 1,
          })
          return ok(res, { ...receipt })
        }
      }
      m = path.match(/^\/manager\/payments\/([^/]+)\/cash\/confirm$/)
      if (m && req.method === 'POST') {
        const attempt = attempts.get(m[1])
        if (!attempt) return fail(res, 404, 'PAYMENT_ATTEMPT_NOT_FOUND', 'not found')
        if (openReceipt(attempt.paymentAttemptId))
          return fail(res, 409, 'PAYMENT_CASH_RECEIPT_UNDER_REVIEW', 'Review the technician receipt instead.')
        return fail(res, 409, 'PAYMENT_CASH_NOT_SELECTED', 'mock: direct confirmation not simulated')
      }
      if (path === '/manager/payments' && req.method === 'GET') {
        const list = [...attempts.values()].filter(
          (a) =>
            (!url.searchParams.get('method') || a.method === url.searchParams.get('method')) &&
            (!url.searchParams.get('status') || a.status === url.searchParams.get('status')),
        )
        const items = list.map((a) => ({
          attempt: attemptView(a, true),
          customerUserId: USERS.customer.id,
          lines: [
            {
              itemType: 'CONTRACT_INSTALLMENT',
              amount: a.amount,
              status: a.status === 'PAID' ? 'SETTLED' : 'PENDING',
              contractId: null,
              subscriptionId: null,
              quotationId: null,
              contractInstallmentId: a.installmentId,
            },
          ],
        }))
        const pageSize = Number(url.searchParams.get('pageSize') ?? 20)
        return ok(res, { items: items.slice(0, pageSize), page: 1, pageSize, totalItems: items.length, totalPages: 1 })
      }
    }

    unknown.push(`${req.method} ${path}`)
    return fail(res, 404, 'MOCK_NOT_FOUND', `No mock for ${req.method} ${path}`)
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://mock')
    const route = url.pathname.startsWith('/storage/')
      ? storageRoute
      : url.pathname.startsWith('/__mock/')
        ? mockRoute
        : url.pathname.startsWith('/api/')
          ? apiRoute
          : null
    if (!route) return send(res, 404, {})
    route(req, res, url).catch((error) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(String(error?.stack ?? error))
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      address = server.address()
      resolve({
        url: origin(),
        requests,
        storagePuts,
        unknown,
        receipts,
        contract,
        control: (name, query = '') => fetch(`${origin()}/__mock/${name}${query}`).then((r) => r.json()),
        close: () => new Promise((done) => server.close(done)),
      })
    })
  })
}
