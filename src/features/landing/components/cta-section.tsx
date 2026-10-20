import { Link } from 'react-router'
import { useAuth } from '@/context/AuthProvider'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'
import { cta } from '@/data/landing'
import { LANDING_CONTAINER, PAGE_GRID } from './classes'
import { Reveal } from './reveal'
import { surveyPath } from './survey-link'

/*
  Bắt đầu thế nào: dải màu thương hiệu tràn màn, một câu hỏi, một nút. Nút đảo màu (nền chữ,
  chữ xanh) vì dải đã là màu accent. Đã đăng nhập thì không mời đăng nhập nữa.
*/
export function CtaSection() {
  const { user } = useAuth()
  return (
    <section id={cta.id} aria-labelledby="cta-title" className="mt-24 bg-accent py-16 text-on-accent lg:mt-40 lg:py-24">
      <div className={cx(LANDING_CONTAINER, PAGE_GRID, 'gap-y-8')}>
        <Reveal className="col-span-4 lg:col-span-7">
          <h2 id="cta-title" className="ld-h1">
            {cta.title}
          </h2>
          <p className="mt-4 max-w-xl ld-lede opacity-90">{cta.lede}</p>
        </Reveal>
        <Reveal delay={150} className="col-span-4 flex flex-col gap-3 sm:items-start lg:col-span-4 lg:col-start-9 lg:self-end">
          <Link
            to={surveyPath(user)}
            className="press inline-flex h-12 items-center justify-center rounded-control bg-on-accent px-6 ld-action whitespace-nowrap text-accent hover:bg-on-accent/90"
          >
            {cta.button}
          </Link>
          {!user && (
            <p className="ld-meta">
              {cta.hasAccount}{' '}
              <Link to={ROUTES.login} className="underline decoration-1 underline-offset-4 hover:decoration-2">
                {cta.login}
              </Link>
            </p>
          )}
        </Reveal>
      </div>
    </section>
  )
}
