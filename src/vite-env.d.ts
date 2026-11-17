/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** "true" khi backend có API link xem / tải PDF hợp đồng (common/contract.ts) */
  readonly VITE_CONTRACT_DOCUMENT_LINKS?: string
  /** "true" (chỉ khi dev) bỏ khoá giờ của nút "Bắt đầu khảo sát" để thử luồng trước giờ hẹn */
  readonly VITE_SKIP_SURVEY_START_WINDOW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
