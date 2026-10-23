type Props = {
  text?: string
  subtitle?: string
}

export function LoadingWaveDots({
  text = 'Đang tải cấu hình AI',
  subtitle = 'Đang đồng bộ dữ liệu từ hệ thống...',
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex items-center gap-1.5 text-body font-medium text-fg-2">
        <span>{text}</span>
        <span className="inline-flex items-center gap-1.5 pl-1" aria-hidden="true">
          <span
            className="inline-block h-2 w-2 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '0.9s' }}
          />
          <span
            className="inline-block h-2 w-2 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: '180ms', animationDuration: '0.9s' }}
          />
          <span
            className="inline-block h-2 w-2 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: '360ms', animationDuration: '0.9s' }}
          />
        </span>
      </div>
      {subtitle && <p className="mt-2 text-meta text-fg-3">{subtitle}</p>}
    </div>
  )
}
