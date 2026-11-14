import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { CONTRACT_DOCUMENT_LINKS } from '@/common/contract'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { UnavailableState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { ContractConfirmDialog } from '@/features/contracts/ContractConfirmDialog'
import { ContractEventLog } from '@/features/contracts/ContractEventLog'
import { ContractPaymentPanel } from '@/features/contracts/ContractPaymentPanel'
import { ContractTermsDialog } from '@/features/contracts/ContractTermsDialog'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import {
  contractErrorMessage,
  contractNextStep,
  contractStatusMeta,
  contractTitle,
  contractTrackerSteps,
  formatContractMoney,
  versionLabel,
  warrantyText,
} from '@/features/contracts/contractDisplay'
import {
  amendBlocker,
  canAmend,
  canAttachOfficialDocument,
  canDiscard,
  canEditDraft,
  canPublish,
  issueBlockers,
  shortHash,
  type ContractViewer,
} from '@/features/contracts/contractRules'
import { OfficialDocumentDialog } from '@/features/contracts/OfficialDocumentDialog'
import { SignaturePanel } from '@/features/contracts/SignaturePanel'
import { FileInfo } from '@/features/files/FileInfo'
import { Facts } from '@/features/pre-surveys/Facts'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { ContractDocumentButtons } from '@/features/contracts/ContractDocumentButtons'
import {
  useContractDocumentUrlMutation,
  useContractQuery,
  useDiscardContractMutation,
  useIssueContractMutation,
  usePublishContractMutation,
  useSurveyRequestContractsQuery,
} from '@/hooks/useContracts'
import { ROUTES, withId } from '@/routes/paths'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'

// Chi tiết một phiên bản hợp đồng lắp đặt, dùng chung kinh doanh, quản lý, quản trị theo quyền của backend:
// kinh doanh phụ trách soạn, phát hành, gắn PDF, gửi ký, duyệt bản ký, lập phụ lục; quản lý duyệt bản ký; quản trị chỉ xem.
// Nút chỉ hiện ở trạng thái backend nhận lệnh đó; backend vẫn kiểm lại và trả lỗi thì hiện lỗi

type Dialog = 'issue' | 'publish' | 'document' | 'discard' | null

const DETAIL_PATTERNS: Record<ContractViewer, string> = {
  sales: ROUTES.ops.contract,
  manager: ROUTES.manage.contract,
  admin: ROUTES.admin.contract,
}

const INSTALLATIONS: Partial<Record<ContractViewer, string>> = {
  manager: `${ROUTES.manage.installations}?muc=hop-dong`,
  admin: `${ROUTES.admin.installations}?muc=hop-dong`,
}

/** Việc của kinh doanh trước khi gửi khách: sửa / phát hành bản nháp, gắn PDF, gửi ký */
function SalesActions({ contract: c }: { contract: ContractView }) {
  const issue = useIssueContractMutation()
  const publish = usePublishContractMutation()
  const discard = useDiscardContractMutation()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [editing, setEditing] = useState(false)
  const blockers = issueBlockers(c)

  if (!canEditDraft(c) && c.status !== 'ISSUED') return null
  return (
    <Panel id="contract-actions" className="scroll-mt-6">
      <PanelHeader title={canEditDraft(c) ? 'Bản nháp' : 'PDF chính thức và gửi ký'} />
      <PanelBody className="space-y-4">
        {canEditDraft(c) && (
          <>
            <p className="text-body text-fg-2">
              Phát hành thì điều khoản, thời hạn bảo hành và giá không sửa được nữa; muốn đổi phải lập phụ lục.
            </p>
            {blockers.length > 0 && (
              <ul className="list-disc pl-5 text-body text-fg-2">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-3">
              <Button icon="edit" variant="secondary" onClick={() => setEditing(true)}>
                Sửa bản nháp
              </Button>
              <Button
                icon="verified"
                variant="primary"
                disabled={blockers.length > 0 || issue.isPending}
                onClick={() => setDialog('issue')}
              >
                Phát hành
              </Button>
              {canDiscard(c) && (
                <Button icon="delete" variant="danger" onClick={() => setDialog('discard')}>
                  Huỷ bản nháp
                </Button>
              )}
            </div>
          </>
        )}

        {c.status === 'ISSUED' && (
          <>
            <Facts
              items={[
                { k: 'Mã nội dung (ghi trên PDF)', v: <code className="font-mono break-all">{c.canonicalHash}</code> },
                {
                  k: 'PDF chính thức',
                  v: c.officialDocument ? <FileInfo fileId={c.officialDocument.fileId} /> : 'Chưa gắn',
                },
              ]}
            />
            <div className="flex flex-wrap gap-3">
              {canAttachOfficialDocument(c) && (
                <Button icon="upload_file" variant="soft" onClick={() => setDialog('document')}>
                  {c.officialDocument ? 'Thay PDF' : 'Gắn PDF chính thức'}
                </Button>
              )}
              <Button
                icon="send"
                variant="primary"
                disabled={!canPublish(c) || publish.isPending}
                onClick={() => setDialog('publish')}
              >
                Gửi khách ký
              </Button>
            </div>
            {!canPublish(c) && <p className="text-meta text-fg-2">Gắn PDF chính thức trước khi gửi khách ký.</p>}
          </>
        )}
      </PanelBody>

      {editing && <ContractTermsDialog target={{ mode: 'edit', contract: c }} onClose={() => setEditing(false)} />}
      {dialog === 'document' && <OfficialDocumentDialog contract={c} onClose={() => setDialog(null)} />}
      <ReasonDialog
        open={dialog === 'discard'}
        title="Huỷ bản nháp hợp đồng?"
        description="Bản nháp giữ lại với trạng thái đã huỷ. Báo giá này không lập hợp đồng mới được nữa; huỷ để đóng yêu cầu khảo sát."
        label="Lý do huỷ"
        submitLabel="Huỷ bản nháp"
        variant="danger-solid"
        icon="delete"
        onSubmit={async (reason) => {
          try {
            await discard.mutateAsync({ contractId: c.contractId, revision: c.revision, reason })
          } catch (e) {
            throw new Error(contractErrorMessage(e))
          }
          toast.success('Đã huỷ bản nháp hợp đồng.')
        }}
        onClose={() => setDialog(null)}
      />
      {dialog === 'issue' && (
        <ContractConfirmDialog
          title="Phát hành hợp đồng?"
          confirmLabel="Phát hành"
          icon="verified"
          successText="Đã phát hành. Tạo PDF chính thức có ghi mã nội dung rồi gắn vào hợp đồng."
          run={() => issue.mutateAsync({ contractId: c.contractId, revision: c.revision })}
          onClose={() => setDialog(null)}
        >
          <p>
            {contractTitle(c)}, {formatContractMoney(c)}, bảo hành lắp đặt {warrantyText(c.warrantyMonths)}.
          </p>
          <p>Nội dung được đóng lại và có mã nội dung để ghi lên PDF chính thức. Không sửa được nữa.</p>
          {c.previousContractId && (
            <p>
              Phiên bản trước bị thay ngay khi phụ lục này được phát hành (trừ khi phiên bản đó vừa được thanh toán).
            </p>
          )}
        </ContractConfirmDialog>
      )}
      {dialog === 'publish' && (
        <ContractConfirmDialog
          title="Gửi khách ký?"
          confirmLabel="Gửi khách ký"
          icon="send"
          successText="Đã gửi khách ký."
          run={() => publish.mutateAsync({ contractId: c.contractId, revision: c.revision })}
          onClose={() => setDialog(null)}
        >
          <p>
            {CONTRACT_DOCUMENT_LINKS
              ? 'Khách thấy hợp đồng trên cổng khách hàng, tải PDF chính thức, in, ký tay rồi gửi lại bản ký.'
              : 'Khách thấy hợp đồng trên cổng khách hàng. Gửi đúng tệp PDF đã gắn cho khách để khách in, ký tay rồi gửi lại bản ký.'}
          </p>
          <p>Sau khi gửi, PDF chính thức không thay được; muốn đổi nội dung phải lập phụ lục.</p>
        </ContractConfirmDialog>
      )}
    </Panel>
  )
}

/** Phụ lục: đổi điều khoản / thời hạn bảo hành sau khi phát hành bằng phiên bản mới cùng giá */
function AmendmentPanel({ contract: c, versions }: { contract: ContractView; versions: ContractView[] }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const amendable = canAmend(c, versions)
  const blocked = amendBlocker(c, versions)
  if (!amendable && !blocked) return null
  return (
    <Panel>
      <PanelHeader title="Phụ lục" />
      <PanelBody className="space-y-3">
        <p className="text-body text-fg-2">
          Đổi điều khoản hoặc thời hạn bảo hành sau khi phát hành: lập phụ lục (phiên bản mới, cùng giá). Phiên bản này
          bị thay khi phụ lục được phát hành.
        </p>
        {amendable ? (
          <Button icon="edit_note" variant="soft" onClick={() => setOpen(true)}>
            Lập phụ lục
          </Button>
        ) : (
          <p className="text-meta text-fg-2">{blocked}</p>
        )}
      </PanelBody>
      {open && (
        <ContractTermsDialog
          target={{ mode: 'amend', contract: c }}
          onClose={() => setOpen(false)}
          onDone={(view) => void navigate(withId(ROUTES.ops.contract, view.contractId))}
        />
      )}
    </Panel>
  )
}

function ContentPanel({ contract: c }: { contract: ContractView }) {
  return (
    <Panel>
      <PanelHeader title="Nội dung" description={`Giá theo báo giá phiên bản ${c.quotationVersion} khách đã đồng ý.`} />
      <PanelBody className="space-y-4">
        <Facts
          items={[
            { k: 'Tổng giá trị', v: formatContractMoney(c) },
            { k: 'Bảo hành lắp đặt', v: warrantyText(c.warrantyMonths) },
          ]}
        />
        <section>
          <h3 className="text-body font-medium text-fg">Điều khoản</h3>
          <p className="mt-1 text-body whitespace-pre-line text-fg-2">{c.terms || 'Chưa có điều khoản.'}</p>
        </section>
        {c.discard && (
          <Notice title={`Bản nháp đã huỷ lúc ${formatMoment(c.discard.discardedAt)}`}>
            <span className="whitespace-pre-line">{c.discard.reason}</span>
          </Notice>
        )}
        {c.rejectionReason && c.status === 'SIGNATURE_REJECTED' && (
          <Notice title="Lý do từ chối bản ký gần nhất">
            <span className="whitespace-pre-line">{c.rejectionReason}</span>
          </Notice>
        )}
      </PanelBody>
    </Panel>
  )
}

function ContractAside({ contract: c, viewer }: { contract: ContractView; viewer: ContractViewer }) {
  const documentUrl = useContractDocumentUrlMutation()
  return (
    <PanelAside aria-label="Thông tin hợp đồng">
      <Panel>
        <PanelHeader title="Thông tin" />
        <PanelBody>
          <Facts
            column
            items={[
              { k: 'Số hợp đồng', v: c.contractNumber },
              { k: 'Phiên bản', v: versionLabel(c) },
              {
                k: 'Yêu cầu khảo sát',
                v:
                  viewer === 'sales' ? (
                    <Link className="tnum ui-link" to={withId(ROUTES.ops.survey, c.surveyRequestId)}>
                      {shortCode(c.surveyRequestId)}
                    </Link>
                  ) : (
                    shortCode(c.surveyRequestId)
                  ),
              },
              { k: 'Mã nội dung', v: shortHash(c.canonicalHash) },
              {
                k: 'PDF chính thức',
                v: c.officialDocument ? <FileInfo fileId={c.officialDocument.fileId} /> : 'Chưa gắn',
              },
              { k: 'Gửi khách ký', v: formatMoment(c.publishedAt) },
              { k: 'Duyệt bản ký', v: formatMoment(c.signedAt) },
              { k: 'Thanh toán đủ', v: formatMoment(c.paidAt) },
            ]}
          />
          {c.officialDocument && (
            <div className="mt-4">
              <ContractDocumentButtons
                name="PDF chính thức"
                request={(disposition) => documentUrl.mutateAsync({ contractId: c.contractId, disposition })}
              />
            </div>
          )}
        </PanelBody>
      </Panel>
    </PanelAside>
  )
}

function ContractPage({ viewer }: { viewer: ContractViewer }) {
  const { id } = useParams()
  const query = useContractQuery(id)
  const versions = useSurveyRequestContractsQuery(query.data?.surveyRequestId)
  usePageCrumb(query.data ? contractTitle(query.data) : null)

  if (query.data === undefined && isFeatureUnavailable(query.error))
    return (
      <UnavailableState
        title="Chức năng hợp đồng chưa sẵn sàng."
        message="Hợp đồng chưa mở được trên web. Thử lại sau."
        pendingMigrations={pendingMigrationsOf(query.error)}
      />
    )

  return (
    <QueryBoundary query={query}>
      {(c) => {
        const status = contractStatusMeta(c.status)
        const list = versions.data ?? [c]
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="tnum">{versionLabel(c)}</span>
                </>
              }
              title={`Hợp đồng ${c.contractNumber}`}
              description={`${formatContractMoney(c)}, bảo hành lắp đặt ${warrantyText(c.warrantyMonths)}.`}
              actions={
                viewer === 'sales' ? (
                  <ButtonLink to={withId(ROUTES.ops.survey, c.surveyRequestId)} variant="info" icon="assignment">
                    Yêu cầu khảo sát
                  </ButtonLink>
                ) : undefined
              }
            />

            <ProgressTracker steps={contractTrackerSteps(c)} next={contractNextStep(c, viewer)} />

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                {viewer === 'sales' && <SalesActions contract={c} />}
                <SignaturePanel contract={c} viewer={viewer} />
                <ContractPaymentPanel contract={c} viewer={viewer} installationsPath={INSTALLATIONS[viewer]} />
                {viewer === 'sales' && <AmendmentPanel contract={c} versions={list} />}
                <ContentPanel contract={c} />
              </div>
              <ContractAside contract={c} viewer={viewer} />
            </div>

            <div className="mt-6 space-y-4 border-t border-line pt-4">
              {list.length > 1 && (
                <Panel>
                  <PanelHeader title="Các phiên bản" />
                  <PanelBody>
                    <ContractVersionList
                      versions={list}
                      detailPattern={DETAIL_PATTERNS[viewer]}
                      currentId={c.contractId}
                    />
                  </PanelBody>
                </Panel>
              )}
              {c.events && <ContractEventLog events={c.events} />}
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}

export function OpsContractPage() {
  return <ContractPage viewer="sales" />
}

export function ManageContractPage() {
  return <ContractPage viewer="manager" />
}

export function AdminContractPage() {
  return <ContractPage viewer="admin" />
}
