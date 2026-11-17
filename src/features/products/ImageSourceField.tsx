import { useState } from 'react'
import type { FilePurpose } from '@/common/file'
import { Button } from '@/components/common/ui/button'
import { Field, Input } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { acceptFor, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { EMPTY_IMAGE_SOURCE, type ImageSource } from '@/features/products/imageSource'
import { PRODUCT_IMAGE_LIMITS, imageUrlError } from '@/features/products/productImageRules'

// Ô chọn ảnh danh mục: dán link https tới ảnh đã đăng sẵn, hoặc chọn tệp ảnh từ máy (chọn tệp là bỏ link). Tệp chỉ tải lên
// lúc người dùng lưu

export function Thumb({ url, alt }: { url: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2">
      {broken ? (
        <span className="px-1 text-center text-meta text-fg-3">Không tải được</span>
      ) : (
        <img src={url} alt={alt} loading="lazy" className="size-full object-cover" onError={() => setBroken(true)} />
      )}
    </div>
  )
}

export function ImageSourceField({
  id,
  label,
  purpose,
  value,
  error,
  required,
  disabled,
  onChange,
}: {
  id: string
  label: string
  purpose: FilePurpose
  value: ImageSource
  error?: string
  required?: boolean
  disabled?: boolean
  onChange: (next: ImageSource) => void
}) {
  const link = value.url.trim()
  return (
    <Field
      label={label}
      htmlFor={id}
      required={required}
      error={error}
      hint={`Link https tới ảnh đã đăng sẵn, hoặc tệp ${fileTypesText(purpose)} từ máy, tối đa ${maxSizeText(purpose)}.`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-64 space-y-2">
          {value.file ? (
            <p className="text-body text-fg">
              Tải lên khi lưu: <span className="font-medium">{value.file.name}</span>
              <span className="tnum">, {formatFileSize(value.file.size)}</span>
            </p>
          ) : (
            <Input
              id={id}
              inputMode="url"
              placeholder="https://"
              value={value.url}
              maxLength={PRODUCT_IMAGE_LIMITS.urlMax}
              aria-required={required || undefined}
              aria-invalid={error ? true : undefined}
              disabled={disabled}
              onChange={(e) => onChange({ url: e.target.value, file: null })}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <FileButton
              id={value.file ? id : undefined}
              size="sm"
              variant="soft"
              icon="upload"
              accept={acceptFor(purpose)}
              disabled={disabled}
              onFiles={(files) => onChange({ url: '', file: files[0]! })}
            >
              {value.file ? 'Chọn ảnh khác' : 'Chọn ảnh từ máy'}
            </FileButton>
            {value.file && (
              <Button
                size="sm"
                variant="secondary"
                icon="close"
                disabled={disabled}
                onClick={() => onChange(EMPTY_IMAGE_SOURCE)}
              >
                Bỏ ảnh đã chọn
              </Button>
            )}
          </div>
        </div>
        {!value.file && link && !imageUrlError(link) && <Thumb key={link} url={link} alt="Ảnh xem trước" />}
      </div>
    </Field>
  )
}
