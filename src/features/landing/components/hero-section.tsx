import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/context/AuthProvider'
import { useResolvedTheme, type ResolvedTheme } from '@/hooks/useTheme'
import { cx } from '@/utils/cx'
import { hero, heroImages, solution } from '@/data/landing'
import { LANDING_CONTAINER, ctaClass, secondaryCtaClass } from './classes'
import { saveData } from './device'
import { surveyPath } from './survey-link'

/*
  Hero tràn màn với ảnh ngày (giao diện sáng) / đêm (giao diện tối). Hai ảnh cùng bố cục: nhà hai bên, dãy pin nửa dưới,
  khoảng trời trống ở giữa phía trên.
  - Từ lg: ảnh phủ cả khung (cao bằng khung nhìn trừ header), chữ căn giữa nằm trên vùng trời, lớp phủ màu nền trang
    (ld-hero-veil) làm dịu trời sau chữ để đủ tương phản mà nhà và dãy pin vẫn rõ.
  - Dưới lg: vùng trời không đủ chỗ cho chữ, nên chữ đứng trên nền trang và ảnh nằm ngay dưới, mép trên của ảnh tan vào
    nền. Điện thoại dùng bản cắt vuông (nhà lớn + dãy pin), từ 768px dùng cả khung.
  Chữ dùng token chữ của trang (fg, fg-2) nên tự đổi theo giao diện cùng lớp phủ.
*/
export function HeroSection() {
  const { user } = useAuth()
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-3.5rem)] flex-col overflow-hidden lg:block lg:h-[clamp(36rem,calc(100svh-4rem),90rem)] lg:min-h-0"
    >
      <div className={cx(LANDING_CONTAINER, 'relative z-10 pt-10 text-center md:pt-14 lg:pt-[clamp(2.5rem,7svh,5.5rem)]')}>
        <h1 id="hero-title" className="mx-auto max-w-4xl ld-display text-fg ld-rise">
          {hero.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl ld-lede text-balance text-fg-2 ld-rise ld-delay-1 lg:mt-5">{hero.lede}</p>
        <div className="mt-8 flex flex-col gap-3 ld-rise ld-delay-2 sm:flex-row sm:justify-center">
          <Link to={surveyPath(user)} className={ctaClass()}>
            {hero.cta}
          </Link>
          <a href={`#${solution.id}`} className={secondaryCtaClass()}>
            {hero.secondary}
          </a>
        </div>
      </div>

      {/* Dưới lg ảnh lấn lên 64px sau cụm nút; phần đó là lớp phủ đặc màu nền nên không đè chữ. */}
      <div className="relative isolate -mt-16 min-h-80 flex-1 lg:absolute lg:inset-0 lg:mt-0">
        <HeroScene />
        <div aria-hidden className="absolute inset-0 z-[2] ld-hero-veil" />
      </div>
    </section>
  )
}

const WIDE_MEDIA = '(min-width: 768px)'

function srcSet(scene: string, kind: 'wide' | 'crop', ext: 'avif' | 'webp') {
  return heroImages[kind].widths.map((w) => `/images/hero/${scene}-${kind}-${w}.${ext} ${w}w`).join(', ')
}

/*
  Ảnh nền theo giao diện đang hiện (useResolvedTheme đọc data-theme, đã áp trong index.html trước khi vẽ, nên lần vẽ
  đầu đã đúng ảnh).
  - Ảnh của giao diện đang dùng tải ngay, ưu tiên cao (index.html đã tải trước đúng ảnh này).
  - Ảnh còn lại chỉ tải khi ảnh đầu đã xong và trình duyệt rảnh, ưu tiên thấp, để lần đổi giao diện đầu tiên không chờ.
  - Đổi giao diện khi ảnh mới chưa tải xong: giữ ảnh cũ, xong mới chuyển, không bao giờ lộ nền trống.
  - Chuyển ảnh: ảnh mới nằm trên và hiện dần 600ms, ảnh cũ giữ nguyên bên dưới tới khi ảnh mới hiện hẳn (ld-hero-img).
    Chỉ đổi opacity nên bố cục không xê dịch; giảm chuyển động thì đổi ngay.
*/
function HeroScene() {
  const theme = useResolvedTheme()
  const other: ResolvedTheme = theme === 'dark' ? 'light' : 'dark'
  const [loaded, setLoaded] = useState<Record<ResolvedTheme, boolean>>({ light: false, dark: false })
  const [prefetch, setPrefetch] = useState(false)
  const shown: ResolvedTheme = !loaded[theme] && loaded[other] ? other : theme

  useEffect(() => {
    if (prefetch || !loaded[theme] || saveData()) return
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setPrefetch(true), { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(() => setPrefetch(true), 1500)
    return () => window.clearTimeout(id)
  }, [prefetch, loaded, theme])

  return (['light', 'dark'] as const).map((mode) =>
    mode === theme || loaded[mode] || prefetch ? (
      <ScenePicture
        key={mode}
        scene={heroImages.scene[mode]}
        shown={mode === shown}
        priority={mode === theme}
        onLoad={() => setLoaded((prev) => (prev[mode] ? prev : { ...prev, [mode]: true }))}
      />
    ) : null,
  )
}

/*
  Ảnh trang trí (alt rỗng): tiêu đề đã nói nội dung. object-position theo breakpoint để luôn thấy nhà và dãy pin:
  điện thoại lệch trái chút để giữ trọn nhà lớn, tablet (ảnh cao bằng khung, cắt hai bên) giữ nhà bên trái, từ lg giữ
  phần trời phía trên cho chữ và cắt bớt cỏ phía dưới khi khung thấp.
*/
function ScenePicture({ scene, shown, priority, onLoad }: { scene: string; shown: boolean; priority: boolean; onLoad: () => void }) {
  const { wide, crop } = heroImages
  return (
    <picture>
      <source media={WIDE_MEDIA} type="image/avif" srcSet={srcSet(scene, 'wide', 'avif')} sizes={wide.sizes} width={wide.width} height={wide.height} />
      <source media={WIDE_MEDIA} type="image/webp" srcSet={srcSet(scene, 'wide', 'webp')} sizes={wide.sizes} width={wide.width} height={wide.height} />
      <source type="image/avif" srcSet={srcSet(scene, 'crop', 'avif')} sizes={crop.sizes} width={crop.width} height={crop.height} />
      <img
        src={`/images/hero/${scene}-crop-960.webp`}
        srcSet={srcSet(scene, 'crop', 'webp')}
        sizes={crop.sizes}
        width={crop.width}
        height={crop.height}
        alt=""
        loading="eager"
        fetchPriority={priority ? 'high' : 'low'}
        decoding="async"
        onLoad={onLoad}
        data-shown={shown || undefined}
        className="ld-hero-img object-cover object-[30%_100%] md:object-[12%_50%] lg:object-[50%_15%]"
      />
    </picture>
  )
}
