import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ActionBar } from '@/components/common/ui/action-bar'
import { Count } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Dialog, DialogFooter, DialogTitle } from '@/components/common/ui/dialog'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/ui/states'
import { WizardSteps, type WizardStep } from '@/components/common/ui/wizard-steps'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { useAuth } from '@/context/AuthProvider'
import { ProfileFields, SiteFields } from '@/features/pre-surveys/components/AssessmentFields'
import {
  clearDraft,
  clearWork,
  readDraft,
  readWork,
  writeDraft,
  writeWork,
  type AssessmentDraft,
} from '@/features/pre-surveys/components/assessmentDraft'
import {
  EMPTY_PROFILE,
  EMPTY_SITE,
  check,
  profileSchema,
  serverFieldErrors,
  siteSchema,
  siteToForm,
  type FormErrors,
  type ProfileForm,
  type SiteForm,
} from '@/features/pre-surveys/components/assessmentForm'
import {
  customerTypeLabel,
  directionLabel,
  formatAddress,
  hasCoordinates,
  shortCode,
  surfaceTypeLabel,
} from '@/features/pre-surveys/components/preSurveyDisplay'
import { formatKwh, formatM2, formatOne, formatTwo, mountingLabel } from '@/features/pre-surveys/components/simulationDisplay'
import { EMPTY_SIMULATION_FORM, type SimulationForm } from '@/features/pre-surveys/components/simulationForm'
import { SimulationHistory } from '@/features/pre-surveys/components/SimulationHistory'
import { SimulationWorkspace } from '@/features/pre-surveys/components/SimulationWorkspace'
import { SurfaceEditor } from '@/features/pre-surveys/components/SurfaceEditor'
import {
  EMPTY_SURFACE_FORM,
  autoDeclared,
  declaredDiffers,
  meterText,
  serverSurfaceErrors,
  surfaceChanged,
  surfaceDiffers,
  surfaceToForm,
  toDeclaredRequest,
  toSurfaceRequest,
  validateSurface,
  type SurfaceErrors,
  type SurfaceForm,
} from '@/features/pre-surveys/components/surfaceForm'
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
import { useHcmWardsQuery } from '@/hooks/useHcmWards'
import { CREATE_SIMULATION_KEY, useSimulationsQuery } from '@/hooks/useSimulations'
import { getSurface } from '@/services/preSurveyService'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError } from '@/services/api/errors'
import { cx } from '@/utils/cx'

/*
 * Đánh giá sơ bộ: hồ sơ khách hàng → địa điểm → mặt lắp (kích thước, hướng, vật cản) → mô phỏng → xem lại và gửi.
 * - Hồ sơ không sửa được: tạo một lần, nhớ cờ trong localStorage theo tài khoản.
 * - Địa điểm không sửa được: đổi thông tin thì tạo địa điểm mới, và bản nháp cũ (gắn với địa điểm cũ) được thay bằng
 *   bản nháp mới; mặt lắp đang nhập vẫn giữ để không phải nhập lại.
 * - Backend không có API liệt kê bản nháp: id bản nháp + địa điểm nhớ trong localStorage (assessmentDraft.ts), mở lại
 *   trang thì đọc lại mặt lắp (GET .../surface) và làm tiếp ở bước mặt lắp hoặc mô phỏng.
 * - Mặt lắp và form cũ dùng chung độ dốc / hướng: lưu mặt lắp trước (có kiểm revision), rồi mới ghi số liệu khai với
 *   đúng độ dốc / hướng đó, nên mô phỏng không bị đánh dấu cũ vì ghi lệch.
 * - Gửi không bắt buộc đã chạy mô phỏng (người dùng chốt 09/10/2026), bước xem lại chỉ nhắc.
 * - Gửi xong khách chọn giờ khảo sát ngay ở trang của yêu cầu (/customer/requests/:id, luồng đặt lịch 12/10/2026).
 */

const STEP_LABELS = ['Thông tin khách hàng', 'Địa điểm lắp đặt', 'Mặt lắp', 'Mô phỏng', 'Xem lại và gửi']
/** Một câu dưới tiêu đề trang: bước này để làm gì (người dùng 10/10/2026: các bước phải rõ, thân thiện). */
const STEP_HINTS = [
  'Cho biết bạn lắp đặt cho cá nhân hay doanh nghiệp. Chỉ khai một lần cho tài khoản này.',
  'Công trình ở đâu và tấm pin sẽ lắp trên bề mặt nào.',
  'Đo mặt mái định lắp, chọn hướng mái và đánh dấu các vật cản trên mái.',
  'Chọn tấm pin và kiểu lắp để xem xếp được bao nhiêu tấm và ước tính sản lượng điện.',
  'Kiểm tra lại thông tin rồi gửi. Gửi xong bạn chọn ngày giờ để kỹ thuật viên tới khảo sát.',
]
const SITE = 1
const SURFACE = 2
const SIMULATION = 3
const REVIEW = 4
/** Bước trên địa chỉ trang (?buoc=mat-lap) để nút Back / Forward của trình duyệt đi giữa các bước. */
const STEP_PARAM = 'buoc'
const STEP_SLUGS = ['ho-so', 'dia-diem', 'mat-lap', 'mo-phong', 'xem-lai']

const FIX_FIELDS = 'Sửa các ô được đánh dấu để tiếp tục.'

const profileFlagKey = (account: string) => `smartsolar.customer-profile.${account}`

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* Trình duyệt chặn storage: lần sau chỉ phải đi qua bước hồ sơ một lần nữa. */
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function AssessmentPage() {
  const { user } = useAuth()
  const account = user?.userId ?? user?.email ?? 'anonymous'
  const flagKey = profileFlagKey(account)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [saved, setSavedState] = useState<AssessmentDraft>(() => readDraft(account))
  const [profileDone, setProfileDone] = useState(() => readFlag(flagKey))
  /*
    Bản đang làm dở trên máy (assessmentDraft.ts, người dùng 10/10/2026: "không giữ lại giá trị của form nếu back qua back
    lại"): mở lại trang thì nạp lại mọi ô chưa gửi và về đúng bước. Mặt lắp trên máy chỉ dùng khi nó thuộc đúng bản nháp
    đang mở (hoặc cả hai chưa có bản nháp); khác thì lấy từ server.
  */
  const [work] = useState(() => readWork(account))
  const workSurface = work && work.preSurveyId === saved.preSurveyId ? work : null
  const [profile, setProfile] = useState<ProfileForm>(() => work?.profile ?? EMPTY_PROFILE)
  const [site, setSite] = useState<SiteForm>(() => work?.site ?? (saved.site ? siteToForm(saved.site) : EMPTY_SITE))
  const [surface, setSurface] = useState<SurfaceForm>(() => workSurface?.surface ?? EMPTY_SURFACE_FORM)
  const [simForm, setSimForm] = useState<SimulationForm>(() => work?.simForm ?? EMPTY_SIMULATION_FORM)
  const [viewId, setViewId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  /** revision của bản mặt lắp mà form đang sửa (expectedRevision khi lưu); null khi form chưa nạp từ server. */
  const [baseRevision, setBaseRevision] = useState<number | null>(() => workSurface?.baseRevision ?? null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const surfaceQuery = useSurfaceQuery(saved.preSurveyId)
  const loaded = surfaceQuery.data

  /*
    Bước đọc từ địa chỉ trang (?buoc=…): mỗi lần khách chuyển bước là một mục lịch sử, nên nút Back / Forward của trình duyệt
    đi giữa các bước thay vì rời trang. Không có trên địa chỉ (mở từ menu) thì về bước đang làm dở đã nhớ; vẫn không có thì
    đoán như cũ (đã có địa điểm thì làm tiếp ở mặt lắp). Không cho đi quá bước đã mở được: chưa có địa điểm thì tối đa bước
    địa điểm, chưa lưu mặt lắp thì tối đa bước mặt lắp.
  */
  const [searchParams, setSearchParams] = useSearchParams()
  const [initialStep] = useState(() => work?.step ?? (saved.preSurveyId || saved.siteId ? SURFACE : readFlag(flagKey) ? SITE : 0))
  /** Mở trang đã có bước cụ thể (trên địa chỉ hoặc bản trên máy): mở lại bản nháp thì không tự nhảy sang bước mô phỏng. */
  const [explicitStep] = useState(() => searchParams.has(STEP_PARAM) || work !== null)
  /** Bước của lần vẽ trước: địa chỉ mất ?buoc (bấm lại "Đánh giá sơ bộ" trên menu) thì giữ nguyên bước đang làm. */
  const lastStep = useRef<number | null>(null)
  const urlStep = STEP_SLUGS.indexOf(searchParams.get(STEP_PARAM) ?? '')
  const firstStep = profileDone ? SITE : 0
  const maxStep = !saved.siteId && !saved.preSurveyId ? firstStep : saved.preSurveyId && loaded?.surfaceDefined ? REVIEW : SURFACE
  const step = Math.min(maxStep, Math.max(firstStep, urlStep >= 0 ? urlStep : (lastStep.current ?? initialStep)))
  /** Đổi bước lặng lẽ (replace, không cuộn): mở lại bản nháp, bỏ bản nháp, lỗi buộc quay về một bước. */
  const silentMove = useRef(false)
  function moveTo(target: number, { replace = false } = {}) {
    // Chỉ đánh dấu "lặng lẽ" khi bước thật sự đổi; không thì cờ còn sót và nuốt lần Back / Forward kế tiếp.
    silentMove.current = replace && target !== step
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(STEP_PARAM, STEP_SLUGS[target]!)
        return next
      },
      { replace },
    )
  }
  // Hàm mới nhất cho effect mở lại bản nháp (effect không chạy lại chỉ vì hàm đổi tham chiếu).
  const moveRef = useRef(moveTo)
  useEffect(() => {
    moveRef.current = moveTo
    lastStep.current = step
  })
  // Địa chỉ chưa có ?buoc (mở từ menu): ghi bước hiện tại vào (replace) để Back từ bước sau quay về đúng bước này.
  useEffect(() => {
    if (!searchParams.has(STEP_PARAM)) moveRef.current(lastStep.current ?? step, { replace: true })
  }, [searchParams, step])

  const createProfile = useCreateCustomerProfileMutation()
  const createSite = useCreatePropertySiteMutation()
  const createPreSurvey = useCreatePreSurveyMutation()
  const updatePreSurvey = useUpdatePreSurveyMutation()
  const saveSurfaceMutation = useSaveSurfaceMutation()
  const submitPreSurvey = useSubmitPreSurveyMutation()
  const wards = useHcmWardsQuery()
  const simulations = useSimulationsQuery(step >= SIMULATION ? saved.preSurveyId : null)
  const [savingSurface, setSavingSurface] = useState(false)
  // Đang chạy mô phỏng (có thể tới ~30 giây) cũng là bận: rời bước / gửi lúc này thì lần chạy bị 409 và mất (rà code 09/10/2026).
  const runningSimulation = useIsMutating({ mutationKey: CREATE_SIMULATION_KEY }) > 0
  const busy =
    savingSurface || runningSimulation || [createProfile, createSite, createPreSurvey, updatePreSurvey, saveSurfaceMutation, submitPreSurvey].some((m) => m.isPending)

  function setSaved(next: AssessmentDraft) {
    setSavedState(next)
    writeDraft(account, next)
  }

  /*
    Mở lại bản nháp đã nhớ (một lần cho mỗi id): đọc mặt lắp rồi nạp vào form; refetch nền về sau không đè chữ khách đang
    gõ. Bản nháp không còn dùng được (404, không thuộc tài khoản, đã gửi ở tab khác) thì bỏ và bắt đầu bản mới; lỗi mạng
    thì giữ bản nháp và cho thử lại.
  */
  const [hydratedFor, setHydratedFor] = useState<string | null>(null)
  /** Id bản nháp mà mặt lắp trên máy thuộc về: lần mở lại đầu tiên giữ bản trên máy, không nạp đè từ server. */
  const restoreLocal = useRef(workSurface?.preSurveyId ?? null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [resumeAttempt, setResumeAttempt] = useState(0)
  useEffect(() => {
    const id = saved.preSurveyId
    if (!id || hydratedFor === id) return
    let cancelled = false
    const dropDraft = (message: string) => {
      clearDraft(account)
      clearWork(account)
      setSavedState({ profile: saved.profile })
      setHydratedFor(null)
      moveRef.current(readFlag(flagKey) ? SITE : 0, { replace: true })
      toast(message)
    }
    queryClient.fetchQuery({ queryKey: preSurveyKeys.surface(id), queryFn: () => getSurface(id) }).then(
      (view) => {
        if (cancelled) return
        if (view.status !== 'DRAFT') return dropDraft('Bản đánh giá trước đã được gửi. Bắt đầu một bản mới.')
        setHydratedFor(id)
        setResumeError(null)
        if (restoreLocal.current === id) {
          // Mặt lắp đang sửa dở trên máy cho đúng bản nháp này: giữ bản trên máy (đã nạp lúc mở trang). Server đã đổi sau đó
          // (sửa ở máy / tab khác) thì báo xung đột ngay để khách chọn tải bản mới hay lưu đè, như khi lưu bị 409.
          restoreLocal.current = null
          if (workSurface?.baseRevision != null && workSurface.baseRevision !== view.revision) setConflict(true)
        } else {
          setBaseRevision(view.revision)
          if (view.surfaceDefined) setSurface(surfaceToForm(view))
          else
            // Lần lưu mặt lắp đầu tiên chưa xong: bản nháp vẫn có độ dốc, hướng (gửi lúc tạo) – nạp lại để khách không nhập lại.
            setSurface((f) => ({
              ...f,
              tiltDegree: view.surfaceTiltDegree == null ? f.tiltDegree : meterText(view.surfaceTiltDegree),
              azimuthDegree: view.surfaceAzimuthDegree == null ? f.azimuthDegree : String(view.surfaceAzimuthDegree),
            }))
        }
        setViewId(view.selectedSimulationId)
        // Mở trang không chỉ định bước (lần đầu trên máy này) mà mặt lắp đã lưu: làm tiếp ở bước mô phỏng.
        if (!explicitStep && view.surfaceDefined) moveRef.current(SIMULATION, { replace: true })
      },
      (error: unknown) => {
        if (cancelled) return
        if (isApiError(error) && [403, 404].includes(error.status)) dropDraft('Không mở được bản nháp trước. Bắt đầu một bản đánh giá mới.')
        else setResumeError(errorMessage(error))
      },
    )
    return () => {
      cancelled = true
    }
  }, [account, explicitStep, flagKey, hydratedFor, queryClient, resumeAttempt, saved.preSurveyId, saved.profile, workSurface])

  // Thanh định vị ghi bước đang làm: "Cổng khách hàng / Đánh giá sơ bộ / Mặt lắp".
  usePageCrumb(STEP_LABELS[step])

  function editor<F>(setter: (fn: (f: F) => F) => void) {
    return (patch: Partial<F>) => {
      setter((f) => ({ ...f, ...patch }))
      clearErrors(Object.keys(patch))
    }
  }

  /** Xoá lỗi của các ô vừa sửa; sửa hết thì tắt luôn câu nhắc chung ở thanh thao tác (câu lỗi từ server thì giữ). */
  function clearErrors(keys: string[]) {
    const next = { ...errors }
    for (const key of keys) delete next[key]
    setErrors(next)
    if (Object.keys(next).length === 0) setFormError((f) => (f === FIX_FIELDS ? null : f))
  }

  function goTo(target: number) {
    setErrors({})
    setFormError(null)
    setConflict(false)
    moveTo(target)
  }

  /*
    Đổi bước do khách (Tiếp tục, Quay lại, bấm bước đã xong, nút Sửa, Back / Forward của trình duyệt): đưa trang về đầu bước
    mới thay vì đứng ở cuối trang của bước cũ, và đưa focus về tiêu đề (ẩn) của bước để bàn phím / trình đọc màn hình bắt
    đầu từ đầu bước. Đổi bước lặng lẽ (mở lại bản nháp…) và lần vẽ đầu thì không.
  */
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const shownStep = useRef(step)
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    const silent = silentMove.current
    silentMove.current = false
    if (silent) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    stepHeadingRef.current?.focus({ preventScroll: true })
  }, [step])

  function showErrors(found: Record<string, string | undefined>) {
    setErrors(Object.fromEntries(Object.entries(found).filter((e): e is [string, string] => Boolean(e[1]))))
    setFormError(FIX_FIELDS)
  }

  /** Lỗi từ server: gắn vào ô nếu được, còn lại hiện ở thanh thao tác. */
  function fail<F extends object>(error: unknown, form?: F) {
    const fieldErrors = form && isApiError(error) ? serverFieldErrors(error, form) : {}
    setErrors(fieldErrors as Record<string, string>)
    setFormError(errorMessage(error))
  }

  function markProfileDone() {
    writeFlag(flagKey, true)
    setProfileDone(true)
  }

  async function saveProfile() {
    const result = check(profileSchema, profile)
    if (result.errors) return showErrors(result.errors as FormErrors<ProfileForm>)
    try {
      await createProfile.mutateAsync(result.data)
      setSaved({ ...saved, profile: result.data })
    } catch (error) {
      if (!isApiError(error) || error.code !== 'CUSTOMER_ALREADY_EXISTS') return fail(error, profile)
      toast('Tài khoản đã có hồ sơ khách hàng, hệ thống dùng hồ sơ hiện có.')
    }
    markProfileDone()
    goTo(SITE)
  }

  async function saveSite() {
    // Không sửa gì ở địa điểm đã lưu: đi tiếp, kể cả địa điểm cũ khai tự do trước khi có danh sách phường/xã 2 cấp
    // (kiểm tra lại sẽ bắt chọn phường mới và tạo bản nháp mới chỉ vì khách bấm Quay lại rồi Tiếp tục). Trừ khi địa điểm
    // cũ thiếu toạ độ: không có toạ độ thì không đặt được giờ khảo sát, phải khai rồi tạo địa điểm mới.
    if (saved.siteId && saved.site && same(site, siteToForm(saved.site)) && hasCoordinates(saved.site.latitude, saved.site.longitude))
      return goTo(SURFACE)
    const result = check(siteSchema, site)
    const wardNames = wards.data?.map((w) => w.name)
    // Danh sách không tải được thì nhận chữ khách gõ (đã báo ở ô); có danh sách thì phải đúng một phường, xã trong đó.
    const wardIssue = wardNames && site.ward.trim() && !wardNames.includes(site.ward.trim()) ? 'Chọn phường, xã trong danh sách.' : undefined
    if (result.errors || wardIssue) return showErrors({ ...result.errors, ...(wardIssue ? { ward: wardIssue } : {}) })
    if (saved.siteId && same(saved.site, result.data)) return goTo(SURFACE)
    try {
      const { propertySiteId } = await createSite.mutateAsync(result.data)
      // Bản nháp gắn với địa điểm; địa điểm mới thì bản nháp mới (mặt lắp đang nhập vẫn giữ trong form).
      setSaved({ profile: saved.profile, site: result.data, siteId: propertySiteId })
      setHydratedFor(null)
      setBaseRevision(null)
      setViewId(null)
      goTo(SURFACE)
    } catch (error) {
      if (isApiError(error) && error.code === 'CUSTOMER_PROFILE_NOT_FOUND') {
        // Cờ trong localStorage sai (ví dụ đổi máy chủ): quay lại khai hồ sơ.
        writeFlag(flagKey, false)
        setProfileDone(false)
        moveTo(0, { replace: true })
      }
      fail(error, site)
    }
  }

  /** Đọc mặt lắp mới nhất từ server (bỏ cache) – dùng sau khi ghi để có revision / geometryVersion đúng. */
  function fetchSurface(id: string) {
    return queryClient.fetchQuery({ queryKey: preSurveyKeys.surface(id), queryFn: () => getSurface(id), staleTime: 0 })
  }

  /**
   * Lưu mặt lắp: lần đầu tạo bản nháp (kèm số liệu khai, độ dốc, hướng) rồi PUT mặt lắp; các lần sau chỉ ghi phần đổi.
   * `overwrite`: khách chọn lưu đè sau xung đột 409 – lấy revision mới nhất làm mốc.
   */
  async function saveSurface({ overwrite = false } = {}) {
    const found = validateSurface(surface)
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return false
    }
    if (!saved.siteId) {
      goTo(SITE)
      return false
    }
    setSavingSurface(true)
    setConflict(false)
    try {
      let id = saved.preSurveyId
      let server = id ? loaded : undefined
      let revision = baseRevision
      if (!id) {
        id = (await createPreSurvey.mutateAsync({ propertySiteId: saved.siteId, ...toDeclaredRequest(surface) })).preSurveyId
        setHydratedFor(id)
        setSaved({ ...saved, preSurveyId: id })
        server = await fetchSurface(id)
        revision = server.revision
      } else if (overwrite || !server || revision === null) {
        server = await fetchSurface(id)
        revision = server.revision
      }
      const body = toSurfaceRequest(surface, revision!)
      if (surfaceDiffers(server!, body)) {
        const written = await saveSurfaceMutation.mutateAsync({ id, body })
        // Mốc mới ngay khi ghi xong: bước sau (số liệu khai) có lỗi thì lần lưu tới không bị báo xung đột oan.
        setBaseRevision(written.revision)
        server = { ...server!, surfaceTiltDegree: body.surfaceTiltDegree ?? null, surfaceAzimuthDegree: body.surfaceAzimuthDegree ?? null }
      }
      const declared = toDeclaredRequest(surface)
      if (declaredDiffers(server!, declared)) await updatePreSurvey.mutateAsync({ id, body: declared })
      const fresh = await fetchSurface(id)
      setBaseRevision(fresh.revision)
      setErrors({})
      setFormError(null)
      return true
    } catch (error) {
      if (isApiError(error) && error.code === 'PRE_SURVEY_CONCURRENTLY_MODIFIED') {
        // Khối đỏ "Mặt lắp vừa được sửa ở nơi khác" đã nói đủ: không báo đỏ lần hai ở thanh thao tác.
        setConflict(true)
      } else if (isApiError(error) && (error.code === 'PRE_SURVEY_NOT_EDITABLE' || error.code === 'PRE_SURVEY_ALREADY_SUBMITTED')) {
        restartDraft()
      } else if (isApiError(error) && error.code === 'PRESURVEY_VALIDATION_FAILED') {
        const mapped = serverSurfaceErrors(error.fieldErrors)
        if (mapped.totalAreaM2 || mapped.usableAreaM2) {
          // Số khai tự tính bị từ chối: chuyển sang tự khai (điền sẵn số đang tính) để khách thấy và sửa được ô bị đánh dấu.
          const auto = autoDeclared(surface)
          setSurface((f) => ({
            ...f,
            declaredManual: true,
            totalAreaM2: f.totalAreaM2 || (auto ? meterText(auto.totalAreaM2) : ''),
            usableAreaM2: f.usableAreaM2 || (auto ? meterText(auto.usableAreaM2) : ''),
          }))
        }
        setErrors(mapped)
        setFormError(error.message)
      } else fail(error)
      return false
    } finally {
      setSavingSurface(false)
    }
  }

  /**
   * Bản nháp đã được gửi ở nơi khác (tab / máy khác): không sửa hay chạy thêm được. Giữ địa điểm và mặt lắp đang nhập, bỏ id
   * bản nháp; lần lưu tới tạo bản đánh giá mới cho cùng địa điểm thay vì kẹt ở lỗi 409.
   */
  function restartDraft() {
    setSaved({ profile: saved.profile, site: saved.site, siteId: saved.siteId })
    setHydratedFor(null)
    setBaseRevision(null)
    setViewId(null)
    setConflict(false)
    goTo(SURFACE)
    toast('Bản đánh giá này đã được gửi ở nơi khác. Lưu mặt lắp để tạo bản đánh giá mới cho địa điểm này.')
  }

  /** Xung đột: bỏ phần đang sửa, nạp bản mới nhất từ server vào form. */
  async function reloadSurface() {
    if (!saved.preSurveyId) return
    try {
      const fresh = await fetchSurface(saved.preSurveyId)
      setSurface(fresh.surfaceDefined ? surfaceToForm(fresh) : EMPTY_SURFACE_FORM)
      setBaseRevision(fresh.revision)
      setConflict(false)
      setErrors({})
      setFormError(null)
      toast('Đã tải bản mặt lắp mới nhất.')
    } catch (error) {
      fail(error)
    }
  }

  async function saveDraft() {
    if (await saveSurface()) toast.success('Đã lưu mặt lắp.')
  }

  async function submit() {
    if (!saved.preSurveyId) return goTo(SURFACE)
    // Bản nháp cũ gắn với địa điểm thiếu toạ độ: gửi được nhưng không đặt được giờ khảo sát, nên bắt khai toạ độ trước.
    if (saved.site && !hasCoordinates(saved.site.latitude, saved.site.longitude)) {
      goTo(SITE)
      return showErrors({ latitude: 'Nhập toạ độ công trình để đặt được lịch khảo sát.' })
    }
    try {
      const { surveyRequestId } = await submitPreSurvey.mutateAsync(saved.preSurveyId)
      clearDraft(account)
      clearWork(account)
      setRequestId(surveyRequestId)
      dialogRef.current?.showModal()
    } catch (error) {
      // Lần gửi trước đã tới server nhưng mất phản hồi: bản đánh giá đã gửi rồi, coi như xong
      // (không có mã yêu cầu trong phản hồi lỗi nên hộp thoại bỏ dòng mã).
      if (isApiError(error) && error.code === 'PRE_SURVEY_ALREADY_SUBMITTED') {
        clearDraft(account)
        clearWork(account)
        setRequestId('')
        dialogRef.current?.showModal()
        return
      }
      if (isApiError(error) && error.code === 'PRE_SURVEY_INCOMPLETE') moveTo(SURFACE, { replace: true })
      fail(error)
    }
  }

  async function next(e?: FormEvent) {
    e?.preventDefault()
    if (busy) return
    setFormError(null)
    if (step === 0) return saveProfile()
    if (step === SITE) return saveSite()
    if (step === SURFACE) {
      if (await saveSurface()) goTo(SIMULATION)
      return
    }
    if (step === SIMULATION) return goTo(REVIEW)
    return submit()
  }

  function startOver() {
    dialogRef.current?.close()
    setSite(EMPTY_SITE)
    setSurface(EMPTY_SURFACE_FORM)
    setSimForm(EMPTY_SIMULATION_FORM)
    setSavedState({ profile: saved.profile })
    setHydratedFor(null)
    setBaseRevision(null)
    setViewId(null)
    setRequestId(null)
    goTo(SITE)
  }

  const submitted = requestId !== null
  const waitingDraft = Boolean(saved.preSurveyId) && hydratedFor !== saved.preSurveyId
  // Ghi bản đang làm mỗi lần đổi (sau khi đã mở xong bản nháp, kẻo ghi form rỗng đè lên bản trên máy); gửi xong thì thôi.
  useEffect(() => {
    if (waitingDraft || submitted) return
    writeWork(account, { step, profile, site, surface, simForm, preSurveyId: saved.preSurveyId, baseRevision })
  }, [account, baseRevision, profile, saved.preSurveyId, simForm, site, step, submitted, surface, waitingDraft])
  // Mặt lắp sửa rồi chưa lưu (đi tiếp bằng nút Forward, hoặc bản trên máy khác bản trên server): mô phỏng / xem lại vẫn dùng
  // bản đã lưu, nên nhắc ở các bước sau.
  const surfaceUnsaved = surfaceChanged(surface, loaded)
  const selectedRun = simulations.data?.find((s) => s.isSelected) ?? null
  /** Tóm tắt dưới bước đã xong: khách nhìn lại được đã khai gì mà không phải mở lại từng bước. */
  const stepSummaries: (string | undefined)[] = [
    saved.profile ? [customerTypeLabel(saved.profile.customerType), saved.profile.companyName].filter(Boolean).join(', ') : 'Đã có hồ sơ',
    saved.site ? [saved.site.name, saved.site.ward].filter(Boolean).join(', ') : undefined,
    loaded?.surfaceDefined
      ? `${formatTwo(loaded.surfaceWidthM)} × ${formatTwo(loaded.surfaceLengthM)} m, ${loaded.obstacles.length > 0 ? `${loaded.obstacles.length} vật cản` : 'không có vật cản'}`
      : undefined,
    selectedRun ? `${selectedRun.panelCount} tấm, ${formatOne(selectedRun.installedCapacityKwp)} kWp` : 'Chưa chạy mô phỏng',
    undefined,
  ]
  const steps: WizardStep[] = STEP_LABELS.map((label, i) => {
    const state = i < step || (i === 0 && profileDone) ? 'done' : i === step ? 'active' : 'upcoming'
    return {
      label,
      state,
      summary: state === 'done' ? stepSummaries[i] : undefined,
      // Bấm bước đã xong để quay lại; hồ sơ khách hàng tạo một lần, không sửa được nên không bấm.
      onSelect: state === 'done' && i >= firstStep && !busy && !submitted ? () => goTo(i) : undefined,
    }
  })
  /*
    Bước có hình vẽ (mặt lắp, mô phỏng) rộng hết trang và tự đặt cột phụ cạnh khối nhập liệu ở hàng đầu, để hình to và nằm
    giữa trang (người dùng 10/10/2026). Các bước còn lại giữ form 2/3 + cột phụ 1/3.
  */
  const wide = step === SURFACE || (step === SIMULATION && Boolean(saved.preSurveyId && loaded?.surfaceDefined))
  const aside = (
    <>
      {step === SIMULATION && simulations.data && simulations.data.length > 0 && (
        <Panel>
          <PanelHeader
            title={
              <span className="flex items-center gap-2">
                Các lần chạy <Count value={simulations.data.length} />
              </span>
            }
          />
          <PanelBody>
            <SimulationHistory items={simulations.data} viewingId={viewId ?? loaded?.selectedSimulationId ?? null} onView={setViewId} />
          </PanelBody>
        </Panel>
      )}
      <Notice tone="info" title="Sau khi gửi">
        Bạn chọn ngày giờ khảo sát trong 30 ngày tới. Bộ phận kinh doanh phân công kỹ thuật viên tới công trình để kiểm tra
        lại các số đo bạn khai.
      </Notice>
      {saved.preSurveyId && !submitted && (
        <Notice tone="ok">
          Bản nháp <span className="tnum font-medium text-fg">{shortCode(saved.preSurveyId)}</span> đã lưu trên hệ thống. Phần đang nhập dở được giữ
          trên máy này, rời trang hay tải lại vẫn còn.
        </Notice>
      )}
    </>
  )

  if (waitingDraft) {
    return resumeError ? (
      <ErrorState
        title="Không mở được bản nháp đang làm."
        message={resumeError}
        onRetry={() => {
          setResumeError(null)
          setResumeAttempt((n) => n + 1)
        }}
      />
    ) : (
      <PageSkeleton />
    )
  }

  return (
    <>
      <PageHeader title="Đánh giá sơ bộ" description={STEP_HINTS[step]} />

      <WizardSteps steps={steps} label="Các bước đánh giá sơ bộ" className="mb-8" />
      <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
        Bước {step + 1}/{STEP_LABELS.length}: {STEP_LABELS[step]}
      </h2>

      <div className={cx('grid gap-6', !wide && 'lg:grid-cols-3')}>
        <form id="assessment-step" noValidate onSubmit={next} className={cx('min-w-0 space-y-4', !wide && 'lg:col-span-2')}>
          {(step === SIMULATION || step === REVIEW) && loaded?.surfaceDefined && surfaceUnsaved && (
            <Notice tone="warn" title="Mặt lắp có thay đổi chưa lưu">
              Mô phỏng và phần xem lại đang dùng mặt lắp đã lưu trước đó. Thay đổi vẫn được giữ trên máy này.{' '}
              <button type="button" className="tap ui-link font-medium" onClick={() => goTo(SURFACE)}>
                Về bước mặt lắp để lưu
              </button>
            </Notice>
          )}
          {step === 0 && (
            <Panel>
              <PanelHeader title="Thông tin khách hàng" description="Khai một lần cho tài khoản này." />
              <PanelBody>
                <ProfileFields value={profile} errors={errors} onChange={editor(setProfile)} />
              </PanelBody>
            </Panel>
          )}

          {step === SITE && saved.preSurveyId && (
            <Notice tone="warn">
              Bản đánh giá đang làm gắn với địa điểm này. Đổi thông tin địa điểm sẽ tạo địa điểm và bản đánh giá mới: mặt lắp giữ
              nguyên, các lần mô phỏng phải chạy lại.
            </Notice>
          )}
          {step === SITE && (
            <Panel>
              <PanelHeader title="Địa điểm lắp đặt" />
              <PanelBody>
                <SiteFields value={site} errors={errors} onChange={editor(setSite)} />
              </PanelBody>
            </Panel>
          )}

          {step === SURFACE && (
            <>
              {conflict && (
                <Notice tone="danger" title="Mặt lắp vừa được sửa ở nơi khác">
                  Có thể bạn đang mở bản đánh giá này ở một tab khác. Tải bản mới nhất để xem trước khi lưu, hoặc lưu đè bằng bản đang sửa ở đây.
                  <span className="mt-3 flex flex-wrap gap-3">
                    <Button size="sm" icon="refresh" onClick={reloadSurface} disabled={busy}>
                      Tải bản mới nhất
                    </Button>
                    <Button size="sm" variant="ghost" bleed={false} onClick={() => void saveSurface({ overwrite: true })} disabled={busy}>
                      Lưu đè bằng bản đang sửa
                    </Button>
                  </span>
                </Notice>
              )}
              <SurfaceEditor
                value={surface}
                errors={errors as SurfaceErrors}
                onChange={(nextForm, touched) => {
                  setSurface(nextForm)
                  clearErrors(touched)
                }}
                aside={aside}
              />
            </>
          )}

          {step === SIMULATION && !loaded?.surfaceDefined && (
            <EmptyState
              title="Chưa lưu mặt lắp"
              description="Mô phỏng xếp tấm trên mặt lắp đã lưu. Nhập kích thước mặt lắp trước."
              action={<Button onClick={() => goTo(SURFACE)}>Về bước mặt lắp</Button>}
            />
          )}
          {step === SIMULATION && saved.preSurveyId && loaded?.surfaceDefined && (
            <SimulationWorkspace
              preSurveyId={saved.preSurveyId}
              surface={loaded}
              form={simForm}
              onFormChange={setSimForm}
              viewId={viewId ?? loaded.selectedSimulationId}
              onView={setViewId}
              onEditSurface={() => goTo(SURFACE)}
              onEditSite={() => goTo(SITE)}
              onDraftClosed={restartDraft}
              aside={aside}
            />
          )}

          {step === REVIEW && (
            <>
              <Panel>
                <PanelHeader title="Thông tin khách hàng" />
                <PanelBody>
                  {saved.profile ? (
                    <KeyValueList
                      columns={2}
                      items={[
                        { k: 'Loại khách hàng', v: customerTypeLabel(saved.profile.customerType) },
                        ...(saved.profile.companyName ? [{ k: 'Doanh nghiệp', v: saved.profile.companyName }] : []),
                        ...(saved.profile.taxCode ? [{ k: 'Mã số thuế', v: saved.profile.taxCode }] : []),
                      ]}
                    />
                  ) : (
                    <p className="text-body text-fg-2">Dùng hồ sơ khách hàng đã có của tài khoản.</p>
                  )}
                </PanelBody>
              </Panel>
              <Panel>
                <PanelHeader
                  title="Địa điểm lắp đặt"
                  action={
                    <Button size="sm" icon="edit" disabled={submitted} onClick={() => goTo(SITE)}>
                      Sửa
                    </Button>
                  }
                />
                <PanelBody>
                  {saved.site ? (
                    /* Một cột: địa chỉ dài, chia hai cột thì bị bẻ từng chữ. */
                    <KeyValueList
                      items={[
                        { k: 'Tên địa điểm', v: saved.site.name },
                        { k: 'Địa chỉ', v: formatAddress(saved.site) },
                        { k: 'Bề mặt', v: surfaceTypeLabel(saved.site.installationSurfaceType) },
                        { k: 'Vật liệu', v: saved.site.surfaceMaterial ?? '—' },
                        ...(saved.site.latitude != null && saved.site.longitude != null
                          ? [{ k: 'Toạ độ', v: `${saved.site.latitude}, ${saved.site.longitude}` }]
                          : []),
                      ]}
                    />
                  ) : (
                    <p className="text-body text-fg-2">Địa điểm đã lưu cùng bản nháp.</p>
                  )}
                </PanelBody>
              </Panel>
              {loaded && (
                <Panel>
                  <PanelHeader
                    title="Mặt lắp"
                    action={
                      <Button size="sm" icon="edit" disabled={submitted} onClick={() => goTo(SURFACE)}>
                        Sửa
                      </Button>
                    }
                  />
                  <PanelBody>
                    <KeyValueList
                      columns={2}
                      items={[
                        { k: 'Kích thước', v: `${formatTwo(loaded.surfaceWidthM)} × ${formatTwo(loaded.surfaceLengthM)} m` },
                        { k: 'Độ dốc, hướng', v: `${formatTwo(loaded.surfaceTiltDegree)}°, ${directionLabel(loaded.surfaceAzimuthDegree)}` },
                        { k: 'Vật cản', v: loaded.obstacles.length > 0 ? loaded.obstacles.map((o) => o.name).join(', ') : 'Không' },
                        { k: 'Tổng diện tích khai', v: formatM2(loaded.declared.totalAreaM2) },
                        { k: 'Dùng được', v: formatM2(loaded.declared.usableAreaM2) },
                      ]}
                    />
                  </PanelBody>
                </Panel>
              )}
              <Panel>
                <PanelHeader
                  title="Mô phỏng chính"
                  action={
                    <Button size="sm" disabled={submitted} onClick={() => goTo(SIMULATION)}>
                      {selectedRun ? 'Xem' : 'Chạy mô phỏng'}
                    </Button>
                  }
                />
                <PanelBody className="space-y-3">
                  {selectedRun ? (
                    <>
                      <KeyValueList
                        columns={2}
                        items={[
                          { k: 'Tấm pin', v: selectedRun.productName },
                          { k: 'Kiểu lắp', v: mountingLabel(selectedRun.mountingType) },
                          { k: 'Số tấm', v: `${selectedRun.panelCount} tấm` },
                          { k: 'Công suất', v: `${formatOne(selectedRun.installedCapacityKwp)} kWp` },
                          { k: 'Sản lượng năm', v: selectedRun.annualEnergyKwh == null ? 'Chưa có dữ liệu' : `${formatKwh(selectedRun.annualEnergyKwh)} kWh` },
                        ]}
                      />
                      {selectedRun.isStale && (
                        <Notice tone="warn">Mô phỏng này tính theo mặt lắp cũ. Chạy lại để chuyên viên thấy kết quả theo mặt lắp mới.</Notice>
                      )}
                    </>
                  ) : (
                    <Notice tone="warn">
                      Chưa chạy mô phỏng. Vẫn gửi được, nhưng chạy trước giúp chuyên viên thấy số tấm và sản lượng dự kiến khi gọi bạn.
                    </Notice>
                  )}
                </PanelBody>
              </Panel>
            </>
          )}
        </form>

        {!wide && <div className="min-w-0 space-y-4 self-start">{aside}</div>}
      </div>

      <ActionBar>
        <Button onClick={() => goTo(Math.max(firstStep, step - 1))} disabled={step <= firstStep || busy || submitted}>
          Quay lại
        </Button>
        {step === SURFACE && (
          <Button variant="ghost" bleed={false} icon="save" onClick={saveDraft} disabled={busy}>
            Lưu nháp
          </Button>
        )}
        {/* Nói rõ trạng thái lưu: thay đổi luôn giữ trên máy, lên hệ thống khi bấm Lưu nháp / Tiếp tục. */}
        {step === SURFACE && surfaceUnsaved && !busy && <span className="text-meta text-fg-2">Chưa lưu lên hệ thống, vẫn giữ trên máy này</span>}
        <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
          {formError && (
            <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
              <Icon name="error" className="shrink-0 text-[20px]" />
              {formError}
            </span>
          )}
          <Button
            type="submit"
            form="assessment-step"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={busy || submitted || (step === SIMULATION && !loaded?.surfaceDefined)}
          >
            {runningSimulation ? 'Đang chạy mô phỏng…' : busy ? 'Đang lưu…' : step === REVIEW ? 'Gửi yêu cầu khảo sát' : `Tiếp tục: ${STEP_LABELS[step + 1]}`}
          </Button>
        </div>
      </ActionBar>

      <Dialog ref={dialogRef} className="max-w-lg">
        <DialogTitle>Đã gửi yêu cầu khảo sát</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          Bước cuối: chọn ngày giờ để kỹ thuật viên tới khảo sát {saved.site?.name ?? 'địa điểm của bạn'}. Bạn cũng có thể chọn sau ở mục
          Yêu cầu khảo sát.
        </p>
        {requestId && (
          <KeyValueList
            className="mt-4 border-t border-line pt-4"
            items={[{ k: 'Mã yêu cầu', v: <span className="tnum">{shortCode(requestId)}</span> }]}
          />
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={startOver}>
            Đánh giá địa điểm khác
          </Button>
          {/* Mất phản hồi khi gửi (PRE_SURVEY_ALREADY_SUBMITTED) thì không có mã yêu cầu: mở danh sách để khách chọn. */}
          <Button
            variant="primary"
            onClick={() => navigate(requestId ? withId(ROUTES.customer.request, requestId) : ROUTES.customer.requests)}
          >
            Chọn giờ khảo sát
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
