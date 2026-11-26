import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { DocumentPreviewButtons } from '@/components/common/ui/document-preview'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { CardTitle, TechCard } from '@/features/contracts/tech-contract/TechCardParts'
import { shortMoment } from '@/features/contracts/tech-contract/techContractDisplay'
import { paymentPlanErrorMessage, signatureSetMeta } from '@/features/payment-plan/paymentPlanDisplay'
import { SignatureSetPanel } from '@/features/payment-plan/SignatureSetPanel'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useSignatureSetsQuery, useSignedPageUrlMutation } from '@/hooks/usePaymentPlan'
import type { SignatureWriter } from '@/services/signatureSetService'
import type { ContractView } from '@/types/res/customerContractsRes'
import type {
  AttachedFileUrlView,
  ContractPaymentPlanView,
  SignatureSetView,
  SignedPageView,
} from '@/types/res/paymentPlanRes'

// Thẻ "Hợp đồng giấy đã ký" của trang hợp đồng 30/70 phía kỹ thuật viên. Lúc còn tải trang (người ghi được) thì dùng nguyên khối
// SignatureSetPanel để giữ đúng luồng ghi số trang, tải, thay, chốt; đã chốt hoặc chỉ đọc thì vẽ các trang dạng ô. Xem / tải từng
// trang bằng link ký sẵn xin lúc bấm

const byPage = (a: SignedPageView, b: SignedPageView) =>
  a.pageNumber - b.pageNumber || a.uploadedAt.localeCompare(b.uploadedAt)

function PageTiles({
  set: s,
  locked,
  request,
}: {
  set: SignatureSetView
  locked: boolean
  request: (fileId: string, disposition: 'inline' | 'attachment') => Promise<AttachedFileUrlView>
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {s.pages
        .slice()
        .sort(byPage)
        .map((p) => (
          <li key={`${p.pageNumber}-${p.fileId}`} className="ct-box flex min-w-0 flex-col gap-2 p-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-body font-bold text-fg">
                Trang <span className="tnum">{p.pageNumber}</span>
                {locked && (
                  <>
                    <Icon name="lock" className="text-[16px] text-fg-3" />
                    <span className="sr-only">, đã khoá</span>
                  </>
                )}
              </p>
              <p className="tnum text-meta text-fg-2">
                {p.replacedAt ? `Bị thay ${shortMoment(p.replacedAt)}` : shortMoment(p.uploadedAt)}
              </p>
              <p className="ct-code text-meta break-all text-fg-3">#{p.sha256.slice(0, 12)}</p>
            </div>
            <div className="mt-auto">
              <DocumentPreviewButtons
                name={`Trang ${p.pageNumber}, lần ${s.version}`}
                request={(disposition) => request(p.fileId, disposition)}
                errorText={paymentPlanErrorMessage}
              />
            </div>
          </li>
        ))}
    </ul>
  )
}

export function TechSignatureCard({
  contract: c,
  writer,
}: {
  contract: ContractView & { paymentPlan: ContractPaymentPlanView }
  writer: SignatureWriter | null
}) {
  const plan = c.paymentPlan
  const sets = useSignatureSetsQuery('staff', c.contractId)
  const pageUrl = useSignedPageUrlMutation('staff')
  const list = sets.data ?? []
  const current = list.find((s) => s.status !== 'SUPERSEDED') ?? plan.signature ?? null
  const finalized = current?.status === 'FINALIZED'

  // Còn đang tải trang và người xem ghi được: khối đầy đủ của luồng ký giấy
  if (writer && plan.depositPaid && !finalized)
    return (
      <TechCard>
        <SignatureSetPanel contract={c} writer={writer} reader="staff" />
      </TechCard>
    )

  const older = list.filter((s) => s.status === 'SUPERSEDED').sort((a, b) => b.version - a.version)
  const request = (fileId: string, disposition: 'inline' | 'attachment') =>
    pageUrl.mutateAsync({ contractId: c.contractId, fileId, disposition })

  return (
    <TechCard id="paper-signature" className="scroll-mt-6" aria-labelledby="tech-paper">
      <CardTitle
        id="tech-paper"
        icon="description"
        aside={
          finalized && current.finalizedAt ? (
            <span className="tnum">Chốt lúc {formatMoment(current.finalizedAt)}</span>
          ) : undefined
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          Hợp đồng giấy đã ký
          {current && (
            <Badge tone={signatureSetMeta(current.status).tone}>
              {finalized ? `Đã chốt ${current.expectedPageCount} trang` : signatureSetMeta(current.status).label}
            </Badge>
          )}
        </span>
      </CardTitle>
      <div className="space-y-4">
        <p className="text-body text-fg-2">
          {!plan.depositPaid
            ? 'Khách ký bản in sau khi khoản 30% được xác minh. Ảnh từng trang hiện ở đây khi kỹ thuật viên tải lên.'
            : finalized
              ? 'Ảnh chụp từng trang bản in khách đã ký. Bộ trang đã khoá, không thay được.'
              : current
                ? `Đang tải các trang: ${current.uploadedPageCount}/${current.expectedPageCount} trang.`
                : 'Kỹ thuật viên chưa tải trang nào của hợp đồng giấy.'}
        </p>
        {sets.isPending ? (
          <Skeleton className="h-28" />
        ) : sets.isError ? (
          <ErrorState
            title="Không tải được các trang đã ký."
            message={paymentPlanErrorMessage(sets.error)}
            onRetry={() => void sets.refetch()}
          />
        ) : (
          <>
            {current && current.pages.length > 0 && <PageTiles set={current} locked={finalized} request={request} />}
            {older.length > 0 && (
              <details className="ct-dashed group px-3 py-1.5">
                <summary className="tap flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-body font-semibold text-fg [&::-webkit-details-marker]:hidden">
                  Các lần tải trước ({older.length})
                  <Icon name="expand_more" className="text-[20px] text-fg-2 group-open:rotate-180" />
                </summary>
                <div className="space-y-4 pt-2 pb-2">
                  {older.map((s) => (
                    <section key={s.signatureSetId} className="space-y-2">
                      <p className="tnum text-meta text-fg-2">
                        Lần {s.version}, {s.expectedPageCount} trang, lập lúc {formatMoment(s.createdAt)}
                      </p>
                      <PageTiles set={s} locked={false} request={request} />
                    </section>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </TechCard>
  )
}
