import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProvider'
import { isSessionId, mergeExchange } from '@/features/chat/chatRules'
import * as chatService from '@/services/chatService'
import type { ApiError } from '@/services/api/errors'
import type { AskChatRequest } from '@/types/req/chatReq'
import type { ChatAnswerView, ChatSessionDetailView, ChatSessionView } from '@/types/res/chatRes'

// Chatbot. Khoá cache kèm mã người đăng nhập để tài khoản khác không bao giờ đọc nhầm phiên; đăng xuất / đăng nhập lại thì
// AuthProvider xoá cả cache. Câu trả lời chỉ vào lịch sử khi backend đã trả về, không thêm tin tạm

export const chatKeys = {
  all: (userId: string) => ['chat', userId] as const,
  sessions: (userId: string) => [...chatKeys.all(userId), 'sessions'] as const,
  session: (userId: string, sessionId: string) => [...chatKeys.all(userId), 'session', sessionId] as const,
  /** `notice` backend trả kèm từng câu trả lời (GET phiên không có), theo mã tin nhắn */
  notices: (userId: string) => [...chatKeys.all(userId), 'notices'] as const,
}

// Như mặc định (4xx không thử lại), thêm 503: chức năng đang tắt hoặc dịch vụ trả lời đang lỗi thì gọi lại vẫn vậy
const noRetryOnUnavailable = (count: number, error: ApiError) =>
  !(error.status >= 400 && error.status < 500) && error.status !== 503 && count < 2

function useUserKey() {
  const { user } = useAuth()
  return user ? (user.userId ?? user.email) : null
}

export function useChatSessionsQuery() {
  const userKey = useUserKey()
  return useQuery<ChatSessionView[], ApiError>({
    queryKey: chatKeys.sessions(userKey ?? ''),
    queryFn: () => chatService.getChatSessions(),
    enabled: userKey !== null,
    retry: noRetryOnUnavailable,
  })
}

export function useChatSessionQuery(sessionId: string | null) {
  const userKey = useUserKey()
  return useQuery<ChatSessionDetailView, ApiError>({
    queryKey: chatKeys.session(userKey ?? '', sessionId ?? ''),
    queryFn: () => chatService.getChatSession(sessionId!),
    enabled: userKey !== null && isSessionId(sessionId),
    retry: noRetryOnUnavailable,
  })
}

/** `notice` đã nhận trong lần dùng trang này, theo mã câu trả lời */
export function useChatNotices() {
  const queryClient = useQueryClient()
  const userKey = useUserKey()
  const queryKey = chatKeys.notices(userKey ?? '')
  return useQuery<Record<string, string>>({
    queryKey,
    // Chỉ là nơi giữ dữ liệu trong bộ nhớ: lỡ bị tải lại thì giữ nguyên, không bao giờ gọi API
    queryFn: () => queryClient.getQueryData<Record<string, string>>(queryKey) ?? {},
    initialData: {},
    staleTime: Infinity,
    gcTime: Infinity,
  }).data
}

/** Không tự gửi lại khi lỗi: người dùng bấm Gửi lại (cùng clientMessageId nếu cùng câu, cùng phiên) */
export function useAskChatMutation() {
  const queryClient = useQueryClient()
  const userKey = useUserKey()
  return useMutation<ChatAnswerView, ApiError, AskChatRequest>({
    mutationFn: (body) => chatService.askChat(body),
    onSuccess: (answer) => {
      if (!userKey) return
      queryClient.setQueryData<ChatSessionDetailView>(chatKeys.session(userKey, answer.sessionId), (detail) =>
        detail ? mergeExchange(detail, answer) : detail,
      )
      queryClient.setQueryData<Record<string, string>>(chatKeys.notices(userKey), (map) => ({
        ...map,
        [answer.answer.messageId]: answer.notice,
      }))
      void queryClient.invalidateQueries({ queryKey: chatKeys.session(userKey, answer.sessionId) })
    },
    // Lỗi mạng / hết giờ chờ: backend có thể đã lưu câu hỏi và mở phiên mới, nên tải lại danh sách để thấy
    onSettled: () => {
      if (userKey) void queryClient.invalidateQueries({ queryKey: chatKeys.sessions(userKey) })
    },
  })
}
