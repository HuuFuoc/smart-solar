import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { COLLECTION_ACTIVITY_KINDS, COLLECTION_CHANNELS, COLLECTION_RECORDABLE_KINDS } from '@/common/paymentPlan'
import { ROLE_LABELS } from '@/common/role'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DateField, Field, Select, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { ActivityList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { Segmented } from '@/components/common/ui/segmented'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { collectionStatusMeta, formatVnd, paymentPlanErrorMessage } from '@/features/payment-plan/paymentPlanDisplay'
import {
  COLLECTION_EVIDENCE_MAX,
  COLLECTION_REASON_MAX,
  COLLECTION_SUMMARY_MAX,
  type CollectionKind,
  canEscalate,
  canRequestLegalReview,
  canResolve,
  collectionActivityErrors,
  collectionReasonError,
  isCollectionOpen,
} from '@/features/payment-plan/paymentPlanRules'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatDateVn, formatMoment, todayVn } from '@/features/scheduling/schedulingDisplay'
import {
  useCollectionDecisionMutation,
  useCollectionQuery,
  useRecordCollectionActivityMutation,
} from '@/hooks/useCollections'
import { useFileUpload } from '@/hooks/useFiles'
import { withId } from '@/routes/paths'
import { COLLECTION_ROUTES, type CollectionViewer } from '@/features/payment-plan/collectionRoutes'
import type { CollectionDecision } from '@/hooks/useCollections'
import type { CollectionActivityRequest } from '@/types/req/paymentPlanReq'
import type { CollectionCaseView } from '@/types/res/paymentPlanRes'

// Một hồ sơ thu hồi khoản quá hạn: ghi liên hệ / thương lượng / khách hẹn trả / ghi chú (kèm bằng chứng COLLECTION_EVIDENCE), chuyển
// quản lý; quản lý / quản trị chuyển xem xét pháp lý hoặc đóng hồ sơ. Không có nút hoàn tiền, thu hồi thiết bị, phạt hay lãi.
// Mỗi lệnh gửi `revision` đang xem; 409 thì báo lỗi, dữ liệu tự tải lại, người dùng làm lại

const PURPOSE = 'COLLECTION_EVIDENCE'

const KIND_OPTIONS = COLLECTION_RECORDABLE_KINDS.map((k) => ({ value: k, label: COLLECTION_ACTIVITY_KINDS[k]! }))

function ActivityForm({ record }: { record: CollectionCaseView }) {
  const write = useRecordCollectionActivityMutation()
  const upload = useFileUpload(PURPOSE)
  const [kind, setKind] = useState<CollectionKind>('CONTACT')
  const [channel, setChannel] = useState('PHONE')
  const [summary, setSummary] = useState('')
  const [promised, setPromised] = useState('')
  const [files, setFiles] = useState<File[]>([])
  // Tệp đã tải xong: gửi lỗi thì lần sau không tải lại
  const [uploaded, setUploaded] = useState(() => new Map<File, string>())
  const [errors, setErrors] = useState<ReturnType<typeof collectionActivityErrors>>({})
  const [error, setError] = useState<string | null>(null)
  const busy = write.isPending || upload.uploading
  const today = todayVn()

  async function submit() {
    setError(null)
    const next = collectionActivityErrors(
      { kind, summary, promisedPaymentDate: promised, evidenceCount: files.length },
      today,
    )
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const bad = files.map((f) => fileProblem(f, PURPOSE)).find(Boolean)
    if (bad) return setError(bad)
    const ids: string[] = []
    for (const file of files) {
      const known = uploaded.get(file)
      if (known) {
        ids.push(known)
        continue
      }
      try {
        const view = await upload.upload(file)
        setUploaded((m) => new Map(m).set(file, view.fileId))
        ids.push(view.fileId)
      } catch (e) {
        return setError(`Chưa tải được ${file.name}: ${paymentPlanErrorMessage(e)}`)
      }
    }
    const body: CollectionActivityRequest = {
      kind,
      channel: kind === 'NOTE' ? null : (channel as CollectionActivityRequest['channel']),
      summary: summary.trim(),
      promisedPaymentDate: kind === 'AGREEMENT' ? promised : null,
      evidenceFileIds: ids.length > 0 ? ids : null,
      expectedRevision: record.revision,
    }
    try {
      await write.mutateAsync({ caseId: record.caseId, body })
      toast.success('Đã ghi lại.')
      setSummary('')
      setPromised('')
      setFiles([])
      setUploaded(new Map())
    } catch (e) {
      setError(paymentPlanErrorMessage(e))
    }
  }

  return (
    <Panel>
      <PanelHeader title="Ghi lại trao đổi với khách" />
      <PanelBody className="space-y-4">
        <Segmented label="Loại" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        {kind !== 'NOTE' && (
          <Field label="Cách liên hệ" htmlFor="col-channel">
            <Select id="col-channel" value={channel} disabled={busy} onChange={(e) => setChannel(e.target.value)}>
              {Object.entries(COLLECTION_CHANNELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nội dung" htmlFor="col-summary" required error={errors.summary}>
          <Textarea
            id="col-summary"
            rows={3}
            maxLength={COLLECTION_SUMMARY_MAX}
            value={summary}
            disabled={busy}
            aria-required
            aria-invalid={Boolean(errors.summary) || undefined}
            aria-describedby={fieldMessageId('col-summary')}
            placeholder="Ví dụ: Gọi lúc 9:30, khách hẹn chuyển khoản cuối tuần."
            onChange={(e) => setSummary(e.target.value)}
          />
        </Field>
        {kind === 'AGREEMENT' && (
          <Field
            label="Ngày khách hẹn trả"
            htmlFor="col-promised"
            required
            error={errors.promisedPaymentDate}
            hint="Chỉ để theo dõi; hạn trong hợp đồng không đổi."
          >
            <DateField id="col-promised" value={promised} min={today} disabled={busy} onChange={setPromised} />
          </Field>
        )}
        <div className="space-y-2">
          <p className="text-body font-medium text-fg">
            Bằng chứng <span className="font-normal text-fg-2">(không bắt buộc)</span>
          </p>
          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center gap-2 text-body text-fg">
                  <span className="min-w-0 break-all">{f.name}</span>
                  <Button
                    size="sm"
                    variant="danger-quiet"
                    icon="close"
                    disabled={busy}
                    onClick={() => setFiles((list) => list.filter((x) => x !== f))}
                  >
                    Bỏ
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <FileButton
            size="sm"
            variant="soft"
            icon="attach_file"
            multiple
            accept={acceptFor(PURPOSE)}
            disabled={busy || files.length >= COLLECTION_EVIDENCE_MAX}
            onFiles={(picked) => setFiles((list) => [...list, ...picked].slice(0, COLLECTION_EVIDENCE_MAX))}
          >
            Thêm tệp
          </FileButton>
          <p className={errors.evidence ? 'text-meta text-danger' : 'text-meta text-fg-3'}>
            {errors.evidence ??
              `${fileTypesText(PURPOSE)}, tối đa ${maxSizeText(PURPOSE)} mỗi tệp, ${COLLECTION_EVIDENCE_MAX} tệp.`}
          </p>
        </div>
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
        <Button icon="save" variant="primary" disabled={busy} onClick={() => void submit()}>
          {upload.uploading ? 'Đang tải tệp…' : write.isPending ? 'Đang ghi…' : 'Ghi lại'}
        </Button>
      </PanelBody>
    </Panel>
  )
}

const DECISIONS: Record<
  CollectionDecision,
  { title: string; label: string; submit: string; icon: string; variant: 'warn' | 'primary'; done: string }
> = {
  escalate: {
    title: 'Chuyển hồ sơ cho quản lý?',
    label: 'Lý do chuyển',
    submit: 'Chuyển quản lý',
    icon: 'escalator_warning',
    variant: 'warn',
    done: 'Đã chuyển quản lý.',
  },
  'legal-review': {
    title: 'Chuyển xem xét pháp lý?',
    label: 'Lý do',
    submit: 'Chuyển xem xét pháp lý',
    icon: 'gavel',
    variant: 'warn',
    done: 'Đã ghi cần xem xét pháp lý.',
  },
  resolve: {
    title: 'Đóng hồ sơ công nợ?',
    label: 'Kết quả',
    submit: 'Đóng hồ sơ',
    icon: 'task_alt',
    variant: 'primary',
    done: 'Đã đóng hồ sơ.',
  },
}

function CollectionPage({ viewer }: { viewer: CollectionViewer }) {
  const { id } = useParams()
  const query = useCollectionQuery(id)
  const decide = useCollectionDecisionMutation()
  const [dialog, setDialog] = useState<CollectionDecision | null>(null)
  const routes = COLLECTION_ROUTES[viewer]
  usePageCrumb(query.data ? `Hồ sơ ${query.data.contractNumber}` : null)

  return (
    <QueryBoundary query={query}>
      {(c) => {
        const meta = collectionStatusMeta(c.status)
        const open = isCollectionOpen(c)
        const activities = [...(c.activities ?? [])].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        return (
          <>
            <PageHeader
              meta={<Badge tone={meta.tone}>{meta.label}</Badge>}
              title={`Công nợ hợp đồng ${c.contractNumber}`}
              description={`${formatVnd(c.amountDue)} quá hạn từ ${formatMoment(c.dueAt)}.`}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                {open && (
                  <Notice title="Chỉ ghi nhận, không đổi tiền hay hạn">
                    Ghi nhận ở đây không đổi số tiền, hạn trong hợp đồng hay quyền sở hữu thiết bị. Khách trả khoản này
                    thì hồ sơ tự đóng.
                  </Notice>
                )}
                {open && <ActivityForm record={c} />}
                {open && (
                  <div className="flex flex-wrap gap-3">
                    {canEscalate(c) && (
                      <Button icon="escalator_warning" variant="warn" onClick={() => setDialog('escalate')}>
                        Chuyển quản lý
                      </Button>
                    )}
                    {canRequestLegalReview(c, viewer) && (
                      <Button icon="gavel" variant="warn" onClick={() => setDialog('legal-review')}>
                        Chuyển xem xét pháp lý
                      </Button>
                    )}
                    {canResolve(c, viewer) && (
                      <Button icon="task_alt" variant="soft" onClick={() => setDialog('resolve')}>
                        Đóng hồ sơ
                      </Button>
                    )}
                  </div>
                )}
                <Panel>
                  <PanelHeader title="Diễn biến" />
                  <PanelBody>
                    {activities.length === 0 ? (
                      <p className="text-body text-fg-2">Chưa có ghi nhận nào.</p>
                    ) : (
                      <ActivityList
                        items={activities.map((a) => ({
                          time: formatMoment(a.occurredAt),
                          title: [
                            COLLECTION_ACTIVITY_KINDS[a.kind] ?? a.kind,
                            a.channel ? COLLECTION_CHANNELS[a.channel] : null,
                            a.promisedPaymentDate ? `hẹn trả ${formatDateVn(a.promisedPaymentDate)}` : null,
                          ]
                            .filter(Boolean)
                            .join(', '),
                          body: a.summary ? (
                            <span className="whitespace-pre-line">
                              {a.summary}
                              {a.evidenceFileIds.length > 0 && ` (${a.evidenceFileIds.length} tệp bằng chứng)`}
                            </span>
                          ) : undefined,
                          by: a.actorRole
                            ? (ROLE_LABELS[a.actorRole.toLowerCase() as keyof typeof ROLE_LABELS] ?? a.actorRole)
                            : undefined,
                        }))}
                      />
                    )}
                  </PanelBody>
                </Panel>
              </div>
              <PanelAside aria-label="Thông tin hồ sơ">
                <Panel>
                  <PanelHeader title="Thông tin" />
                  <PanelBody>
                    <Facts
                      column
                      items={[
                        {
                          k: 'Hợp đồng',
                          v: (
                            <Link className="ui-link" to={withId(routes.contract, c.contractId)}>
                              {c.contractNumber}
                            </Link>
                          ),
                        },
                        { k: 'Khách', v: c.customerName },
                        { k: 'Số điện thoại', v: c.customerPhone ?? '—' },
                        { k: 'Khoản', v: c.installmentSequence === 2 ? 'Khoản 70%' : `Khoản ${c.installmentSequence}` },
                        { k: 'Số tiền', v: <span className="tnum">{formatVnd(c.amountDue)}</span> },
                        { k: 'Hạn', v: <span className="tnum">{formatMoment(c.dueAt)}</span> },
                        { k: 'Quá hạn', v: `${c.daysOverdue} ngày` },
                        { k: 'Khách hẹn trả', v: c.promisedPaymentDate ? formatDateVn(c.promisedPaymentDate) : '—' },
                        { k: 'Mở hồ sơ', v: formatMoment(c.openedAt) },
                        ...(c.resolvedAt ? [{ k: 'Đóng hồ sơ', v: formatMoment(c.resolvedAt) }] : []),
                        ...(c.resolution ? [{ k: 'Kết quả', v: c.resolution }] : []),
                      ]}
                    />
                  </PanelBody>
                </Panel>
              </PanelAside>
            </div>
            {dialog && (
              <ReasonDialog
                open
                title={DECISIONS[dialog].title}
                description={
                  dialog === 'resolve'
                    ? 'Đóng hồ sơ không ghi nhận tiền: khoản chưa trả vẫn còn nợ.'
                    : dialog === 'legal-review'
                      ? 'Hệ thống chỉ ghi lại; không tự quyết định gì về pháp lý.'
                      : undefined
                }
                label={DECISIONS[dialog].label}
                maxLength={COLLECTION_REASON_MAX}
                submitLabel={DECISIONS[dialog].submit}
                icon={DECISIONS[dialog].icon}
                variant={DECISIONS[dialog].variant}
                onSubmit={async (reason) => {
                  const problem = collectionReasonError(reason)
                  if (problem) throw new Error(problem)
                  try {
                    await decide.mutateAsync({
                      caseId: c.caseId,
                      decision: dialog,
                      body: { reason: reason.trim(), expectedRevision: c.revision },
                    })
                  } catch (e) {
                    throw new Error(paymentPlanErrorMessage(e))
                  }
                  toast.success(DECISIONS[dialog].done)
                }}
                onClose={() => setDialog(null)}
              />
            )}
          </>
        )
      }}
    </QueryBoundary>
  )
}

export function OpsCollectionPage() {
  return <CollectionPage viewer="sales" />
}

export function ManageCollectionPage() {
  return <CollectionPage viewer="manager" />
}

export function AdminCollectionPage() {
  return <CollectionPage viewer="admin" />
}
