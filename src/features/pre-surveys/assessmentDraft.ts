import { EMPTY_PROFILE, EMPTY_SITE, type ProfileForm, type SiteForm } from '@/features/pre-surveys/components/assessmentForm'
import { EMPTY_SIMULATION_FORM, type SimulationForm } from '@/features/pre-surveys/components/simulationForm'
import { EMPTY_SURFACE_FORM, newObstacleKey, type SurfaceForm } from '@/features/pre-surveys/components/surfaceForm'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'

/*
 * Bản nháp đánh giá đang làm, nhớ trong localStorage theo tài khoản. Backend không có API liệt kê hồ sơ, địa điểm hay
 * bản nháp của khách hàng; chỉ đọc lại được một bản nháp theo id (GET .../surface). Nhớ id để tải lại trang vẫn làm
 * tiếp được; nhớ thêm thông tin địa điểm vì không có API đọc lại địa điểm (bước xem lại cần hiển thị).
 * Gửi xong, hoặc bản nháp không còn (404 / không thuộc tài khoản / đã gửi ở tab khác) thì xoá.
 */

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
    /* Trình duyệt chặn storage: tải lại trang thì bắt đầu lại, bản nháp vẫn nằm trên server. */
  }
}

export function clearDraft(account: string) {
  writeDraft(account, {})
}

/*
 * Bản đang làm dở trên máy (người dùng 10/10/2026: "không giữ lại giá trị của form nếu back qua back lại"): mọi ô đã nhập
 * nhưng chưa gửi (hồ sơ, địa điểm chưa bấm Tiếp tục, mặt lắp chưa lưu, cấu hình mô phỏng) và bước đang làm, ghi vào
 * localStorage theo tài khoản mỗi lần đổi. Rời trang, bấm Back, tải lại hay mở lại trình duyệt vẫn còn và về đúng bước.
 * Server vẫn chỉ nhận khi bấm Tiếp tục / Lưu nháp (người dùng chọn giữ trên trình duyệt thay vì tự lưu lên server).
 * Mặt lắp ghi kèm id bản nháp và revision nó dựa vào: mở lại đúng bản nháp đó thì dùng bản trên máy (lưu sau đó vẫn qua
 * kiểm tra revision, server đã đổi thì hiện xung đột như cũ); bản nháp khác thì lấy mặt lắp từ server.
 */
export type AssessmentWork = {
  step: number
  profile: ProfileForm
  site: SiteForm
  surface: SurfaceForm
  simForm: SimulationForm
  /** Bản nháp mà mặt lắp trong form đang sửa (chưa có bản nháp thì không có). */
  preSurveyId?: string
  /** revision của mặt lắp mà form dựa vào (expectedRevision khi lưu). */
  baseRevision: number | null
}

const workKey = (account: string) => `smartsolar.assessment-work.${account}`

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)

/** Đọc bản đang làm; ghép với giá trị rỗng để bản cũ thiếu ô (form đổi theo thời gian) vẫn mở được. */
export function readWork(account: string): AssessmentWork | null {
  try {
    const raw = localStorage.getItem(workKey(account))
    if (!raw) return null
    const w: unknown = JSON.parse(raw)
    if (!isObject(w) || typeof w.step !== 'number') return null
    const surface = isObject(w.surface) ? (w.surface as Partial<SurfaceForm>) : {}
    return {
      step: w.step,
      profile: { ...EMPTY_PROFILE, ...(isObject(w.profile) ? w.profile : {}) },
      site: { ...EMPTY_SITE, ...(isObject(w.site) ? w.site : {}) },
      surface: {
        ...EMPTY_SURFACE_FORM,
        ...surface,
        // Khoá React của vật cản tạo lại: khoá cũ có thể trùng khoá mới sinh trong phiên này.
        obstacles: Array.isArray(surface.obstacles) ? surface.obstacles.map((o) => ({ ...o, key: newObstacleKey() })) : [],
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
    /* Trình duyệt chặn storage: vẫn làm được, chỉ không giữ khi rời trang. */
  }
}

export function clearWork(account: string) {
  try {
    localStorage.removeItem(workKey(account))
  } catch {
    /* Như trên. */
  }
}
