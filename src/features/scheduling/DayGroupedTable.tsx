import { Fragment, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ButtonLink, IconButtonLink } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { TruncatedText } from '@/components/common/ui/tooltip'
import { formatDay, formatTime, relativeDay, todayVn, vnDate } from '@/features/scheduling/schedulingDisplay'
import { groupByDay } from '@/features/scheduling/scheduleOrder'
import { cx } from '@/utils/cx'

// Bảng việc / lịch nhóm theo ngày của kỹ thuật viên, dùng chung cho Việc của tôi, Lắp đặt, Bảo hành.
// Thứ tự do groupByDay quyết định. Chia cột từ xl vì ở 1024px tên công trình bị bóp còn vài chữ một dòng.
// Dưới xl mỗi dòng xếp khối: giờ và tên đứng đầu không nhãn (tự hiểu), các ô còn lại có nhãn bên trái

export type DayColumn = {
  label: string
  /** Cột chính nhận phần rộng còn lại để các cột phụ đứng sát nhau */
  primary?: boolean
  /** Bề rộng cố định khi chia cột (vd. `xl:w-36`), để cột phụ không co giãn theo từng dòng */
  className?: string
}

/** "Hôm nay, Chủ nhật, 15/11/2026"; ngày khác "Thứ Năm, 12/11/2026" */
export function DayName({ day, today }: { day: string; today: string }) {
  const relative = relativeDay(day, today)
  const named = relative !== formatDay(day)
  return (
    <span className="text-body font-semibold text-fg">
      {named && (
        <>
          <span className={cx(day === today && 'text-accent-fg')}>{relative}</span>,{' '}
        </>
      )}
      {formatDay(day, { year: true })}
    </span>
  )
}

export function DayGroupedTable<T extends { startsAt: string }>({
  label,
  columns,
  rows,
  rowKey,
  row,
  unit,
}: {
  label: string
  columns: DayColumn[]
  rows: readonly T[]
  rowKey: (row: T) => string
  row: (row: T) => ReactNode
  /** Đơn vị của số đếm trên dải ngày: "lịch", "công trình"... */
  unit: string
}) {
  const today = todayVn()
  return (
    <Table stack="xl" aria-label={label}>
      <thead>
        <tr>
          {columns.map((c) => (
            <Th key={c.label} className={cx('xl:pb-2', c.primary && 'xl:w-full', c.className)}>
              {c.label}
            </Th>
          ))}
          <Th>
            <span className="sr-only">Thao tác</span>
          </Th>
        </tr>
      </thead>
      {groupByDay(rows).map(([day, items]) => (
        <tbody key={day}>
          <tr className="max-xl:border-b-0! max-xl:py-0!">
            <th
              colSpan={columns.length + 1}
              scope="rowgroup"
              className="border-y border-line bg-surface-2 px-3 py-1.5 text-left font-normal max-xl:block max-xl:border-t-0"
            >
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <DayName day={day} today={today} />
                <span className="tnum text-meta text-fg-2">
                  {items.length} {unit}
                </span>
              </span>
            </th>
          </tr>
          {items.map((item) => (
            <Fragment key={rowKey(item)}>{row(item)}</Fragment>
          ))}
        </tbody>
      ))}
    </Table>
  )
}

/** Khung chờ cùng hình với bảng: một dải ngày và vài dòng, để dữ liệu về không nhảy bố cục */
export function DayGroupedTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="-mx-4 md:mx-0 xl:-mx-3">
      <Skeleton className="h-9 rounded-none" />
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-6 px-3 py-2.5">
            <Skeleton className="h-5 w-24" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/2 max-w-80" />
              <Skeleton className="h-3.5 w-1/3 max-w-56" />
            </div>
            <Skeleton className="hidden h-4 w-28 xl:block" />
            <Skeleton className="hidden h-4 w-24 xl:block" />
            <Skeleton className="size-8 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Một dòng mở được bằng cách bấm bất kỳ đâu (link tên trong DayTitleCell phủ cả dòng).
 * Khi xếp khối, dòng thụt 12px như dải ngày để chữ hai bên thẳng mép */
export function DayRow({ children }: { children: ReactNode }) {
  return (
    <Tr className="group relative cursor-pointer transition-colors max-xl:px-3 max-xl:py-3! [&>td]:py-2.5 [&>td]:align-middle">
      {children}
    </Tr>
  )
}

/** Giờ bắt đầu đậm để dò theo cột, giờ kết thúc nhạt; kết thúc sang ngày khác thì ghi kèm ngày */
export function DayTimeCell({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const endDay = vnDate(endsAt)
  const sameDay = endDay === vnDate(startsAt)
  return (
    <Td className="tnum whitespace-nowrap">
      {/* Một khối cho cả khoảng giờ: khi xếp khối, mỗi phần tử con của ô là một dòng */}
      <span>
        <span className="font-semibold text-fg">{formatTime(startsAt)}</span>
        {sameDay && <span className="text-fg-2">–{formatTime(endsAt)}</span>}
      </span>
      {!sameDay && (
        <span className="block text-meta text-fg-2">
          đến {formatTime(endsAt)} {formatDay(endDay)}
        </span>
      )}
    </Td>
  )
}

/** Tên (link phủ cả dòng) và một dòng phụ, dòng phụ dài thì cắt và rê chuột xem đủ */
export function DayTitleCell({ to, title, detail }: { to: string; title: ReactNode; detail?: string | null }) {
  const navigate = useNavigate()
  return (
    <Td className="xl:max-w-0">
      <Link
        to={to}
        className="font-semibold text-fg underline-offset-4 after:absolute after:inset-0 group-hover:text-accent-fg group-hover:underline"
      >
        {title}
      </Link>
      {detail && (
        <div>
          <TruncatedText text={detail} className="text-meta text-fg-2" onClick={() => navigate(to)} />
        </div>
      )}
    </Td>
  )
}

/** Ô thao tác nằm trên link phủ dòng để nút vẫn bấm được */
export function DayActionsCell({ children }: { children: ReactNode }) {
  return (
    <Td className="whitespace-nowrap">
      <div className="relative flex w-full items-center justify-end gap-2">{children}</div>
    </Td>
  )
}

/** Nút xem lặp trên từng dòng: khi chia cột là icon có tooltip để cột thao tác gọn, khi xếp khối là nút chữ.
 * Hai phần tử nhưng mỗi cỡ màn chỉ một cái hiện (cái kia `hidden`, không vào cây trợ năng) */
export function DayViewLink({ to, name, label = 'Xem chi tiết' }: { to: string; name: string; label?: string }) {
  return (
    <>
      <ButtonLink to={to} size="sm" variant="info" icon="visibility" className="xl:hidden">
        {label}
        <span className="sr-only"> {name}</span>
      </ButtonLink>
      <IconButtonLink
        to={to}
        icon="visibility"
        size="sm"
        variant="info"
        label={`${label} ${name}`}
        tooltip={label}
        className="max-xl:hidden"
      />
    </>
  )
}
