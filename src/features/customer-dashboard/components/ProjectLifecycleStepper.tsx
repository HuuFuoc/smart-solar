import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { cx } from '@/utils/cx'

export type ProjectStage = 'ASSESSMENT' | 'SURVEY' | 'QUOTATION' | 'INSTALLATION' | 'HANDOVER'

type ProjectLifecycleStepperProps = {
  currentStage: ProjectStage
  stageDetail?: string | null
}

const STAGES: {
  id: ProjectStage
  stepNumber: number
  title: string
  subtitle: string
  icon: string
}[] = [
  {
    id: 'ASSESSMENT',
    stepNumber: 1,
    title: 'Đánh giá mái',
    subtitle: 'Mô phỏng 3D & công suất',
    icon: 'roofing',
  },
  {
    id: 'SURVEY',
    stepNumber: 2,
    title: 'Khảo sát thực địa',
    subtitle: 'KTV đo đạc tận nơi',
    icon: 'calendar_month',
  },
  {
    id: 'QUOTATION',
    stepNumber: 3,
    title: 'Báo giá & Ký kết',
    subtitle: 'Dự toán & hợp đồng',
    icon: 'request_quote',
  },
  {
    id: 'INSTALLATION',
    stepNumber: 4,
    title: 'Lắp đặt thi công',
    subtitle: 'Thi công & nghiệm thu',
    icon: 'solar_power',
  },
  {
    id: 'HANDOVER',
    stepNumber: 5,
    title: 'Bàn giao & Bảo hành',
    subtitle: 'Vận hành & hậu mãi',
    icon: 'verified_user',
  },
]

const STAGE_INDEX_MAP: Record<ProjectStage, number> = {
  ASSESSMENT: 0,
  SURVEY: 1,
  QUOTATION: 2,
  INSTALLATION: 3,
  HANDOVER: 4,
}

export function ProjectLifecycleStepper({ currentStage, stageDetail }: ProjectLifecycleStepperProps) {
  const currentIndex = STAGE_INDEX_MAP[currentStage] ?? 0
  const currentStageObj = STAGES[currentIndex] ?? STAGES[0]!

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="route" className="text-[20px] text-accent" />
          <h2 className="text-body font-semibold text-fg sm:text-title">Hành trình dự án SmartSolar</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">
            Bước {currentStageObj.stepNumber}/5: {currentStageObj.title}
          </Badge>
          {stageDetail && <span className="hidden text-meta text-fg-3 md:inline">({stageDetail})</span>}
        </div>
      </div>

      {/* Stepper Track */}
      <div className="relative mt-2">
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-5 sm:gap-2">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isUpcoming = index > currentIndex

            return (
              <li key={stage.id} className="relative flex flex-col items-center text-center">
                {/* Connecting Line (Desktop) */}
                {index > 0 && (
                  <div
                    aria-hidden
                    className={cx(
                      'absolute top-4 -left-1/2 hidden h-0.5 w-full -translate-y-1/2 sm:block',
                      isCompleted || isCurrent ? 'bg-accent' : 'bg-surface-3',
                    )}
                  />
                )}

                {/* Step Circle Node */}
                <div
                  className={cx(
                    'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-200',
                    isCompleted && 'bg-accent text-on-accent shadow-sm',
                    isCurrent && 'border-2 border-accent bg-accent-soft text-accent-fg ring-4 ring-accent/20',
                    isUpcoming && 'border border-line bg-surface-3 text-fg-3',
                  )}
                >
                  {isCompleted ? (
                    <Icon name="check" className="text-[18px] font-bold" />
                  ) : (
                    <Icon name={stage.icon} className="text-[18px]" />
                  )}
                </div>

                {/* Step Text */}
                <div className="mt-2.5 space-y-0.5">
                  <p
                    className={cx(
                      'text-meta font-semibold',
                      isCompleted && 'text-fg',
                      isCurrent && 'text-accent-fg font-bold',
                      isUpcoming && 'text-fg-3',
                    )}
                  >
                    {stage.title}
                  </p>
                  <p className="hidden text-meta text-fg-3 sm:block lg:text-[12px]">{stage.subtitle}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
