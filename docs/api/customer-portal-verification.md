# Kiểm tra cổng khách hàng: hợp đồng, thanh toán, sau bán, địa điểm cũ

Phạm vi: 11 endpoint của cổng khách trong [api-coverage-report.md](api-coverage-report.md) mục 9.1–9.3. Code FE đối chiếu
backend `main` 7c79fa8 (cùng ngày build image) và swagger của image `c43e1cada345` đang chạy ngày 03/11/2026. Nhánh
`fix/business-logic-v2` (31/10) không đổi các endpoint này và cũng không có link tải PDF hợp đồng.

## Endpoint → service → giao diện

| Endpoint                                               | Nguồn backend                                                            | Service / hook                                                 | Giao diện                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------- |
| `GET /customers/me/contracts/{id}`                     | `ContractControllers.cs:99`, `ContractHandlers.GetForCustomerAsync`      | `getMyContract` / `useMyContractQuery`                         | `/customer/contracts/:id`               |
| `POST …/contracts/{id}/signed-document`                | `ContractControllers.cs:104`, `SubmitSignedDocumentAsync`                | `submitSignedDocument` / `useSubmitSignedDocumentMutation`     | "Gửi bản đã ký" (`SignContractDialog`)  |
| `POST …/contracts/{id}/payments`                       | `PaymentControllers.cs:21`, `CreateOrGetAttemptAsync`                    | `createContractPayment`                                        | "Tạo link thanh toán"                   |
| `GET …/contracts/{id}/payments`                        | `PaymentControllers.cs:27`, `GetForCustomerAsync`                        | `getContractPayments` / `useContractPaymentsQuery`             | khối Thanh toán, hỏi lại 5 giây         |
| `POST …/contracts/{id}/payments/cancel`                | `PaymentControllers.cs:32`, `CancelCurrentAsync`                         | `cancelContractPayment`                                        | "Huỷ link"                              |
| `POST …/after-sales/maintenance/{entitlementId}/book`  | `AfterSalesControllers.cs:160`, `BookMaintenanceAsync`                   | `bookMaintenance` / `useBookMaintenanceMutation`               | "Đặt lịch" ở `/customer/packages`       |
| `POST …/after-sales/requests/{id}/reschedule`          | `AfterSalesControllers.cs:94`, `RescheduleMaintenanceAsync`              | `rescheduleRequest`                                            | "Đổi giờ" ở `/customer/after-sales/:id` |
| `POST …/after-sales/requests/{id}/reconsideration`     | `AfterSalesControllers.cs:83`, `RequestReconsiderationAsync`             | `requestReconsideration`                                       | "Xin xét lại" (khối Hỗ trợ thiên tai)   |
| `POST …/after-sales/requests/{id}/report-fault`        | `AfterSalesControllers.cs:100`, `ReportFaultFromMaintenanceAsync`        | `reportFaultFromMaintenance`                                   | "Báo lỗi" (khối Phát hiện khi bảo trì)  |
| `GET …/after-sales/notifications`                      | `AfterSalesControllers.cs:167`, `NotificationsAsync`                     | `listNotifications` / `useNotificationsQuery`                  | `/customer/notifications`               |
| `PUT /customers/me/sites/{id}/administrative-location` | `OperationalZoneControllers.cs:122`, `ZoneHandlers.SetSiteLocationAsync` | `setSiteAdministrativeLocation` / `useSetSiteLocationMutation` | `SiteLocationDialog`, bước Địa điểm     |

Request DTO sinh từ `docs/api/swagger.json` (11 path chép từ swagger đang chạy, `$ref` đổi về tên ngắn). Response viết tay:
`ContractView` (`customerContractsRes.ts`), `ContractPaymentView` (`staffPaymentsRes.ts`, `history` null với khách),
`DisasterClaimView` + `NotificationView` (`customerAfterSalesRes.ts`), `SiteLocationView` (`customerSiteLocationRes.ts`).

## Đã chạy

| Kiểm tra                                                                      | Lệnh                                                                         | Kết quả 03/11/2026                                     |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| Luật (ký, thanh toán, lượt bảo trì, đổi giờ, xét lại, báo lỗi, quay về PayOS) | `npm test`                                                                   | 29 test mới, cả bộ 107/107 qua                         |
| E2E với API giả (`tests/e2e/mock-customer-api.mjs`)                           | `node --test tests/e2e/customer-portal.e2e.mjs`                              | 18/18 qua                                              |
| E2E cũ sau khi sửa component dùng chung                                       | `node --test tests/e2e/ops-contracts.e2e.mjs tests/e2e/admin-portal.e2e.mjs` | qua (cả 3 bộ 48/48)                                    |
| Backend thật: 11 route có và cần đăng nhập (401, đối chứng 404)               | `node --test tests/e2e/customer-portal.live.e2e.mjs`                         | 12/12 qua                                              |
| Backend thật, đọc dữ liệu qua giao diện                                       | cùng lệnh, `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD`                    | Bỏ qua: chưa có tài khoản khách                        |
| `npm run typecheck`, `npm run lint`, `npm run build`                          |                                                                              | qua (lint còn 3 cảnh báo có sẵn, không thuộc phần này) |

API giả bám handler backend nhưng không chứng minh backend thật hay PayOS chạy.

## Chạy tay với backend thật

Cần: tài khoản khách có hợp đồng `AWAITING_SIGNATURE` (kinh doanh đã gửi ký); tài khoản kinh doanh hoặc quản lý để duyệt;
PayOS có khoá (`Providers__PayOS__ClientId` đang trống trên máy dev nên tạo link trả `503 PAYMENT_PROVIDER_NOT_CONFIGURED`);
`Payments__ReturnUrl` / `CancelUrl` trỏ đúng cổng của FE (đang là `http://localhost:5173/payments/return|cancel`, còn
`npm run dev -- --port 3000` chạy ở 3000).

1. `/customer/contracts` → hợp đồng chờ ký → "Gửi bản đã ký": kiểm tệp PDF chính thức nhận từ kinh doanh (SHA-256 tính trên
   máy), chọn PDF bản ký, gửi. Xem request `POST …/signed-document` có `officialDocumentSha256` = `officialDocument.sha256`
   của hợp đồng lúc mở hộp thoại; hợp đồng thành `UNDER_REVIEW`.
2. Kinh doanh từ chối có lý do → khách thấy lý do, "Gửi lại bản ký". Kinh doanh lập phụ lục trong lúc khách đang mở hộp thoại →
   khách gửi bị từ chối (`CONTRACT_INVALID_STATE` / `CONTRACT_WRONG_DOCUMENT_VERSION`), không tự gửi lại; mở phiên bản mới ký lại.
3. Duyệt → `SIGNED` → "Tạo link thanh toán" (bấm lại ở tab khác phải ra đúng link cũ) → mở PayOS → trả tiền → PayOS chuyển về
   `/payments/return` → về đúng trang hợp đồng, chỉ hiện "Đã thanh toán đủ" sau khi `GET …/payments` trả `contractStatus: PAID`.
   Thử bấm huỷ ở PayOS (về `/payments/cancel`), "Huỷ link", để link quá 15 phút, tạo quá 5 link trong 10 phút (429).
4. Mua gói kèm hợp đồng `SIGNED` khi hợp đồng đang có link riêng → `PAYMENT_CHECKOUT_IN_PROGRESS`, hộp thoại dẫn sang hợp đồng.
5. Gói bảo trì `ACTIVE` → "Đặt lịch" một lượt; yêu cầu bảo trì → "Đổi giờ" (buổi hẹn còn dưới 24 giờ thì khoá); yêu cầu báo lỗi
   có hỗ trợ thiên tai bị từ chối → "Xin xét lại" (lần hai không còn nút); lần bảo trì có ghi phát hiện → "Báo lỗi".
6. Địa điểm cũ không có mã phường, xã → trang yêu cầu khảo sát hiện "Bổ sung phường, xã" → giờ trống tải lại theo khu vực.

## Còn chặn

| Hạng mục                                                                                           | Lý do                                                                                                                                                                                 | Cần backend                                                                                      |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tải / xem PDF chính thức của hợp đồng                                                              | Không có link tải cho `CONTRACT_DOCUMENT`; `GET /api/files/{id}` chỉ trả cho người tải lên (`FileService.GetAsync`)                                                                   | Endpoint link ký sẵn cho khách, vd. `GET /api/customers/me/contracts/{id}/official-document/url` |
| E2E ký → duyệt → PAID với backend thật                                                             | Chưa có tài khoản khách và hợp đồng chờ ký trên DB chung; PayOS chưa có khoá                                                                                                          | Dữ liệu test + khoá PayOS sandbox                                                                |
| Mã QR trên trang                                                                                   | `qrCode` là chuỗi VietQR, vẽ cần thêm thư viện; trang PayOS đã có QR                                                                                                                  | —                                                                                                |
| Đánh dấu thông báo đã đọc                                                                          | Không có endpoint, `readAt` không bao giờ được ghi                                                                                                                                    | `POST …/notifications/{id}/read`                                                                 |
| Kiểm lại cả hai tệp khi gửi bản ký                                                                 | Report ghi backend kiểm lại cả hai tệp, nhưng `SubmitSignedDocumentAsync` (7c79fa8) chỉ kiểm tệp `VERIFIED`; đọc lại kho chỉ ở bước duyệt. FE vẫn xử lý `FILE_CONTENT_CHANGED` nếu có | —                                                                                                |
| `GET /customers/me/sites`, `GET /customers/me/pre-surveys`, `POST …/survey-requests/{id}/withdraw` | Image 21/10 trả 405 / 404 / 404 (dò ngày 03/11). FE nay báo "chưa tải được" thay vì ẩn như không có dữ liệu; rút yêu cầu hiện lỗi                                                     | Image mới (31/10, còn chờ 7 migration)                                                           |
