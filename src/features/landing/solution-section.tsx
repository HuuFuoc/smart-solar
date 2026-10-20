import { Link } from 'react-router'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'
import { solution } from '@/data/landing'
import { PAGE_GRID, TEXT_LINK } from './classes'
import { Reveal } from './reveal'
import { Section, SectionTitle } from './section'
import { SolarPanelShowcase } from './solar-panel-showcase'

/*
  Giới thiệu giải pháp: tiêu đề + một câu bên trái, ba việc nền tảng làm bên phải, ngăn bằng đường kẻ. Link duy nhất dẫn
  tới danh mục sản phẩm thật (/products); bảo hành, bảo trì chỉ mô tả, không có nút vì chưa có màn cho khách.
  Mô hình 3D một tấm pin: từ lg ở cột trái, dưới phần chữ (danh sách bên phải trải qua cả hai hàng); dưới lg đứng sau
  danh sách để không chen vào giữa các đoạn chữ.
*/
export function SolutionSection() {
  return (
    <Section id={solution.id} space="far" titleId="solution-title">
      <div className={cx(PAGE_GRID, 'gap-y-10 lg:grid-rows-[auto_1fr]')}>
        <Reveal className="col-span-4 lg:col-span-5">
          <SectionTitle id="solution-title">{solution.title}</SectionTitle>
          <p className="mt-4 max-w-copy ld-body text-pretty text-fg-2">{solution.lede}</p>
          <Link to={ROUTES.products} className={cx(TEXT_LINK, 'mt-6 inline-block ld-body')}>
            {solution.products}
          </Link>
        </Reveal>
        <ul className="col-span-4 lg:col-span-6 lg:col-start-7 lg:row-span-2">
          {solution.items.map((item, i) => (
            <li key={item.title} className="border-t border-line-2 py-6 last:pb-0">
              <Reveal delay={110 * i}>
                <h3 className="ld-sub text-fg">{item.title}</h3>
                <p className="mt-2 max-w-copy ld-body text-pretty text-fg-2">{item.text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
        <SolarPanelShowcase className="col-span-4 lg:col-span-5 lg:row-start-2" />
      </div>
    </Section>
  )
}
