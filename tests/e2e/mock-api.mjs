// Backend giả cho E2E của cổng quản trị: trả lời /api/** trong trình duyệt bằng page.route, giữ trạng thái trong bộ nhớ.
// Luật bám handler của backend `main` (7c79fa8) đã đối chiếu: upsert thời hạn bảo hành, ghi nhận hoàn tiền, revision của khu,
// COMMUNE_ALREADY_MAPPED, công bố tài liệu, kiểm tra / áp dụng cấu hình RAG, ảnh sản phẩm, phân công thẳng.
// Chỉ dùng trong test, không phải nguồn dữ liệu của ứng dụng

const now = () => new Date().toISOString()
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')

export function adminToken() {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: 'admin-1', email: 'admin@test.vn', role: 'ADMIN', exp })}.sig`
}

const zoneRow = (z) => ({ ...z })

export function createState() {
  return {
    requests: [],
    warranty: [{ optionId: 'w-r12', kind: 'REPAIR', months: 12, isDefault: true, isActive: true }],
    refunds: [
      {
        refundId: 'rf-approved',
        customerUserId: 'c1',
        paymentAttemptId: 'p1',
        subscriptionId: 'sub-1',
        quotationId: null,
        requestId: null,
        originalAmount: 2_000_000,
        approvedAmount: 1_500_000,
        reason: 'Khách huỷ gói trước khi bắt đầu kỳ',
        status: 'APPROVED',
        approvedByUserId: 'm1',
        approvedAt: '2026-11-01T02:00:00Z',
        decisionNote: 'Giữ phí xử lý',
        recordedByUserId: null,
        refundedAt: null,
        refundReference: null,
        createdAt: '2026-10-30T02:00:00Z',
        revision: 1,
      },
      {
        refundId: 'rf-pending',
        customerUserId: 'c2',
        paymentAttemptId: 'p2',
        subscriptionId: null,
        quotationId: 'q2',
        requestId: 'req-2',
        originalAmount: 800_000,
        approvedAmount: null,
        reason: 'Huỷ sửa chữa đã trả tiền',
        status: 'PENDING_APPROVAL',
        approvedByUserId: null,
        approvedAt: null,
        decisionNote: null,
        recordedByUserId: null,
        refundedAt: null,
        refundReference: null,
        createdAt: '2026-11-02T02:00:00Z',
        revision: 0,
      },
    ],
    zones: [
      {
        zoneId: 'zone-1',
        code: 'KHU-Q1',
        name: 'Quận 1 cũ',
        isActive: true,
        isServiceable: true,
        responsibleManagerUserId: 'm1',
        communeCount: 1,
        memberCount: 1,
        schedulableMemberCount: 1,
        hasAvailableTechnician: true,
        revision: 3,
        createdAt: '2026-10-01T02:00:00Z',
        updatedAt: '2026-10-01T02:00:00Z',
      },
      {
        zoneId: 'zone-2',
        code: 'KHU-THU-DUC',
        name: 'Thủ Đức',
        isActive: true,
        isServiceable: true,
        responsibleManagerUserId: null,
        communeCount: 1,
        memberCount: 0,
        schedulableMemberCount: 0,
        hasAvailableTechnician: false,
        revision: 0,
        createdAt: '2026-10-01T02:00:00Z',
        updatedAt: '2026-10-01T02:00:00Z',
      },
    ],
    zoneCommunes: { 'zone-1': ['26734'], 'zone-2': ['26800'] },
    communes: [
      { code: '26734', name: 'Phường Sài Gòn', unitType: 'WARD', provinceCode: '79' },
      { code: '26740', name: 'Phường Bến Thành', unitType: 'WARD', provinceCode: '79' },
      { code: '26743', name: 'Phường Tân Định', unitType: 'WARD', provinceCode: '79' },
      { code: '26800', name: 'Phường Thủ Đức', unitType: 'WARD', provinceCode: '79' },
    ],
    knowledgeEnabled: true,
    documents: [
      {
        documentId: 'doc-1',
        title: 'Chính sách bảo hành',
        category: 'WARRANTY',
        tags: ['bảo hành'],
        status: 'READY_FOR_REVIEW',
        latestVersionId: 'v-2',
        publishedVersionId: null,
        createdAt: '2026-10-20T02:00:00Z',
        updatedAt: '2026-10-21T02:00:00Z',
        revision: 2,
        versions: [
          version('v-1', 1, 'PROCESSING'),
          version('v-2', 2, 'READY_FOR_REVIEW', { pageCount: 4, chunkCount: 12, ingestedAt: '2026-10-21T02:00:00Z' }),
        ],
        jobs: [],
      },
    ],
    rag: {
      draft: ragView(7, 'DRAFT', { chunkCharacters: 1800, revision: 0 }),
      active: ragView(6, 'ACTIVE', {}),
      history: [ragView(6, 'ACTIVE', {}), ragView(5, 'SUPERSEDED', { chunkCharacters: 2000 })],
      draftInvalid: true,
    },
    product: {
      id: 'prod-1',
      sku: 'TSM-700',
      productType: 'SOLAR_PANEL',
      category: 'Tấm pin',
      name: 'Tấm pin Trina 700W',
      brand: 'Trina',
      model: 'Vertex N',
      unit: 'tấm',
      unitPrice: 3_600_000,
      currency: 'VND',
      ratedPowerW: 700,
      widthMm: 1303,
      heightMm: 2384,
      warrantyMonth: 144,
      spec: {},
      status: 'ACTIVE',
      imageUrl: 'https://cdn.example.com/a.jpg',
      images: [
        { id: 'img-a', url: 'https://cdn.example.com/a.jpg', altText: 'Mặt trước', sortOrder: 0, isPrimary: true },
        { id: 'img-b', url: 'https://cdn.example.com/b.jpg', altText: null, sortOrder: 1, isPrimary: false },
      ],
      createdAt: '2026-10-01T02:00:00Z',
      updatedAt: '2026-10-01T02:00:00Z',
    },
    appointmentRevision: 4,
  }
}

function version(versionId, versionNumber, status, extra = {}) {
  return {
    versionId,
    versionNumber,
    fileId: `file-${versionId}`,
    status,
    pageCount: null,
    chunkCount: null,
    extractedCharacters: null,
    embeddingModel: null,
    failureReason: null,
    createdAt: '2026-10-20T02:00:00Z',
    ingestedAt: null,
    publishedAt: null,
    indexedConfigVersion: null,
    indexedChunkCharacters: null,
    indexedChunkOverlap: null,
    lastIngestStatus: null,
    lastIngestError: null,
    ...extra,
  }
}

function ragView(version, status, extra) {
  return {
    version,
    status,
    generationModel: 'gpt-4.1-mini',
    temperature: 0.1,
    supportsTemperature: true,
    tokenParameter: 'max_tokens',
    maxOutputTokens: 700,
    chunkCharacters: 2400,
    chunkOverlap: 300,
    topK: 6,
    minScore: 0.2,
    maxContextTokens: 3000,
    maxHistoryMessages: 6,
    promptVersion: 'v1',
    notes: null,
    basedOnVersion: null,
    createdBy: null,
    createdAt: '2026-10-20T02:00:00Z',
    updatedAt: '2026-10-20T02:00:00Z',
    activatedBy: null,
    activatedAt: status === 'DRAFT' ? null : '2026-10-20T02:00:00Z',
    revision: 0,
    ...extra,
  }
}

const ok = (data, status = 200) => ({ status, body: { isSuccess: true, traceId: 't', data } })
const fail = (status, code, message, details) => ({
  status,
  body: { isSuccess: false, traceId: 't', data: null, error: { code, message, details } },
})
const page = (items) => ({ items, page: 1, pageSize: items.length || 20, totalItems: items.length, totalPages: 1 })

const USERS = [
  { id: 'm1', email: 'manager@test.vn', fullName: 'Quản Lý Một', roles: ['MANAGER'], status: 'ACTIVE' },
  { id: 's1', email: 'sale1@test.vn', fullName: 'Kinh Doanh Một', roles: ['SALES'], status: 'ACTIVE' },
  { id: 's2', email: 'sale2@test.vn', fullName: 'Kinh Doanh Hai', roles: ['SALES'], status: 'ACTIVE' },
].map((u) => ({
  phone: null,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: '2026-10-01T02:00:00Z',
  updatedAt: '2026-10-01T02:00:00Z',
  deletedAt: null,
  hasPassword: true,
  technician: null,
  ...u,
}))

function zoneDetail(state, zoneId) {
  const zone = state.zones.find((z) => z.zoneId === zoneId)
  const codes = state.zoneCommunes[zoneId] ?? []
  return {
    zone: { ...zoneRow(zone), communeCount: codes.length },
    communes: codes.map((code) => ({
      ...state.communes.find((c) => c.code === code),
      assignedAt: '2026-10-02T02:00:00Z',
    })),
  }
}

function dispatchDetail() {
  const sla = {
    reviewSlaMinutes: 240,
    reviewDueAt: '2026-11-04T02:00:00Z',
    escalationDueAt: '2026-11-05T02:00:00Z',
    reminderIntervalMinutes: 60,
    settingsVersion: 1,
    overdue: false,
    overdueAt: null,
    escalated: false,
    escalatedAt: null,
    reminderCount: 0,
    lastReminderAt: null,
  }
  return {
    request: {
      dispatchRequestId: 'disp-1',
      surveyRequestId: 'sr-1',
      propertySiteId: 'site-1',
      status: 'ASSIGNED',
      reason: 'NO_ZONE_TECHNICIAN',
      customerName: 'Nguyễn Văn A',
      propertyName: 'Nhà phố Bến Thành',
      province: 'Thành phố Hồ Chí Minh',
      communeCode: '26740',
      zone: { zoneId: 'zone-1', code: 'KHU-Q1', name: 'Quận 1 cũ' },
      createdAt: '2026-11-01T02:00:00Z',
      sla,
      liveProposal: null,
      revision: 2,
    },
    customerNote: null,
    preferredWindows: [],
    proposals: [],
    crossZoneAuthorizations: [],
    events: [],
    resolution: 'ASSIGNED',
    resolutionReason: null,
    resolvedAt: '2026-11-02T02:00:00Z',
    resolvedByUserId: 'm1',
    appointmentId: 'appt-1',
    currentCoverageStatus: 'COVERED',
    releasedAppointmentId: null,
  }
}

/** Trả { status, body } cho một request; ghi lại mọi request vào state.requests để test kiểm tra body / query */
export function handle(state, method, url, bodyText) {
  const u = new URL(url)
  const path = u.pathname.replace(/^\/api/, '')
  const q = Object.fromEntries(u.searchParams)
  const body = bodyText ? safeJson(bodyText) : undefined
  state.requests.push({ method, path, query: q, body })
  const m = (re) => path.match(re)

  // Phiên
  if (method === 'POST' && path === '/auth/refresh')
    return ok({
      accessToken: adminToken(),
      accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      tokenType: 'Bearer',
      userId: 'admin-1',
    })

  // Layout và các danh sách nền
  if (method === 'GET' && path === '/products') return ok(page([state.product]))
  if (method === 'GET' && path === '/admin/products') return ok(page([state.product]))
  if (method === 'GET' && path === '/admin/users') {
    const items = q.role ? USERS.filter((x) => x.roles.includes(q.role)) : USERS
    return ok(page(items))
  }
  if (method === 'GET' && m(/^\/admin\/users\/([^/]+)$/)) {
    const user = USERS.find((x) => x.id === m(/^\/admin\/users\/([^/]+)$/)[1])
    return user ? ok(user) : fail(404, 'ADMIN_USER_NOT_FOUND', 'not found')
  }
  if (method === 'GET' && path === '/admin/dispatch-requests') return ok(page([]))
  if (method === 'GET' && (path === '/installations/ready-contracts' || path === '/installation-projects'))
    return ok([])
  if (method === 'GET' && (path === '/manager/after-sales/requests' || path === '/admin/technicians')) return ok([])
  if (method === 'GET' && path === '/admin/after-sales/packages') return ok([])
  if (method === 'GET' && path === '/administrative-units/communes') return ok(state.communes)
  if (method === 'GET' && path === '/admin/system-settings/scheduling')
    return ok({
      version: 1,
      bootstrap: false,
      updatedAt: null,
      updatedByUserId: null,
      cacheTtlSeconds: 15,
      settings: [],
      rules: [],
    })
  if (method === 'GET' && path === '/admin/system-settings/scheduling/history') return ok(page([]))

  // A. Thời hạn bảo hành
  if (path === '/admin/after-sales/warranty-options') {
    if (method === 'GET') return ok(state.warranty.filter((o) => !q.kind || o.kind === q.kind))
    if (method === 'PUT') {
      const { kind, months, isActive, isDefault } = body
      if (!['INSTALLATION', 'REPAIR'].includes(kind))
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Unknown warranty kind.')
      if (!(months >= 1 && months <= 240))
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Months are between 1 and 240.')
      if (isDefault && !isActive)
        return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'The default option must be active.')
      if (isDefault) for (const o of state.warranty) if (o.kind === kind && o.months !== months) o.isDefault = false
      let option = state.warranty.find((o) => o.kind === kind && o.months === months)
      if (!option) state.warranty.push((option = { optionId: `w-${kind}-${months}`, kind, months }))
      Object.assign(option, { isActive, isDefault })
      return ok({ ...option })
    }
  }

  // A. Hoàn tiền
  if (method === 'GET' && path === '/manager/after-sales/refunds')
    return ok(state.refunds.filter((r) => !q.status || r.status === q.status))
  if (method === 'POST' && m(/^\/admin\/after-sales\/refunds\/([^/]+)\/record$/)) {
    const refund = state.refunds.find((r) => r.refundId === m(/^\/admin\/after-sales\/refunds\/([^/]+)\/record$/)[1])
    if (!refund) return fail(404, 'REFUND_NOT_FOUND', 'Refund was not found.')
    if (refund.status !== 'APPROVED')
      return fail(409, 'AFTER_SALES_INVALID_STATE', 'Only an approved refund can be recorded.')
    if (Date.parse(body.refundedAt) > Date.now())
      return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'The refund date cannot be in the future.')
    Object.assign(refund, {
      status: 'REFUNDED',
      refundedAt: new Date(body.refundedAt).toISOString(),
      refundReference: body.reference,
      revision: refund.revision + 1,
    })
    return ok({ ...refund })
  }

  // A. Báo cáo
  if (method === 'GET' && path === '/admin/after-sales/dashboard') {
    if (q.To < q.From) return fail(400, 'AFTER_SALES_VALIDATION_FAILED', 'Each range ends on or after its start.')
    return ok({
      from: q.From,
      to: q.To,
      compareFrom: q.CompareFrom,
      compareTo: q.CompareTo,
      metrics: [
        {
          key: 'collected_contracts',
          description: 'x',
          current: 100_000_000,
          previous: 50_000_000,
          changePercent: 100,
        },
        { key: 'collected_packages', description: 'x', current: 4_000_000, previous: 0, changePercent: null },
        { key: 'collected_services', description: 'x', current: 1_000_000, previous: 2_000_000, changePercent: -50 },
        { key: 'collected_total', description: 'x', current: 105_000_000, previous: 52_000_000, changePercent: 101.92 },
        { key: 'refunded', description: 'x', current: 1_500_000, previous: 0, changePercent: null },
        { key: 'net_collected', description: 'x', current: 103_500_000, previous: 52_000_000, changePercent: 99.04 },
        { key: 'new_customers', description: 'x', current: 7, previous: 5, changePercent: 40 },
      ],
    })
  }
  if (method === 'GET' && path === '/admin/after-sales/dashboard/export')
    return {
      status: 200,
      raw: `metric,description,current,previous,change_percent\ncollected_total,"Gross",105000000,52000000,101.92\n`,
      contentType: 'text/csv',
    }

  // B. Khu vực phục vụ
  if (path === '/admin/operational-zones') {
    if (method === 'GET')
      return ok(state.zones.map((z) => ({ ...z, communeCount: (state.zoneCommunes[z.zoneId] ?? []).length })))
    if (method === 'POST') {
      const code = String(body.code ?? '')
        .trim()
        .toUpperCase()
      if (state.zones.some((z) => z.code === code)) return fail(409, 'ZONE_CODE_EXISTS', 'exists')
      const zone = {
        zoneId: `zone-${state.zones.length + 1}`,
        code,
        name: body.name,
        isActive: body.isActive,
        isServiceable: body.isServiceable,
        responsibleManagerUserId: body.responsibleManagerUserId ?? null,
        communeCount: 0,
        memberCount: 0,
        schedulableMemberCount: 0,
        hasAvailableTechnician: false,
        revision: 0,
        createdAt: now(),
        updatedAt: now(),
      }
      state.zones.push(zone)
      state.zoneCommunes[zone.zoneId] = []
      return ok(zone, 201)
    }
  }
  if (method === 'GET' && path === '/admin/operational-zones/coverage') {
    const mapped = new Set(Object.values(state.zoneCommunes).flat())
    const unmapped = state.communes.filter((c) => !mapped.has(c.code))
    return ok({
      unmappedCommuneCount: unmapped.length,
      unmappedCommunes: unmapped,
      zonesWithoutSchedulableTechnicians: state.zones.filter((z) => z.isActive && !z.hasAvailableTechnician),
    })
  }
  const zoneMatch = m(/^\/admin\/operational-zones\/([^/]+)(\/communes|\/technicians)?$/)
  if (zoneMatch) {
    const [, zoneId, sub] = zoneMatch
    const zone = state.zones.find((z) => z.zoneId === zoneId)
    if (!zone) return fail(404, 'ZONE_NOT_FOUND', 'Operational zone was not found.')
    if (method === 'GET' && !sub) return ok(zoneDetail(state, zoneId))
    if (method === 'GET' && sub === '/technicians')
      return ok(
        zone.memberCount
          ? [
              {
                technicianUserId: 't1',
                fullName: 'Kỹ Thuật Một',
                isActiveUser: true,
                isSchedulingActive: true,
                isSchedulable: true,
                assignedAt: '2026-10-02T02:00:00Z',
              },
            ]
          : [],
      )
    if (method === 'PUT' && !sub) {
      if (body.revision !== zone.revision) return fail(409, 'ZONE_STALE_REVISION', 'The zone changed meanwhile.')
      Object.assign(zone, {
        name: body.name,
        isActive: body.isActive ?? zone.isActive,
        isServiceable: body.isServiceable ?? zone.isServiceable,
        responsibleManagerUserId: body.responsibleManagerUserId ?? null,
        revision: zone.revision + 1,
      })
      return ok({ ...zone })
    }
    if (method === 'PUT' && sub === '/communes') {
      if (body.revision !== zone.revision) return fail(409, 'ZONE_STALE_REVISION', 'The zone changed meanwhile.')
      const holders = []
      for (const code of body.communeCodes) {
        for (const [otherId, codes] of Object.entries(state.zoneCommunes)) {
          const other = state.zones.find((z) => z.zoneId === otherId)
          if (otherId !== zoneId && other.isActive && codes.includes(code))
            holders.push({ communeCode: code, zoneId: otherId, zoneCode: other.code, zoneName: other.name })
        }
      }
      if (holders.length)
        return fail(409, 'COMMUNE_ALREADY_MAPPED', 'One or more communes already belong to another active zone.', {
          communes: holders,
        })
      state.zoneCommunes[zoneId] = [...body.communeCodes]
      zone.revision += 1
      return ok(zoneDetail(state, zoneId))
    }
  }

  // C. Kho tri thức
  if (path.startsWith('/admin/knowledge-documents') && !state.knowledgeEnabled)
    return fail(
      503,
      'FEATURE_PENDING_MIGRATION',
      'This feature is not enabled until its database migration has been applied.',
    )
  if (path === '/admin/knowledge-documents') {
    if (method === 'GET')
      return ok(
        state.documents
          .filter((d) => (!q.status || d.status === q.status) && (!q.category || d.category === q.category))
          .map((d) => ({ ...d, versions: null, jobs: null })),
      )
    if (method === 'POST') {
      const doc = {
        documentId: `doc-${state.documents.length + 1}`,
        title: body.title,
        category: body.category,
        tags: body.tags,
        status: 'REGISTERED',
        latestVersionId: 'v-new',
        publishedVersionId: null,
        createdAt: now(),
        updatedAt: now(),
        revision: 0,
        versions: [version('v-new', 1, 'REGISTERED', { fileId: body.fileId })],
        jobs: [
          {
            jobId: 'job-new',
            versionId: 'v-new',
            kind: 'INGEST',
            status: 'PENDING',
            attempts: 0,
            maxAttempts: 5,
            nextAttemptAt: now(),
            lastError: null,
            createdAt: now(),
            completedAt: null,
            configVersion: 6,
            chunkCharacters: 2400,
            chunkOverlap: 300,
          },
        ],
      }
      state.documents.push(doc)
      return ok(doc, 201)
    }
  }
  const docMatch = m(/^\/admin\/knowledge-documents\/([^/]+)(\/publish|\/unpublish|\/archive|\/reindex)?$/)
  if (docMatch) {
    const [, documentId, action] = docMatch
    const doc = state.documents.find((d) => d.documentId === documentId)
    if (!doc) return fail(404, 'RAG_DOCUMENT_NOT_FOUND', 'Document was not found.')
    if (method === 'GET' && !action) return ok(doc)
    if (action === '/publish') {
      if (body.revision !== doc.revision)
        return fail(409, 'RAG_STALE_REVISION', 'The document changed meanwhile.', { currentRevision: doc.revision })
      const v = doc.versions.find((x) => x.versionId === body.versionId)
      if (!v) return fail(404, 'RAG_VERSION_NOT_FOUND', 'Version was not found.')
      if (!['READY_FOR_REVIEW', 'WITHDRAWN'].includes(v.status))
        return fail(409, 'RAG_INVALID_STATE', 'Only a ready version can be published.')
      for (const other of doc.versions) if (other.status === 'PUBLISHED') other.status = 'SUPERSEDED'
      Object.assign(v, { status: 'PUBLISHED', publishedAt: now() })
      Object.assign(doc, { status: 'PUBLISHED', publishedVersionId: v.versionId, revision: doc.revision + 1 })
      return ok(doc)
    }
    if (action === '/reindex')
      return {
        status: 429,
        body: { isSuccess: false, error: { code: 'AUTH_TOO_MANY_REQUESTS', message: 'Too many' } },
        headers: { 'retry-after': '120' },
      }
  }

  // C. Tệp (luồng tải lên có sẵn của FE)
  if (method === 'POST' && path === '/files/presigned-upload')
    return ok({
      fileId: null,
      bucket: 'b',
      objectKey: 'knowledge/admin-1/x.pdf',
      uploadUrl: 'https://s3.mock.test/upload',
      method: 'PUT',
      headers: { 'Content-Type': body.contentType },
      expiresAt: now(),
    })
  if (method === 'POST' && path === '/files')
    return ok(
      {
        fileId: 'file-uploaded',
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
        verifiedAt: now(),
        createdAt: now(),
      },
      201,
    )

  // D. Cấu hình RAG
  if (method === 'GET' && path === '/admin/rag-configuration')
    return ok({ bootstrap: false, effective: state.rag.active, active: state.rag.active, draft: state.rag.draft })
  if (method === 'GET' && path === '/admin/rag-configuration/models')
    return ok({
      models: [
        {
          id: 'gpt-4.1-mini',
          displayName: 'GPT-4.1 mini',
          supportsTemperature: true,
          tokenParameter: 'max_tokens',
          maxOutputTokensLimit: 4000,
        },
      ],
      promptVersions: ['v1'],
    })
  if (method === 'GET' && path === '/admin/rag-configuration/versions')
    return ok({ items: state.rag.history, total: state.rag.history.length, page: 1, pageSize: 15 })
  if (method === 'POST' && path === '/admin/rag-configuration/draft/validate') {
    if (!state.rag.draft) return fail(404, 'RAG_CONFIG_DRAFT_NOT_FOUND', 'There is no draft configuration.')
    return ok({
      version: state.rag.draft.version,
      valid: !state.rag.draftInvalid,
      errors: state.rag.draftInvalid ? { chunkOverlap: ['Must be less than a third of chunkCharacters.'] } : {},
      chunkSettingsChanged: true,
      versionsNeedingReindex: 3,
    })
  }
  if (method === 'POST' && path === '/admin/rag-configuration/draft/activate') {
    const draft = state.rag.draft
    if (!draft) return fail(404, 'RAG_CONFIG_DRAFT_NOT_FOUND', 'There is no draft configuration.')
    if (body.expectedRevision !== draft.revision) return fail(409, 'RAG_CONFIG_STALE_REVISION', 'stale')
    const previous = state.rag.active
    state.rag.active = { ...draft, status: 'ACTIVE' }
    state.rag.draft = null
    state.rag.history = [state.rag.active, { ...previous, status: 'SUPERSEDED' }, ...state.rag.history.slice(1)]
    return ok({
      active: state.rag.active,
      supersededVersion: previous.version,
      chunkSettingsChanged: true,
      versionsNeedingReindex: 3,
    })
  }
  if (method === 'DELETE' && path === '/admin/rag-configuration/draft') {
    if (!state.rag.draft) return fail(404, 'RAG_CONFIG_DRAFT_NOT_FOUND', 'none')
    if (Number(q.expectedRevision) !== state.rag.draft.revision) return fail(409, 'RAG_CONFIG_STALE_REVISION', 'stale')
    state.rag.draft = null
    return ok(true)
  }
  if (method === 'POST' && path === '/admin/rag-configuration/rollback') {
    const target = state.rag.history.find((v) => v.version === body.version)
    if (!target) return fail(404, 'RAG_CONFIG_VERSION_NOT_FOUND', 'none')
    if (target.status !== 'SUPERSEDED') return fail(409, 'RAG_CONFIG_INVALID_STATE', 'This version is already active.')
    const previous = state.rag.active
    state.rag.active = { ...target, version: 8, status: 'ACTIVE', notes: `Rollback to version ${target.version}.` }
    return ok({
      active: state.rag.active,
      supersededVersion: previous.version,
      chunkSettingsChanged: true,
      versionsNeedingReindex: 2,
    })
  }
  if (method === 'POST' && path === '/admin/rag-configuration/reindex-stale')
    return ok({ configVersion: state.rag.active.version, stale: 3, queued: 2, skippedOpenJob: 1 }, 202)

  // E. Ảnh sản phẩm
  const productMatch = m(/^\/admin\/products\/([^/]+)(?:\/images(?:\/(order|[^/]+)(\/primary)?)?)?$/)
  if (productMatch && productMatch[1] === state.product.id) {
    const p = state.product
    const [, , image, primary] = productMatch
    const isImages = path.includes('/images')
    if (method === 'GET' && !isImages) return ok(p)
    if (method === 'POST' && isImages && !image) {
      if (p.images.some((i) => i.url === body.url)) return fail(409, 'PRODUCT_IMAGE_DUPLICATE', 'dup')
      const makePrimary = p.images.length === 0 || body.makePrimary
      if (makePrimary) for (const i of p.images) i.isPrimary = false
      p.images.push({
        id: `img-${p.images.length + 1}-new`,
        url: body.url,
        altText: body.altText,
        sortOrder: p.images.length,
        isPrimary: makePrimary,
      })
      return ok(p, 201)
    }
    if (method === 'PUT' && image === 'order') {
      const ids = body.imageIds
      if (ids.length !== p.images.length || !p.images.every((i) => ids.includes(i.id)))
        return fail(400, 'PRODUCT_IMAGE_ORDER_MISMATCH', 'mismatch')
      for (const i of p.images) i.sortOrder = ids.indexOf(i.id)
      return ok(p)
    }
    if (method === 'PUT' && primary) {
      for (const i of p.images) i.isPrimary = i.id === image
      return ok(p)
    }
    if (method === 'DELETE' && image) {
      p.images = p.images.filter((i) => i.id !== image)
      if (!p.images.some((i) => i.isPrimary) && p.images[0]) p.images[0].isPrimary = true
      return ok(p)
    }
  }

  // F. Điều phối khảo sát
  if (method === 'GET' && path === '/admin/dispatch-requests/disp-1') return ok(dispatchDetail())
  if (method === 'GET' && path === '/technicians/availability')
    return ok({
      surveyRequestId: q.surveyRequestId,
      appointmentId: 'appt-1',
      startsAt: '2026-11-10T01:00:00Z',
      endsAt: '2026-11-10T02:30:00Z',
      appointmentStatus: 'ASSIGNED',
      revision: state.appointmentRevision,
      zone: { zoneId: 'zone-1', code: 'KHU-Q1', name: 'Quận 1 cũ' },
      technicians: [
        {
          technicianUserId: 't1',
          fullName: 'Kỹ Thuật Một',
          isCapacityHolder: false,
          isAssigned: true,
          commitmentsThatDay: 1,
          requiresHoldRehoming: false,
        },
        {
          technicianUserId: 't2',
          fullName: 'Kỹ Thuật Hai',
          isCapacityHolder: false,
          isAssigned: false,
          commitmentsThatDay: 0,
          requiresHoldRehoming: false,
        },
      ],
      ineligible: [{ technicianUserId: 't3', fullName: 'Kỹ Thuật Ba', reason: 'TECHNICIAN_ON_LEAVE' }],
    })
  if (method === 'POST' && path === '/admin/survey-appointments/appt-1/assign-technician') {
    if (!body.reason)
      return fail(400, 'SCHEDULING_VALIDATION_FAILED', 'One or more fields are invalid.', { Reason: ['required'] })
    if (body.expectedRevision !== state.appointmentRevision)
      return fail(409, 'APPOINTMENT_CONCURRENCY_CONFLICT', 'stale')
    state.appointmentRevision += 1
    return ok({
      appointmentId: 'appt-1',
      surveyRequestId: 'sr-1',
      technicianUserId: body.technicianUserId,
      technicianName: 'Kỹ Thuật Hai',
      startsAt: '2026-11-10T01:00:00Z',
      endsAt: '2026-11-10T02:30:00Z',
      appointmentStatus: 'ASSIGNED',
      assignmentSource: 'MANAGER_OVERRIDE',
      assignmentReason: body.reason,
      surveyRequestStatus: 'SCHEDULED',
      scheduledAt: '2026-11-10T01:00:00Z',
      reassigned: true,
      changed: true,
      revision: state.appointmentRevision,
    })
  }
  if (method === 'PUT' && path === '/admin/survey-requests/sr-1/sales-owner') {
    if (!USERS.some((x) => x.id === body.saleUserId && x.roles.includes('SALES')))
      return fail(422, 'SALES_USER_INVALID', 'invalid')
    return ok({ surveyRequestId: 'sr-1', saleUserId: body.saleUserId, previousSaleUserId: 's1', changed: true })
  }

  return fail(404, 'RESOURCE_NOT_FOUND', `mock: no handler for ${method} ${path}`)
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Gắn backend giả vào một page của Playwright */
export async function installMockApi(page, state) {
  // Chỉ chặn đường dẫn bắt đầu bằng /api/: module của Vite như /src/services/api/errors.ts không được đụng
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const result = handle(state, request.method(), request.url(), request.postData())
      if (result.raw !== undefined)
        return route.fulfill({ status: result.status, contentType: result.contentType, body: result.raw })
      return route.fulfill({
        status: result.status,
        contentType: 'application/json',
        headers: result.headers,
        body: JSON.stringify(result.body),
      })
    },
  )
  // PUT thẳng lên kho S3 (axios trần, không qua /api)
  await page.route('https://s3.mock.test/**', (route) => route.fulfill({ status: 200, body: '' }))
}
