import { useIsMutating, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ActionBar } from '@/components/common/ui/action-bar'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/ui/states'
import { WizardSteps, type WizardStep } from '@/components/common/ui/wizard-steps'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { useAuth } from '@/context/AuthProvider'
import { AssessmentAside } from '@/features/pre-surveys/AssessmentAside'
import { ReviewStep } from '@/features/pre-surveys/ReviewStep'
import { SubmittedDialog } from '@/features/pre-surveys/SubmittedDialog'
import { SurfaceConflictNotice } from '@/features/pre-surveys/SurfaceConflictNotice'
import { ProfileFields } from '@/features/pre-surveys/ProfileFields'
import { SiteFields } from '@/features/pre-surveys/SiteFields'
import { SimulationWorkspace } from '@/features/pre-surveys/SimulationWorkspace'
import { SurfaceEditor } from '@/features/pre-surveys/SurfaceEditor'
import {
  preSurveyKeys,
  useCreateCustomerProfileMutation,
  useCreatePreSurveyMutation,
  useCreatePropertySiteMutation,
  useSaveSurfaceMutation,
  useSubmitPreSurveyMutation,
  useSurfaceQuery,
  useUpdatePreSurveyMutation,
} from '@/hooks/usePreSurveys'
import { CREATE_SIMULATION_KEY, useSimulationsQuery } from '@/hooks/useSimulations'
import { useWizardStep } from '@/hooks/useWizardStep'
import { getSurface } from '@/services/preSurveyService'
import {
  clearDraft,
  clearWork,
  readDraft,
  readProfileDone,
  readWork,
  writeDraft,
  writeProfileDone,
  writeWork,
  type AssessmentDraft,
  type AssessmentWork,
} from '@/features/pre-surveys/assessmentDraft'
import {
  EMPTY_PROFILE,
  EMPTY_SITE,
  check,
  profileSchema,
  serverFieldErrors,
  siteSchema,
  siteToForm,
  type ProfileForm,
  type SiteForm,
} from '@/features/pre-surveys/assessmentForm'
import { STEP, STEP_HINTS, STEP_LABELS, STEP_SLUGS } from '@/features/pre-surveys/assessmentSteps'
import { customerTypeLabel, hasCoordinates } from '@/features/pre-surveys/preSurveyDisplay'
import { formatOne, formatTwo } from '@/features/pre-surveys/simulationDisplay'
import { EMPTY_SIMULATION_FORM, type SimulationForm } from '@/features/pre-surveys/simulationForm'
import {
  EMPTY_SURFACE_FORM,
  declaredDiffers,
  serverSurfaceErrors,
  surfaceChanged,
  surfaceDiffers,
  surfaceFormFromServer,
  surfaceToForm,
  toDeclaredRequest,
  toSurfaceRequest,
  validateSurface,
  withManualArea,
  type SurfaceErrors,
  type SurfaceForm,
} from '@/features/pre-surveys/surfaceForm'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError, type ApiError } from '@/services/api/errors'
import type { PreSurveySurfaceView } from '@/types/res/preSurveySurfaceRes'
import type { SelectedSimulation } from '@/types/res/simulationsRes'
import { cx } from '@/utils/cx'

// Wizard "Đánh giá sơ bộ" của khách hàng, 5 bước: hồ sơ, địa điểm, mặt lắp, mô phỏng, xem lại và gửi.
// - Hồ sơ và địa điểm không có API sửa: đổi địa điểm thì tạo địa điểm mới, kèm bản nháp mới.
// - Backend không có API lấy lại bản nháp, nên id bản nháp được lưu trên máy (assessmentDraft.ts).
// - Lưu mặt lắp trước rồi mới ghi số liệu khai, vì cả hai API đều ghi độ dốc và hướng.

// Câu nhắc chung ở thanh dưới khi có ô bị đánh dấu lỗi
const FIX_FIELDS = 'Sửa các ô được đánh dấu để tiếp tục.'

function isSameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Đọc mặt lắp mới nhất của bản nháp từ server, không dùng cache (để có revision đúng) */
function fetchLatestSurface(queryClient: QueryClient, preSurveyId: string) {
  return queryClient.fetchQuery({
    queryKey: preSurveyKeys.surface(preSurveyId),
    queryFn: () => getSurface(preSurveyId),
    staleTime: 0,
  })
}

/** Bước mở sẵn khi vào trang mà URL chưa có ?buoc */
function getStartStep(savedWork: AssessmentWork | null, draft: AssessmentDraft, profileDone: boolean) {
  if (savedWork) return savedWork.step
  if (draft.preSurveyId || draft.siteId) return STEP.SURFACE
  if (profileDone) return STEP.SITE
  return STEP.PROFILE
}

/** Bước xa nhất khách được mở: chưa có địa điểm thì dừng ở bước đầu, chưa lưu mặt lắp thì dừng ở bước mặt lắp */
function getMaxStep(draft: AssessmentDraft, firstStep: number, surfaceSaved: boolean) {
  const hasSite = Boolean(draft.siteId || draft.preSurveyId)
  if (!hasSite) return firstStep
  if (draft.preSurveyId && surfaceSaved) return STEP.REVIEW
  return STEP.SURFACE
}

/** Dòng tóm tắt dưới mỗi bước đã xong trên thanh các bước */
function getStepSummaries(
  draft: AssessmentDraft,
  surface: PreSurveySurfaceView | undefined,
  selectedRun: SelectedSimulation | null,
) {
  const summaries: (string | undefined)[] = []

  if (draft.profile) {
    const parts = [customerTypeLabel(draft.profile.customerType), draft.profile.companyName]
    summaries[STEP.PROFILE] = parts.filter(Boolean).join(', ')
  } else {
    summaries[STEP.PROFILE] = 'Đã có hồ sơ'
  }

  if (draft.site) {
    summaries[STEP.SITE] = [draft.site.name, draft.site.ward].filter(Boolean).join(', ')
  }

  if (surface?.surfaceDefined) {
    const size = `${formatTwo(surface.surfaceWidthM)} × ${formatTwo(surface.surfaceLengthM)} m`
    const obstacleCount = surface.obstacles.length
    const obstacles = obstacleCount > 0 ? `${obstacleCount} vật cản` : 'không có vật cản'
    summaries[STEP.SURFACE] = `${size}, ${obstacles}`
  }

  if (selectedRun) {
    summaries[STEP.SIMULATION] = `${selectedRun.panelCount} tấm, ${formatOne(selectedRun.installedCapacityKwp)} kWp`
  } else {
    summaries[STEP.SIMULATION] = 'Chưa chọn mô phỏng chính'
  }
  return summaries
}

/** Chữ trên nút chính ở thanh dưới */
function nextButtonLabel(step: number, runningSimulation: boolean, busy: boolean) {
  if (runningSimulation) return 'Đang chạy mô phỏng…'
  if (busy) return 'Đang lưu…'
  if (step === STEP.REVIEW) return 'Gửi yêu cầu khảo sát'
  return `Tiếp tục: ${STEP_LABELS[step + 1]}`
}

export function AssessmentPage() {
  const { user } = useAuth()
  const account = user?.userId ?? user?.email ?? 'anonymous'
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // ---------- Dữ liệu lưu trên máy (localStorage) ----------
  // draft: id địa điểm và id bản nháp đã lưu trên server
  const [draft, setDraftState] = useState(() => readDraft(account))
  const [profileDone, setProfileDoneState] = useState(() => readProfileDone(account))
  // savedWork: form đang nhập dở lần trước, để tải lại trang không mất chữ đã gõ
  const [savedWork] = useState(() => readWork(account))
  // Mặt lắp trên máy chỉ dùng được nếu thuộc đúng bản nháp đang mở
  const savedWorkSurface = savedWork && savedWork.preSurveyId === draft.preSurveyId ? savedWork : null

  // ---------- Các form ----------
  const [profile, setProfile] = useState<ProfileForm>(() => savedWork?.profile ?? EMPTY_PROFILE)
  const [site, setSite] = useState<SiteForm>(() => {
    if (savedWork) return savedWork.site
    if (draft.site) return siteToForm(draft.site)
    return EMPTY_SITE
  })
  const [surface, setSurface] = useState<SurfaceForm>(() => savedWorkSurface?.surface ?? EMPTY_SURFACE_FORM)
  const [simForm, setSimForm] = useState<SimulationForm>(() => savedWork?.simForm ?? EMPTY_SIMULATION_FORM)

  // ---------- Bản nháp trên server ----------
  // Id bản nháp đã được nạp vào form (mỗi bản nháp chỉ nạp một lần, để không đè chữ khách đang gõ)
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  // Bản nháp có mặt lắp đang sửa dở trên máy: lần nạp đầu tiên giữ bản trên máy, không lấy bản từ server
  const keepLocalSurfaceFor = useRef(savedWorkSurface?.preSurveyId ?? null)
  // Revision của mặt lắp lúc nạp vào form, gửi làm expectedRevision khi lưu. null là chưa nạp từ server
  const [baseRevision, setBaseRevision] = useState<number | null>(() => savedWorkSurface?.baseRevision ?? null)
  const [surfaceConflict, setSurfaceConflict] = useState(false)
  // Lần chạy mô phỏng đang xem
  const [viewingRunId, setViewingRunId] = useState<string | null>(null)

  // ---------- Lỗi và kết quả gửi ----------
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Câu lỗi ở thanh dưới
  const [actionError, setActionError] = useState<string | null>(null)
  // null: chưa gửi. Chuỗi rỗng: đã gửi nhưng không biết mã yêu cầu
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null)
  const submitted = submittedRequestId !== null
  const submittedDialogRef = useRef<HTMLDialogElement>(null)

  // ---------- Dữ liệu từ server ----------
  const surfaceQuery = useSurfaceQuery(draft.preSurveyId)
  const serverSurface = surfaceQuery.data
  const surfaceSaved = Boolean(serverSurface?.surfaceDefined)

  // ---------- Bước hiện tại ----------
  const [startStep] = useState(() => getStartStep(savedWork, draft, profileDone))
  const firstStep = profileDone ? STEP.SITE : STEP.PROFILE
  const maxStep = getMaxStep(draft, firstStep, surfaceSaved)
  const { step, setStep, headingRef, hadStepInUrl } = useWizardStep({
    slugs: STEP_SLUGS,
    firstStep,
    maxStep,
    startStep,
  })
  // Đã biết bước (từ URL hoặc từ máy) thì không tự nhảy sang bước mô phỏng khi mở lại bản nháp
  const stepKnownAtStart = hadStepInUrl || savedWork !== null
  usePageCrumb(STEP_LABELS[step])

  // ---------- Gọi API ----------
  const createProfile = useCreateCustomerProfileMutation()
  const createSite = useCreatePropertySiteMutation()
  const createPreSurvey = useCreatePreSurveyMutation()
  const updatePreSurvey = useUpdatePreSurveyMutation()
  const saveSurfaceMutation = useSaveSurfaceMutation()
  const submitPreSurvey = useSubmitPreSurveyMutation()
  const simulations = useSimulationsQuery(step >= STEP.SIMULATION ? draft.preSurveyId : null)
  const [savingSurface, setSavingSurface] = useState(false)
  // Mô phỏng có thể chạy tới ~30 giây. Lúc đó cũng tính là bận, vì gửi giữa chừng thì lần chạy bị 409
  const runningSimulation = useIsMutating({ mutationKey: CREATE_SIMULATION_KEY }) > 0
  const mutations = [createProfile, createSite, createPreSurvey, updatePreSurvey, saveSurfaceMutation, submitPreSurvey]
  const busy = savingSurface || runningSimulation || mutations.some((mutation) => mutation.isPending)

  // ---------- Hàm cập nhật state dùng chung ----------

  /** Cập nhật thông tin bản nháp và lưu luôn vào localStorage */
  function updateDraft(next: AssessmentDraft) {
    setDraftState(next)
    writeDraft(account, next)
  }

  function setProfileDone(done: boolean) {
    writeProfileDone(account, done)
    setProfileDoneState(done)
  }

  /** Quên bản nháp trên server (form vẫn giữ nguyên) */
  function resetServerDraftState() {
    setLoadedDraftId(null)
    setBaseRevision(null)
    setViewingRunId(null)
  }

  /** Chuyển bước do khách bấm: xoá lỗi của bước cũ */
  function goToStep(target: number) {
    setFieldErrors({})
    setActionError(null)
    setSurfaceConflict(false)
    setStep(target)
  }

  /** Đánh dấu các ô bị lỗi và hiện câu nhắc chung ở thanh dưới */
  function showFieldErrors(found: Record<string, string | undefined>) {
    const errors: Record<string, string> = {}
    for (const [field, message] of Object.entries(found)) {
      if (message) errors[field] = message
    }
    setFieldErrors(errors)
    setActionError(FIX_FIELDS)
  }

  /** Lỗi từ server: gắn vào ô của `form` nếu được, câu lỗi chung hiện ở thanh dưới */
  function showServerError(error: unknown, form?: object) {
    let errors: Record<string, string> = {}
    if (form && isApiError(error)) errors = serverFieldErrors(error, form) as Record<string, string>
    setFieldErrors(errors)
    setActionError(errorMessage(error))
  }

  /** Xoá lỗi của các ô vừa sửa. Hết lỗi thì tắt câu nhắc chung (lỗi từ server thì giữ) */
  function clearFieldErrors(fields: string[]) {
    const next = { ...fieldErrors }
    for (const field of fields) delete next[field]
    setFieldErrors(next)
    if (Object.keys(next).length === 0 && actionError === FIX_FIELDS) setActionError(null)
  }

  function changeProfile(patch: Partial<ProfileForm>) {
    setProfile((current) => ({ ...current, ...patch }))
    clearFieldErrors(Object.keys(patch))
  }

  function changeSite(patch: Partial<SiteForm>) {
    setSite((current) => ({ ...current, ...patch }))
    clearFieldErrors(Object.keys(patch))
  }

  function changeSurface(next: SurfaceForm, touchedFields: string[]) {
    setSurface(next)
    clearFieldErrors(touchedFields)
  }

  // ---------- Mở lại bản nháp đã lưu ----------

  /** Bản nháp không mở được nữa (đã gửi, bị xoá, không thuộc tài khoản): bỏ đi và bắt đầu bản mới */
  function dropDraft(message: string) {
    clearDraft(account)
    clearWork(account)
    updateDraft({ profile: draft.profile })
    setLoadedDraftId(null)
    setStep(profileDone ? STEP.SITE : STEP.PROFILE, { replace: true })
    toast(message)
  }

  const handleDraftLoaded = useEffectEvent((preSurveyId: string, view: PreSurveySurfaceView) => {
    if (view.status !== 'DRAFT') {
      dropDraft('Bản đánh giá trước đã được gửi. Bắt đầu một bản mới.')
      return
    }
    setLoadedDraftId(preSurveyId)
    setLoadError(null)

    if (keepLocalSurfaceFor.current === preSurveyId) {
      // Giữ mặt lắp đang sửa trên máy. Server đã có bản mới hơn (sửa ở tab khác) thì báo xung đột ngay
      keepLocalSurfaceFor.current = null
      const localRevision = savedWorkSurface?.baseRevision
      if (localRevision != null && localRevision !== view.revision) setSurfaceConflict(true)
    } else {
      setBaseRevision(view.revision)
      setSurface((current) => surfaceFormFromServer(view, current))
    }

    setViewingRunId(view.selectedSimulationId)
    // Máy mới (chưa biết bước nào) mà mặt lắp đã lưu thì đưa khách tới bước mô phỏng
    if (!stepKnownAtStart && view.surfaceDefined) setStep(STEP.SIMULATION, { replace: true })
  })

  const handleDraftLoadFailed = useEffectEvent((error: unknown) => {
    const draftGone = isApiError(error) && (error.status === 403 || error.status === 404)
    if (draftGone) dropDraft('Không mở được bản nháp trước. Bắt đầu một bản đánh giá mới.')
    else setLoadError(errorMessage(error))
  })

  useEffect(() => {
    const preSurveyId = draft.preSurveyId
    if (!preSurveyId || loadedDraftId === preSurveyId) return
    let cancelled = false
    async function loadDraft(id: string) {
      try {
        const view = await fetchLatestSurface(queryClient, id)
        if (!cancelled) handleDraftLoaded(id, view)
      } catch (error) {
        if (!cancelled) handleDraftLoadFailed(error)
      }
    }
    void loadDraft(preSurveyId)
    return () => {
      cancelled = true
    }
  }, [queryClient, draft.preSurveyId, loadedDraftId, loadAttempt])

  // Có bản nháp nhưng chưa nạp xong vào form
  const waitingForDraft = Boolean(draft.preSurveyId) && loadedDraftId !== draft.preSurveyId

  // Lưu form vào localStorage mỗi khi đổi. Đợi nạp bản nháp xong mới ghi, kẻo form rỗng đè lên dữ liệu cũ
  useEffect(() => {
    if (waitingForDraft || submitted) return
    writeWork(account, { step, profile, site, surface, simForm, preSurveyId: draft.preSurveyId, baseRevision })
  }, [account, baseRevision, profile, draft.preSurveyId, simForm, site, step, submitted, surface, waitingForDraft])

  // ---------- Bước 1: hồ sơ khách hàng ----------

  async function saveProfile() {
    const result = check(profileSchema, profile)
    if (result.errors) {
      showFieldErrors(result.errors)
      return
    }
    try {
      await createProfile.mutateAsync(result.data)
      updateDraft({ ...draft, profile: result.data })
    } catch (error) {
      // Tài khoản đã có hồ sơ thì dùng hồ sơ đó, lỗi khác thì báo
      const alreadyExists = isApiError(error) && error.code === 'CUSTOMER_ALREADY_EXISTS'
      if (!alreadyExists) {
        showServerError(error, profile)
        return
      }
      toast('Tài khoản đã có hồ sơ khách hàng, hệ thống dùng hồ sơ hiện có.')
    }
    setProfileDone(true)
    goToStep(STEP.SITE)
  }

  // ---------- Bước 2: địa điểm ----------

  async function saveSite() {
    // Khách không sửa gì (chỉ bấm Quay lại rồi Tiếp tục) thì đi tiếp, không tạo địa điểm mới.
    // Trừ khi địa điểm cũ thiếu toạ độ hoặc chưa có mã phường, xã (tạo trước khi backend có danh mục phường).
    const savedSite = draft.site
    const unchanged =
      draft.siteId &&
      savedSite &&
      isSameJson(site, siteToForm(savedSite)) &&
      hasCoordinates(savedSite.latitude, savedSite.longitude) &&
      Boolean(savedSite.communeCode)
    if (unchanged) {
      goToStep(STEP.SURFACE)
      return
    }

    const result = check(siteSchema, site)
    if (result.errors) {
      showFieldErrors(result.errors)
      return
    }
    // Đã có địa điểm giống hệt thì không tạo lại
    if (draft.siteId && isSameJson(draft.site, result.data)) {
      goToStep(STEP.SURFACE)
      return
    }

    try {
      const { propertySiteId } = await createSite.mutateAsync(result.data)
      // Bản nháp gắn với địa điểm, nên địa điểm mới thì bỏ bản nháp cũ (mặt lắp trong form vẫn giữ)
      updateDraft({ profile: draft.profile, site: result.data, siteId: propertySiteId })
      resetServerDraftState()
      goToStep(STEP.SURFACE)
    } catch (error) {
      if (isApiError(error) && error.code?.startsWith('ADMINISTRATIVE_LOCATION_')) {
        // Mã phường, xã không còn hiệu lực hoặc không thuộc TP.HCM: báo ngay ở ô phường, xã
        showFieldErrors({ ward: errorMessage(error) })
        return
      }
      if (isApiError(error) && error.code === 'CUSTOMER_PROFILE_NOT_FOUND') {
        // Cờ "đã có hồ sơ" trên máy bị sai (ví dụ đổi database): quay lại bước hồ sơ
        setProfileDone(false)
        setStep(STEP.PROFILE, { replace: true })
      }
      showServerError(error, site)
    }
  }

  // ---------- Bước 3: mặt lắp ----------

  /**
   * Bản nháp và bản mặt lắp trên server dùng làm mốc khi lưu.
   * Chưa có bản nháp thì tạo mới. Lưu đè, hoặc chưa có mốc, thì đọc bản mới nhất trên server.
   */
  async function getSaveBase(siteId: string, overwrite: boolean) {
    if (!draft.preSurveyId) {
      const created = await createPreSurvey.mutateAsync({ propertySiteId: siteId, ...toDeclaredRequest(surface) })
      const preSurveyId = created.preSurveyId
      // Form đang có sẵn dữ liệu của bản nháp này, không cần nạp lại từ server
      setLoadedDraftId(preSurveyId)
      updateDraft({ ...draft, preSurveyId })
      const server = await fetchLatestSurface(queryClient, preSurveyId)
      return { preSurveyId, server, revision: server.revision }
    }

    if (overwrite || !serverSurface || baseRevision === null) {
      const server = await fetchLatestSurface(queryClient, draft.preSurveyId)
      return { preSurveyId: draft.preSurveyId, server, revision: server.revision }
    }
    return { preSurveyId: draft.preSurveyId, server: serverSurface, revision: baseRevision }
  }

  /**
   * Lưu mặt lắp lên server, trả về true nếu lưu xong:
   * 1. Lấy mốc (tạo bản nháp nếu chưa có).
   * 2. Ghi mặt lắp nếu khác bản trên server.
   * 3. Ghi số liệu khai (diện tích, có vật cản) nếu khác bản trên server.
   * 4. Đọc lại để có revision mới nhất.
   * `overwrite`: khách chọn "Lưu đè" sau khi bị báo xung đột.
   */
  async function saveSurface({ overwrite = false } = {}) {
    const found = validateSurface(surface)
    if (Object.keys(found).length > 0) {
      showFieldErrors(found)
      return false
    }
    if (!draft.siteId) {
      goToStep(STEP.SITE)
      return false
    }

    setSavingSurface(true)
    setSurfaceConflict(false)
    try {
      const base = await getSaveBase(draft.siteId, overwrite)
      let server = base.server

      const surfaceBody = toSurfaceRequest(surface, base.revision)
      if (surfaceDiffers(server, surfaceBody)) {
        const written = await saveSurfaceMutation.mutateAsync({ id: base.preSurveyId, body: surfaceBody })
        // Cập nhật revision ngay, để lỗi ở bước sau không gây xung đột giả ở lần lưu tới
        setBaseRevision(written.revision)
        server = {
          ...server,
          surfaceTiltDegree: surfaceBody.surfaceTiltDegree ?? null,
          surfaceAzimuthDegree: surfaceBody.surfaceAzimuthDegree ?? null,
        }
      }

      const declaredBody = toDeclaredRequest(surface)
      if (declaredDiffers(server, declaredBody)) {
        await updatePreSurvey.mutateAsync({ id: base.preSurveyId, body: declaredBody })
      }

      const latest = await fetchLatestSurface(queryClient, base.preSurveyId)
      setBaseRevision(latest.revision)
      setFieldErrors({})
      setActionError(null)
      return true
    } catch (error) {
      handleSaveSurfaceError(error)
      return false
    } finally {
      setSavingSurface(false)
    }
  }

  function handleSaveSurfaceError(error: unknown) {
    if (!isApiError(error)) {
      showServerError(error)
      return
    }
    if (error.code === 'PRE_SURVEY_CONCURRENTLY_MODIFIED') {
      // Đã có khối báo xung đột riêng nên không hiện thêm lỗi ở thanh dưới
      setSurfaceConflict(true)
      return
    }
    if (error.code === 'PRE_SURVEY_NOT_EDITABLE' || error.code === 'PRE_SURVEY_ALREADY_SUBMITTED') {
      restartDraft()
      return
    }
    if (error.code === 'PRESURVEY_VALIDATION_FAILED') {
      showSurfaceValidationError(error)
      return
    }
    showServerError(error)
  }

  function showSurfaceValidationError(error: ApiError) {
    const errors: SurfaceErrors = serverSurfaceErrors(error.fieldErrors)
    // Diện tích tự tính bị từ chối: bật chế độ tự khai (điền sẵn số đang tính) để khách thấy ô lỗi và sửa
    if (errors.totalAreaM2 || errors.usableAreaM2) setSurface((current) => withManualArea(current))
    setFieldErrors(errors)
    setActionError(error.message)
  }

  /** Bản nháp đã được gửi ở tab khác nên không sửa được nữa: bỏ id, lần lưu sau tạo bản nháp mới */
  function restartDraft() {
    updateDraft({ profile: draft.profile, site: draft.site, siteId: draft.siteId })
    resetServerDraftState()
    setSurfaceConflict(false)
    goToStep(STEP.SURFACE)
    toast('Bản đánh giá này đã được gửi ở nơi khác. Lưu mặt lắp để tạo bản đánh giá mới cho địa điểm này.')
  }

  /** Nút "Tải bản mới nhất" khi xung đột: bỏ phần đang sửa, nạp bản trên server vào form */
  async function reloadSurface() {
    if (!draft.preSurveyId) return
    try {
      const latest = await fetchLatestSurface(queryClient, draft.preSurveyId)
      setSurface(latest.surfaceDefined ? surfaceToForm(latest) : EMPTY_SURFACE_FORM)
      setBaseRevision(latest.revision)
      setSurfaceConflict(false)
      setFieldErrors({})
      setActionError(null)
      toast('Đã tải bản mặt lắp mới nhất.')
    } catch (error) {
      showServerError(error)
    }
  }

  async function saveSurfaceAsDraft() {
    const saved = await saveSurface()
    if (saved) toast.success('Đã lưu mặt lắp.')
  }

  // ---------- Bước 5: xem lại và gửi ----------

  function finishSubmit(requestId: string) {
    clearDraft(account)
    clearWork(account)
    setSubmittedRequestId(requestId)
    submittedDialogRef.current?.showModal()
  }

  async function submit() {
    const preSurveyId = draft.preSurveyId
    if (!preSurveyId) {
      goToStep(STEP.SURFACE)
      return
    }
    // Địa điểm cũ thiếu toạ độ hoặc mã phường, xã thì bắt sửa trước khi gửi
    if (draft.site && !hasCoordinates(draft.site.latitude, draft.site.longitude)) {
      goToStep(STEP.SITE)
      showFieldErrors({ latitude: 'Nhập toạ độ công trình để ước tính được sản lượng điện.' })
      return
    }
    if (draft.site && !draft.site.communeCode) {
      // Không có mã phường, xã thì backend không xếp được kỹ thuật viên khi khách đặt lịch khảo sát
      goToStep(STEP.SITE)
      showFieldErrors({ ward: 'Chọn phường, xã trong danh sách.' })
      return
    }

    try {
      const { surveyRequestId } = await submitPreSurvey.mutateAsync(preSurveyId)
      finishSubmit(surveyRequestId)
    } catch (error) {
      // Lần gửi trước đã thành công nhưng mất phản hồi: coi như đã gửi (không biết mã yêu cầu)
      if (isApiError(error) && error.code === 'PRE_SURVEY_ALREADY_SUBMITTED') {
        finishSubmit('')
        return
      }
      if (isApiError(error) && error.code === 'PRE_SURVEY_INCOMPLETE') setStep(STEP.SURFACE, { replace: true })
      showServerError(error)
    }
  }

  /** Mở trang chọn giờ khảo sát. Không biết mã yêu cầu thì mở danh sách yêu cầu */
  function chooseSurveyTime() {
    if (submittedRequestId) navigate(withId(ROUTES.customer.request, submittedRequestId))
    else navigate(ROUTES.customer.requests)
  }

  /** Sau khi gửi: đánh giá thêm một địa điểm khác (giữ hồ sơ) */
  function startOver() {
    submittedDialogRef.current?.close()
    setSite(EMPTY_SITE)
    setSurface(EMPTY_SURFACE_FORM)
    setSimForm(EMPTY_SIMULATION_FORM)
    updateDraft({ profile: draft.profile })
    resetServerDraftState()
    setSubmittedRequestId(null)
    goToStep(STEP.SITE)
  }

  // ---------- Nút "Tiếp tục" (submit form của bước hiện tại) ----------

  async function handleNext(event?: FormEvent) {
    event?.preventDefault()
    if (busy) return
    setActionError(null)
    if (step === STEP.PROFILE) {
      await saveProfile()
    } else if (step === STEP.SITE) {
      await saveSite()
    } else if (step === STEP.SURFACE) {
      const saved = await saveSurface()
      if (saved) goToStep(STEP.SIMULATION)
    } else if (step === STEP.SIMULATION) {
      goToStep(STEP.REVIEW)
    } else {
      await submit()
    }
  }

  // ---------- Giao diện ----------

  const surfaceUnsaved = surfaceChanged(surface, serverSurface)
  const selectedRun = simulations.data?.selected ?? null
  const hasRuns = (simulations.data?.items.length ?? 0) > 0
  const summaries = getStepSummaries(draft, serverSurface, selectedRun)
  const wizardSteps: WizardStep[] = STEP_LABELS.map((label, index) => {
    let state: WizardStep['state'] = 'upcoming'
    if (index < step || (index === STEP.PROFILE && profileDone)) state = 'done'
    else if (index === step) state = 'active'
    // Bấm bước đã xong để quay lại. Bước hồ sơ không bấm được vì hồ sơ không sửa được
    const canOpen = state === 'done' && index >= firstStep && !busy && !submitted
    return {
      label,
      state,
      summary: state === 'done' ? summaries[index] : undefined,
      onSelect: canOpen ? () => goToStep(index) : undefined,
    }
  })

  // Bước mặt lắp và mô phỏng có hình vẽ nên dùng hết chiều ngang (component tự đặt cột phụ)
  const wide = step === STEP.SURFACE || (step === STEP.SIMULATION && Boolean(draft.preSurveyId) && surfaceSaved)
  // Mô phỏng và xem lại dùng mặt lắp trên server, nên nhắc khi form có thay đổi chưa lưu
  const showUnsavedNotice = (step === STEP.SIMULATION || step === STEP.REVIEW) && surfaceSaved && surfaceUnsaved
  const aside = (
    <AssessmentAside
      runs={step === STEP.SIMULATION ? simulations.data?.items : undefined}
      viewingRunId={viewingRunId ?? serverSurface?.selectedSimulationId ?? null}
      onViewRun={setViewingRunId}
      preSurveyId={draft.preSurveyId}
      submitted={submitted}
    />
  )

  if (waitingForDraft) {
    if (!loadError) return <PageSkeleton />
    return (
      <ErrorState
        title="Không mở được bản nháp đang làm."
        message={loadError}
        onRetry={() => {
          setLoadError(null)
          setLoadAttempt((attempt) => attempt + 1)
        }}
      />
    )
  }

  return (
    <>
      <PageHeader title="Đánh giá sơ bộ" description={STEP_HINTS[step]} />

      <WizardSteps steps={wizardSteps} label="Các bước đánh giá sơ bộ" className="mb-8" />
      {/* Tiêu đề ẩn, nhận focus khi chuyển bước (cho người dùng bàn phím và trình đọc màn hình) */}
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        Bước {step + 1}/{STEP_LABELS.length}: {STEP_LABELS[step]}
      </h2>

      <div className={cx('grid gap-6', !wide && 'lg:grid-cols-3')}>
        <form
          id="assessment-step"
          noValidate
          onSubmit={handleNext}
          className={cx('min-w-0 space-y-4', !wide && 'lg:col-span-2')}
        >
          {showUnsavedNotice && (
            <Notice tone="warn" title="Mặt lắp có thay đổi chưa lưu">
              Mô phỏng và phần xem lại đang dùng mặt lắp đã lưu trước đó. Thay đổi vẫn được giữ trên máy này.{' '}
              <button type="button" className="tap ui-link font-medium" onClick={() => goToStep(STEP.SURFACE)}>
                Về bước mặt lắp để lưu
              </button>
            </Notice>
          )}

          {step === STEP.PROFILE && (
            <Panel>
              <PanelHeader title="Thông tin khách hàng" description="Khai một lần cho tài khoản này." />
              <PanelBody>
                <ProfileFields value={profile} errors={fieldErrors} onChange={changeProfile} />
              </PanelBody>
            </Panel>
          )}

          {step === STEP.SITE && (
            <>
              {draft.preSurveyId && (
                <Notice tone="warn">
                  Bản đánh giá đang làm gắn với địa điểm này. Đổi thông tin địa điểm sẽ tạo địa điểm và bản đánh giá
                  mới: mặt lắp giữ nguyên, các lần mô phỏng phải chạy lại.
                </Notice>
              )}
              <Panel>
                <PanelHeader title="Địa điểm lắp đặt" />
                <PanelBody>
                  <SiteFields value={site} errors={fieldErrors} onChange={changeSite} />
                </PanelBody>
              </Panel>
            </>
          )}

          {step === STEP.SURFACE && (
            <>
              {surfaceConflict && (
                <SurfaceConflictNotice
                  disabled={busy}
                  onReload={reloadSurface}
                  onOverwrite={() => void saveSurface({ overwrite: true })}
                />
              )}
              <SurfaceEditor value={surface} errors={fieldErrors} onChange={changeSurface} aside={aside} />
            </>
          )}

          {step === STEP.SIMULATION && !surfaceSaved && (
            <EmptyState
              title="Chưa lưu mặt lắp"
              description="Mô phỏng xếp tấm trên mặt lắp đã lưu. Nhập kích thước mặt lắp trước."
              action={<Button onClick={() => goToStep(STEP.SURFACE)}>Về bước mặt lắp</Button>}
            />
          )}
          {step === STEP.SIMULATION && draft.preSurveyId && serverSurface?.surfaceDefined && (
            <SimulationWorkspace
              preSurveyId={draft.preSurveyId}
              surface={serverSurface}
              form={simForm}
              onFormChange={setSimForm}
              viewId={viewingRunId ?? serverSurface.selectedSimulationId}
              onView={setViewingRunId}
              onEditSurface={() => goToStep(STEP.SURFACE)}
              onEditSite={() => goToStep(STEP.SITE)}
              onDraftClosed={restartDraft}
              aside={aside}
            />
          )}

          {step === STEP.REVIEW && (
            <ReviewStep
              draft={draft}
              surface={serverSurface}
              selectedRun={selectedRun}
              hasRuns={hasRuns}
              disabled={submitted}
              onEditSite={() => goToStep(STEP.SITE)}
              onEditSurface={() => goToStep(STEP.SURFACE)}
              onOpenSimulation={() => goToStep(STEP.SIMULATION)}
            />
          )}
        </form>

        {!wide && <div className="min-w-0 space-y-4 self-start">{aside}</div>}
      </div>

      <ActionBar>
        <Button
          onClick={() => goToStep(Math.max(firstStep, step - 1))}
          disabled={step <= firstStep || busy || submitted}
        >
          Quay lại
        </Button>
        {step === STEP.SURFACE && (
          <Button variant="ghost" bleed={false} icon="save" onClick={saveSurfaceAsDraft} disabled={busy}>
            Lưu nháp
          </Button>
        )}
        {/* Cho khách biết thay đổi mới nằm trên máy, chưa lên server */}
        {step === STEP.SURFACE && surfaceUnsaved && !busy && (
          <span className="text-meta text-fg-2">Chưa lưu lên hệ thống, vẫn giữ trên máy này</span>
        )}
        <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
          {actionError && (
            <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
              <Icon name="error" className="shrink-0 text-[20px]" />
              {actionError}
            </span>
          )}
          <Button
            type="submit"
            form="assessment-step"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={busy || submitted || (step === STEP.SIMULATION && !surfaceSaved)}
          >
            {nextButtonLabel(step, runningSimulation, busy)}
          </Button>
        </div>
      </ActionBar>

      <SubmittedDialog
        ref={submittedDialogRef}
        siteName={draft.site?.name}
        requestId={submittedRequestId}
        onStartOver={startOver}
        onChooseTime={chooseSurveyTime}
      />
    </>
  )
}
