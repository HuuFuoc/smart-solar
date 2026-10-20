import { Component, lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useResolvedTheme } from '@/hooks/useTheme'
import { cx } from '@/utils/cx'
import { solution } from '@/data/landing'
import { liteDevice, prefersReducedMotion, saveData, supportsWebGL2 } from './device'

/* three.js + react-three-fiber chỉ tải khi khung sắp hiện (chunk riêng, dùng chung với cảnh mô phỏng của portal). */
const SolarPanelScene = lazy(() => import('./solar-panel-scene'))

/*
  Ảnh tĩnh của đúng khung hình đầu của cảnh 3D (cùng góc nhìn, cùng khung 4:3), chụp từ chính cảnh này ở mỗi giao diện. Dùng
  làm ảnh chờ trong lúc tải three.js (canvas hiện dần lên trên, khớp từng điểm nên không thấy nhảy) và làm ảnh thay thế
  khi không vẽ được 3D.
*/
const STILL = { light: '/images/landing/solar-panel-light.webp', dark: '/images/landing/solar-panel-dark.webp', width: 960, height: 720 }

/* Lỗi tạo renderer hoặc tải chunk chỉ bỏ lớp 3D, ảnh tĩnh bên dưới vẫn còn. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

type Mode = 'waiting' | '3d' | 'still'

/*
  Mô hình 3D một tấm pin trong section giải pháp.
  - Chưa tới gần (cách mép màn hình hơn 300px): chỉ có khung giữ chỗ, chưa tải gì.
  - Tới gần: máy có WebGL2 và không bật tiết kiệm dữ liệu thì tải cảnh 3D (điện thoại / cảm ứng chạy bản nhẹ); ngược lại
    giữ ảnh tĩnh. Ảnh tĩnh tải cùng lúc (loading="lazy") và nằm dưới canvas cho tới khi canvas vẽ xong khung đầu.
  - Dòng hướng dẫn "Kéo để xoay tấm pin" chỉ hiện khi xoay được; giữ chỗ sẵn nên bố cục không nhảy.
*/
export function SolarPanelShowcase({ className }: { className?: string }) {
  const theme = useResolvedTheme()
  const box = useRef<HTMLDivElement>(null)
  const hintId = useId()
  const [mode, setMode] = useState<Mode>('waiting')
  const [ready, setReady] = useState(false)
  // Ảnh tĩnh nằm dưới canvas trong lúc canvas hiện dần, rồi gỡ đi: đổi giao diện sau đó không tải thêm ảnh của giao diện kia.
  const [stillGone, setStillGone] = useState(false)
  const [options, setOptions] = useState({ lite: false, reducedMotion: false })

  useEffect(() => {
    const el = box.current
    if (!el) return
    const decide = () => {
      setOptions({ lite: liteDevice(), reducedMotion: prefersReducedMotion() })
      setMode(supportsWebGL2() && !saveData() ? '3d' : 'still')
    }
    if (typeof IntersectionObserver === 'undefined') {
      const id = window.setTimeout(decide, 0)
      return () => window.clearTimeout(id)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        io.disconnect()
        decide()
      },
      { rootMargin: '300px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const interactive = mode === '3d' && ready

  return (
    <div className={className}>
      <div ref={box} className="relative aspect-[4/3] w-full">
        {(mode === 'still' || (mode === '3d' && !stillGone)) && (
          <img
            src={STILL[theme]}
            width={STILL.width}
            height={STILL.height}
            alt={interactive ? '' : solution.model.alt}
            decoding="async"
            className="absolute inset-0 size-full object-contain"
          />
        )}
        {mode === '3d' && (
          <SceneBoundary
            onError={() => {
              setReady(false)
              setStillGone(false)
              setMode('still')
            }}
          >
            <Suspense fallback={null}>
              <div className={cx('absolute inset-0 transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')}>
                <SolarPanelScene
                  label={solution.model.label}
                  describedBy={hintId}
                  lite={options.lite}
                  reducedMotion={options.reducedMotion}
                  onReady={() => {
                    setReady(true)
                    window.setTimeout(() => setStillGone(true), 600)
                  }}
                />
              </div>
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      <p id={hintId} className={cx('mt-2 text-center ld-meta text-fg-3', !interactive && 'invisible')}>
        {solution.model.hint}
        <span className="sr-only">. {solution.model.keyboard}</span>
      </p>
    </div>
  )
}
