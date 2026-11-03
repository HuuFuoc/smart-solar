# Kiểm tra hợp đồng lắp đặt phía kinh doanh với backend thật

Phạm vi: 13 endpoint của cổng kinh doanh trong [api-coverage-report.md](api-coverage-report.md) mục 7.1–7.2. Code FE đối
chiếu backend `main` 7c79fa8 (`ContractControllers.cs`, `ContractHandlers.cs`, `PaymentControllers.cs`, `PaymentService.cs`,
`SalesTaskHandlers.cs`, `QuotationHandlers.AttachDocumentAsync`) và swagger của image `c43e1cada345` đang chạy ngày
03/11/2026. Nhánh `fix/business-logic-v2` (31/10) chỉ thêm: trạng thái `DISCARDED`, lệnh huỷ bản nháp, các mã
`CONTRACT_SURVEY_CHANGED`, `CONTRACT_REQUEST_CLOSED`, `CONTRACT_DRAFT_DISCARDED`, `CONTRACT_TERMS_REQUIRED` (FE đã dịch mã,
chưa làm lệnh huỷ bản nháp).

## Đã chạy

| Kiểm tra                                       | Lệnh                                               | Kết quả 03/11/2026                          |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Luật (máy trạng thái, kiểm tra ô, phụ lục)     | `npm test`                                         | 49/49 qua                                   |
| E2E với API giả (`tests/e2e/mock-ops-api.mjs`) | `node --test tests/e2e/ops-contracts.e2e.mjs`      | 17/17 qua                                   |
| E2E với backend thật, chỉ đọc                  | `node --test tests/e2e/ops-contracts.live.e2e.mjs` | Bỏ qua: chưa có tài khoản kinh doanh để thử |

API giả bám handler backend nhưng không chứng minh backend thật chạy.

## Chạy tay với backend thật

Cần: tài khoản kinh doanh phụ trách một yêu cầu khảo sát có báo giá khách đã đồng ý; tài khoản khách của yêu cầu đó; tài
khoản quản lý; quản trị đã bật ít nhất một thời hạn bảo hành lắp đặt (`/admin/warranty-options`); PayOS có khoá.

1. `/ops/surveys/:id` → khối Hợp đồng → "Lập hợp đồng": chọn thời hạn, xem POST `/quotations/{id}/contracts` trả 201.
2. Trang hợp đồng → "Phát hành": nhận `canonicalHash`. Thiếu thời hạn bảo hành thì nút bị khoá, ép gửi thì backend trả
   `400 CONTRACT_WARRANTY_REQUIRED`.
3. Tạo PDF ngoài hệ thống có ghi mã nội dung → "Gắn PDF chính thức" → PUT `.../official-document` gửi đúng hash đang hiện.
   Thử: lập phụ lục / phát hành lại ở tab khác rồi gắn ở tab cũ → `409 CONTRACT_STALE_REVISION` hoặc
   `CONTRACT_CANONICAL_HASH_MISMATCH`, FE báo lỗi và không tự gửi lại.
4. "Gửi khách ký" → `AWAITING_SIGNATURE`. Khách gửi bản ký (màn của khách thuộc phần việc cổng khách hàng) → `UNDER_REVIEW`.
5. Kinh doanh hoặc quản lý (`/manage/contracts/:id`): từ chối thiếu lý do bị chặn ở ô nhập; duyệt → `SIGNED`. Kinh doanh
   không phụ trách mở trang → 404.
6. Khách thanh toán PayOS (cổng khách hàng) → khối Thanh toán thấy `PAID` sau "Tải lại" (hoặc tự hỏi lại 30 giây / lần).
   Quản lý mở "Hợp đồng chờ tạo dự án" ở mục Thi công để tạo dự án.
7. Phụ lục từ bản đã ký: phát hành phụ lục thì bản cũ thành `SUPERSEDED`; bản `PAID` không có nút phụ lục.
8. `/ops/after-sales`: việc nhắc khách → Nhận việc → Bắt đầu → Ghi liên hệ (bỏ trống kết quả bị chặn; "Không liên lạc được"
   đóng việc).

## Còn chặn

| Hạng mục                               | Lý do                                                                                                                              | Cần backend                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Xem / tải PDF chính thức và bản ký     | `GET /api/files/{id}` chỉ trả tên, cỡ, SHA-256; không có link tải cho `CONTRACT_DOCUMENT`, `SIGNED_CONTRACT`, `QUOTATION_DOCUMENT` | Endpoint link ký sẵn, ví dụ `GET /api/contracts/{id}/documents/{fileId}/url` cho Sales, Manager |
| Gọi khách trong việc nhắc              | `SalesTaskView` chỉ có `customerUserId`; `ServiceRequestView` của kinh doanh không có tên, số điện thoại khách                     | Thêm `customerName`, `customerPhone` vào `SalesTaskView`                                        |
| Quản lý tìm hợp đồng chờ duyệt bản ký  | Không có danh sách hợp đồng `UNDER_REVIEW`; quản lý chỉ vào được qua link                                                          | `GET /api/contracts?status=UNDER_REVIEW` cho Manager                                            |
| Danh sách mọi hợp đồng của kinh doanh  | Chỉ có danh sách theo yêu cầu khảo sát, nên không có mục menu "Hợp đồng" riêng                                                     | `GET /api/contracts/mine`                                                                       |
| Chạy với image 31/10                   | DB còn thiếu 7 migration, mọi request trả `SCHEMA_NOT_READY`                                                                       | Chạy migration trên DB chung                                                                    |
| `POST /api/survey-requests/{id}/close` | Có ở nhánh 31/10 (`SalesOutcomeControllers.cs`), không có ở image 21/10. FE giữ nguyên, chỉ ẩn nút khi đã có hợp đồng còn hiệu lực | Image mới                                                                                       |
