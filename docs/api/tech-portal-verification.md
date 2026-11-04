# Kiểm tra cổng kỹ thuật viên: lịch chờ nhận, bổ sung biên bản, sửa tại chỗ

Phạm vi: 5 endpoint của cổng kỹ thuật viên trong [api-coverage-report.md](api-coverage-report.md) mục 8, cộng field
`stayOnSite` của báo cáo kiểm tra (đã có endpoint, FE chưa gửi). Code FE đối chiếu backend `main` 7c79fa8 (cùng ngày build
image) và swagger của image `c43e1cada345` đang chạy ngày 04/11/2026. Swagger đang chạy có đủ 5 path và đúng body như
dưới; `requiredParts` là chuỗi, `estimatedMinutes` là int32.

## Endpoint → service → giao diện

| Endpoint                                                   | Nguồn backend                                                                         | Service / hook                                          | Giao diện                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `GET /technicians/me/open-appointments/{id}`               | `TechnicianSchedulingControllers.cs:57`, `TechnicianHandlers.GetOpenAsync`:58         | `getOpenAppointment` / `useOpenAppointmentQuery`        | `/tech/jobs/open/:id` (tên công trình ở tab Chờ nhận) |
| `POST /technicians/me/appointments/{id}/accept` (có sẵn)   | `AppointmentAssignmentService.Precheck`, revision ở dòng 593                          | `acceptAppointment` / `useAcceptAppointmentMutation`    | "Nhận việc" trên trang chi tiết                       |
| `POST …/appointments/{id}/onsite-survey/amendments`        | `OnSiteSurveyControllers.cs:69`, `OnSiteSurveyHandlers.AmendAsync`:191                | `amendOnSiteSurvey` / `useAmendOnSiteSurveyMutation`    | "Bổ sung biên bản" ở `/tech/jobs/:id`                 |
| `POST …/after-sales/visits/{id}/inspection` (`stayOnSite`) | `AfterSalesControllers.cs:217`, `TechnicianServiceHandlers.ReportInspectionAsync`:113 | `reportInspection` / `useInspectionReportMutation`      | ô "Ở lại công trình để sửa luôn"                      |
| `POST …/after-sales/visits/{id}/continue-repair`           | `AfterSalesControllers.cs:226`, `ContinueWithRepairAsync`:170                         | `continueRepair` / `useContinueRepairMutation`          | "Sửa luôn" (`OnSiteWaitPanel`)                        |
| `POST …/after-sales/visits/{id}/finish`                    | `AfterSalesControllers.cs:234`, `FinishOnSiteWaitAsync`:198                           | `finishOnSite` / `useFinishOnSiteMutation`              | "Kết thúc buổi chờ" (`OnSiteWaitPanel`)               |
| `POST …/after-sales/visits/{id}/supplementary-items`       | `AfterSalesControllers.cs:239`, `AddSupplementaryItemAsync`:218                       | `addSupplementaryItem` / `useSupplementaryItemMutation` | "Báo hạng mục phát sinh" (`SupplementaryItemDialog`)  |

Số dòng `TechnicianServiceHandlers.cs`, `OnSiteSurveyHandlers.cs` theo `origin/main`. Request DTO sinh từ
`docs/api/swagger.json` (5 path chép từ swagger đang chạy, `$ref` đổi về tên ngắn, rồi `npm run gen:api`; chỉ
`technicianAfterSalesReq.ts` đổi). Response dùng kiểu viết tay có sẵn: `OpenAppointmentView`, `TechnicianVisitView`
(có `waitingOnSite`), `OnSiteSurveyView` (có `version`, `amendments`, `attachments[].amendmentId`).

## Luật đã bám

- Chi tiết lịch chờ nhận trả 404 khi lịch không còn mở hoặc ngoài khu vực; trang hiện "không còn chờ nhận" kể cả khi cache
  còn bản cũ. Nhận việc gửi `expectedRevision` của lần GET mới nhất; 409 `APPOINTMENT_ALREADY_TAKEN` /
  `APPOINTMENT_CONCURRENCY_CONFLICT` thì tải lại, không tự gửi lại.
- Bổ sung: lý do bắt buộc ≤ 1000; `changes` ô null là giữ nguyên (`Merge`), nên FE chỉ gửi ô đã đổi; ô chữ xoá trắng gửi
  `""`; ô số / toạ độ không xoá được (FE chặn); đổi toạ độ gửi cả hai (BE kiểm cặp trên chính `changes`); vật cản đổi thì gửi
  cả danh sách. Biên bản sau khi gộp phải đủ 10 ô bắt buộc. Tệp `ONSITE_SURVEY_EVIDENCE` đã xác minh, của chính người gửi, BE
  gắn loại `DOCUMENT`. BE ghi `{ ô: { old, new } }` mỗi lần, `version` tăng; FE hiện lịch sử ở cả cổng kỹ thuật viên và kinh
  doanh. Trong `main` 7c79fa8, bổ sung không làm báo giá / hợp đồng cũ hết hiệu lực nên FE không thêm quy tắc nào về việc đó.
- `stayOnSite: true` chỉ khi có hạng mục (BE từ chối kèm `noFaultFound`). Buổi vẫn `IN_PROGRESS`, `waitingOnSite` true.
  `TechnicianVisitView` không có trạng thái yêu cầu, nên khối chờ chỉ gợi ý đang chờ gì theo `AfterSalesWorkflow.NextStatus`
  từ `items`; nút Sửa luôn luôn bật, BE quyết định.
- `continue-repair`: 1–480 phút; thứ tự lỗi của BE: không còn chờ (409 `AFTER_SALES_INVALID_STATE`) → chưa `READY_FOR_WORK`
  (`AFTER_SALES_PAYMENT_REQUIRED`) → thiếu linh kiện → vượt khung giờ. Ba lỗi sau hiện lý do + chỉ "Kết thúc buổi chờ"; FE
  không tự gọi `finish`. `finish` không thay báo cáo công việc: chỉ đóng buổi kiểm tra với kết quả đã gửi, quản lý xếp buổi sửa.
- Hạng mục phát sinh chỉ trong buổi `REPAIR` / `REWORK` đang làm; mới là `OPEN` + `PENDING`, nên không vào `results` của báo
  cáo công việc cho tới khi được `AUTHORIZED`.

## Đã chạy

| Kiểm tra                                    | Lệnh                                                                                  | Kết quả 04/11/2026                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Kiểu                                        | `npm run typecheck`                                                                   | đạt                                                |
| Lint                                        | `npm run lint`                                                                        | 0 lỗi; 3 cảnh báo có sẵn ở file ngoài phạm vi      |
| Build                                       | `npm run build`                                                                       | đạt                                                |
| Luật (23 tình huống, cả bộ 145)             | `npm test`                                                                            | 145/145 đạt                                        |
| E2E với API giả (10 tình huống)             | `node --test --test-concurrency=1 tests/e2e/tech-portal.e2e.mjs`                      | 10/10, chạy 3 lần liên tiếp                        |
| Route có trên image đang chạy (không token) | `curl` 5 endpoint + `inspection`                                                      | đều 401; đường dẫn đối chứng không tồn tại trả 404 |
| E2E với backend thật, chỉ đọc               | `E2E_TECH_EMAIL=… E2E_TECH_PASSWORD=… node --test tests/e2e/tech-portal.live.e2e.mjs` | **chưa chạy**: không có tài khoản kỹ thuật viên    |

E2E với API giả bám đúng thứ tự kiểm tra của handler (`tests/e2e/mock-tech-api.mjs`); bước của quản lý, kinh doanh, khách
(quyết định chi phí, báo giá, thanh toán PayOS, xếp buổi sửa) được giả lập bằng hàm đổi state, không chạy qua giao diện các
cổng đó. Không chứng minh backend thật chạy.

## Còn chặn / chưa xác minh

- Chưa chạy luồng với dữ liệu thật: cần tài khoản kỹ thuật viên và dữ liệu (lịch chờ nhận trong khu vực, biên bản đã hoàn
  thành, yêu cầu báo lỗi có buổi kiểm tra đang làm). Luồng sửa tại chỗ thật cần quản lý quyết định + khách thanh toán PayOS
  trong khung giờ của buổi.
- Image 31/10 (`hoaikhoitran/smartsolar-api:2026-10-31`) bị `SCHEMA_NOT_READY` trên DB dùng chung nên chưa đối chiếu; tên
  migration `AutomatedInstallationQuotation` gợi ý luồng báo giá đổi, có thể đổi tác động của bổ sung biên bản lên báo giá.
- View lần bổ sung không có id: FE ghép tệp với lần bổ sung theo mốc giờ (`addedAt === createdAt`, cùng `now` trong một giao
  dịch ở `AmendAsync`). Backend thêm `amendmentId` vào `AmendmentView` thì nên ghép theo id.
- `TechnicianVisitView` không có trạng thái yêu cầu (`READY_FOR_WORK`): muốn khoá nút Sửa luôn đúng như BE thì cần BE thêm
  field này; hiện FE chỉ gợi ý theo `items`.
