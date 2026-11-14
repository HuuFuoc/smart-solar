/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** "true" khi backend có API link xem / tải PDF hợp đồng (common/contract.ts) */
  readonly VITE_CONTRACT_DOCUMENT_LINKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
