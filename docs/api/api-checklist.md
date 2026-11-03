# Checklist API chưa gọi từ FE

Đối chiếu ngày 03/11/2026 giữa swagger của API đang chạy (image `smartsolar-api` build 21/10/2026, `c43e1cada345`) và
các lời gọi `get/post/put/patch/del(ENDPOINTS…)` trong `src/services`. API có 262 endpoint, FE gọi 185, còn **77**
(76 việc của FE + 1 webhook). Image 31/10 chưa chạy được (DB thiếu migration) nên chưa đối chiếu; khi chạy được thì
làm lại, danh sách có thể dài thêm.

Đánh dấu `[x]` khi đã có hàm trong `src/services` và màn hình dùng nó.

## Quản trị `/admin` (32)

### Sản phẩm – chi tiết và ảnh (AdminProducts)

- [ ] `GET /api/admin/products/{id}` – chi tiết theo quyền admin (thấy cả sản phẩm ngừng bán?)
- [ ] `POST /api/admin/products/{id}/images` – thêm ảnh
- [ ] `DELETE /api/admin/products/{id}/images/{imageId}` – xoá ảnh
- [ ] `PUT /api/admin/products/{id}/images/order` – sắp xếp ảnh
- [ ] `PUT /api/admin/products/{id}/images/{imageId}/primary` – đặt ảnh chính

### Khu vực phục vụ (AdminOperationalZones) – trang lập / sửa khu vực chưa làm

- [ ] `POST /api/admin/operational-zones` – tạo khu
- [ ] `GET /api/admin/operational-zones/{zoneId}` – chi tiết khu
- [ ] `PUT /api/admin/operational-zones/{zoneId}` – sửa khu
- [ ] `PUT /api/admin/operational-zones/{zoneId}/communes` – gán phường, xã cho khu
- [ ] `GET /api/admin/operational-zones/{zoneId}/technicians` – kỹ thuật viên của khu
- [ ] `GET /api/admin/operational-zones/coverage` – phường, xã nào đã / chưa có khu

### Kho tri thức AI (AdminKnowledgeDocuments) – chưa gọi endpoint nào

- [ ] `GET /api/admin/knowledge-documents`
- [ ] `POST /api/admin/knowledge-documents`
- [ ] `GET /api/admin/knowledge-documents/{documentId}`
- [ ] `PUT /api/admin/knowledge-documents/{documentId}`
- [ ] `POST /api/admin/knowledge-documents/{documentId}/versions`
- [ ] `POST /api/admin/knowledge-documents/{documentId}/publish`
- [ ] `POST /api/admin/knowledge-documents/{documentId}/unpublish`
- [ ] `POST /api/admin/knowledge-documents/{documentId}/reindex`
- [ ] `POST /api/admin/knowledge-documents/{documentId}/jobs/{jobId}/retry`
- [ ] `POST /api/admin/knowledge-documents/{documentId}/archive`

### Cấu hình RAG (AdminRagConfiguration) – đã gọi 5, còn 4

- [ ] `POST /api/admin/rag-configuration/draft/validate` – đã khai trong `endpoints.ts`, chưa có hàm service
- [ ] `POST /api/admin/rag-configuration/rollback` – đã khai trong `endpoints.ts`, chưa có hàm service
- [ ] `DELETE /api/admin/rag-configuration/draft` – bỏ bản nháp
- [ ] `POST /api/admin/rag-configuration/reindex-stale`

### Sau bán hàng (AdminAfterSales) – đã gọi 3 (gói dịch vụ), còn 5

- [ ] `GET /api/admin/after-sales/warranty-options`
- [ ] `PUT /api/admin/after-sales/warranty-options`
- [ ] `POST /api/admin/after-sales/refunds/{refundId}/record` – ghi nhận đã hoàn tiền
- [ ] `GET /api/admin/after-sales/dashboard`
- [ ] `GET /api/admin/after-sales/dashboard/export`

### Khảo sát

- [ ] `POST /api/admin/survey-appointments/{appointmentId}/assign-technician` (AdminSurveyAppointments)
- [ ] `PUT /api/admin/survey-requests/{surveyRequestId}/sales-owner` – đổi nhân viên kinh doanh phụ trách (AdminSurveyRequests)

## Quản lý `/manage` (10)

### Sau bán hàng (ManagerAfterSales) – đã gọi 7, còn 10

- [ ] `POST /api/manager/after-sales/requests/{requestId}/claim-decision` – quyết định yêu cầu hỗ trợ của gói thiên tai
- [ ] `POST /api/manager/after-sales/requests/{requestId}/duplicate` – đánh dấu trùng
- [ ] `POST /api/manager/after-sales/requests/{requestId}/stop`
- [ ] `POST /api/manager/after-sales/requests/{requestId}/not-fulfilled`
- [ ] `PUT /api/manager/after-sales/assets/{assetId}` – sửa thiết bị
- [ ] `POST /api/manager/after-sales/subscriptions/{subscriptionId}/cancellation-decision` – duyệt huỷ gói đã trả tiền
- [ ] `GET /api/manager/after-sales/tasks`
- [ ] `POST /api/manager/after-sales/tasks/{taskId}/assign`
- [ ] `GET /api/manager/after-sales/refunds`
- [ ] `POST /api/manager/after-sales/refunds/{refundId}/decision`

## Kinh doanh `/ops` (13)

### Hợp đồng (SalesContracts) – `/ops/contracts/:id` + khối Hợp đồng của `/ops/surveys/:id` (03/11/2026)

Đánh dấu nghĩa là có màn gọi và đã chạy E2E với API giả (`tests/e2e/ops-contracts.e2e.mjs`); chưa chạy với backend thật.

- [x] `POST /api/quotations/{quotationId}/contracts` – lập hợp đồng từ báo giá đã đồng ý
- [x] `GET /api/survey-requests/{surveyRequestId}/contracts`
- [x] `GET /api/contracts/{contractId}`
- [x] `PUT /api/contracts/{contractId}`
- [x] `POST /api/contracts/{contractId}/review` – kinh doanh và quản lý (`/manage/contracts/:id`)
- [x] `POST /api/contracts/{contractId}/issue`
- [x] `PUT /api/contracts/{contractId}/official-document` – gắn bản chính thức (`fileId`, `canonicalHash`)
- [x] `POST /api/contracts/{contractId}/publish`
- [x] `POST /api/contracts/{contractId}/amendments`

### Khác

- [x] `GET /api/contracts/{contractId}/payments` – khối Thanh toán của trang hợp đồng, cả 3 cổng nhân viên (StaffPayments)
- [x] `PUT /api/quotations/{quotationId}/document` – tệp PDF báo giá tạo ngoài hệ thống (SalesQuotations)
- [x] `POST /api/sales/after-sales/tasks/{taskId}/start` – hàng việc `/ops/after-sales` (SalesAfterSales)
- [x] `POST /api/sales/after-sales/tasks/{taskId}/follow-up` – hàng việc `/ops/after-sales` (SalesAfterSales)

## Kỹ thuật viên `/tech` (5)

- [ ] `GET /api/technicians/me/open-appointments/{appointmentId}` – chi tiết lịch chờ nhận (TechnicianAppointments)
- [ ] `POST /api/technicians/me/appointments/{appointmentId}/onsite-survey/amendments` – bổ sung biên bản đã hoàn
      thành (TechnicianOnSiteSurvey)
- [ ] `POST /api/technicians/me/after-sales/visits/{visitId}/continue-repair` (TechnicianAfterSales)
- [ ] `POST /api/technicians/me/after-sales/visits/{visitId}/finish` (TechnicianAfterSales)
- [ ] `POST /api/technicians/me/after-sales/visits/{visitId}/supplementary-items` (TechnicianAfterSales)

## Khách hàng `/customer` (11)

### Hợp đồng và thanh toán – ký và thanh toán riêng hợp đồng chưa có giao diện

- [ ] `GET /api/customers/me/contracts/{contractId}` (CustomerContracts)
- [ ] `POST /api/customers/me/contracts/{contractId}/signed-document` – gửi bản khách đã ký (CustomerContracts)
- [ ] `POST /api/customers/me/contracts/{contractId}/payments` (CustomerPayments)
- [ ] `GET /api/customers/me/contracts/{contractId}/payments` (CustomerPayments)
- [ ] `POST /api/customers/me/contracts/{contractId}/payments/cancel` (CustomerPayments)

### Sau bán hàng (CustomerAfterSales) – đã gọi 17, còn 5

- [ ] `POST /api/customers/me/after-sales/maintenance/{entitlementId}/book` – đặt lịch lượt bảo trì của gói
- [ ] `POST /api/customers/me/after-sales/requests/{requestId}/reschedule` – đổi giờ
- [ ] `POST /api/customers/me/after-sales/requests/{requestId}/reconsideration` – xin xem xét lại
- [ ] `POST /api/customers/me/after-sales/requests/{requestId}/report-fault`
- [ ] `GET /api/customers/me/after-sales/notifications`

### Địa điểm

- [ ] `PUT /api/customers/me/sites/{siteId}/administrative-location` – bổ sung phường, xã cho địa điểm cũ (CustomerSiteLocation)

## Chung (5)

- [ ] `POST /api/chat/messages` (Chat – chatbot)
- [ ] `GET /api/chat/sessions` (Chat)
- [ ] `GET /api/chat/sessions/{sessionId}` (Chat)
- [ ] `GET /api/administrative-units/provinces` – hiện cố định TP.HCM nên chưa cần
- [ ] `GET /api/administrative-units/legacy-lookup` – tra phường, xã mới từ địa chỉ cũ

## Không phải việc của FE

- `POST /api/payments/payos/webhook` – PayOS gọi thẳng backend.

## FE đang gọi nhưng image 21/10 chưa có

Các lời gọi này có trong code FE nhưng image 21/10 không có endpoint (chắc ở bản 31/10). Trong lúc chạy image 21/10 thì
màn dùng chúng sẽ lỗi 404 / 405:

- `GET /api/customers/me/sites` (`preSurveyService.ts`) – địa điểm đã lưu
- `GET /api/customers/me/pre-surveys` (`preSurveyService.ts`) – bản nháp đã lưu
- `POST /api/customers/me/survey-requests/{id}/withdraw` (`bookingService.ts`)
- `POST /api/survey-requests/{id}/close` (`surveyRequestService.ts`)
- `POST /api/manager/after-sales/assets/{id}/warranty-activation` (`managerAfterSalesService.ts`)
