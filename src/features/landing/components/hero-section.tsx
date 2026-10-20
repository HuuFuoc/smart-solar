import { Link } from 'react-router'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'
import { hero, projects } from '@/data/landing'
import { LANDING_CONTAINER, ctaClass } from './classes'
import { LandingPhoto } from './photo'

/*
  Bạn là ai, bạn làm gì. Ảnh công trình phủ kín khung; chữ trắng đặt thẳng lên ảnh, trên lớp phủ tối ở
  góc dưới trái. Khi tải trang ảnh thu nhẹ về cỡ thật, chữ và nút trượt lên lần lượt (ld-settle, ld-rise).
*/
export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-surface-3">
      <div className="ld-hero-frame relative">
        <div className="absolute inset-0 ld-settle">
          <LandingPhoto shot={hero.photo} sizes="100vw" priority />
        </div>
        <div aria-hidden className="absolute inset-0 ld-hero-scrim" />

        <div className={cx(LANDING_CONTAINER, 'relative flex h-full flex-col justify-end pb-10 lg:pb-20')}>
          <h1 id="hero-title" className="max-w-4xl ld-display text-white ld-rise">
            {hero.title}
          </h1>
          <p className="mt-4 max-w-2xl ld-lede text-white/90 ld-rise ld-delay-1 lg:mt-5">{hero.lede}</p>
          <div className="mt-8 flex flex-col gap-4 ld-rise ld-delay-2 sm:flex-row sm:items-center sm:gap-8">
            <Link to={ROUTES.register} className={ctaClass()}>
              {hero.cta}
            </Link>
            <a
              href={`#${projects.id}`}
              className="ld-action text-white underline decoration-1 underline-offset-4 hover:decoration-2"
            >
              {hero.secondary}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
