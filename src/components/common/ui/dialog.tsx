import { useLayoutEffect, useRef, type DialogHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cx } from '@/utils/cx'

// Dialog native, mở bằng ref.current.showModal()
export function Dialog({
  ref,
  className,
  children,
  ...rest
}: DialogHTMLAttributes<HTMLDialogElement> & { ref: Ref<HTMLDialogElement> }) {
  return (
    <dialog
      ref={ref}
      className={cx(
        'm-auto w-[calc(100%-2rem)] rounded-container border border-line bg-canvas p-6 text-fg shadow-pop backdrop:bg-scrim',
        // cx không gộp class: chỉ đặt bề rộng mặc định khi nơi gọi không tự đặt max-w-*.
        !/(^|\s)max-w-/.test(className ?? '') && 'max-w-md',
        className,
      )}
      {...rest}
    >
      {children}
    </dialog>
  )
}

// Dialog điều khiển bằng state. Children chỉ mount khi mở nên form bên trong luôn mới
export function ModalDialog({
  open,
  onOpenChange,
  dismissible = true,
  onAfterClose,
  className,
  children,
  ...rest
}: Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open'> & {
  open: boolean
  onOpenChange: (open: boolean) => void
  dismissible?: boolean
  /** Chạy sau khi dialog đóng, dùng để chuyển focus khi nút mở dialog không còn nữa */
  onAfterClose?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // Luôn gọi bản onAfterClose mới nhất mà không phải đưa nó vào deps (hàm mới mỗi lần render).
  const afterCloseRef = useRef(onAfterClose)
  useLayoutEffect(() => {
    afterCloseRef.current = onAfterClose
  })
  // Dùng layout effect để không loé khung dialog rỗng
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) {
      dialog.close()
      afterCloseRef.current?.()
    }
  }, [open])
  return (
    <Dialog
      ref={ref}
      className={className}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault()
      }}
      onClose={() => {
        // Chrome vẫn đóng dialog ở lần Esc thứ hai, nên đang bận thì mở lại
        if (!dismissible && open) {
          ref.current?.showModal()
          return
        }
        onOpenChange(false)
      }}
      {...rest}
    >
      {open && children}
    </Dialog>
  )
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-title font-semibold">{children}</h2>
}

/* Right-aligned actions; the primary action goes last. */
export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('mt-6 flex flex-wrap justify-end gap-3', className)}>{children}</div>
}
