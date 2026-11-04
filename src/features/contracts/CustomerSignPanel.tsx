import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ContractDocumentButtons } from '@/features/contracts/ContractDocumentButtons'
import { signatureOutcomeMeta } from '@/features/contracts/contractDisplay'
import { shortHash } from '@/features/contracts/contractRules'
import { canSubmitSigned } from '@/features/contracts/customerContractRules'
import { SignContractDialog } from '@/features/contracts/SignContractDialog'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyContractDocumentUrlMutation } from '@/hooks/useCustomerContracts'
import type { DocumentDisposition } from '@/services/contractService'
import type { ContractView } from '@/types/res/customerContractsRes'

// Ký hợp đồng phía khách: xem / tải PDF chính thức, mã nội dung để đối chiếu, gửi bản đã ký, các lần đã gửi (xem lại được tệp đã
// gửi) và lý do bị từ chối. Link tải xin lúc bấm, chỉ cho hợp đồng của chính khách

export function CustomerSignPanel({ contract: c }: { contract: ContractView }) {
  const [signing, setSigning] = useState(false)
  const documentUrl = useMyContractDocumentUrlMutation()
  const submissions = c.submissions ?? []
  const canSign = canSubmitSigned(c)
  const request = (submissionId?: string) => (disposition: DocumentDisposition) =>
    documentUrl.mutateAsync({ contractId: c.contractId, submissionId, disposition })

  return (
    <Panel id="contract-sign" className="scroll-mt-6">
      <PanelHeader
        title="Ký hợp đồng"
        action={
          canSign && (
            <Button icon="draw" variant="primary" onClick={() => setSigning(true)}>
              {c.status === 'SIGNATURE_REJECTED' ? 'Gửi lại bản ký' : 'Gửi bản đã ký'}
            </Button>
          )
        }
      />
      <PanelBody className="space-y-4">
        <Facts
          items={[
            { k: 'Mã nội dung (in trên PDF)', v: <code className="font-mono">{shortHash(c.canonicalHash, 4)}</code> },
            {
              k: 'PDF chính thức',
              v: c.officialDocument?.sha256 ? (
                <span>
                  SHA-256 <code className="font-mono">{shortHash(c.officialDocument.sha256)}</code>
                </span>
              ) : (
                'Chưa có'
              ),
            },
            { k: 'Gửi bạn ký', v: formatMoment(c.publishedAt) },
          ]}
        />
        {c.officialDocument && <ContractDocumentButtons name="PDF chính thức" request={request()} />}
        {canSign && (
          <Notice>
            Tải PDF chính thức, in và ký tay, rồi quét thành PDF để gửi lại. Mã nội dung in trên PDF phải trùng mã ở đây; khi
            gửi bản ký, bạn kiểm tra được tệp PDF đang giữ có đúng bản chính thức không.
          </Notice>
        )}
        {c.status === 'UNDER_REVIEW' && (
          <p className="text-body text-fg-2">
            Bạn đã gửi bản ký lúc {formatMoment(c.signedDocument?.confirmedAt)}. Smart Solar đang so bản ký với PDF
            chính thức.
          </p>
        )}

        {submissions.length > 0 && (
          <section>
            <h3 className="text-body font-medium text-fg">Các lần gửi bản ký</h3>
            <ul className="mt-2 divide-y divide-line">
              {[...submissions].reverse().map((s) => {
                const outcome = signatureOutcomeMeta(s.outcome)
                return (
                  <li key={s.submissionId} className="space-y-1 py-3">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body">
                      <span className="tnum text-fg">Gửi {formatMoment(s.submittedAt)}</span>
                      <Badge tone={outcome.tone}>{outcome.label}</Badge>
                    </p>
                    {s.rejectionReason && (
                      <p className="text-body whitespace-pre-line text-fg-2">Lý do: {s.rejectionReason}</p>
                    )}
                    <ContractDocumentButtons
                      name={`bản ký gửi ${formatMoment(s.submittedAt)}`}
                      request={request(s.submissionId)}
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </PanelBody>
      {signing && <SignContractDialog contract={c} onClose={() => setSigning(false)} />}
    </Panel>
  )
}
