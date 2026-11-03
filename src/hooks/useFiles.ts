import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { FilePurpose } from '@/common/file'
import { useLatest } from '@/hooks/useLatest'
import { useRetryCountdown } from '@/hooks/useRetryCountdown'
import { errorMessage, isApiError, type ApiError } from '@/services/api/errors'
import * as fileService from '@/services/fileService'
import type { FileView } from '@/types/res/filesRes'

export const fileKeys = {
  detail: (id: string) => ['files', id] as const,
}

/** Thông tin một tệp đã đăng ký (tên, loại, cỡ), không có link xem */
export function useFileQuery(id: string | null | undefined) {
  return useQuery<FileView, ApiError>({
    queryKey: fileKeys.detail(id ?? ''),
    queryFn: () => fileService.getFile(id!),
    enabled: Boolean(id),
    staleTime: Infinity,
  })
}

/** Tải một tệp lên kho, trả tệp đã xác minh. `progress`: phần đã gửi lên kho (0 đến 1), null khi không tải */
export function useFileUpload(purpose: FilePurpose) {
  const [progress, setProgress] = useState<number | null>(null)
  const mutation = useMutation<FileView, ApiError, File>({
    mutationFn: (file) => fileService.uploadFile(file, purpose, { onProgress: setProgress }),
    onMutate: () => setProgress(0),
    onSettled: () => setProgress(null),
  })
  return { upload: mutation.mutateAsync, uploading: mutation.isPending, progress }
}

export type UploadStatus = 'invalid' | 'queued' | 'uploading' | 'attaching' | 'done' | 'failed'

export type UploadItem = {
  key: number
  file: File
  caption: string
  status: UploadStatus
  /** Phần đã gửi lên kho, 0 đến 1 */
  progress: number
  /** Lỗi thấy trên máy (invalid) hoặc lỗi của lần thử gần nhất (failed) */
  error: string | null
  /** Có từ khi tệp đã xác minh: gắn lỗi thì lần thử lại chỉ gắn, không tải lại */
  fileId: string | null
}

let lastKey = 0

/**
 * Hàng đợi nhiều tệp: tải lần lượt từng tệp rồi gắn vào nghiệp vụ qua `attach`. Gặp giới hạn số lần (429) thì dừng cả
 * hàng, đếm ngược theo Retry-After rồi tự chạy tiếp. Rời trang thì dừng tải.
 */
export function useUploadQueue({
  purpose,
  check,
  attach,
  onComplete,
}: {
  purpose: FilePurpose
  /** Lỗi thấy ngay trên máy; tệp có lỗi nằm lại trong danh sách, không tải */
  check: (file: File) => string | null
  /** Gắn tệp đã xác minh vào nghiệp vụ */
  attach: (fileId: string, caption: string) => Promise<unknown>
  /** Chạy hết hàng (không tính lúc tạm dừng): tệp đã gắn rời danh sách, tệp lỗi ở lại */
  onComplete?: (result: { added: number; failed: number }) => void
}) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [running, setRunning] = useState(false)
  const latest = useLatest({ items, attach, onComplete })
  const controller = useRef<AbortController | null>(null)
  const tally = useRef({ added: 0, failed: 0 })
  const pause = useRetryCountdown(() => void run(keysOf(items, 'queued')))

  useEffect(() => () => controller.current?.abort(), [])

  const patch = (key: number, change: Partial<UploadItem>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)))

  async function process(item: UploadItem, signal: AbortSignal): Promise<'next' | 'pause'> {
    let fileId = item.fileId
    try {
      if (!fileId) {
        patch(item.key, { status: 'uploading', progress: 0, error: null })
        const view = await fileService.uploadFile(item.file, purpose, {
          signal,
          onProgress: (progress) => patch(item.key, { progress }),
        })
        fileId = view.fileId
      }
      patch(item.key, { status: 'attaching', fileId, error: null })
      // Chú thích đọc lúc gắn vì người dùng có thể gõ trong lúc tệp đang tải
      const caption = latest.current.items.find((i) => i.key === item.key)?.caption.trim() ?? ''
      await latest.current.attach(fileId, caption)
      patch(item.key, { status: 'done' })
      tally.current.added++
      return 'next'
    } catch (error) {
      if (signal.aborted) return 'pause'
      if (isApiError(error) && error.status === 429) {
        patch(item.key, { status: 'queued', fileId, error: null })
        pause.start(error.retryAfter ?? 60)
        return 'pause'
      }
      patch(item.key, { status: 'failed', fileId, error: errorMessage(error) })
      tally.current.failed++
      return 'next'
    }
  }

  async function run(keys: number[]) {
    if (controller.current || keys.length === 0) return
    const current = new AbortController()
    controller.current = current
    setRunning(true)
    let paused = false
    for (const key of keys) {
      const item = latest.current.items.find((i) => i.key === key)
      if (!item) continue
      if ((await process(item, current.signal)) === 'pause') {
        paused = true
        break
      }
    }
    controller.current = null
    if (current.signal.aborted) return
    setRunning(false)
    if (paused) return
    setItems((list) => list.filter((i) => i.status !== 'done'))
    latest.current.onComplete?.({ ...tally.current })
  }

  const busy = running || pause.secondsLeft > 0

  return {
    items,
    busy,
    /** Còn chờ tải sau 429, 0 là không chờ */
    waitSeconds: pause.secondsLeft,
    add(files: File[]) {
      const added = files.map((file): UploadItem => {
        const problem = check(file)
        return {
          key: ++lastKey,
          file,
          caption: '',
          status: problem ? 'invalid' : 'queued',
          progress: 0,
          error: problem,
          fileId: null,
        }
      })
      setItems((list) => [...list, ...added])
    },
    remove: (key: number) => setItems((list) => list.filter((i) => i.key !== key)),
    clear: () => setItems([]),
    setCaption: (key: number, caption: string) => patch(key, { caption }),
    /** Tải các tệp đang chờ và thử lại các tệp lỗi */
    start() {
      if (busy) return
      tally.current = { added: 0, failed: 0 }
      void run(keysOf(items, 'queued', 'failed'))
    },
  }
}

const keysOf = (items: UploadItem[], ...statuses: UploadStatus[]) =>
  items.filter((i) => statuses.includes(i.status)).map((i) => i.key)
