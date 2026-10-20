import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ActionDock } from '@/components/common/tech/ActionDock'
import { ChoiceCardGroup } from '@/features/surveys/ChoiceCardGroup'
import { FieldSection } from '@/features/surveys/FieldSection'
import { SectionCard } from '@/components/common/tech/SectionCard'
import { SegmentedControl } from '@/features/surveys/SegmentedControl'
import { StepperInput } from '@/components/common/tech/StepperInput'
import { SurveyHomeownerAside } from '@/features/surveys/SurveyHomeownerAside'
import { TaskHeaderCard } from '@/features/surveys/TaskHeaderCard'
import { Button, Icon, StatusBadge, Switch, Toast, buttonVariants } from '@/components/common/stitch-ui'
import { surveyPhotosPath } from '@/routes/paths'
import { cn } from '@/utils/cn'
import { notFound } from '@/routes/notFound'
import {
  getSurveyById,
  type BreakerAnswer,
  type SurveyObstacle,
  type SurveyRecord,
  type SurveySeverity,
} from '@/data/surveys'

/* Dựng từ site_survey_task/code.html + screen.png. */

const obstacleIconTone: Record<SurveyObstacle['iconTone'], string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-on-surface-variant',
}

/** Mức "Moderate"/"Heavy" tô cam cảnh báo, hai mức còn lại tô trung tính. */
const severityTone = (severity: SurveySeverity) =>
  severity === 'moderate' || severity === 'heavy' ? ('warning' as const) : ('neutral' as const)

export function SurveyTaskPage() {
  const { id } = useParams()
  const survey = getSurveyById(id)
  if (!survey) notFound()
  return <SurveyTaskView survey={survey} />
}

function SurveyTaskView({ survey }: { survey: SurveyRecord }) {
  const { audit } = survey
  const [autosave, setAutosave] = useState(survey.autosave.initial)
  const [area, setArea] = useState(audit.area.value)
  const [pitch, setPitch] = useState(String(audit.pitch.value))
  const [roof, setRoof] = useState(audit.roof.selected)
  const [scaffolding, setScaffolding] = useState(audit.accessibility.scaffolding.enabled)
  const [severities, setSeverities] = useState<Record<string, SurveySeverity>>(() =>
    Object.fromEntries(audit.shading.items.map((item) => [item.id, item.severity])),
  )
  const [breaker, setBreaker] = useState<BreakerAnswer>(audit.electrical.breaker.answer)
  const [recommendation, setRecommendation] = useState(audit.recommendation.text)
  const [toast, setToast] = useState<string | null>(null)

  const autosaveTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(autosaveTimer.current)
      window.clearTimeout(toastTimer.current)
    },
    [],
  )

  /* Mô phỏng autosave như script trong code.html: đổi nhãn rồi chuyển sang "đã lưu". */
  const flashAutosave = useCallback(() => {
    setAutosave(survey.autosave.saving)
    window.clearTimeout(autosaveTimer.current)
    autosaveTimer.current = window.setTimeout(() => setAutosave(survey.autosave.saved), 600)
  }, [survey.autosave.saved, survey.autosave.saving])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  return (
    <div className="flex w-full flex-col gap-space-xl">
      <TaskHeaderCard
        code={survey.projectCode}
        statusLabel={survey.statusLabel}
        autosaveLabel={autosave}
        title={survey.title}
        contacts={survey.contacts}
        location={survey.location}
      />

      {/*
       * Thiết kế chia 5/7 từ xl trở lên, cột trái là aside dữ liệu chủ nhà.
       * Dưới xl (gồm cả dưới lg) xếp một cột và `order` đẩy aside xuống dưới nội dung chính.
       */}
      <div className="grid grid-cols-1 items-start gap-space-lg xl:grid-cols-12">
        <aside className="order-2 flex flex-col gap-space-lg xl:order-1 xl:col-span-5">
          <SurveyHomeownerAside data={survey.homeowner} />
        </aside>

        <div className="order-1 flex flex-col gap-space-lg xl:order-2 xl:col-span-7">
          <SectionCard
            icon="verified"
            iconTone="primary"
            title={audit.title}
            subtitle={audit.subtitle}
            gap="lg"
            trailing={
              <span className="flex shrink-0 items-center gap-1 text-label-sm font-semibold text-primary">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                {audit.grade}
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
              <FieldSection label={audit.area.label} hint={audit.area.hint} hintTone="tint">
                <StepperInput
                  label={audit.area.label}
                  value={area}
                  step={audit.area.step}
                  min={audit.area.min}
                  unit={audit.area.unit}
                  onChange={(next) => {
                    setArea(next)
                    flashAutosave()
                  }}
                />
                <span className="text-body-sm text-on-surface-variant">
                  {audit.area.varianceLabel} <strong className="text-secondary">{audit.area.varianceValue}</strong>
                </span>
              </FieldSection>

              <FieldSection
                label={audit.pitch.label}
                htmlFor="survey-pitch"
                hint={audit.pitch.hint}
                hintTone="primary"
                footnote={
                  <>
                    {audit.pitch.footnoteLabel}{' '}
                    <span className="font-semibold text-on-surface">{audit.pitch.footnoteValue}</span>
                  </>
                }
              >
                <div className="relative flex items-center">
                  <input
                    id="survey-pitch"
                    type="number"
                    min={audit.pitch.min}
                    max={audit.pitch.max}
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    onBlur={flashAutosave}
                    className="h-12 w-full rounded-xl bg-surface-container-low px-space-md text-headline-md font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                  <div className="pointer-events-none absolute right-3 flex items-center gap-1 text-on-surface-variant">
                    <Icon name="screen_rotation" className="text-[18px]" />
                    <span className="text-label-sm">{audit.pitch.unit}</span>
                  </div>
                </div>
              </FieldSection>
            </div>

            <FieldSection label={audit.roof.label}>
              <ChoiceCardGroup
                label={audit.roof.label}
                options={audit.roof.options}
                value={roof}
                onChange={(next) => {
                  setRoof(next)
                  flashAutosave()
                }}
              />
            </FieldSection>

            <FieldSection label={audit.accessibility.label} className="pt-space-xs">
              <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
                <div className="flex items-center justify-between gap-space-xs rounded-xl bg-surface-container-low p-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <Icon name={audit.accessibility.ladder.icon} className="text-[20px] text-primary" />
                    <div className="flex flex-col">
                      <span className="text-label-md font-semibold text-on-surface">
                        {audit.accessibility.ladder.title}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        {audit.accessibility.ladder.description}
                      </span>
                    </div>
                  </div>
                  <StatusBadge variant="positive" size="sm" dot={false} className="shrink-0 font-bold">
                    {audit.accessibility.ladder.badge}
                  </StatusBadge>
                </div>

                <div className="flex items-center justify-between gap-space-xs rounded-xl bg-surface-container-low p-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <Icon name={audit.accessibility.scaffolding.icon} className="text-[20px] text-secondary" />
                    <div className="flex flex-col">
                      <span className="text-label-md font-semibold text-on-surface">
                        {audit.accessibility.scaffolding.title}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        {audit.accessibility.scaffolding.description}
                      </span>
                    </div>
                  </div>
                  <Switch
                    aria-label={audit.accessibility.scaffolding.title}
                    checked={scaffolding}
                    onChange={(e) => {
                      setScaffolding(e.target.checked)
                      flashAutosave()
                    }}
                  />
                </div>
              </div>
            </FieldSection>

            <FieldSection
              label={audit.shading.label}
              hint={audit.shading.hint}
              hintTone="muted"
              className="pt-space-xs"
            >
              <div className="flex flex-col gap-space-xs">
                {audit.shading.items.map((item) => {
                  const current = severities[item.id] ?? item.severity
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-space-xs rounded-xl bg-surface-container-low p-space-sm sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-[180px] items-center gap-space-xs">
                        <Icon name={item.icon} className={cn('text-[20px]', obstacleIconTone[item.iconTone])} />
                        <div>
                          <span className="block text-label-md font-semibold text-on-surface">{item.title}</span>
                          <span className="text-body-sm text-on-surface-variant">{item.description}</span>
                        </div>
                      </div>
                      <SegmentedControl
                        label={`Mức độ che bóng: ${item.title}`}
                        options={audit.shading.options.map((option) => ({
                          ...option,
                          tone: severityTone(option.value),
                        }))}
                        value={current}
                        onChange={(next) => {
                          setSeverities((prev) => ({ ...prev, [item.id]: next }))
                          flashAutosave()
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </FieldSection>

            <FieldSection label={audit.electrical.label} className="pt-space-xs">
              <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md">
                <div className="flex flex-col justify-between gap-space-xs sm:flex-row sm:items-center">
                  <div className="flex items-center gap-space-xs">
                    <Icon name={audit.electrical.panel.icon} className="text-[22px] text-primary" />
                    <div>
                      <span className="block text-label-md font-semibold text-on-surface">
                        {audit.electrical.panel.title}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        {audit.electrical.panel.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-headline-md font-bold text-primary">{audit.electrical.panel.rating}</span>
                </div>

                <div aria-hidden="true" className="h-px w-full bg-outline-variant/30" />

                <div className="flex flex-col justify-between gap-space-xs sm:flex-row sm:items-center">
                  <div className="flex flex-col">
                    <span className="text-label-md font-semibold text-on-surface">
                      {audit.electrical.breaker.question}
                    </span>
                    <span className="text-body-sm text-on-surface-variant">
                      {audit.electrical.breaker.description}
                    </span>
                  </div>
                  <SegmentedControl
                    label={audit.electrical.breaker.question}
                    size="md"
                    options={audit.electrical.breaker.options.map((option) => ({
                      ...option,
                      tone: option.value === 'yes' ? ('primary' as const) : ('neutral' as const),
                    }))}
                    value={breaker}
                    onChange={(next) => {
                      setBreaker(next)
                      flashAutosave()
                    }}
                  />
                </div>
              </div>
            </FieldSection>

            <FieldSection
              label={audit.recommendation.label}
              htmlFor="survey-recommendation"
              hint={audit.recommendation.hint}
              hintTone="tint"
              className="pt-space-xs"
            >
              <textarea
                id="survey-recommendation"
                rows={3}
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                onBlur={flashAutosave}
                className="w-full resize-none rounded-xl bg-surface-container-low p-space-sm text-body-md leading-relaxed text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </FieldSection>
          </SectionCard>
        </div>
      </div>

      <ActionDock icon={survey.dock.icon} title={survey.dock.title} description={survey.dock.description}>
        <Button
          variant="ghost"
          iconLeft="save"
          className="font-semibold"
          onClick={() => {
            flashAutosave()
            showToast(survey.toasts.draftSaved)
          }}
        >
          {survey.dock.actions.saveDraft}
        </Button>
        <Link to={surveyPhotosPath(survey.id)} className={buttonVariants({ className: 'shadow-md' })}>
          <Icon name="add_a_photo" className="text-[18px]" />
          {survey.dock.actions.photos}
        </Link>
        <Button
          variant="accent"
          iconLeft="send"
          className="px-space-lg shadow-md"
          onClick={() => showToast(survey.toasts.submitted)}
        >
          {survey.dock.actions.submit}
        </Button>
      </ActionDock>

      <Toast open={toast !== null} message={toast ?? ''} />
    </div>
  )
}
