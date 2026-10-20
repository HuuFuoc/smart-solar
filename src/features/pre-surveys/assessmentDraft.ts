import { EMPTY_PROFILE, EMPTY_SITE, type ProfileForm, type SiteForm } from '@/features/pre-surveys/assessmentForm'
import { EMPTY_SIMULATION_FORM, type SimulationForm } from '@/features/pre-surveys/simulationForm'
import { EMPTY_SURFACE_FORM, newObstacleKey, type SurfaceForm } from '@/features/pre-surveys/surfaceForm'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'

// Backend không có API lấy lại bản nháp hay địa điểm của khách, nên lưu id và thông tin vào localStorage.
export type AssessmentDraft = {
  profile?: CreateCustomerProfileRequest
  site?: CreatePropertySiteRequest
  siteId?: string
  preSurveyId?: string
}

const draftKey = (account: string) => `smartsolar.assessment-draft.${account}`

export function readDraft(account: string): AssessmentDraft {
  try {
    const raw = localStorage.getItem(draftKey(account))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as AssessmentDraft) : {}
  } catch {
    return {}
  }
}

export function writeDraft(account: string, draft: AssessmentDraft) {
  try {
    if (draft.siteId || draft.preSurveyId) localStorage.setItem(draftKey(account), JSON.stringify(draft))
    else localStorage.removeItem(draftKey(account))
  } catch {
    // Trình duyệt chặn localStorage: bỏ qua
  }
}

export function clearDraft(account: string) {
  writeDraft(account, {})
}

// Form đang nhập dở, để tải lại trang không bị mất
export type AssessmentWork = {
  step: number
  profile: ProfileForm
  site: SiteForm
  surface: SurfaceForm
  simForm: SimulationForm
  preSurveyId?: string
  // Gửi làm expectedRevision khi lưu mặt lắp
  baseRevision: number | null
}

const workKey = (account: string) => `smartsolar.assessment-work.${account}`

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)

export function readWork(account: string): AssessmentWork | null {
  try {
    const raw = localStorage.getItem(workKey(account))
    if (!raw) return null
    const w: unknown = JSON.parse(raw)
    if (!isObject(w) || typeof w.step !== 'number') return null
    const surface = isObject(w.surface) ? (w.surface as Partial<SurfaceForm>) : {}
    return {
      step: w.step,
      // Ghép với form rỗng phòng khi dữ liệu cũ thiếu field
      profile: { ...EMPTY_PROFILE, ...(isObject(w.profile) ? w.profile : {}) },
      site: { ...EMPTY_SITE, ...(isObject(w.site) ? w.site : {}) },
      surface: {
        ...EMPTY_SURFACE_FORM,
        ...surface,
        // Sinh key mới để không trùng key trong phiên này
        obstacles: Array.isArray(surface.obstacles)
          ? surface.obstacles.map((o) => ({ ...o, key: newObstacleKey() }))
          : [],
      },
      simForm: { ...EMPTY_SIMULATION_FORM, ...(isObject(w.simForm) ? w.simForm : {}) },
      preSurveyId: typeof w.preSurveyId === 'string' ? w.preSurveyId : undefined,
      baseRevision: typeof w.baseRevision === 'number' ? w.baseRevision : null,
    } as AssessmentWork
  } catch {
    return null
  }
}

export function writeWork(account: string, work: AssessmentWork) {
  try {
    localStorage.setItem(workKey(account), JSON.stringify(work))
  } catch {
    // Trình duyệt chặn localStorage: bỏ qua
  }
}

export function clearWork(account: string) {
  try {
    localStorage.removeItem(workKey(account))
  } catch {
    // Trình duyệt chặn localStorage: bỏ qua
  }
}
