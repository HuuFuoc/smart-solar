# Xử lý phần thiếu sau kiểm tra 76 endpoint SmartSolar

Ngày: 04–05/11/2026. Đợt này xử lý các phần thiếu mà lần kiểm tra trước (`SmartSolar_Final_76_Endpoint_Audit.md`, bản đầu) để
lại, rồi kiểm chứng lại cả 76 endpoint bằng thao tác giao diện thật trên backend thật. Kết quả kiểm chứng chi tiết từng endpoint
nằm ở `SmartSolar_Final_76_Endpoint_Audit.md` (bản mới) và `SmartSolar_Final_76_Endpoint_Matrix.csv`.

Không commit, không push, không deploy. Mọi thay đổi còn trong cây làm việc của repo FE và worktree backend
`D:\FPT-Ky9\capstone_code\smart-solar-backend-test`.

## 1. Kết quả

|                               | Lần trước (image 21/10, không tài khoản) | Lần này (stack `deddde8` + bản vá, 8 tài khoản thật) |
| ----------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| VERIFIED                      | 2 (G04, G05)                             | 76                                                   |
| STATIC_ONLY                   | 72                                       | 0                                                    |
| INCOMPLETE                    | 2 (M06, M08)                             | 0                                                    |
| MISSING / BROKEN / UNASSESSED | 0 / 0 / 0                                | 0 / 0 / 0                                            |
| Có blocker (tập con)          | 74                                       | 10 (B2 RAG dev ×6, B3 PayOS ×3, B8 lối vào S08)      |
| 5 lời gọi ngoài baseline      | 404/405                                  | 200 qua giao diện                                    |
| Workflow xuyên cổng chạy trọn | 0/6                                      | 6/6                                                  |

Hai cột thuộc hai môi trường khác nhau và **không cộng với nhau**. VERIFIED lần này đúng cho `deddde8` + bản vá chưa merge; muốn
áp cho bản backend nộp thì bản vá phải được nhận vào và bộ test stack phải chạy lại trên bản đó.

**Phụ thuộc khi triển khai:** FE sau đợt này gọi 7 API đọc chỉ có trong bản vá backend (mục 4). Chạy FE với backend chưa vá thì
hàng chờ "Huỷ gói", hộp "Giao việc" (cả quản lý lẫn quản trị) và nút xem / tải PDF hợp đồng sẽ báo lỗi. FE không lùi ngầm về
`GET /api/admin/users` hay ghép link tệp, theo yêu cầu không đổi ngầm endpoint.

## 2. Kiểm chứng lại điểm xuất phát

| Điểm                                           | Trạng thái                    | Bằng chứng                                                                                                                                                                 |
| ---------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M06 không có màn, không có API đọc gói chờ huỷ | Kiểm lại, đúng                | `useDecidePackageCancellationMutation` không có component gọi; `ManagerAfterSalesController` ở `deddde8` không có GET gói                                                  |
| M08: quản lý không giao được việc              | Kiểm lại, đúng                | `sales-tasks-page.tsx` chỉ bật giao cho quản trị vì danh sách kinh doanh lấy từ `GET /api/admin/users` (chỉ ADMIN)                                                         |
| Không có API xem / tải PDF hợp đồng            | Kiểm lại, đúng (cả `deddde8`) | Không có route đọc tệp hợp đồng; `GET /api/files/{id}` chỉ trả metadata cho người tải lên                                                                                  |
| 5 lời gọi ngoài baseline có ở `deddde8`        | Kiểm lại, đúng                | Route có trong source `deddde8`; giai đoạn 7 gọi qua giao diện → 200                                                                                                       |
| 5 lời gọi đó trả 404/405 trên image 21/10      | **Kế thừa**, chưa kiểm lại    | Container `backend-api-1` đang Exited (255) từ 16:06 (+07) 04/11; không khởi động lại vì là môi trường dùng chung                                                          |
| Số liệu 2/72/2/0/0/0, 74 blocker của lần trước | Kế thừa                       | Giữ nguyên để so sánh, không trộn vào kết quả lần này                                                                                                                      |
| Bản backend nộp là bản nào                     | **Còn mâu thuẫn**             | Image 21/10 (môi trường của nhóm) thiếu route mà FE đã dùng; `CLAUDE.md` ghi FE bám `main 7c79fa8` nhưng một số màn bám `fix/business-logic-v2` (`deddde8`). Nhóm cần chốt |
| PayOS có môi trường thử                        | Kiểm lại: **không có**        | https://payos.vn/docs/moi-truong-test: payOS không có sandbox, giao dịch test là tiền thật → giữ blocker B3                                                                |

## 3. Môi trường kiểm thử

Chi tiết ở mục 1 của báo cáo audit. Tóm tắt:

- Backend: worktree trên nhánh `test/post-audit-remediation`, gốc `deddde8` + bản vá (`local-test/post-audit-remediation.patch`),
  chạy `dotnet run` ở `127.0.0.1:8090`.
- Hạ tầng riêng, compose project `ss-audit` (`local-test/docker-compose.yml`): Postgres, Redis, RabbitMQ, MinIO có versioning,
  Mailpit, dịch vụ RAG build từ `deddde8`, PayOS giả lập. Tất cả chỉ nghe `127.0.0.1`. Migration chỉ chạy trên DB
  `smartsolar_audit` mới tạo (`local-test/reset-db.sh`).
- Tài khoản: 8 tài khoản tạo qua luồng auth thật (`local-test/seed-accounts.mjs`); mật khẩu chỉ ở `local-test/.env.accounts`
  (gitignore). Quyền ADMIN đầu tiên gán bằng một câu SQL trên DB kiểm thử vì backend không có cách tạo quản trị đầu tiên.
- Cấu hình chỉ dành cho stack (nâng rate limit, chu kỳ quét sau bán 30 giây, cài đặt nghiệp vụ nhỏ nhất để chạy luồng trong
  vài phút) liệt kê ở báo cáo audit, mục 1. Không tắt phân quyền, không sửa tay trạng thái tài chính hay hợp đồng; mọi trạng thái
  (PAID, bàn giao, hoàn tiền…) do backend chuyển qua đúng lệnh của đúng vai trò.

Tệp trong `local-test/` của worktree backend (chưa theo dõi): `docker-compose.yml`, `.env` + `.env.api` (bí mật, gitignore),
`run-api.ps1`, `restart-api.ps1`, `reset-db.sh`, `seed-accounts.mjs`, `fake-payos.mjs`, `post-audit-remediation.patch`.

## 4. Thay đổi backend (bản vá trên `deddde8`)

| Thay đổi                                                                                                                             | File                                                                                                                                                    | Lý do                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/manager/after-sales/subscriptions?status` (mặc định `CANCELLATION_REQUESTED`), `GET …/subscriptions/{id}`; MANAGER + ADMIN | `AfterSalesControllers.cs`, `ServicePackageHandlers.cs` (`ListForManagerAsync`, `GetForManagerAsync`), `AfterSalesViews.cs` (`ManagerSubscriptionView`) | M06: nguồn ID cho quyết định huỷ gói. Trả kèm mã + họ tên khách, lý do xin huỷ; status lạ → `VALIDATION_FAILED`                        |
| `GET /api/manager/after-sales/sales-assignees`; MANAGER + ADMIN                                                                      | `AfterSalesControllers.cs`, `SalesTaskHandlers.cs` (`ListAssignableSalesAsync`), `SalesAssigneeView`                                                    | M08: quản lý cần danh sách người nhận. Chỉ trả mã + họ tên tài khoản SALES đang hoạt động; không mở `GET /api/admin/users` cho quản lý |
| `GET /api/contracts/{id}/official-document/url`, `GET /api/contracts/{id}/submissions/{sid}/url`                                     | `ContractControllers.cs`, `ContractDocumentUrlHandlers.cs` (mới)                                                                                        | Xem / tải PDF chính thức và bản ký. Quyền: quản lý / quản trị, hoặc kinh doanh phụ trách yêu cầu                                       |
| `GET /api/customers/me/contracts/{id}/official-document/url`, `…/submissions/{sid}/url`                                              | như trên                                                                                                                                                | Khách chỉ đọc hợp đồng của mình, ở trạng thái khách được thấy                                                                          |
| Mã lỗi `CONTRACT_DOCUMENT_NOT_FOUND`; đăng ký handler                                                                                | `ContractEntities.cs`, `InstallationWorkflowModuleExtensions.cs`                                                                                        | Hợp đồng chưa có tài liệu đó                                                                                                           |
| Làm tròn thời hạn lease của job nạp RAG về micro giây                                                                                | `KnowledgeIngestionService.cs`                                                                                                                          | Sửa lỗi F1: job kẹt RUNNING vì Postgres cắt tick 100 ns, bước so `LockedUntil` từ chối chính kết quả của job                           |

Link PDF: dùng `FileReadUrlService` có sẵn, link GET ký sẵn **ghim đúng phiên bản S3 đã xác minh**, sống ngắn, `Cache-Control:
no-store`; `disposition` chỉ nhận `inline` hoặc `attachment` (khác → 400). Không có URL công khai, không ghép từ `fileId`, khoá
kho không ra khỏi backend.

Test thêm:

- `Unit/InstallationWorkflow/ContractDocumentUrlTests.cs` (3): chủ hợp đồng nhận link ghim phiên bản; người khác / tài liệu không
  có → NotFound / `CONTRACT_DOCUMENT_NOT_FOUND`; kho chưa cấu hình / object mất.
- `Unit/AfterSales/ManagerReadModelsTests.cs` (3): vòng đời hàng chờ (từ chối, quyết định lặp → `AFTER_SALES_INVALID_STATE`);
  status lạ / gói không có; danh sách kinh doanh loại tài khoản bị khoá và vai trò khác.
- `Integration/KnowledgeBase/PostgresKnowledgeBaseConcurrencyTests.cs` (+1): job lease ở thời điểm lẻ micro giây ghi được kết
  quả của chính nó. Chạy khi chưa sửa: thất bại (RUNNING); sau khi sửa: qua.

## 5. Thay đổi frontend

| Phần                          | File                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đường dẫn API                 | `src/services/api/endpoints.ts` (7 path mới), `src/services/api/errors.ts` (`CONTRACT_DOCUMENT_NOT_FOUND`)                                                                                                                                                                                  |
| Kiểu response viết tay        | `src/types/res/managerAfterSalesRes.ts` (`ManagerSubscriptionView`, `SalesAssigneeView`), `src/types/res/customerContractsRes.ts` (`ContractDocumentUrlView`)                                                                                                                               |
| M06: hàng chờ "Huỷ gói"       | `managerAfterSalesService.ts`, `useManagerAfterSales.ts`, `managerAfterSalesRules.ts` (`packageCancellationErrors/Body`), `pages/package-cancellations-page.tsx` (mới), `routes/paths.ts`, `routes/protectedRoutes.tsx`, `config/portals.ts`, `components/layout/manage-layout.tsx` (số đỏ) |
| M08: giao việc ở cổng Quản lý | `features/after-sales/AssignTaskDialog.tsx`, `pages/sales-tasks-page.tsx` (cả hai cổng dùng `useSalesAssigneesQuery`, bỏ thông báo "chỉ quản trị")                                                                                                                                          |
| PDF hợp đồng                  | `features/contracts/ContractDocumentButtons.tsx` (mới), `CustomerSignPanel.tsx`, `SignaturePanel.tsx`, `pages/contract-page.tsx`, `contractService.ts`, `customerContractService.ts`, `useContracts.ts`, `useCustomerContracts.ts`                                                          |
| Swagger                       | `docs/api/swagger.json`: 7 path đọc mới (chỉ 200 OK; `npm run gen:api` không đổi type nào)                                                                                                                                                                                                  |
| Tài liệu dự án                | `CLAUDE.md`: câu "chưa có màn xét huỷ gói", "giao việc chỉ ở cổng quản trị", "chưa có API tải PDF" sửa theo code hiện tại, ghi rõ phụ thuộc bản vá                                                                                                                                          |

Nút xem / tải PDF: xin link đúng lúc bấm, không lưu link vào cache react-query, storage hay log; "Xem" mở tab ngay trong lần bấm
(tránh bị chặn cửa sổ bật lên) rồi mới đặt địa chỉ; lỗi qua bảng `contractErrorMessage`.

## 6. Kiểm thử đã chạy

### 6.1. E2E trên stack thật (`tests/e2e/stack-*.live.e2e.mjs`)

Bước thuộc 76 luôn đi qua giao diện (Vite + Chromium, đăng nhập bằng form). Bước nối ngoài 76 gọi API nghiệp vụ thật bằng đúng vai
trò (`stack-flows.mjs`). Mỗi response `/api/` của trình duyệt được ghi kèm traceId vào `docs/api/evidence/stack-2026-11-04/`.

| Giai đoạn | File                  | Test qua | Nội dung chính                                                                                                                                           |
| --------- | --------------------- | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | `stack-1-admin`       |      4/4 | Thời hạn bảo hành, khu vực + phường + kỹ thuật viên, ảnh sản phẩm, báo cáo + CSV                                                                         |
| 2         | `stack-2-knowledge`   |      5/5 | Tài liệu: tải lên, nạp thật, công bố, gỡ, nạp lại, FAILED khi RAG dừng → chạy lại, lưu trữ; cấu hình RAG; trợ lý                                         |
| 3         | `stack-3-contract`    |      9/9 | Lịch chờ nhận, bổ sung biên bản, PDF báo giá, hợp đồng + phụ lục, PDF đúng SHA-256, bản ký, duyệt, PayOS giả lập → PAID                                  |
| 4         | `stack-4-aftersales`  |    11/11 | Huỷ gói (M06), hoàn tiền (M09, M10, A03), thiên tai, đóng trùng, sửa thiết bị, sửa luôn, phát sinh, dừng việc, việc báo giá, bảo trì của gói, bảo trì lẻ |
| 5         | `stack-5-location`    |      3/3 | Tên tỉnh, tra địa chỉ cũ, bổ sung phường (C11), điều phối, đổi kỹ thuật viên (A31), đổi kinh doanh (A32)                                                 |
| 6         | `stack-6-followup`    |      1/1 | Việc nhắc bảo trì do backend tự mở sau ≥ 1 giờ: quản lý giao, quản trị giao lại, kinh doanh bắt đầu + ghi liên hệ                                        |
| 7         | `stack-7-offbaseline` |      4/4 | 5 lời gọi ngoài baseline qua giao diện                                                                                                                   |
| 8         | `stack-8-invalid`     |      5/5 | Ca không hợp lệ qua API: chuyển trạng thái sai cho lệnh ghi, sai vai trò cho lệnh đọc (53 endpoint, 57 lời gọi; 56 bị từ chối, 1 lọt qua là F9)          |

Lượt cuối: DB dựng lại sạch 22:57 (+07) 04/11 → giai đoạn 1–4 liền nhau → 5, 7 chạy lại trên cùng DB sau khi sửa test → máy tắt
khoảng 23:30 → sáng 05/11 khởi động lại chỉ stack `ss-audit` (volume giữ DB) → giai đoạn 6 lúc 12:40 → giai đoạn 8 (bản đủ ca)
lúc 12:49. Các lần chạy hỏng trước đó (lỗi ở test, đã sửa) giữ ở `retries/` trong thư mục tạm, không dùng làm bằng chứng.

Ca không hợp lệ chạy trên backend thật: 74/76 endpoint (giao diện chặn trước khi gửi, hoặc backend từ chối 4xx mà không đổi trạng
thái). Còn G02 (danh sách phiên của chính người gọi) và G04 (danh mục công khai): lệnh đọc, không có trạng thái hay quyền sai để
thử.

### 6.2. Test khác

| Lệnh                                                                                   | Kết quả                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`, `npm run lint`, `npm run build`, `npm run format:check`           | Đều exit 0. Lint: 0 lỗi, 3 cảnh báo có sẵn. Build: cảnh báo có sẵn chunk > 500 kB. Prettier chỉ chạy `--write` cho file của đợt này                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `npm test`                                                                             | 147/147 (thêm 2 test luật xét huỷ gói)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `npm run test:e2e` (backend giả)                                                       | 107 test: 87 qua, 19 bỏ qua (bộ live và stack khi không khai backend), 1 hỏng: test đầu của `customer-portal` hết giờ 15 giây khi chạy cả bộ; chạy riêng file đó hai lần liền đều 19/19. Sau khi máy khởi động lại, cả bộ từng hỏng / huỷ hàng loạt vì `localhost` (F10); đã cho Vite trong 12 file test nghe `127.0.0.1`. Sửa test lỗi thời "quản lý không có nút giao" thành "quản lý giao việc bằng danh sách của API quản lý, không gọi API tài khoản"; thêm 3 test hàng chờ huỷ gói (đúng / số vượt giá / 409), 1 test tải PDF chính thức (link xin lúc bấm, hợp đồng chưa có tài liệu thì báo lỗi). Các file stack tự bỏ qua khi không khai `AUDIT_STACK_API` |
| Backend `dotnet test -c Release`, có `SMARTSOLAR_TEST_POSTGRES` trỏ Postgres của stack | 1548 test: 1542 qua, 4 hỏng, 2 bỏ qua (cần Redis cho rate limit phân tán). 4 test hỏng không do bản vá: 3 vì `core.autocrlf=true` đổi file dữ liệu sang CRLF khi checkout trên Windows (thay đúng blob LF thì 2 test catalog qua; `ZoneProposalTests` đọc `guides/reference/operational-zones-initial-proposal.csv` có `\r\n`), 1 vì dòng `//TMP-REVERT` có sẵn ở `deddde8` (`TestHostIsolationTests`)                                                                                                                                                                                                                                                              |

## 7. Phát hiện cần xử lý tiếp

Chi tiết ở mục 7 của báo cáo audit.

- **F9, phân quyền backend:** `GET /api/contracts/{id}/payments` cho mọi tài khoản SALES đọc lịch sử thanh toán của mọi hợp đồng
  (`PaymentService.GetForStaffAsync` không nhận người gọi), lệch với `GET /api/contracts/{id}`. Nên kiểm người phụ trách như các
  lệnh đọc hợp đồng khác.
- **F1, đã sửa trong bản vá:** lỗi lease của job nạp RAG; có ở cả `7c79fa8`.
- **F2–F4, FE ngoài 76:**
  - chưa có màn đặt đối tượng tài liệu (tài liệu mặc định INTERNAL nên trợ lý của khách không dùng được);
  - `AssetEntry` gửi `productId: null` trong khi `deddde8` bắt buộc sản phẩm trong danh mục;
  - chưa có luồng duyệt thiết bị khác hợp đồng.

  Thiếu cả ba thì luồng thi công và trợ lý của khách chưa chạy trọn chỉ bằng giao diện.

- **F5:** rate limit mặc định quá thấp so với số lệnh đọc mà layout gọi mỗi lần tải trang.
- Cổng Quản lý vẫn chưa đổi được kinh doanh phụ trách (A32), dù backend cho quản lý gọi: `SurveyStaffPanel` lấy danh sách từ
  `GET /api/admin/users`. Có thể chuyển sang `sales-assignees` như M08.
- `.gitattributes` cho thư mục dữ liệu danh mục (giữ LF) sẽ làm 3 test backend qua trên Windows.

## 8. Ràng buộc đã giữ

- Không commit / push / deploy; không thêm trailer AI.
- Không ghi bí mật vào báo cáo hay file theo dõi. Mật khẩu, khoá kho, khoá JWT, khoá PayOS giả lập chỉ nằm trong file gitignore
  của `local-test/`. Bằng chứng không có token, body request hay link ký sẵn.
- Không đụng DB, cache, kho tệp hay container dùng chung. Container của nhóm đã dừng từ trước khi stack được tạo; sáng 05/11
  tôi mở lại Docker Desktop để chạy lại **chỉ** stack `ss-audit`, container của nhóm vẫn để dừng.
- Không tắt phân quyền để test, không sửa tay trạng thái tài chính / hợp đồng. Không ghép bằng chứng của image 21/10 với stack.
- Không thực hiện giao dịch tiền thật: PayOS chỉ là bản giả lập trên máy.
