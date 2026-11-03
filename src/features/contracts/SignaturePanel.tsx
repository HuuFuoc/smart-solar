import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { FileInfo } from '@/features/files/FileInfo'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { ContractConfirmDialog } from '@/features/contracts/ContractConfirmDialog'
import { contractErrorMessage, signatureOutcomeMeta } from '@/features/contracts/contractDisplay'
import {
  canReview,
  REJECTION_REASON_MAX,
  shortHash,
  submissionMatchesOfficial,
  type ContractViewer,
} from '@/features/contracts/contractRules'
import { useReviewContractMutation } from '@/hooks/useContracts'
import type { ContractView, SignatureSubmissionView } from '@/types/res/customerContractsRes'

// Bản ký khách gửi và duyệt nội bộ (không phải xác thực chữ ký điện tử). Kinh doanh phụ trách hoặc quản lý duyệt; quản trị
// chỉ xem. Duyệt thì backend kiểm lại cả PDF chính thức và bản ký trên kho; từ chối bắt buộc lý do, khách gửi lại được

function SubmissionRow({ s, contract }: { s: SignatureSubmissionView; contract: ContractView }) {
  const outcome = signatureOutcomeMeta(s.outcome)
  const matches = submissionMatchesOfficial(s, contract)
  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge tone={outcome.tone}>{outcome.label}</Badge>
        <span className="tnum text-body text-fg-2">Gửi lúc {formatMoment(s.submittedAt)}</span>
      </div>
      <Facts
        items={[
          { k: 'Tệp bản ký', v: <FileInfo fileId={s.fileId} /> },
          {
            k: 'Ký trên PDF chính thức',
            v: matches ? 'Đúng PDF hiện tại' : `Khác PDF hiện tại (${shortHash(s.officialDocumentSha256)})`,
          },
          ...(s.reviewedAt ? [{ k: 'Duyệt lúc', v: formatMoment(s.reviewedAt) }] : []),
        ]}
      />
      {s.rejectionReason && (
        <Notice title="Lý do từ chối">
          <span className="whitespace-pre-line">{s.rejectionReason}</span>
        </Notice>
      )}
    </li>
  )
}

export function SignaturePanel({ contract, viewer }: { contract: ContractView; viewer: ContractViewer }) {
  const review = useReviewContractMutation()
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const submissions = [...(contract.submissions ?? [])].reverse()
  const reviewable = canReview(contract, viewer)
  if (submissions.length === 0) return null

  return (
    <Panel id="contract-review" className="scroll-mt-6">
      <PanelHeader title="Bản khách đã ký" description={`${submissions.length} lần gửi, mới nhất trước.`} />
      <PanelBody className="space-y-4">
        {reviewable && (
          <>
            <Notice tone="info">
              Trang này chưa mở được nội dung tệp bản ký. Chỉ duyệt khi đã xem bản ký và thấy đúng chữ ký của khách trên
              PDF chính thức.
            </Notice>
            <div className="flex flex-wrap gap-3">
              <Button icon="task_alt" variant="primary" disabled={review.isPending} onClick={() => setApproving(true)}>
                Duyệt bản ký
              </Button>
              <Button icon="block" variant="danger" disabled={review.isPending} onClick={() => setRejecting(true)}>
                Từ chối
              </Button>
            </div>
          </>
        )}
        <ul className="divide-y divide-line">
          {submissions.map((s) => (
            <SubmissionRow key={s.submissionId} s={s} contract={contract} />
          ))}
        </ul>
      </PanelBody>

      {approving && (
        <ContractConfirmDialog
          title="Duyệt bản ký?"
          confirmLabel="Duyệt bản ký"
          icon="task_alt"
          successText="Đã duyệt bản ký. Khách thanh toán được trên cổng khách hàng."
          run={() =>
            review.mutateAsync({
              contractId: contract.contractId,
              body: { revision: contract.revision, decision: 'APPROVE', reason: null },
            })
          }
          onClose={() => setApproving(false)}
        >
          <p>
            Hợp đồng thành <span className="font-medium text-fg">Đã ký</span> và khách thanh toán được. Không đổi lại
            được.
          </p>
          <p>Hệ thống kiểm tra lại PDF chính thức và bản ký; một trong hai tệp đã bị đổi thì không duyệt được.</p>
        </ContractConfirmDialog>
      )}
      <ReasonDialog
        open={rejecting}
        title="Từ chối bản ký"
        description="Khách thấy lý do này và gửi lại bản ký mới."
        label="Lý do từ chối"
        maxLength={REJECTION_REASON_MAX}
        submitLabel="Từ chối bản ký"
        variant="danger"
        icon="block"
        onSubmit={(reason) =>
          review
            .mutateAsync({
              contractId: contract.contractId,
              body: { revision: contract.revision, decision: 'REJECT', reason },
            })
            .then(
              () => toast.success('Đã từ chối bản ký. Khách thấy lý do và gửi lại bản mới.'),
              (e: unknown) => {
                throw new Error(contractErrorMessage(e))
              },
            )
        }
        onClose={() => setRejecting(false)}
      />
    </Panel>
  )
}
