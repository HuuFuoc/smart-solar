# Smart Solar: tích hợp Frontend với backend 462733c (luồng kỹ thuật viên tại công trình)

Ngày: 18/11/2026. Backend đối chiếu: `hoaikhoitran/smart-solar-backend` commit `462733ce7a0370eeaf14a9644fac507b352502a7`
(merge PR #20, thay đổi nghiệp vụ nằm ở `8437dcc`). Frontend: nhánh `main` của repo này, thay đổi **chưa commit**.

## 0. Tóm tắt

- FE đã có sẵn luồng tiền khảo sát, đặt lịch trực tiếp, khảo sát tại công trình, giỏ báo giá, thi công (tích hợp tới backend
  8f70cb2). Lần này chỉ sửa phần backend 8437dcc đổi: báo giá chốt tại công trình, thanh toán trước khi có hợp đồng, chốt lịch không
  qua khách, nghiệm thu nội bộ, hậu mãi tại công trình, và gỡ mọi màn / lời gọi tới API đã trả 410.
- Kiểm tra thật đã chạy: `typecheck` đạt, `lint` đạt (3 cảnh báo có từ trước, ở file không sửa), `npm test` 302/302 đạt, `build`
  đạt, `format:check` đạt.
- **Chưa chạy được**: E2E với backend thật (không có tài khoản kiểm thử trong máy này, và stack kiểm thử riêng `AUDIT_STACK_API`
  không dựng). Các file E2E đã sửa theo luồng mới nhưng chưa được chạy; xem mục 7.
- Nguồn sự thật: code backend tại 462733c (handler, controller, record view). Tài liệu `FE_HANDOFF_TECHNICIAN_ONSITE.md` khớp với code ở
  mọi điểm đã đối chiếu; các khác biệt nhỏ ghi ở mục 5.

## 1. Bảng đối chiếu từng luồng

| Luồng                        | Backend 462733c                                                                                                                                        | FE trước khi sửa                                                                         | Đã sửa                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Tiền khảo sát, đặt lịch   | Không đổi ở 8437dcc; rút / đóng yêu cầu khi đang có thanh toán báo giá thì 409 `SURVEY_REQUEST_PAYMENT_IN_PROGRESS`                                    | Đã đúng (đánh giá sơ bộ 5 bước, đặt trực tiếp, `SURVEY_REQUEST_ALREADY_OPEN`, điều phối) | Thêm câu lỗi `SURVEY_REQUEST_PAYMENT_IN_PROGRESS`; bỏ tải lại báo giá của khách khi rút yêu cầu                                                                                                           |
| 2. Khảo sát tại công trình   | Không đổi; hoàn thành không tự lập báo giá (từ ad10455)                                                                                                | Đã đúng (start, lưu, ảnh ROOF, complete, bổ sung, revision)                              | Chỉ sửa câu chữ trong CLAUDE.md                                                                                                                                                                           |
| 3. Báo giá tại công trình    | `issue` = chốt giá, không gửi khách; `POST …/on-site-decision` AGREED / DECLINED / REVISION_NEEDED                                                     | "Gửi cho khách", khách đồng ý / từ chối / yêu cầu sửa trên cổng khách hàng               | "Chốt báo giá", màn trình bày cỡ chữ to, ghi 3 quyết định (ghi chú bắt buộc khi không đồng ý / muốn sửa), khách đổi ý trước khi mở thanh toán; gỡ menu Báo giá của khách                                  |
| 4. Thanh toán tại công trình | `POST / GET …/payment`, `…/payment/cancel`, `paymentState`, chỉ PAID kèm `contractId` là đã trả                                                        | Không có                                                                                 | Khối Thanh toán: QR vẽ từ `current.qrCode`, link `checkoutUrl`, mã đơn, hạn, hỏi lại 5 s; tiền mặt chờ quản lý (1 phút); huỷ / đổi cách trả; `REVIEW_REQUIRED`; bàn thu tiền có nhãn dòng báo giá lắp đặt |
| 5. Hợp đồng sau thanh toán   | Hợp đồng DRAFT tự lập khi tiền xác minh; `paymentCompleted`, `paymentAttemptId`, `paymentConfirmedAt`; duyệt bản ký → PAID; lập tay cần đã trả         | Hợp đồng lập khi khách đồng ý; trạng thái thanh toán suy từ trạng thái hợp đồng          | Thêm 3 trường; hiện "Đã thanh toán" tách khỏi trạng thái; dải bước riêng cho hợp đồng trả trước; khách không bị coi là còn việc ký / trả; không nút trả tiền lần hai; "Lập hợp đồng" chỉ còn là khôi phục |
| 6. Chốt lịch thi công        | Kỹ thuật viên ghi ngày khi hợp đồng đã trả (chưa ký vẫn được); `awaitingContractSignature`; slot offer 410; xung đột `PLANNED_CONFLICT`                | Có "Đề xuất khung giờ" và khách chọn khung                                               | Gỡ đề xuất khung / khách chọn; "Xem khung trống của bạn" trong hộp Hẹn ngày đổ vào ô ngày giờ (giờ VN); hiện riêng chờ ký / chờ thanh toán ở mọi màn lịch                                                 |
| 7. Thi công, nghiệm thu      | `POST /installation-projects/{id}/acceptance` (quản lý / quản trị); `PENDING_CUSTOMER_ACCEPTANCE` = chờ nghiệm thu nội bộ; duyệt thay thiết bị là cuối | Khách nghiệm thu, khách đồng ý thay thiết bị                                             | Nút "Nghiệm thu" (ghi chú bắt buộc, biên bản PDF tuỳ chọn) khoá khi checklist / thiết bị chưa xong; số đỏ menu Thi công; trang khách chỉ đọc; nhãn "Chờ nghiệm thu nội bộ"                                |
| 8. Hậu mãi tại công trình    | Kỹ thuật viên ghi AGREED / DECLINED, mở QR / tiền mặt, ghi khách xác nhận hoàn thành; khách duyệt báo giá kỹ thuật viên → 409                          | Kỹ thuật viên chỉ lập báo giá; khách duyệt, trả tiền, nghiệm thu                         | Khối "Báo giá tại công trình" và "Khách xác nhận hoàn thành" trên buổi hẹn; phía khách báo giá kỹ thuật viên chỉ để xem; báo giá của kinh doanh giữ đường cũ                                              |

## 2. API đã tích hợp (mới)

| Endpoint                                                                        | Vai trò           | FE                                                   |
| ------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------- |
| `POST /api/technician/quotations/{id}/on-site-decision`                         | Kỹ thuật viên     | `recordOnSiteDecision`, `DecisionDialog`             |
| `POST /api/technician/quotations/{id}/payment`                                  | Kỹ thuật viên     | `startPayment`, `QuotationPaymentPanel`              |
| `GET /api/technician/quotations/{id}/payment`                                   | Kỹ thuật viên     | `useQuotationPaymentQuery` (hỏi lại theo trạng thái) |
| `POST /api/technician/quotations/{id}/payment/cancel`                           | Kỹ thuật viên     | `cancelPayment`                                      |
| `POST /api/installation-projects/{id}/acceptance`                               | Quản lý, quản trị | `acceptInternally`, `CompletionPanel`                |
| `POST /api/technicians/me/after-sales/quotations/{id}/on-site-decision`         | Kỹ thuật viên     | `recordQuotationDecision`, `ServiceOnSitePanel`      |
| `POST / GET /api/technicians/me/after-sales/quotations/{id}/payment`, `/cancel` | Kỹ thuật viên     | `startQuotationPayment`, `getQuotationPayment`, …    |
| `POST /api/technicians/me/after-sales/requests/{id}/completion-confirmation`    | Kỹ thuật viên     | `confirmCompletionOnSite`, `CompletionConfirmation`  |
| `GET /api/technicians/me/contracts/{id}/installation-availability` (đã có)      | Kỹ thuật viên     | Dời vào `ScheduleDialog` ("Xem khung trống")         |
| `POST /api/manager/payments/{attemptId}/cash/confirm` (đã có)                   | Quản lý, quản trị | Bàn thu tiền, thêm nhãn `INSTALLATION_QUOTATION`     |

Request DTO sinh lại bằng `npm run sync:api http://160.187.1.242:8080/swagger/v1/swagger.json` + `npm run gen:api` (server chung đã
chạy bản có 10 path mới). Response viết tay theo record C#: `QuotationPaymentView`, `ServiceQuotationPaymentView`, 3 trường mới của
`ContractView`, `awaitingContractSignature` của `InstallationScheduleView`, `installationQuotationId` của `PaymentLineView`.

## 3. API đã bỏ (410 `ENDPOINT_RETIRED`) và đã gỡ khỏi FE

| Endpoint                                                                                                       | Đã gỡ                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/customers/me/quotations`, `GET …/{id}`, `POST …/accept`, `/reject`, `/revision-request`              | Menu và trang "Báo giá" của khách, `customerQuotationService`, `useCustomerQuotations`, `AcceptQuotationDialog`, `CustomerQuotationTables`, `RequestQuotationPanel`, việc "Trả lời báo giá" ở tổng quan, số đỏ menu |
| `GET /api/customers/me/contracts/{id}/installation-slot-offers`, `POST …/installation-slot-offers/{id}/select` | `CustomerSlotOffers`, hàm service / hook                                                                                                                                                                            |
| `POST /api/technicians/me/contracts/{id}/installation-slot-offers`                                             | `SlotOfferDialog`, nút "Đề xuất khung giờ"                                                                                                                                                                          |
| `POST /api/customers/me/installation-projects/{id}/acceptance`, `/equipment-substitution/approve`              | `AcceptanceDialog`, nút nghiệm thu / đồng ý thay thiết bị của khách, việc "Nghiệm thu" ở tổng quan                                                                                                                  |

Dữ liệu lịch sử không bị xoá: thông báo cũ (`INSTALLATION_QUOTATION_ISSUED`, `INSTALLATION_SLOTS_OFFERED`,
`INSTALLATION_ACCEPTANCE_REQUIRED`, `EQUIPMENT_SUBSTITUTION_APPROVAL_REQUIRED`) vẫn có nhãn "(thông báo cũ)" và dẫn tới mục còn
dùng được; sự kiện cũ của báo giá / dự án ghi "(cách cũ)". Test `tests/technician-onsite-flow.test.mjs` quét toàn bộ `src/` để chắc
không còn lời gọi nào tới các path trên.

## 4. File đã thay đổi

Mới: `src/features/quotations/OnSiteQuotation.tsx`, `src/features/payments/PaymentQr.tsx`,
`src/features/after-sales/ServiceOnSitePanel.tsx`, `src/features/installation-projects/acceptanceRules.ts`,
`src/types/req/technicianAfterSalesOnSiteReq.ts` (sinh), `tests/technician-onsite-flow.test.mjs`,
`tests/installation-schedule-onsite-rules.test.mjs` (đổi tên từ `installation-slot-offer-rules.test.mjs`).

Xoá: 10 file của màn đã bỏ (mục 3) và `src/types/req/customerInstallationsReq.ts` (sinh, không còn schema).

Sửa (chính): `TechnicianQuotationPanel.tsx`, `quotationRules.ts`, `quotationDisplay.ts`, `common/quotation.ts`,
`technicianQuotationService.ts`, `useTechnicianQuotations.ts`; `contractRules.ts`, `contractDisplay.ts`, `ContractPaymentPanel.tsx`,
`SignaturePanel.tsx`, `customerContractRules.ts`, `customerContractDisplay.ts`, `contractPrint.ts` (điều khoản in), `pages/contract-page.tsx`,
`pages/contracts-page.tsx`, `pages/customer/contract-page.tsx`; `ScheduleDialog.tsx`, `scheduleRules.ts`, `CustomerSchedulePanel.tsx`,
`StaffContractSchedulePanel.tsx`, `installationScheduleService.ts`, `useInstallationSchedules.ts`, `pages/tech/installation-schedules-page.tsx`;
`CompletionPanel.tsx`, `EquipmentPanel.tsx`, `pages/installation-project-page.tsx`, `useManagerInstallations.ts`,
`managerInstallationService.ts`, `useManagerNavAlerts.ts`, `common/installation.ts`; `pages/customer/project-page.tsx` và các bảng / thẻ
công trình của khách; `technicianVisitRules.ts`, `technicianAfterSalesService.ts`, `useTechnicianAfterSales.ts`,
`pages/tech/after-sales-visit-page.tsx`, `CustomerQuotationPanel.tsx`, `customerServiceRules.ts`; `endpoints.ts`, `errors.ts`,
`routes/paths.ts`, `routes/protectedRoutes.tsx`, `config/portals.ts`, `customer-layout.tsx`, tổng quan khách; `styles/globals.css` (token
`qr-bg`, `qr-fg` ở cả 3 khối); `docs/api/swagger.json`; `package.json` (`qrcode-generator@1.4.4`); E2E stack 3 + `stack-flows.mjs` +
`stack-baseline.json`; `CLAUDE.md`.

Phụ thuộc mới: `qrcode-generator@1.4.4` (MIT, không phụ thuộc gì, chỉ mã hoá QR; SVG tự vẽ bằng token). Không phải thư viện UI.

## 5. Lỗi / lệch phát hiện và cách sửa

| #   | Vấn đề                                                                                                                  | Cách sửa                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | FE gọi 9 endpoint đã 410 (báo giá, chọn khung, nghiệm thu, đồng ý thay thiết bị của khách; gửi khung của kỹ thuật viên) | Gỡ màn và lời gọi (mục 3), thêm test quét mã nguồn                                                          |
| 2   | Hợp đồng trả trước ở `AWAITING_SIGNATURE` bị tính là việc của khách và hiện bước "Thanh toán" chưa xong                 | `isPrepaid` / `isPrepaidContract` theo `paymentCompleted` + `paymentAttemptId`; dải bước và Tình hình riêng |
| 3   | Khối Thanh toán của nhân viên chỉ mở khi SIGNED / PAID, nên hợp đồng trả trước hiện "chưa tới bước thanh toán"          | `hasPaymentStage` gồm hợp đồng trả trước; khối báo "đã thanh toán trước", không thu lần hai                 |
| 4   | Khối Lịch thi công (khách, nhân viên) chỉ hiện khi SIGNED / PAID; hợp đồng trả trước chưa ký không thấy lịch đã hẹn     | `canPlanForContract(status, paymentCompleted)`                                                              |
| 5   | `PENDING_CUSTOMER_ACCEPTANCE` hiện "Chờ khách nghiệm thu" và tô đỏ cho khách                                            | Nhãn "Chờ nghiệm thu nội bộ" / "Smart Solar đang nghiệm thu"; đỏ chuyển sang quản lý / quản trị             |
| 6   | Điều khoản hợp đồng in (`contractPrint.ts`) ghi khách trả PayOS sau khi ký và khách bấm nghiệm thu                      | Viết lại điều 3, 4.1, 5.1–5.2 theo luồng tại công trình                                                     |
| 7   | Bộ E2E stack gọi API đã 410 (`customers/me/quotations/{id}/accept`, khách nghiệm thu)                                   | Chuyển sang ghi quyết định, mở QR, PayOS giả lập, nghiệm thu nội bộ; thêm id K04–K07, M11 vào baseline      |

Khác biệt tài liệu ↔ code backend (đã theo code):

- Tài liệu ghi `PUT /api/technician/quotations/{id}/lines/{lineId}` và `DELETE …?revision=`; khớp code, FE đã dùng từ trước.
- `GET …/after-sales/quotations/{id}/payment` trả `version` (không phải `quotationVersion`) và không có `issuedByRole`.
- Lệnh ghi quyết định hậu mãi không kiểm `IssuedByRole`: kỹ thuật viên có buổi hẹn ghi được cả trên báo giá của kinh doanh. FE không
  phân biệt được vì view thanh toán không có `issuedByRole` (xem mục 6).

## 6. Việc chưa hoàn thành / giới hạn

1. **E2E chưa chạy.** `tests/e2e/stack-3-contract.live.e2e.mjs` (K04–K06 mới, S08, C04) và `stack-flows.mjs` đã sửa nhưng chưa chạy
   trên stack thật; các file portal live E2E (`*-portal.live.e2e.mjs`) không đụng tới luồng đã đổi. Cần tài khoản + stack để chạy.
2. **Chưa xem giao diện trên trình duyệt** với dữ liệu thật (cần đăng nhập). Đã kiểm tra build, kiểu và luật; chưa chụp màn hình.
3. Backend: khách **không thấy hợp đồng** từ lúc trả tiền tới lúc quản lý gửi ký (`ContractStatuses.CustomerVisible` không có DRAFT /
   ISSUED), dù thông báo `CONTRACT_CREATED_AFTER_PAYMENT` nói "có thể theo dõi". Trang Hợp đồng của khách ghi rõ điều này.
4. Backend: `TechnicianVisitView` không có danh sách báo giá; FE dựng khối báo giá tại công trình từ `items[].quotationId` + GET
   thanh toán của từng báo giá. Báo giá không gắn hạng mục nào (nếu có) sẽ không hiện.
5. Backend: view buổi hẹn không có trạng thái yêu cầu, nên nút "Ghi khách xác nhận" hiện sau mọi báo cáo công việc của buổi sửa /
   bảo trì; khi yêu cầu không còn chờ xác nhận, backend trả `AFTER_SALES_INVALID_STATE` và FE báo câu tiếng Việt.
6. Số đỏ menu "Bảo hành, sửa chữa" của khách vẫn tính `AWAITING_CUSTOMER` cả khi báo giá do kỹ thuật viên lập, vì danh sách yêu cầu
   (`ServiceRequestSummary`) không có nguồn báo giá. Trang chi tiết đã hiện đúng (xanh dương, không nút duyệt).
7. Migration `20261118102011_TechnicianLedOnSiteSales` theo báo cáo backend chưa áp vào Supabase; server chung đã có path mới nhưng
   chưa xác minh DB đã có cột `installation_quotation_id`. Chưa thử thanh toán thật trên server chung.
8. Thay thiết bị trong báo cáo sửa chữa, hoàn tiền: ngoài phạm vi (nhóm không làm hoàn tiền).

## 7. Kết quả kiểm tra (đã chạy 18/11/2026)

| Lệnh                   | Kết quả                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | Đạt                                                                                                              |
| `npm run lint`         | Đạt, 3 cảnh báo có từ trước (`AuthProvider.tsx`, `app-shell.tsx`, `stitch-ui/Button.tsx`), không có cảnh báo mới |
| `npm test`             | 302 test, 302 đạt, 0 lỗi (gồm `ui-rules`, 24 test mới của luồng tại công trình, 4 test lịch thi công)            |
| `npm run build`        | Đạt (cảnh báo chunk > 500 kB có từ trước)                                                                        |
| `npm run format:check` | Đạt                                                                                                              |
| E2E backend thật       | **Chưa chạy** (thiếu tài khoản / stack)                                                                          |

Test mới bao phủ, mỗi luật có đường chính + luật nghiệp vụ + trường hợp sai: ghi quyết định (đồng ý khi hết hạn / biên bản đổi bị
chặn; đổi ý sau khi mở thanh toán bị chặn; ghi chú bắt buộc), thanh toán (chỉ PAID kèm hợp đồng là đã trả; QR đã quét chưa phải đã
trả; đổi cách trả phải huỷ trước; nhịp hỏi lại trong hạn mức 30 lần / phút), hợp đồng trả trước (không thu lần hai, không là việc của
khách), lịch (chờ ký khác chờ thanh toán; trả trước chưa ký vẫn hẹn được; hợp đồng bị thay / huỷ thì không), nghiệm thu nội bộ
(checklist / thiết bị chưa duyệt chặn; không có lượt chờ thì không), hậu mãi (không phải trả thì làm ngay; báo giá kinh doanh vẫn
khách duyệt; xác nhận hoàn thành không cho buổi kiểm tra), và API đã bỏ không còn trong mã nguồn.

## 8. Các bước để deploy

1. Backend: deploy API 462733c **trước** khi bật thanh toán tại công trình (theo báo cáo backend: bản cũ nhận webhook của lần thanh
   toán báo giá sẽ đánh dấu xử lý tay, giữ tiền, không lập hợp đồng), rồi áp migration `20261118102011_TechnicianLedOnSiteSales` (sao
   lưu, diễn tập trước).
2. Kiểm tra PayOS của môi trường: `Payments__*` (return / cancel URL trỏ về FE), webhook tới API.
3. FE: `npm ci` (có phụ thuộc mới `qrcode-generator`), `npm run build`, deploy `dist/` như cũ (Vercel, `vercel.json` không đổi).
4. Chạy E2E: portal live với `API_BASE`, `API_PROXY_TARGET` và tài khoản `E2E_*`; stack 1 → 8 với `AUDIT_STACK_API`,
   `AUDIT_ACCOUNTS_FILE`, `AUDIT_EVIDENCE_DIR` (giai đoạn 3 kiểm luồng mới: chốt giá, đồng ý, QR, PayOS giả lập, hợp đồng trả trước,
   duyệt bản ký → PAID, không thu lần hai).
5. Báo người dùng cuối: khách không còn duyệt báo giá / chọn ngày / nghiệm thu trong ứng dụng; kỹ thuật viên cần thiết bị có mạng để
   hiện QR tại công trình; quản lý xác nhận tiền mặt ở "Thu tiền" và nghiệm thu ở "Thi công".
