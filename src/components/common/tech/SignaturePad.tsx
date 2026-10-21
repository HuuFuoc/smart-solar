import { useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from 'react'
import { Icon } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'

// Ô ký tay bằng chuột hoặc bút cảm ứng
export type SignaturePadHandle = { clear: () => void }

export type SignaturePadProps = {
  /** Nhãn a11y cho canvas */
  label: string
  /** Chữ mờ giữa ô khi chưa ký */
  hint: string
  /** Chữ mờ góc phải dưới ("Elena Rostova, Sign & Verify") */
  caption?: string
  /** Báo cho form biết đã có nét ký hay chưa */
  onSignedChange?: (signed: boolean) => void
  /** Chiều cao ô ký */
  height?: 'sm' | 'md'
  ref?: Ref<SignaturePadHandle>
  className?: string
}

export function SignaturePad({
  label,
  hint,
  caption,
  onSignedChange,
  height = 'md',
  ref,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [signed, setSigned] = useState(false)

  const clear = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setSigned(false)
    onSignedChange?.(false)
  }

  useImperativeHandle(ref, () => ({ clear }))

  const positionOf = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current?.getContext('2d')
    const point = positionOf(event)
    if (!context || !point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    context.lineWidth = 2.5
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#0d1c2e'
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const extendStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const context = canvasRef.current?.getContext('2d')
    const point = positionOf(event)
    if (!context || !point) return
    context.lineTo(point.x, point.y)
    context.stroke()
    if (!signed) {
      setSigned(true)
      onSignedChange?.(true)
    }
  }

  const endStroke = () => {
    drawing.current = false
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl',
        height === 'md' ? 'h-36 border border-outline-variant bg-surface' : 'h-28 bg-surface-container-low',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        width={640}
        height={220}
        aria-label={label}
        onPointerDown={startStroke}
        onPointerMove={extendStroke}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        className="h-full w-full cursor-crosshair touch-none"
      />
      {!signed && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-body-sm text-on-surface-variant/40">
          <Icon name="gesture" className="text-[28px]" />
          <span>{hint}</span>
        </div>
      )}
      {caption && (
        <span className="pointer-events-none absolute bottom-2 right-3 text-label-sm text-on-surface-variant opacity-75">
          {caption}
        </span>
      )}
    </div>
  )
}
