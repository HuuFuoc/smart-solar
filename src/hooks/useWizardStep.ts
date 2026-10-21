import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

// Tên tham số trên URL, ví dụ /customer/assessment?buoc=mat-lap
const STEP_PARAM = 'buoc'

type Options = {
  /** Tên của từng bước trên URL, theo đúng thứ tự các bước */
  slugs: string[]
  /** Bước nhỏ nhất khách được mở */
  firstStep: number
  /** Bước lớn nhất khách được mở (chưa làm xong bước trước thì không mở được bước sau) */
  maxStep: number
  /** Bước mở sẵn khi URL chưa có ?buoc */
  startStep: number
}

type SetStepOptions = {
  /** true: chuyển bước do code, thay URL hiện tại (không thêm lịch sử) và không cuộn trang */
  replace?: boolean
}

/**
 * Bước hiện tại của wizard. Bước được lưu trên URL để nút Back / Forward của trình duyệt chuyển được bước.
 * Khi khách chuyển bước thì trang cuộn lên đầu và focus vào tiêu đề của bước (gắn `headingRef` vào tiêu đề đó).
 */
export function useWizardStep({ slugs, firstStep, maxStep, startStep }: Options) {
  const [searchParams, setSearchParams] = useSearchParams()
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Lúc mở trang, URL đã có ?buoc chưa (chỉ đọc một lần)
  const [hadStepInUrl] = useState(() => searchParams.has(STEP_PARAM))

  // Bước đang hiện. Dùng khi URL mất ?buoc (khách bấm lại mục menu) để giữ nguyên bước, không nhảy về bước đầu
  const [shownStep, setShownStep] = useState(startStep)
  const urlStep = slugs.indexOf(searchParams.get(STEP_PARAM) ?? '')
  const wantedStep = urlStep >= 0 ? urlStep : shownStep
  const step = Math.min(maxStep, Math.max(firstStep, wantedStep))
  // Nhớ bước vừa tính cho lần render sau (React cho phép gọi setState khi render để nhớ giá trị của lần trước)
  if (step !== shownStep) setShownStep(step)

  // Bước của lần chạy effect trước, để biết bước có đổi không (null ở lần đầu)
  const previousStepRef = useRef<number | null>(null)
  // true nếu lần đổi bước sắp tới là do code, khi đó không cuộn trang
  const silentRef = useRef(false)

  function setStep(target: number, options: SetStepOptions = {}) {
    const replace = options.replace ?? false
    // Chỉ bật cờ khi bước thật sự đổi, nếu không cờ bị sót lại cho lần chuyển bước sau
    silentRef.current = replace && target !== step
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set(STEP_PARAM, slugs[target]!)
        return next
      },
      { replace },
    )
  }

  // URL chưa có ?buoc (mở từ menu) thì ghi bước đang hiện vào URL
  const writeStepToUrl = useEffectEvent(() => setStep(step, { replace: true }))
  useEffect(() => {
    if (!searchParams.has(STEP_PARAM)) writeStepToUrl()
  }, [searchParams, step])

  // Bước vừa đổi: cuộn lên đầu trang và focus tiêu đề của bước (trừ lần đầu và khi đổi do code)
  useEffect(() => {
    const previousStep = previousStepRef.current
    previousStepRef.current = step
    if (previousStep === null || previousStep === step) return
    if (silentRef.current) {
      silentRef.current = false
      return
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  return { step, setStep, headingRef, hadStepInUrl }
}
