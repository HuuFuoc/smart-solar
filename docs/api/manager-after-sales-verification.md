# Cổng quản lý: 10 endpoint ManagerAfterSales

Phạm vi: mục 6 của [api-coverage-report.md](api-coverage-report.md). Đối chiếu ngày 03/11/2026 với:

- swagger của API đang chạy (`http://localhost:8080/swagger/v1/swagger.json`, image `c43e1cada345`, build 21/10/2026): cả 10
  route có, gọi không token trả 401 (route khớp, cần đăng nhập);
- source backend `main` 7c79fa8: `src/SmartSolar.Api/Controllers/AfterSalesControllers.cs` (controller), `Contracts/AfterSales/
AfterSalesRequests.cs` (DTO), `Modules/AfterSales/ServiceManagerHandlers.cs`, `SalesTaskHandlers.cs`,
  `ServicePackageHandlers.cs`, `AfterSalesViews.cs`;
- DLL `SmartSolar.Modules.dll` lấy từ container đang chạy, dịch ngược bằng ilspycmd: câu lỗi và điều kiện của 5 handler trên
  trùng với `main`;
- nhánh `fix/business-logic-v2` (31/10): 10 endpoint này không đổi luật, chỉ thêm `assets/{id}/warranty-activation`.

Quyền: cả controller `[Authorize(Roles = "MANAGER,ADMIN")]` (`AfterSalesControllers.cs:321`), không lệnh nào khác quyền riêng;
Admin gọi được mọi lệnh như Manager. Mã lỗi → HTTP theo `OperationResultControllerBase.StatusFor`: `*_NOT_FOUND` 404,
`*_VALIDATION*` và `AFTER_SALES_REASON_REQUIRED` 400, `FEATURE_PENDING_MIGRATION` 503, còn lại (trạng thái, trùng serial,
revision) 409. Không lệnh nào trong 10 lệnh nhận `revision` / `expectedRevision`; tranh chấp dựa vào kiểm trạng thái của
handler (người sau nhận 409 `AFTER_SALES_INVALID_STATE`), FE tải lại và không tự gửi lại.

## Ma trận

Response là "200 OK" không schema trong swagger; kiểu viết tay theo `AfterSalesViews.cs` (ghi ở cột Response).

| Endpoint (controller)                                    | Request (DTO)                                                                                                   | Response                                    | Luật chính (handler)                                                                                                                                                         | Service (FE)                                   | Màn / thao tác                                                                                | Kiểm tra       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------- |
| `POST requests/{id}/claim-decision` (`:361`)             | `DecisionRequest(approve, reason?)` (`AfterSalesRequests.cs:37`)                                                | `ServiceRequestView`                        | `DecideClaimAsync` `:250`: từ chối bắt buộc lý do ≤ 1000; claim phải `SUBMITTED` / `RECONSIDERATION_REQUESTED`                                                               | `decideClaim` `managerAfterSalesService.ts:69` | `/manage/after-sales/:id`, `/admin/after-sales/:id` → khối "Hỗ trợ của gói thiên tai"         | unit + E2E giả |
| `POST requests/{id}/duplicate` (`:366`)                  | `DuplicateRequest(originalRequestId, reason?)` (`:38`)                                                          | `ServiceRequestView` (`CLOSED_DUPLICATE`)   | `MarkDuplicateAsync` `:279`: gốc tồn tại, khác chính nó, cùng công trình; yêu cầu chưa đóng, không có báo giá `PAID`                                                         | `markDuplicate` `:74`                          | "Kết thúc yêu cầu" → Đóng vì trùng (chọn gốc từ `GET requests`, xem lại `GET requests/{gốc}`) | unit + E2E giả |
| `POST requests/{id}/stop` (`:383`)                       | `StopWorkRequest(reason?, refundAmount)` (`:41`)                                                                | `ServiceRequestView` (`CANCELLED`)          | `StopWorkAsync` `:355`: lý do bắt buộc; tiền nguyên ≥ 0, ≤ tổng báo giá `PAID`; > 0 thì tạo khoản hoàn `APPROVED`                                                            | `stopWork` `:79`                               | "Kết thúc yêu cầu" → Dừng việc (chỉ khi đã bắt đầu)                                           | unit + E2E giả |
| `POST requests/{id}/not-fulfilled` (`:388`)              | `ReasonRequest(reason?)` (`:6`, FE đặt tên `AfterSalesReasonRequest`)                                           | `ServiceRequestView` (`CANCELLED`)          | `ConfirmCannotFulfillAsync` `:380`: lý do bắt buộc; chỉ `ONE_TIME_MAINTENANCE` chưa đóng, chưa có buổi `IN_PROGRESS` / `REPORTED`; duyệt hoàn 100 % tiền đã trả (`APPROVED`) | `markNotFulfilled` `:84`                       | "Kết thúc yêu cầu" → Không thực hiện được                                                     | unit + E2E giả |
| `PUT assets/{assetId}` (`:393`)                          | `AssetCorrectionRequest(manufacturer?, model?, serialNumber?, positionCode?, specifications?, reason?)` (`:42`) | `AssetView` (`AfterSalesViews.cs:40`)       | `CorrectAssetAsync` `:403`: lý do bắt buộc ≤ 500 dù DTO cho null; ô null giữ nguyên; trùng hãng + serial → 409 `AFTER_SALES_DUPLICATE_SERIAL`; ghi cũ / mới vào lịch sử      | `correctAsset` `:89`                           | Khối "Thiết bị của công trình" → Sửa                                                          | unit + E2E giả |
| `POST subscriptions/{id}/cancellation-decision` (`:401`) | `PackageCancellationDecisionRequest(approve, refundAmount?, note?)` (`:43`)                                     | `SubscriptionView`                          | `ServicePackageHandlers.DecideCancellationAsync` `:365`: gói phải `CANCELLATION_REQUESTED`; đồng ý: tiền nguyên ≤ giá (mặc định cả giá), hoàn `APPROVED`; từ chối: về `PAID` | `decidePackageCancellation` `:97`              | **Chưa có màn** (xem "Còn chặn")                                                              | unit (luật)    |
| `GET tasks?status=` (`:407`)                             | –                                                                                                               | `SalesTaskView[]` (`AfterSalesViews.cs:73`) | `SalesTaskHandlers.ListAllAsync` `:22`                                                                                                                                       | `listTasks` `:102`                             | `/manage/sales-tasks`, `/admin/sales-tasks`                                                   | unit + E2E giả |
| `POST tasks/{id}/assign` (`:412`)                        | `AssignTaskRequest(salesUserId, reason?)` (`:44`)                                                               | `SalesTaskView`                             | `AssignAsync` `:50`: người nhận là SALES đang hoạt động; việc còn mở; giao lại bắt buộc lý do; `OPEN` → `CLAIMED`                                                            | `assignTask` `:107`                            | `/admin/sales-tasks` → Giao việc / Giao lại                                                   | unit + E2E giả |
| `GET refunds?status=` (`:417`)                           | –                                                                                                               | `RefundView[]` (`AfterSalesViews.cs:76`)    | `RefundHandlers.ListAsync` `:147`                                                                                                                                            | `listRefunds` `:115` (đã có từ phần quản trị)  | `/manage/refunds`, `/admin/refunds`                                                           | E2E giả        |
| `POST refunds/{id}/decision` (`:422`)                    | `RefundDecisionRequest(approve, approvedAmount?, note?)` (`:45`)                                                | `RefundView`                                | `DecideAsync` `:150`: khoản phải `PENDING_APPROVAL`; duyệt: tiền nguyên 0 … số gốc (mặc định số gốc); không trả tiền                                                         | `decideRefund` `:120`                          | Nút "Xét hoàn tiền" ở hai trang hoàn tiền                                                     | unit + E2E giả |

Đường dẫn đầy đủ có tiền tố `/api/manager/after-sales/`. Hook ở `src/hooks/useManagerAfterSales.ts`; sau mỗi lệnh (kể cả lỗi)
tải lại chi tiết + danh sách yêu cầu, thêm danh sách hoàn tiền với dừng việc / không thực hiện được / xét huỷ, chi tiết công
trình với sửa thiết bị, mọi bộ lọc hàng việc với giao việc.

## Điểm tái sử dụng xuyên cổng (không tính vào 10)

| Việc                                                   | Hiện trạng                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Duyệt bản ký hợp đồng (`POST /contracts/{id}/review`)  | Có ở `/manage/contracts/:id` (`SignaturePanel`, viewer `manager`). Quản lý chỉ vào được qua link (xem "Còn chặn")                       |
| Trạng thái thanh toán nhân viên (`GET .../payments`)   | Có ở trang hợp đồng của cả 3 cổng; tạo dự án vẫn chỉ từ hợp đồng `PAID`                                                                 |
| Phân công thẳng kỹ thuật viên khảo sát                 | `SurveyStaffPanel` ở `/manage/dispatch/:id`, quản lý dùng được                                                                          |
| Đổi kinh doanh phụ trách (`sales-owner`)               | Chỉ quản trị: chọn người cần `GET /admin/users` (ADMIN)                                                                                 |
| `POST assets/{id}/warranty-activation` (mục 11 report) | Giữ nguyên, không đổi sang PUT assets. Image đang chạy trả **404** cho route này (thăm dò không token 03/11/2026); chỉ có ở nhánh 31/10 |

## Đã chạy (03/11/2026)

| Kiểm tra                                           | Lệnh                                                   | Kết quả                                                        |
| -------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Luật                                               | `npm test` (gồm `tests/manager-portal-rules.test.mjs`) | 107/107 qua (29 test mới)                                      |
| E2E với API giả (`tests/e2e/mock-manager-api.mjs`) | `node --test tests/e2e/manager-portal.e2e.mjs`         | 16/16 qua                                                      |
| Mọi E2E của repo (hồi quy quản trị, kinh doanh)    | `npm run test:e2e`                                     | 76/76 qua, 4 bộ chạy với backend thật bỏ qua (thiếu tài khoản) |
| E2E với backend thật, chỉ đọc                      | `node --test tests/e2e/manager-portal.live.e2e.mjs`    | Bỏ qua: chưa có tài khoản quản lý (`E2E_MANAGER_EMAIL`)        |
| Typecheck, lint, build                             | `npm run typecheck`, `npm run lint`, `npm run build`   | Qua; lint chỉ còn 3 cảnh báo có từ trước                       |

API giả bám handler backend nhưng không chứng minh backend thật chạy. Chưa gửi lệnh ghi nào lên backend thật.

Luồng E2E giả đã chạy: quyết định claim (từ chối thiếu lý do bị chặn → từ chối → khách xin xét lại → duyệt → mở "gói thiên tai"
cho hạng mục; người khác vừa quyết định → 409); đóng vì trùng (chỉ gốc cùng công trình, xem lại gốc, link gốc sau khi đóng; báo
giá đã trả thì khoá); dừng việc (việc chưa làm không có nút; hoàn vượt số đã trả bị chặn; khoản hoàn `APPROVED` chờ quản trị;
yêu cầu vừa đóng → 409); không thực hiện được (chỉ bảo trì lẻ; hoàn 100 %); sửa thiết bị (thiếu lý do, serial trùng 409, chỉ
gửi ô đổi); giao việc ở quản trị → kinh doanh bắt đầu, ghi liên hệ → "Xong"; giao lại thiếu lý do; quản lý không có nút giao;
503 hiện "chưa sẵn sàng" kèm migration; quản lý duyệt hoàn một phần → quản trị ghi nhận → quản lý thấy "Đã hoàn"; từ chối hoàn;
quản lý mở trang quản trị → 403.

## Chạy tay với backend thật

Cần tài khoản quản lý + quản trị + kinh doanh; một công trình đã bàn giao có yêu cầu báo lỗi kèm loại thiên tai (khách có gói
thiên tai còn hiệu lực), một bảo trì lẻ đã thanh toán, một việc nhắc khách mở.

1. `/manage/after-sales/:id` của yêu cầu có claim: Từ chối thiếu lý do bị chặn; từ chối → khách xin xét lại ở cổng khách →
   duyệt; xét bảo hành chọn "Gói bảo vệ thiên tai"; xem số hỗ trợ trên báo giá kinh doanh lập.
2. Đóng vì trùng giữa hai yêu cầu của cùng công trình; thử chọn yêu cầu công trình khác bằng cách sửa request → 409.
3. Dừng việc đang làm với số hoàn > 0 → `/admin/refunds` thấy "Đã duyệt, chờ ghi nhận" → ghi nhận.
4. Không thực hiện được trên bảo trì lẻ đã trả tiền → khoản hoàn 100 %.
5. Sửa serial thiết bị; thử serial của thiết bị khác cùng hãng → 409.
6. `/admin/sales-tasks` giao việc → kinh doanh thấy ở "Của tôi" → Bắt đầu → Ghi liên hệ.

## Còn chặn

| Hạng mục                                | Lý do                                                                                                                                                                                                                                                                         | Cần backend                                                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Xét huỷ gói đã trả tiền (màn)           | Không API nào cho Manager / Admin đọc gói `CANCELLATION_REQUESTED`: `GET .../subscriptions` chỉ có ở cổng khách; thông báo `PACKAGE_CANCELLATION_REQUESTED` gửi cho quản lý nhưng không có API đọc thông báo nhân viên. `SubscriptionView` cũng không có `cancellationReason` | `GET /api/manager/after-sales/subscriptions?status=CANCELLATION_REQUESTED` trả `SubscriptionView` + `customerUserId`, `cancellationReason` |
| Quản lý giao / giao lại việc kinh doanh | Chọn `salesUserId` cần danh sách kinh doanh; `GET /api/admin/users` chỉ cho ADMIN (cả nhánh 31/10)                                                                                                                                                                            | Cho Manager đọc `GET /api/admin/users?role=SALES&status=ACTIVE`, hoặc `GET /api/manager/sales-users`                                       |
| Tên người giữ việc ở cổng quản lý       | `SalesTaskView` chỉ có `assignedSalesUserId`                                                                                                                                                                                                                                  | Thêm `assignedSalesUserName` vào `SalesTaskView`                                                                                           |
| Thông số đang lưu của thiết bị          | `InstallationStaffView.assets` không có `specifications`, `status` (thiết bị đã thay)                                                                                                                                                                                         | Thêm hai trường vào `AssetView` của Installations, hoặc `GET /api/manager/after-sales/projects/{id}/assets`                                |
| Lịch sử sửa thiết bị                    | Backend ghi sự kiện `ASSET_CORRECTED` (cũ / mới) nhưng không có API đọc sự kiện của thiết bị                                                                                                                                                                                  | API đọc lịch sử thiết bị                                                                                                                   |
| Quản lý tìm hợp đồng chờ duyệt bản ký   | Không có danh sách hợp đồng `UNDER_REVIEW`                                                                                                                                                                                                                                    | `GET /api/contracts?status=UNDER_REVIEW` cho Manager                                                                                       |
| E2E với backend thật                    | Chưa có tài khoản quản lý / quản trị / kinh doanh để chạy                                                                                                                                                                                                                     | –                                                                                                                                          |
| Image 31/10                             | DB còn thiếu 7 migration, mọi request trả `SCHEMA_NOT_READY`; FE hiện "chưa sẵn sàng" kèm `pendingMigrations` khi backend trả                                                                                                                                                 | Chạy migration trên DB chung                                                                                                               |
