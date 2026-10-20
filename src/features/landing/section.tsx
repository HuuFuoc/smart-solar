import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'
import { LANDING_CONTAINER } from './classes'

/*
  Khoảng cách trước một section đi theo quan hệ nội dung, không một giá trị chung:
    near    – cùng hồ sơ với section trước (96px)
    far     – đổi chủ đề (128px)
    farther – nhảy thời gian hoặc đổi người chịu trách nhiệm (160px)
*/
const spaces = {
  near: 'pt-16 lg:pt-24',
  far: 'pt-20 lg:pt-32',
  farther: 'pt-24 lg:pt-40',
} as const

export function Section({
  id,
  space,
  titleId,
  className,
  children,
}: {
  id: string
  space: keyof typeof spaces
  titleId: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={titleId} className={cx(spaces[space], className)}>
      <div className={LANDING_CONTAINER}>{children}</div>
    </section>
  )
}

export function SectionTitle({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <h2 id={id} className={cx('ld-h2 max-w-3xl text-fg', className)}>
      {children}
    </h2>
  )
}
