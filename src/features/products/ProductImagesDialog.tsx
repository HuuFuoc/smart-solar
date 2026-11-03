import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, IconButton } from '@/components/common/ui/button'
import { DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Input } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { productStatusMeta } from '@/features/products/productDisplay'
import {
  PRODUCT_IMAGE_LIMITS,
  altTextError,
  imageUrlError,
  moveImage,
  sortImages,
} from '@/features/products/productImageRules'
import {
  useAddProductImageMutation,
  useAdminProductQuery,
  useRemoveProductImageMutation,
  useReorderProductImagesMutation,
  useSetPrimaryProductImageMutation,
} from '@/hooks/useProducts'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { ProductImageResponse, ProductResponse } from '@/types/res/adminProductsRes'

// Ảnh của một sản phẩm: thêm bằng link https (backend nhận link, không nhận tệp tải lên), sắp xếp, đặt ảnh chính, xoá.
// Đọc chi tiết quản trị nên mở được cả sản phẩm ngừng bán. Mỗi thao tác trả lại cả bộ ảnh mới, hiện đúng bộ đó

function serverField(error: unknown, field: string) {
  if (!isApiError(error)) return undefined
  const key = Object.keys(error.fieldErrors).find((k) => k.toLowerCase() === field.toLowerCase())
  return key ? error.fieldErrors[key] : undefined
}

function Thumb({ url, alt }: { url: string; alt: string }) {
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

function AddImageForm({ product, disabled }: { product: ProductResponse; disabled: boolean }) {
  const add = useAddProductImageMutation()
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [makePrimary, setMakePrimary] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const urlError = (checked ? imageUrlError(url) : undefined) ?? serverField(error, 'url')
  const altError = altTextError(alt) ?? serverField(error, 'altText')
  const previewable = !imageUrlError(url)
  const full = (product.images?.length ?? 0) >= PRODUCT_IMAGE_LIMITS.maxImages

  async function submit() {
    if (add.isPending || !product.id) return
    setChecked(true)
    setError(null)
    if (imageUrlError(url) || altTextError(alt)) return
    try {
      await add.mutateAsync({
        id: product.id,
        body: { url: url.trim(), altText: alt.trim() || null, makePrimary },
      })
      toast.success('Đã thêm ảnh.')
      setUrl('')
      setAlt('')
      setMakePrimary(false)
      setChecked(false)
    } catch (e) {
      setError(e)
    }
  }

  return (
    <form
      noValidate
      className="mt-6 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h3 className="text-body font-semibold text-fg">Thêm ảnh</h3>
      {full ? (
        <p className="mt-2 text-body text-fg-2">
          Sản phẩm đã có {PRODUCT_IMAGE_LIMITS.maxImages} ảnh, mức tối đa. Xoá bớt ảnh rồi thêm lại.
        </p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <Field
              label="Link ảnh"
              required
              htmlFor="product-image-url"
              error={urlError}
              hint="Link https tới ảnh đã đăng sẵn (trang của hãng, kho ảnh). Không tải tệp từ máy lên được."
            >
              <Input
                id="product-image-url"
                inputMode="url"
                value={url}
                maxLength={PRODUCT_IMAGE_LIMITS.urlMax}
                aria-required
                aria-invalid={urlError ? true : undefined}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null)
                }}
              />
            </Field>
            <Field
              label="Mô tả ảnh"
              htmlFor="product-image-alt"
              error={altError}
              hint="Cho người dùng trình đọc màn hình, ví dụ Mặt trước tấm pin."
            >
              <Input
                id="product-image-alt"
                value={alt}
                maxLength={PRODUCT_IMAGE_LIMITS.altMax}
                onChange={(e) => setAlt(e.target.value)}
              />
            </Field>
            <Checkbox
              label="Đặt làm ảnh chính"
              description="Ảnh chính hiện ở danh mục. Sản phẩm chưa có ảnh thì ảnh đầu tiên luôn là ảnh chính."
              checked={makePrimary}
              onChange={(e) => setMakePrimary(e.target.checked)}
            />
          </div>
          {previewable && (
            <div>
              <p className="mb-2 text-meta text-fg-2">Xem trước</p>
              <Thumb key={url.trim()} url={url.trim()} alt={alt || 'Ảnh xem trước'} />
            </div>
          )}
        </div>
      )}
      {error != null && !serverField(error, 'url') && !serverField(error, 'altText') && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{errorMessage(error)}</Notice>
        </div>
      )}
      {!full && (
        <div className="mt-4 flex justify-end">
          <Button icon="add_photo_alternate" type="submit" variant="primary" disabled={disabled || add.isPending}>
            {add.isPending ? 'Đang thêm…' : 'Thêm ảnh'}
          </Button>
        </div>
      )}
    </form>
  )
}

function ImageList({ product, onBusy }: { product: ProductResponse; onBusy: (busy: boolean) => void }) {
  const remove = useRemoveProductImageMutation()
  const reorder = useReorderProductImagesMutation()
  const primary = useSetPrimaryProductImageMutation()
  const [deleting, setDeleting] = useState<string | null>(null)
  const images = sortImages(product.images)
  const busy = remove.isPending || reorder.isPending || primary.isPending
  const id = product.id!

  async function run(action: () => Promise<unknown>, success: string) {
    onBusy(true)
    try {
      await action()
      toast.success(success)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      onBusy(false)
      setDeleting(null)
    }
  }

  const move = (index: number, delta: -1 | 1) =>
    void run(
      () =>
        reorder.mutateAsync({
          id,
          imageIds: moveImage(
            images.map((i) => i.id!),
            index,
            delta,
          ),
        }),
      'Đã đổi thứ tự ảnh.',
    )

  if (images.length === 0) return <p className="mt-4 text-body text-fg-2">Sản phẩm chưa có ảnh nào.</p>

  return (
    <ol className="mt-4 divide-y divide-line">
      {images.map((image: ProductImageResponse, index) => (
        <li key={image.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
          <Thumb url={image.url ?? ''} alt={image.altText ?? ''} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tnum text-meta text-fg-3">#{index + 1}</span>
              {image.isPrimary && <Badge tone="accent">Ảnh chính</Badge>}
            </div>
            <a
              href={image.url ?? undefined}
              target="_blank"
              rel="noreferrer noopener"
              className="ui-link block truncate text-meta"
            >
              {image.url}
            </a>
            <p className="text-meta text-fg-3">{image.altText || 'Chưa có mô tả ảnh'}</p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              size="sm"
              icon="arrow_upward"
              label={`Đưa ảnh ${index + 1} lên trước`}
              disabled={busy || index === 0}
              onClick={() => move(index, -1)}
            />
            <IconButton
              size="sm"
              icon="arrow_downward"
              label={`Đưa ảnh ${index + 1} xuống sau`}
              disabled={busy || index === images.length - 1}
              onClick={() => move(index, 1)}
            />
            {!image.isPrimary && (
              <Button
                size="sm"
                variant="soft"
                icon="star"
                disabled={busy}
                onClick={() => void run(() => primary.mutateAsync({ id, imageId: image.id! }), 'Đã đổi ảnh chính.')}
              >
                Đặt làm ảnh chính
              </Button>
            )}
            {deleting === image.id ? (
              <>
                <Button size="sm" variant="secondary" icon="close" disabled={busy} onClick={() => setDeleting(null)}>
                  Giữ lại
                </Button>
                <Button
                  size="sm"
                  variant="danger-solid"
                  icon="delete"
                  disabled={busy}
                  onClick={() => void run(() => remove.mutateAsync({ id, imageId: image.id! }), 'Đã xoá ảnh.')}
                >
                  {remove.isPending ? 'Đang xoá…' : 'Xoá ảnh'}
                </Button>
              </>
            ) : (
              <IconButton
                size="sm"
                variant="danger-quiet"
                icon="delete"
                label={`Xoá ảnh ${index + 1}`}
                disabled={busy}
                onClick={() => setDeleting(image.id!)}
              />
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function ProductImagesDialog({
  productId,
  productName,
  onOpenChange,
}: {
  /** null là đóng */
  productId: string | null
  productName: string
  onOpenChange: (open: boolean) => void
}) {
  const query = useAdminProductQuery(productId ?? undefined)
  const [busy, setBusy] = useState(false)
  const product = query.data
  const status = product ? productStatusMeta(product.status) : null

  return (
    <ModalDialog
      open={productId !== null}
      onOpenChange={onOpenChange}
      dismissible={!busy}
      aria-label={`Ảnh của ${productName}`}
      className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <DialogTitle>Ảnh của {product?.name ?? productName}</DialogTitle>
          {product && status && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-body text-fg-2">
              <span className="tnum">{product.sku}</span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </p>
          )}
        </div>
        <Button variant="secondary" icon="close" className="-mt-2" disabled={busy} onClick={() => onOpenChange(false)}>
          Đóng
        </Button>
      </div>
      {query.isPending ? (
        <div className="mt-4 space-y-3" aria-label="Đang tải">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : query.isError ? (
        <div className="mt-4">
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        </div>
      ) : (
        <>
          <ImageList product={query.data} onBusy={setBusy} />
          <AddImageForm product={query.data} disabled={busy} />
        </>
      )}
    </ModalDialog>
  )
}
