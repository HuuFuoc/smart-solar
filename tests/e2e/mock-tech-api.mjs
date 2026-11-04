// Backend giả cho E2E cổng kỹ thuật viên: trả lời /api/** trong trình duyệt bằng page.route, giữ trạng thái trong bộ nhớ.
// Luật bám backend `main` (7c79fa8, cùng ngày build image c43e1cada345): TechnicianJobHandlers.GetOpenAsync,
// AppointmentAssignmentService.Precheck, OnSiteSurveyHandlers.AmendAsync, TechnicianServiceHandlers (ReportInspectionAsync,
// ContinueWithRepairAsync, FinishOnSiteWaitAsync, AddSupplementaryItemAsync, ReportWorkAsync), AfterSalesWorkflow.NextStatus;
// mã lỗi và HTTP status theo OperationResultControllerBase.StatusFor. Các bước của quản lý / kinh doanh / khách (quyết định chi
// phí, báo giá, thanh toán, xếp buổi sửa) được giả lập bằng hàm đổi state ở cuối file. Chỉ dùng trong test

const iso = (ms) => new Date(ms).toISOString()
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
const MIN = 60_000

export function token(role, sub) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub, email: `${sub}@test.vn`, role, exp })}.sig`
}

const ok = (data, status = 200) => ({ status, body: { isSuccess: true, traceId: 't', data } })
const fail = (status, code, message = code, details = null) => ({
  status,
  body: { isSuccess: false, traceId: 't', data: null, error: { code, message, details } },
})
const trim = (text, max) => (typeof text === 'string' && text.trim() ? text.trim().slice(0, max) : null)
const clone = (v) => JSON.parse(JSON.stringify(v))

function openAppointment(over) {
  return {
    surveyRequestId: 'sr-open-1',
    status: 'PENDING_ACCEPTANCE',
    revision: 3,
    zone: { zoneId: 'z1', code: 'Q1', name: 'Khu trung tâm' },
    propertyName: 'Nhà phố Lê Lợi',
    province: 'Thành phố Hồ Chí Minh',
    district: null,
    ward: 'Phường Bến Thành',
    installationSurfaceType: 'ROOFTOP',
    totalAreaM2: 80,
    usableAreaM2: 60,
    canAccept: true,
    reason: null,
    requiresHoldRehoming: false,
    ...over,
  }
}

function job(over) {
  return {
    appointmentType: 'PRE_SURVEY',
    status: 'ACCEPTED',
    assignmentSource: 'SELF_ACCEPTED',
    assignedAt: '2026-11-01T08:00:00+07:00',
    acceptedAt: '2026-11-01T08:00:00+07:00',
    customerNote: null,
    revision: 4,
    customer: { fullName: 'Khách Một', phone: '0900000001', email: 'khach@test.vn' },
    property: {
      propertySiteId: 'site-1',
      name: 'Nhà phố Lê Lợi',
      province: 'Thành phố Hồ Chí Minh',
      district: null,
      ward: 'Phường Bến Thành',
      streetLine: '12 Lê Lợi',
      latitude: 10.77,
      longitude: 106.7,
      installationSurfaceType: 'ROOFTOP',
      surfaceMaterial: null,
    },
    preSurvey: {
      preSurveyId: 'ps-1',
      totalAreaM2: 80,
      usableAreaM2: 60,
      surfaceLengthM: 10,
      surfaceWidthM: 8,
      surfaceTiltDegree: 10,
      surfaceAzimuthDegree: 180,
      hasObstruction: false,
      obstacleCount: 0,
    },
    selectedSimulation: null,
    simulationDetailPath: null,
    isOverdue: false,
    ...over,
  }
}

const surveyData = (over = {}) => ({
  roofType: 'Mái bằng',
  roofMaterial: 'Bê tông',
  roofLengthM: 10,
  roofWidthM: 8,
  usableAreaM2: 60,
  tiltDegree: 5,
  azimuthDegree: 180,
  roofCondition: 'GOOD',
  electricalCabinetNotes: 'Tủ điện tầng trệt',
  electricalConnectionNotes: null,
  installationFeasibility: 'FEASIBLE',
  proposedInverterLocation: null,
  proposedPanelLayoutNotes: null,
  measuredLatitude: null,
  measuredLongitude: null,
  notes: null,
  ...over,
})

const asset = (id, over) => ({
  assetId: id,
  assetType: 'INVERTER',
  manufacturer: 'Huawei',
  model: 'SUN2000-5KTL',
  serialNumber: `SN-${id}`,
  positionCode: null,
  status: 'ACTIVE',
  replacesAssetId: null,
  serviceRequestId: null,
  specifications: null,
  warrantyMonths: null,
  warrantySource: null,
  warrantyStartsAt: null,
  ...over,
})

/** `now`: giờ máy lúc tạo state; buổi kiểm tra đang làm từ 30 phút trước, khung giờ giữ còn 90 phút */
export function createTechState({ now = Date.now() } = {}) {
  const dayAfter = now + 2 * 24 * 60 * MIN
  const state = {
    requests: [],
    files: {},
    open: [
      openAppointment({
        appointmentId: 'a-open-1',
        startsAt: iso(dayAfter),
        endsAt: iso(dayAfter + 90 * MIN),
        acceptanceDeadlineAt: iso(now + 24 * 60 * MIN),
      }),
      openAppointment({
        appointmentId: 'a-open-2',
        surveyRequestId: 'sr-open-2',
        propertyName: 'Nhà vườn Thủ Đức',
        ward: 'Phường Thủ Đức',
        startsAt: iso(dayAfter + 3 * 60 * MIN),
        endsAt: iso(dayAfter + 4 * 60 * MIN),
        acceptanceDeadlineAt: iso(now + 24 * 60 * MIN),
        revision: 1,
      }),
    ],
    /** Lịch người khác vừa nhận: không còn trong danh sách chờ, nhận thì 409 */
    takenByOthers: new Set(),
    mine: [
      job({
        appointmentId: 'a-done',
        surveyRequestId: 'sr-done',
        status: 'COMPLETED',
        startsAt: '2026-11-02T09:00:00+07:00',
        endsAt: '2026-11-02T10:30:00+07:00',
      }),
    ],
    surveys: {
      'a-done': {
        reportId: 'rep-1',
        surveyRequestId: 'sr-done',
        appointmentId: 'a-done',
        technicianUserId: 't1',
        status: 'COMPLETED',
        version: 1,
        revision: 5,
        startedAt: '2026-11-02T09:05:00+07:00',
        completedAt: '2026-11-02T10:10:00+07:00',
        data: { ...surveyData(), obstacles: [] },
        obstacles: [],
        attachments: [
          {
            attachmentId: 'att-roof',
            fileId: 'f-roof',
            category: 'ROOF',
            caption: null,
            addedAt: '2026-11-02T09:30:00+07:00',
            amendmentId: null,
          },
        ],
        amendments: [],
        updatedAt: '2026-11-02T10:10:00+07:00',
      },
    },
    serviceRequests: {
      'r-1': { requestId: 'r-1', status: 'IN_PROGRESS', items: [] },
      'r-2': { requestId: 'r-2', status: 'READY_FOR_WORK', items: [] },
    },
    visits: [
      {
        visitId: 'v-insp',
        requestId: 'r-1',
        requestNumber: 'SR-3001',
        requestKind: 'FAULT',
        purpose: 'INSPECTION',
        status: 'IN_PROGRESS',
        assignmentStatus: 'ACCEPTED',
        technicianUserId: 't1',
        startsAt: iso(now - 30 * MIN),
        endsAt: iso(now + 90 * MIN),
        customerConfirmationRequired: false,
        customerConfirmedAt: null,
        siteAddress: '12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh',
        description: 'Inverter báo lỗi quạt, sản lượng giảm.',
        assets: [asset('as-inv')],
        report: null,
        evidence: [
          { evidenceId: 'ev-1', visitId: 'v-insp', fileId: 'f-ev1', caption: null, addedAt: iso(now - 20 * MIN) },
        ],
      },
      {
        visitId: 'v-repair',
        requestId: 'r-2',
        requestNumber: 'SR-3002',
        requestKind: 'FAULT',
        purpose: 'REPAIR',
        status: 'IN_PROGRESS',
        assignmentStatus: 'ACCEPTED',
        technicianUserId: 't1',
        startsAt: iso(now - 30 * MIN),
        endsAt: iso(now + 90 * MIN),
        customerConfirmationRequired: false,
        customerConfirmedAt: null,
        siteAddress: '5 Võ Văn Ngân, Phường Thủ Đức, Thành phố Hồ Chí Minh',
        description: 'Cáp DC bị chuột cắn.',
        assets: [asset('as-2', { assetType: 'SOLAR_PANEL', manufacturer: 'Trina', model: 'Vertex N' })],
        report: null,
        evidence: [],
      },
      {
        visitId: 'v-other',
        requestId: 'r-1',
        requestNumber: 'SR-3001',
        requestKind: 'FAULT',
        purpose: 'REPAIR',
        status: 'SCHEDULED',
        assignmentStatus: 'ACCEPTED',
        technicianUserId: 't2',
        startsAt: iso(now + 24 * 60 * MIN),
        endsAt: iso(now + 26 * 60 * MIN),
        customerConfirmationRequired: false,
        customerConfirmedAt: null,
        siteAddress: null,
        description: '',
        assets: [],
        report: null,
        evidence: [],
      },
    ],
    itemSeq: 0,
  }
  // Buổi sửa đang làm có sẵn một hạng mục bảo hành đã được phép làm
  state.serviceRequests['r-2'].items.push(
    item(state, 'Cáp DC chuỗi 1 bị đứt', 'Chuột cắn', { coverage: 'INSTALLATION_WARRANTY', status: 'AUTHORIZED' }),
  )
  return state
}

function item(state, description, diagnosis, over = {}) {
  state.itemSeq += 1
  return {
    itemId: `it-${state.itemSeq}`,
    assetId: null,
    description,
    diagnosis,
    requiredParts: null,
    coverage: 'PENDING',
    coverageReason: null,
    status: 'OPEN',
    isSupplementary: false,
    quotationId: null,
    workResult: null,
    partsUsed: null,
    ...over,
  }
}

const waitingOnSite = (v) => v.purpose === 'INSPECTION' && v.status === 'IN_PROGRESS' && v.report !== null

function visitView(state, v) {
  return {
    visitId: v.visitId,
    requestId: v.requestId,
    requestNumber: v.requestNumber,
    requestKind: v.requestKind,
    purpose: v.purpose,
    status: v.status,
    assignmentStatus: v.assignmentStatus,
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    customerConfirmationRequired: v.customerConfirmationRequired,
    customerConfirmedAt: v.customerConfirmedAt,
    siteAddress: v.siteAddress,
    description: v.description,
    items: clone(state.serviceRequests[v.requestId].items),
    assets: clone(v.assets),
    waitingOnSite: waitingOnSite(v),
    evidence: clone(v.evidence),
  }
}

/** AfterSalesWorkflow.NextStatus */
export function nextStatus(items) {
  if (items.some((i) => i.coverage === 'PENDING' && i.status === 'OPEN')) return 'AWAITING_DECISION'
  if (items.some((i) => ['CHARGEABLE', 'DISASTER_PROTECTION'].includes(i.coverage) && i.status === 'OPEN'))
    return 'AWAITING_QUOTATION'
  if (items.some((i) => i.status === 'QUOTED')) return 'AWAITING_CUSTOMER'
  if (items.some((i) => i.status === 'AUTHORIZED')) return 'READY_FOR_WORK'
  if (items.length > 0 && items.every((i) => i.status === 'DECLINED')) return 'CANCELLED'
  return 'PENDING_CUSTOMER_ACCEPTANCE'
}

function closeVisit(v, report) {
  v.status = 'REPORTED'
  v.report = report
  v.assignmentStatus = 'COMPLETED'
}

const ONSITE_TEXT_FIELDS = [
  'roofType',
  'roofMaterial',
  'roofCondition',
  'electricalCabinetNotes',
  'electricalConnectionNotes',
  'installationFeasibility',
  'proposedInverterLocation',
  'proposedPanelLayoutNotes',
  'notes',
]
const ONSITE_FIELDS = [
  'roofType',
  'roofMaterial',
  'roofLengthM',
  'roofWidthM',
  'usableAreaM2',
  'tiltDegree',
  'azimuthDegree',
  'roofCondition',
  'electricalCabinetNotes',
  'electricalConnectionNotes',
  'installationFeasibility',
  'proposedInverterLocation',
  'proposedPanelLayoutNotes',
  'measuredLatitude',
  'measuredLongitude',
  'notes',
]
const REQUIRED = [
  'roofType',
  'roofMaterial',
  'roofLengthM',
  'roofWidthM',
  'usableAreaM2',
  'tiltDegree',
  'azimuthDegree',
  'roofCondition',
  'installationFeasibility',
  'electricalCabinetNotes',
]

/** OnSiteSurveyHandlers.AmendAsync */
function amend(state, who, appointmentId, body) {
  const reason = body?.reason ?? ''
  if (!reason.trim() || reason.length > 1000)
    return fail(400, 'VALIDATION_FAILED', 'A reason (at most 1000 characters) is required.')
  const changes = body.changes ?? {}
  const lat = changes.measuredLatitude ?? null
  const lng = changes.measuredLongitude ?? null
  if ((lat === null) !== (lng === null))
    return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
      measuredLatitude: ['Latitude and longitude go together.'],
    })
  const appointment = state.mine.find((a) => a.appointmentId === appointmentId)
  if (!appointment || !['ACCEPTED', 'ASSIGNED', 'COMPLETED'].includes(appointment.status))
    return fail(404, 'ONSITE_APPOINTMENT_NOT_FOUND', 'Appointment was not found.')
  const files = body.additionalFileIds ?? []
  for (const id of files)
    if (state.files[id]?.purpose !== 'ONSITE_SURVEY_EVIDENCE' || state.files[id]?.ownerId !== who.userId)
      return fail(400, 'FILE_WRONG_PURPOSE', 'File purpose mismatch.')
  const report = state.surveys[appointmentId]
  if (!report) return fail(404, 'ONSITE_SURVEY_NOT_FOUND', 'Start or save the survey first.')
  if (body.revision !== report.revision)
    return fail(409, 'ONSITE_SURVEY_STALE_REVISION', 'The survey was changed meanwhile. Reload and try again.', {
      currentRevision: report.revision,
    })
  if (report.status !== 'COMPLETED')
    return fail(409, 'ONSITE_SURVEY_NOT_COMPLETED', 'Only completed surveys are amended; edit the draft instead.')

  const before = report.data
  const merged = { ...before }
  for (const f of ONSITE_FIELDS) if (changes[f] !== undefined && changes[f] !== null) merged[f] = changes[f]
  for (const f of ONSITE_TEXT_FIELDS) if (merged[f] === '') merged[f] = null
  const missing = REQUIRED.filter((f) => merged[f] === null || merged[f] === undefined || merged[f] === '')
  if (missing.length > 0)
    return fail(
      400,
      'VALIDATION_FAILED',
      'The amended survey would be incomplete.',
      Object.fromEntries(missing.map((f) => [f, ['Required.']])),
    )
  if (merged.usableAreaM2 > merged.roofLengthM * merged.roofWidthM)
    return fail(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
      usableAreaM2: ['Must not exceed length × width.'],
    })

  const diff = {}
  for (const f of ONSITE_FIELDS) {
    const after = changes[f] !== undefined && changes[f] !== null ? changes[f] : before[f]
    if (after !== before[f]) diff[f] = { old: before[f], new: after }
  }
  if (Array.isArray(changes.obstacles)) {
    diff.obstacles = { old: clone(report.obstacles), new: changes.obstacles }
    report.obstacles = changes.obstacles.map((o) => ({ ...o, kind: o.kind.toUpperCase() }))
  }
  if (Object.keys(diff).length === 0 && files.length === 0)
    return fail(400, 'VALIDATION_FAILED', 'The amendment changes nothing.')
  for (const id of files)
    if (report.attachments.some((a) => a.fileId === id))
      return fail(409, 'FILE_ALREADY_LINKED', 'A file is already attached.')

  const createdAt = new Date().toISOString()
  const amendmentId = `am-${report.version}`
  report.amendments.push({
    amendmentNumber: report.version,
    authorUserId: who.userId,
    reason: reason.trim(),
    changes: diff,
    createdAt,
  })
  for (const id of new Set(files))
    report.attachments.push({
      attachmentId: `att-${id}`,
      fileId: id,
      category: 'DOCUMENT',
      caption: null,
      addedAt: createdAt,
      amendmentId,
    })
  report.data = { ...merged, obstacles: clone(report.obstacles) }
  report.version += 1
  report.revision += 1
  report.updatedAt = createdAt
  return ok(clone(report))
}

export function handleTech(state, who, method, url, bodyText) {
  const u = new URL(url)
  const path = u.pathname.replace(/^\/api/, '')
  const q = Object.fromEntries(u.searchParams)
  const body = bodyText ? JSON.parse(bodyText) : undefined
  state.requests.push({ method, path, query: q, body, role: who.role })
  const m = (re) => path.match(re)
  const tech = who.role === 'TECHNICIAN'

  if (method === 'POST' && path === '/auth/refresh')
    return ok({
      accessToken: token(who.role, who.userId),
      accessTokenExpiresAt: iso(Date.now() + 3600_000),
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: iso(Date.now() + 86_400_000),
      tokenType: 'Bearer',
      userId: who.userId,
    })
  if (method === 'GET' && path === '/products')
    return ok({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 })

  // Tệp (luồng tải lên có sẵn của FE)
  if (method === 'POST' && path === '/files/presigned-upload')
    return ok({
      fileId: null,
      bucket: 'b',
      objectKey: `onsite/${who.userId}/${state.requests.length}`,
      uploadUrl: 'https://s3.mock.test/upload',
      method: 'PUT',
      headers: { 'Content-Type': body.contentType },
      expiresAt: iso(Date.now() + 300_000),
    })
  if (method === 'POST' && path === '/files') {
    const fileId = `file-${Object.keys(state.files).length + 1}`
    state.files[fileId] = { purpose: body.purpose, ownerId: who.userId }
    return ok(
      {
        fileId,
        purpose: body.purpose,
        bucket: 'b',
        objectKey: body.objectKey,
        originalFileName: body.fileName,
        status: 'VERIFIED',
        rejectionReason: null,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
        checksumSha256: body.checksumSha256,
        objectVersionId: '1',
        verifiedAt: iso(Date.now()),
        createdAt: iso(Date.now()),
      },
      201,
    )
  }

  if (path.startsWith('/technicians/me') && !tech) return fail(403, 'AUTH_FORBIDDEN')

  // ---- Lịch khảo sát (TechnicianAppointments)
  if (method === 'GET' && path === '/technicians/me/open-appointments') return ok(clone(state.open))
  let hit = m(/^\/technicians\/me\/open-appointments\/([^/]+)$/)
  if (hit && method === 'GET') {
    const found = state.open.find((a) => a.appointmentId === hit[1])
    return found ? ok(clone(found)) : fail(404, 'APPOINTMENT_NOT_FOUND', 'Appointment was not found.')
  }
  hit = m(/^\/technicians\/me\/appointments\/([^/]+)\/accept$/)
  if (hit && method === 'POST') {
    const id = hit[1]
    const own = state.mine.find((a) => a.appointmentId === id)
    if (own) return ok({ appointmentId: id, surveyRequestId: own.surveyRequestId, technicianUserId: who.userId })
    if (state.takenByOthers.has(id))
      return fail(409, 'APPOINTMENT_ALREADY_TAKEN', 'Another technician already took this appointment.')
    const open = state.open.find((a) => a.appointmentId === id)
    if (!open) return fail(404, 'APPOINTMENT_NOT_FOUND', 'Appointment was not found.')
    if (body?.expectedRevision != null && body.expectedRevision !== open.revision)
      return fail(
        409,
        'APPOINTMENT_CONCURRENCY_CONFLICT',
        'The appointment changed since you loaded it. Reload and try again.',
      )
    state.open = state.open.filter((a) => a.appointmentId !== id)
    state.mine.push(
      job({
        appointmentId: id,
        surveyRequestId: open.surveyRequestId,
        startsAt: open.startsAt,
        endsAt: open.endsAt,
        revision: open.revision + 1,
        assignedAt: iso(Date.now()),
        acceptedAt: iso(Date.now()),
        property: { ...job({}).property, name: open.propertyName, ward: open.ward },
      }),
    )
    return ok({ appointmentId: id, surveyRequestId: open.surveyRequestId, technicianUserId: who.userId })
  }
  if (method === 'GET' && path === '/technicians/me/appointments')
    return ok(
      state.mine.map((a) => ({
        appointmentId: a.appointmentId,
        appointmentType: a.appointmentType,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        assignmentSource: a.assignmentSource,
        propertyName: a.property.name,
        province: a.property.province,
        district: null,
        assignedAt: a.assignedAt,
        surveyRequestId: a.surveyRequestId,
        ward: a.property.ward,
        communeName: a.property.ward,
        isOverdue: false,
      })),
    )
  hit = m(/^\/technicians\/me\/appointments\/([^/]+)$/)
  if (hit && method === 'GET') {
    const found = state.mine.find((a) => a.appointmentId === hit[1])
    return found ? ok(clone(found)) : fail(404, 'APPOINTMENT_NOT_FOUND', 'Appointment was not found.')
  }

  // ---- Khảo sát tại công trình
  hit = m(/^\/technicians\/me\/appointments\/([^/]+)\/onsite-survey$/)
  if (hit && method === 'GET') {
    if (!state.mine.some((a) => a.appointmentId === hit[1]))
      return fail(404, 'ONSITE_APPOINTMENT_NOT_FOUND', 'Appointment was not found.')
    return ok(state.surveys[hit[1]] ? clone(state.surveys[hit[1]]) : null)
  }
  hit = m(/^\/technicians\/me\/appointments\/([^/]+)\/onsite-survey\/amendments$/)
  if (hit && method === 'POST') return amend(state, who, hit[1], body)
  hit = m(/^\/technicians\/me\/appointments\/([^/]+)\/onsite-survey\/attachments\/([^/]+)\/url$/)
  if (hit && method === 'GET')
    return ok({
      id: hit[2],
      url: 'https://s3.mock.test/file.png',
      expiresAt: iso(Date.now() + 300_000),
      disposition: 'inline',
      contentType: 'image/png',
      fileName: 'file.png',
    })

  // ---- Lắp đặt (không thuộc phạm vi test này)
  if (method === 'GET' && path === '/technicians/me/installation-projects') return ok([])

  // ---- Sau bán hàng (TechnicianAfterSales)
  if (method === 'GET' && path === '/technicians/me/after-sales/visits')
    return ok(state.visits.filter((v) => v.technicianUserId === who.userId).map((v) => visitView(state, v)))
  hit = m(/^\/technicians\/me\/after-sales\/visits\/([^/]+)\/evidence\/([^/]+)\/url$/)
  if (hit && method === 'GET')
    return ok({ evidenceId: hit[2], url: 'https://s3.mock.test/photo.png', expiresAt: iso(Date.now() + 300_000) })
  hit = m(/^\/technicians\/me\/after-sales\/visits\/([^/]+)(\/[a-z-]+)?$/)
  if (hit) {
    const v = state.visits.find((x) => x.visitId === hit[1])
    if (!v || v.technicianUserId !== who.userId) return fail(404, 'SERVICE_VISIT_NOT_FOUND', 'Visit was not found.')
    const request = state.serviceRequests[v.requestId]
    const action = hit[2] ?? ''
    const invalid = (message) => fail(409, 'AFTER_SALES_INVALID_STATE', message)
    const done = () => ok(visitView(state, v))

    if (method === 'GET' && action === '') return done()

    if (method === 'POST' && action === '/evidence') {
      if (state.files[body.fileId]?.purpose !== 'SERVICE_EVIDENCE')
        return fail(400, 'FILE_WRONG_PURPOSE', 'File purpose mismatch.')
      if (!['SCHEDULED', 'IN_PROGRESS'].includes(v.status)) return invalid('Photos are added while the visit is open.')
      v.evidence.push({
        evidenceId: `ev-${body.fileId}`,
        visitId: v.visitId,
        fileId: body.fileId,
        caption: trim(body.caption, 300),
        addedAt: iso(Date.now()),
      })
      return done()
    }

    if (method === 'POST' && action === '/inspection') {
      const items = body.items ?? []
      if (body.noFaultFound && body.stayOnSite)
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Nothing to repair when no fault was found.')
      const text = trim(body.report, 4000)
      if (!text) return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Describe what you inspected and found.')
      if (Boolean(body.noFaultFound) === items.length > 0)
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Report either diagnosed items or no fault found.')
      if (v.purpose !== 'INSPECTION' || v.status !== 'IN_PROGRESS') return invalid('Start the inspection first.')
      if (v.report !== null) return invalid('The diagnosis of this visit was already reported.')
      if (v.evidence.length === 0) return fail(409, 'AFTER_SALES_EVIDENCE_REQUIRED', 'Add at least one photo.')
      for (const input of items) {
        if (!trim(input.description, 500) || !trim(input.diagnosis, 2000))
          return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Every item needs a description and a diagnosis.')
        request.items.push(
          item(state, input.description.trim(), input.diagnosis.trim(), {
            assetId: input.assetId ?? null,
            requiredParts: trim(input.requiredParts, 1000),
          }),
        )
      }
      if (body.stayOnSite) v.report = text
      else closeVisit(v, text)
      request.status = body.noFaultFound ? 'PENDING_CUSTOMER_ACCEPTANCE' : 'AWAITING_DECISION'
      return done()
    }

    if (method === 'POST' && action === '/continue-repair') {
      const minutes = body.estimatedMinutes
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480)
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Estimate the repair between 1 and 480 minutes.')
      if (!waitingOnSite(v) || v.assignmentStatus !== 'ACCEPTED')
        return invalid(
          'Only an inspection whose diagnosis you reported while staying on site can continue as a repair.',
        )
      if (request.status !== 'READY_FOR_WORK')
        return fail(409, 'AFTER_SALES_PAYMENT_REQUIRED', 'The work is not authorized yet.')
      if (!body.partsAvailable) return fail(409, 'AFTER_SALES_PARTS_UNAVAILABLE', 'Finish the visit.')
      if (Date.now() + minutes * MIN > new Date(v.endsAt).getTime())
        return fail(409, 'AFTER_SALES_REPAIR_TIME_INSUFFICIENT', 'The repair does not fit in this visit.')
      v.purpose = 'REPAIR'
      request.status = 'IN_PROGRESS'
      return done()
    }

    if (method === 'POST' && action === '/finish') {
      if (!waitingOnSite(v)) return invalid('This visit is not waiting on site.')
      closeVisit(v, v.report)
      v.finishNote = trim(body?.note, 500) ?? 'finished by the technician'
      return done()
    }

    if (method === 'POST' && action === '/supplementary-items') {
      const description = trim(body.description, 500)
      const diagnosis = trim(body.diagnosis, 2000)
      if (!description || !diagnosis)
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'The item needs a description and a diagnosis.')
      if (!['REPAIR', 'REWORK'].includes(v.purpose) || v.status !== 'IN_PROGRESS')
        return invalid('Additional faults are reported during a repair.')
      request.items.push(
        item(state, description, diagnosis, {
          assetId: body.assetId ?? null,
          requiredParts: trim(body.requiredParts, 1000),
          isSupplementary: true,
        }),
      )
      return done()
    }

    if (method === 'POST' && action === '/work-report') {
      const text = trim(body.report, 4000)
      if (!text) return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Describe the work you did.')
      if (v.purpose === 'INSPECTION' || v.status !== 'IN_PROGRESS') return invalid('Start the work first.')
      if (v.evidence.length === 0) return fail(409, 'AFTER_SALES_EVIDENCE_REQUIRED', 'Add at least one photo.')
      for (const result of body.results ?? []) {
        const it = request.items.find((i) => i.itemId === result.itemId)
        if (!it) return fail(404, 'SERVICE_ITEM_NOT_FOUND', 'Item was not found.')
        if (!['AUTHORIZED', 'DONE'].includes(it.status)) return invalid('Only authorized work can be reported.')
        Object.assign(it, {
          status: 'DONE',
          workResult: trim(result.workResult, 2000),
          partsUsed: trim(result.partsUsed, 1000),
        })
      }
      closeVisit(v, v.report ? `${v.report}\n\n${text}` : text)
      request.status = nextStatus(request.items)
      return done()
    }
  }

  return fail(404, 'RESOURCE_NOT_FOUND', `mock chưa có ${method} ${path}`)
}

export async function installTechMockApi(page, state, who) {
  // Chỉ chặn đường dẫn bắt đầu bằng /api/: module của Vite như /src/services/api/errors.ts không được đụng
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const result = handleTech(state, who, request.method(), request.url(), request.postData())
      return route.fulfill({
        status: result.status,
        contentType: 'application/json',
        body: JSON.stringify(result.body),
      })
    },
  )
  await page.route('https://s3.mock.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(TINY_PNG, 'base64') }),
  )
}

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

// ---- Bước của vai trò khác, giả lập trên state (không phải giao diện thật)

/** Quản lý quyết định chi phí từng hạng mục: bảo hành thì được làm ngay, khách trả tiền thì chờ báo giá */
export function managerDecides(state, requestId, coverage) {
  const request = state.serviceRequests[requestId]
  for (const i of request.items.filter((x) => x.coverage === 'PENDING' && x.status === 'OPEN')) {
    i.coverage = coverage
    if (['INSTALLATION_WARRANTY', 'REPAIR_WARRANTY'].includes(coverage)) i.status = 'AUTHORIZED'
  }
  request.status = nextStatus(request.items)
}

/** Kinh doanh gửi báo giá: hạng mục khách trả tiền thành QUOTED */
export function salesQuotes(state, requestId) {
  const request = state.serviceRequests[requestId]
  for (const i of request.items.filter((x) => x.status === 'OPEN' && x.coverage === 'CHARGEABLE')) i.status = 'QUOTED'
  request.status = nextStatus(request.items)
}

/** Khách đồng ý và PayOS xác nhận đã trả: hạng mục đã báo giá thành AUTHORIZED */
export function customerPays(state, requestId) {
  const request = state.serviceRequests[requestId]
  for (const i of request.items.filter((x) => x.status === 'QUOTED')) i.status = 'AUTHORIZED'
  request.status = nextStatus(request.items)
}

/** Quản lý xếp buổi sửa riêng cho kỹ thuật viên (chờ người đó nhận) */
export function managerSchedulesRepair(state, requestId, technicianUserId) {
  const from = state.visits.find((v) => v.requestId === requestId)
  const startsAt = Date.now() + 2 * 24 * 60 * MIN
  state.visits.push({
    ...clone(from),
    visitId: `v-repair-${state.visits.length + 1}`,
    purpose: 'REPAIR',
    status: 'SCHEDULED',
    assignmentStatus: 'PENDING',
    technicianUserId,
    startsAt: iso(startsAt),
    endsAt: iso(startsAt + 120 * MIN),
    report: null,
    evidence: [],
  })
}
