// Mở khung Trợ lý từ một nút trong trang (vd. thẻ "Bạn cần hỗ trợ thêm?" của trang hợp đồng). ChatWidget của khung nghe sự kiện
// này; tách file riêng để trang không phải import cả ChatWidget

export const OPEN_ASSISTANT_EVENT = 'smart-solar:open-assistant'

export function openAssistant() {
  window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT))
}
