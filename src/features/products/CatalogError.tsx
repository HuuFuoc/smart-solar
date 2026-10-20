import { errorMessage, isApiError } from '@/services/api/errors'

/*
 * Lỗi khi tải danh mục trên trang công khai. GET /api/products đã mở cho khách chưa đăng nhập
 * (dò 08/10/2026), nên không còn nhánh mời đăng nhập khi gặp 401.
 */
export function CatalogError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  // 404 (sản phẩm đã xoá, đường dẫn sai) thử lại vẫn vậy nên không có nút "Thử lại".
  const retryable = !(isApiError(error) && error.status === 404)
  return (
    <div role="alert" className="rounded-container border border-line px-6 py-10 text-center">
      <p className="ld-body font-semibold text-fg">Không tải được sản phẩm</p>
      <p className="mx-auto mt-2 max-w-[46ch] ld-body text-fg-2">{errorMessage(error)}</p>
      {retryable && (
        <button type="button" onClick={onRetry} className="tap mt-4 ld-body text-accent-fg underline underline-offset-4">
          Thử lại
        </button>
      )}
    </div>
  )
}
