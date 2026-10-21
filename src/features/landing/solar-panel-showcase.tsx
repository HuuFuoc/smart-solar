import { Component, lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useResolvedTheme } from '@/hooks/useTheme'
import { cx } from '@/utils/cx'
import { solution } from '@/data/landing'
import { liteDevice, prefersReducedMotion, saveData, supportsWebGL2 } from './device'

// three.js chỉ tải khi khung sắp hiện
const SolarPanelScene = lazy(() => import('./solar-panel-scene'))

// Ảnh chụp khung hình đầu của cảnh 3D, dùng làm ảnh chờ và ảnh thay thế khi không vẽ được 3D
const STILL = {
  light: '/images/landing/solar-panel-light.webp',
  dark: '/images/landing/solar-panel-dark.webp',
  width: 960,
  height: 720,
}

// Lỗi tạo renderer hoặc tải chunk thì chỉ bỏ lớp 3D, ảnh tĩnh vẫn còn
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

// Mô hình 3D tấm pin, chỉ tải khi cách màn hình 300px. Không có WebGL2 hoặc bật tiết kiệm dữ liệu thì dùng ảnh tĩnh
export function SolarPanelShowcase({ className }: { className?: string }) {
  const theme = useResolvedTheme()
  const box = useRef<HTMLDivElement>(null)
  const hintId = useId()
  const [mode, setMode] = useState<Mode>('waiting')
  const [ready, setReady] = useState(false)
  // Gỡ ảnh tĩnh khi canvas đã hiện để đổi giao diện không tải thêm ảnh
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
              <div
                className={cx('absolute inset-0 transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')}
              >
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
