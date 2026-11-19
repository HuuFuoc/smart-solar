# Tích hợp FE: thanh toán 30/70, hợp đồng giấy, khách nghiệm thu, thu hồi công nợ, tài chính

Ngày 19/11/2026. Báo cáo này không chứa token, mật khẩu, link ký sẵn hay dữ liệu khách.

## 1. Phiên bản và trạng thái

| Mục                                              | Giá trị                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FE branch / HEAD                                 | `main` @ `6a2f8be058ebb14a0777bcd35efde4d72dbef23c` (trùng baseline)                                                                                                                                                                                                                                                                                                           |
| Working tree                                     | Chưa commit. Có thay đổi của người dùng từ trước, không thuộc việc này: `CLAUDE.md`, `HandoverPanel.tsx`, `AssetEntry.tsx`, `AssetEntryRow.tsx`, `assetForm.ts`, `installationDisplay.ts`, `pages/tech/installation-page.tsx`, `tests/installation-assets.test.mjs`, một phần `pages/customer/project-page.tsx`. `npm run format` đã chạy qua cả các file này (chỉ định dạng). |
| BE dùng làm chuẩn                                | `hoaikhoitran/smart-solar-backend` `main` @ `7d2705419f57f51b482c314d087253420966fde6` (đọc bằng `git archive`, không đụng working tree backend ở máy)                                                                                                                                                                                                                         |
| BE đang chạy (server chung `160.187.1.242:8080`) | **BLOCKED / API VERSION MISMATCH.** Không đăng nhập: `GET /api/contracts`, `/api/collections`, `/api/admin/finance/overview`, `/api/customers/me/contracts/{id}/signature-sets` trả **404**; còn `/api/customers/me/contracts`, `/api/manager/payments` trả **401**. Nghĩa là server chưa chạy bản 7d27054.                                                                    |

**Thứ tự triển khai bắt buộc:** cập nhật backend lên 7d27054 trước rồi mới deploy FE này. Nếu deploy FE trước:

- kỹ thuật viên không mở được thanh toán báo giá (FE đã gỡ lệnh `POST /technician/quotations/{id}/payment` vì bản 7d27054 trả 410);
- khách không gửi được bản ký (đã gỡ vì 410);
- quản lý không nghiệm thu được (đã gỡ vì 410);
- danh sách hợp đồng, công nợ, tài chính báo lỗi tải (404).

Ô "Mở theo mã hợp đồng" ở trang Hợp đồng vẫn dùng được trên cả hai bản.

## 2. Ma trận theo vai trò

DONE = đã có màn, đã gọi đúng API theo code BE tại SHA, đã qua typecheck và unit test. Chưa có lần chạy nào với backend 7d27054 (xem mục 1).

| Vai trò            | Màn / thao tác                                                                                                             | Trạng thái             | File, route, API                                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kỹ thuật viên      | Ghi khách đồng ý → mở hợp đồng 30/70                                                                                       | DONE                   | `OnSiteQuotation.tsx` (DecisionDialog), `TechnicianQuotationPanel.tsx`; `POST /technician/quotations/{id}/on-site-decision`, đọc `contractId`, chuyển tới `/tech/contracts/:id`. Ghi đồng ý lại trả cùng hợp đồng. |
| Kỹ thuật viên      | Khách đổi ý trước khi trả 30%                                                                                              | DONE                   | Nút "Khách muốn sửa" / "Khách đổi ý" trên báo giá ACCEPTED. 409 `QUOTATION_PAYMENT_STARTED` có câu riêng.                                                                                                          |
| Kỹ thuật viên      | Thu 30% / 70% (QR, tiền mặt, huỷ, hỏi lại 4 giây / lần)                                                                    | DONE                   | `InstallmentPaymentBlock.tsx`; `POST/GET /technician/contracts/{id}/installments/{n}/payment`, `…/payment/cancel`                                                                                                  |
| Kỹ thuật viên      | Hợp đồng giấy 1–50 trang: khai số trang, chọn nhiều ảnh, gán / đổi số trang, tiến độ từng trang, thử lại, thay trang, chốt | DONE                   | `SignatureSetPanel.tsx`; `POST …/signature-set`, `PUT …/pages/{n}`, `POST …/finalize` (gửi `expectedRevision`); tệp `SIGNED_CONTRACT_PAGE`                                                                         |
| Kỹ thuật viên      | Danh sách mọi hợp đồng (chỉ đọc), chi tiết                                                                                 | DONE                   | `/tech/contracts(/:id)`; `GET /contracts`, `GET /contracts/{id}`                                                                                                                                                   |
| Kỹ thuật viên      | Hẹn ngày thi công sau khi nhận 30%                                                                                         | DONE (dùng màn có sẵn) | Nút "Hẹn ngày thi công" trên trang hợp đồng → `/tech/installation-schedules`                                                                                                                                       |
| Kỹ thuật viên      | Thanh toán 100% báo giá cũ                                                                                                 | Chỉ còn xem / huỷ      | Đã gỡ lệnh mở mới (410)                                                                                                                                                                                            |
| Khách              | Mọi hợp đồng, mọi phiên bản, bản nháp 30/70                                                                                | DONE                   | `pages/customer/contracts-page.tsx` bỏ `latestPerContract`; thêm nhóm "Đang thực hiện" và "Đã huỷ, đã có bản mới"                                                                                                  |
| Khách              | Chi tiết 30/70: đọc điều khoản, trả 30% / 70%, xem trang đã ký                                                             | DONE                   | `pages/customer/contract-page.tsx`; `…/customers/me/contracts/{id}/installments/{n}/payment(/cancel)`, `…/signature-sets`, `…/signed-pages/{fileId}/url`                                                           |
| Khách              | Nghiệm thu / yêu cầu làm lại / không nghiệm thu (lý do + ≤ 10 tệp)                                                         | DONE                   | `CustomerAcceptancePanel.tsx`; `POST /customers/me/installation-projects/{id}/acceptance` gửi `expectedRevision`; tệp `ACCEPTANCE_EVIDENCE`                                                                        |
| Khách              | Tự tải bản ký                                                                                                              | Đã gỡ (410)            | `SignContractDialog.tsx` đã xoá; khối ký của hợp đồng cũ chỉ còn xem / tải / in                                                                                                                                    |
| Kinh doanh         | Danh sách hợp đồng, chi tiết (chỉ đọc)                                                                                     | DONE                   | `/ops/contracts(/:id)`                                                                                                                                                                                             |
| Kinh doanh         | Thu hồi công nợ: ghi liên hệ / thương lượng / hẹn trả / ghi chú, kèm tệp, chuyển quản lý                                   | DONE                   | `/ops/collections(/:id)`; `GET /collections`, `POST …/activities`, `…/escalate`; tệp `COLLECTION_EVIDENCE`                                                                                                         |
| Quản lý / Quản trị | Danh sách hợp đồng (tìm, lọc cách trả / trạng thái / quá hạn / khách, phân trang 20)                                       | DONE                   | `pages/contracts-page.tsx`; lọc nằm trên địa chỉ                                                                                                                                                                   |
| Quản lý / Quản trị | Chi tiết 30/70: xem khoản trả, xác nhận tiền mặt đúng số của khoản, hỗ trợ tải trang ký                                    | DONE                   | `pages/contract-page.tsx` (`PlanContract`); `POST /manager/payments/{attemptId}/cash/confirm`; `/contracts/{id}/signature-set…`                                                                                    |
| Quản lý / Quản trị | Thao tác luồng cũ trên hợp đồng 30/70                                                                                      | Ẩn                     | Phát hành, PDF chính thức, gửi ký, duyệt bản ký, phụ lục, thu 100% chỉ còn ở hợp đồng `paymentPlan === null`                                                                                                       |
| Quản lý / Quản trị | Bàn thu tiền: dòng "Một khoản của hợp đồng 30/70"                                                                          | DONE                   | `pages/payments-page.tsx`; dòng không có `contractId` thì nút "Hợp đồng của khách" mở danh sách lọc theo `customerId`                                                                                              |
| Quản lý / Quản trị | Nghiệm thu nội bộ                                                                                                          | Đã gỡ (410)            | `CompletionPanel.tsx` chỉ còn "Trả về làm lại" và ghi đỏ điều chặn khách nghiệm thu (checklist, thiết bị khác hợp đồng)                                                                                            |
| Quản lý / Quản trị | Công nợ: thêm xem xét pháp lý, đóng hồ sơ                                                                                  | DONE                   | `/manage                                                                                                                                                                                                           | admin/collections(/:id)`; `POST …/legal-review`, `…/resolve` |
| Quản trị           | Tài chính hợp đồng (hiện tại / trong kỳ, khu vực, ≤ 366 ngày)                                                              | DONE                   | Tab "Tài chính hợp đồng" ở `/admin/reports?muc=tai-chinh`; `GET /admin/finance/overview`                                                                                                                           |

## 3. File thay đổi và file mới

**Mới**

- `src/types/res/paymentPlanRes.ts`, `src/types/req/paymentPlanReq.ts`: DTO viết tay theo record C# (swagger chỉ khai "200 OK").
- `src/common/paymentPlan.ts`: enum, nhãn, giới hạn.
- `src/services/installmentService.ts`, `signatureSetService.ts`, `contractDirectoryService.ts`, `collectionService.ts`, `adminFinanceService.ts`.
- `src/hooks/usePaymentPlan.ts`, `paymentPlanKeys.ts`, `useCollections.ts`, `useAdminFinance.ts`.
- `src/features/payment-plan/`: `paymentPlanRules.ts` (luật thuần), `paymentPlanDisplay.ts`, `InstallmentPlanPanel.tsx`, `InstallmentPaymentBlock.tsx`, `SignatureSetPanel.tsx`, `collectionRoutes.ts`.
- `src/features/installations/CustomerAcceptancePanel.tsx`, `src/features/admin-dashboard/FinanceOverview.tsx`.
- `src/pages/collections-page.tsx`, `src/pages/collection-page.tsx`.
- `tests/payment-plan-rules.test.mjs` (24 test), `tests/e2e/payment-plan.live.e2e.mjs` (chỉ đọc).

**Sửa (chính)**

- `customerContractsRes.ts` (`paymentPlan`), `quotationsRes.ts` (`contractId`), `staffPaymentsRes.ts` (`contractInstallmentId`).
- `common/file.ts`: thêm `SIGNED_CONTRACT_PAGE` (chỉ nhận ảnh, ≤ 20 MiB; PDF chỉ nhận khi backend bật cài đặt mà web không đọc được nên không mặc định), `ACCEPTANCE_EVIDENCE`, `COLLECTION_EVIDENCE` (≤ 15 MiB).
- `fileService.ts`, `useFiles.ts`: tệp đã đăng ký mà còn `PENDING_VERIFICATION` thì giữ `fileId`; lần thử sau chỉ gọi `…/verify` trên đúng tệp đó, không tải lại. Hàng đợi tải nhận chú thích ban đầu (số trang).
- `endpoints.ts`: thêm `installments`, `signatureSets`, `contractDirectory`, `customerAcceptance`, `collections`, `adminFinance`; bỏ `managerInstallations.acceptance`, `customerContracts.signedDocument`.
- `errors.ts`: câu cho các mã lỗi 30/70, hợp đồng giấy, công nợ; `CONTRACT_WARRANTY_REQUIRED` chỉ ra cấu hình của quản trị.
- `contract-page.tsx`, `contracts-page.tsx`, `customer/contract-page.tsx`, `customer/contracts-page.tsx`, `customer/project-page.tsx`, `installation-project-page.tsx`, `payments-page.tsx`, `admin/reports-page.tsx`.
- `contractRules.ts` (`ContractViewer` thêm `technician`), `customerContractRules.ts` (`isCustomerTodo` theo chặng 30/70), `scheduleRules.ts` (`canRetryConfirm` nhận SIGNED khi backend báo không còn chờ tiền / chờ ký), `acceptanceRules.ts` (đổi thành `awaitsCustomerAcceptance`, `customerAcceptanceBlockers`).
- `routes/paths.ts`, `routes/protectedRoutes.tsx`, `config/portals.ts`: route và menu "Hợp đồng" (kinh doanh, kỹ thuật viên), "Thu hồi công nợ" (kinh doanh, quản lý, quản trị).
- `useManagerNavAlerts.ts`: dự án chờ nghiệm thu không còn tính vào số đỏ của quản lý (việc của khách).
- `usePaymentDesk.ts`: xác nhận tiền mặt xong thì tải lại cả khoản trả và báo cáo tài chính.

**Endpoint đã bỏ khỏi FE (410 ở 7d27054):** `POST /technician/quotations/{id}/payment`, `POST /installation-projects/{id}/acceptance`, `POST /customers/me/contracts/{id}/signed-document`. Test `tests/technician-onsite-flow.test.mjs` quét `src/` để chắc không còn gọi.

**Lệch giữa tài liệu BE và code BE (theo code):**

- FE_HANDOFF §1.3 ghi `POST /api/files/upload-url`; `FilesController` thật là `POST /api/files/presigned-upload`. FE giữ đường đúng.
- Dòng `CONTRACT_INSTALLMENT` của bàn thu tiền có `contractId = null` (chỉ có `contractInstallmentId`). FE dẫn sang danh sách hợp đồng theo `customerId`.
- Lịch thi công (`InstallationScheduleView`) không mang gói thanh toán. FE suy "sẵn sàng" của hợp đồng 30/70 từ SIGNED kèm `awaitingPayment` và `awaitingContractSignature` đều false.

## 4. Hồi quy đã kiểm

- **Hợp đồng cũ (`paymentPlan === null`):** trang nhân viên và khách giữ nguyên luồng cũ: tracker, phát hành, PDF, gửi ký, duyệt bản ký, phụ lục, thu 100%, lịch sử bản ký. Riêng khách không còn tự gửi bản ký vì backend đã bỏ cho mọi hợp đồng.
- **Sau bán** (gói, báo giá sửa chữa / bảo trì, tiền mặt sau bán): không đổi, vẫn trả 100% trước; dòng ở bàn thu tiền giữ nhãn cũ.
- **Không có màn / nút / số tiền hoàn tiền.** Báo cáo tài chính không hiện `refunded`. Không có nút tịch thu cọc, thu hồi thiết bị, phạt, lãi. Quyền sở hữu chỉ ghi "đủ điều kiện xem xét chuyển quyền sở hữu (theo quy trình, pháp lý)". Điều khoản còn chờ duyệt pháp lý thì báo vàng.

## 5. Lệnh đã chạy

| Lệnh                   | Kết quả                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | PASSED                                                                                                                                                                        |
| `npm run lint`         | PASSED, 0 lỗi, 3 cảnh báo có từ trước (`app-shell.tsx`, `AuthProvider.tsx`, `stitch-ui/Button.tsx`)                                                                           |
| `npm test`             | PASSED: 321 test / 81 suite, 0 fail, 0 skip (gồm `ui-rules.test.mjs` và 24 test mới)                                                                                          |
| `npm run format:check` | PASSED                                                                                                                                                                        |
| `npm run build`        | PASSED (exit 0)                                                                                                                                                               |
| `npm run test:e2e`     | SKIPPED: 19/19 test có sẵn bị bỏ qua vì không có biến `E2E_*`; file mới `payment-plan.live.e2e.mjs` cũng bỏ qua. Dù có tài khoản, server chung vẫn chưa chạy 7d27054 (mục 1). |

Không có ảnh chụp màn hình: không đăng nhập được vào backend chạy 7d27054.

**Test thuần mới** (`tests/payment-plan-rules.test.mjs`):

- phân nhánh 30/70 / cũ;
- đúng `dueAt` chưa quá hạn, `dueAt + 1 s` quá hạn;
- ví dụ 72 giờ theo giờ Việt Nam của backend (19/11 23:30 → 22/11 16:30 UTC);
- tách "còn lại", "phải trả ngay", "quá hạn";
- chọn tiền mặt chưa phải đã trả;
- lý do chưa trả được theo `PayableProblem`;
- thiếu trang không chốt được, thay trang trước khi chốt, đã chốt là khoá, số trang 1–50, ngày ký;
- xếp ảnh vào trang;
- nghiệm thu: lý do bắt buộc khi không nghiệm thu, ≤ 10 tệp, ảnh chỉ kèm khi làm lại;
- công nợ: AGREEMENT bắt buộc ngày hẹn, kinh doanh không chuyển pháp lý / không đóng hồ sơ;
- tài chính: khoảng ≤ 366 ngày, mặc định tháng này.

**Chưa có:** E2E cho 10 hành trình đầy đủ (thanh toán thật, xác nhận tiền mặt, chốt trang, nghiệm thu). Các hành trình này ghi dữ liệu và tiền thật, nên cần stack kiểm thử riêng chạy 7d27054 (`tests/e2e/stack-*` của repo), không chạy được trên server chung.

## 6. Còn lại

1. **Server chung chưa chạy 7d27054** (mục 1). Ảnh hưởng: mọi màn mới báo lỗi tải, và các lệnh cũ đã gỡ khỏi FE. Xử lý: deploy backend 7d27054 (kèm migration của bản này) trước FE, rồi chạy `tests/e2e/payment-plan.live.e2e.mjs` với tài khoản quản trị và khách.
2. **Tệp ký là PDF:** backend có cài đặt `PaymentPlan:AllowPdfSignedPages` (mặc định true) nhưng web không đọc được, nên web chỉ nhận ảnh. Cần một API đọc cài đặt nếu muốn nhận PDF.
3. **Quyền S3 / IAM:** các tiền tố mới `contracts/signed-pages/`, `installations/acceptance/`, `collections/` (và `payments/cash/` đang lỗi, xem trao đổi trước) cần `s3:PutObject`, `s3:GetObject`, `s3:GetObjectVersion`. Thiếu thì tải lên báo 403 hoặc kẹt ở "chưa kiểm tra được tệp". Đây là việc phía AWS, FE không sửa.
4. **E2E 10 hành trình** cần stack kiểm thử riêng (mục 5).
5. **Thông tin dự án trong danh sách công nợ / bàn thu tiền:** backend không trả số hợp đồng trên dòng thanh toán của một khoản, nên bàn thu tiền chỉ dẫn được tới danh sách hợp đồng của khách.
