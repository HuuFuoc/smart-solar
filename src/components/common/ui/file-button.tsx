import { useRef, type ComponentProps } from 'react'
import { Button } from '@/components/common/ui/button'

// Nút mở hộp chọn tệp của trình duyệt (ô input gốc khó tạo kiểu nên ẩn đi).
// Giá trị của ô được xoá sau mỗi lần chọn để chọn lại đúng tệp đó vẫn nhận
export function FileButton({
  accept,
  multiple,
  onFiles,
  disabled,
  ...button
}: Omit<ComponentProps<typeof Button>, 'onClick' | 'type'> & {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
      <Button {...button} disabled={disabled} onClick={() => input.current?.click()} />
    </>
  )
}
