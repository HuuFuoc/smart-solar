# Gói dịch vụ đi kèm báo giá lắp đặt: khoảng trống FE ↔ BE

**Trạng thái: BLOCKED ở backend.** Frontend đã có luật và component sẵn để gắn (nhánh `feat/bundled-service-packages-quotation`),
nhưng chưa gắn vào màn nào vì chưa có API để đọc, ghi hay thanh toán gói đi kèm.

Đối chiếu ngày 24/11/2026 với:

- backend `hoaikhoitran/smart-solar-backend` nhánh `origin/main` commit `09e0876` (đã gồm 30/70 `7d27054`);
- swagger của server chung `http://160.187.1.242:8080/swagger/v1/swagger.json` (345 đường dẫn, khớp `09e0876`);
- `docs/api/swagger.json` của FE (`6a2f8be`, cũ hơn, chưa có các đường 30/70).

## 1. Kết luận nhanh

| Khả năng cần cho tính năng                           | Backend hiện có                                        | Ảnh hưởng FE                        |
| ---------------------------------------------------- | ------------------------------------------------------ | ----------------------------------- |
| Kỹ thuật viên xem danh sách gói đang bán             | Không. Chỉ có đường của Customer và Admin              | Hộp thoại chọn gói không có dữ liệu |
| Gắn / đổi / bỏ gói trong báo giá                     | Không. Dòng giỏ chỉ là sản phẩm danh mục (`productId`) | Không lưu được lựa chọn             |
| Bản chụp gói trong báo giá, tổng tách lắp đặt và gói | Không. `QuotationView` không có trường gói             | Không hiện được ở màn nào           |
| Chuyển gói sang hợp đồng khi khách đồng ý            | Không                                                  | Không hiện được ở hợp đồng          |
| Khoản 70% gồm cả tiền gói (một lần thanh toán)       | Không, và **đang bị cấm** (mục 3)                      | Không mở được thanh toán gộp        |
| Trạng thái gói của một hợp đồng cho nhân viên        | Không. Chỉ khách đọc được gói của chính mình           | Nhân viên không thấy trạng thái     |
| Trạng thái gói cho khách                             | Có: `GET /api/customers/me/after-sales/subscriptions`  | Dùng được khi đã có gói đi kèm      |

Không có khả năng nào đủ để làm một phần tính năng chạy thật. Theo yêu cầu, FE không tự đặt đường API, không gọi API của khách
bằng tài khoản kỹ thuật viên, không dùng dữ liệu giả và không giả lập đã lưu hay đã thanh toán.

## 2. Những gì backend đang có (đã đọc mã nguồn)

### 2.1 Danh mục gói

| Đường                                         | Vai trò  | Ghi chú                                                     |
| --------------------------------------------- | -------- | ----------------------------------------------------------- |
| `GET /api/customers/me/after-sales/packages`  | Customer | `activeOnly: true`. `AfterSalesControllers.cs:157`          |
| `GET /api/admin/after-sales/packages`         | Admin    | Cả gói ngừng bán. `AfterSalesControllers.cs:603`            |
| `POST/PUT /api/admin/after-sales/packages`    | Admin    | Sửa gói chỉ ảnh hưởng lần mua sau (bản chụp ở subscription) |
| `GET /api/sales/after-sales/warranty-options` | Sales    | Chỉ thời hạn bảo hành, không phải gói                       |

Kỹ thuật viên (`[Authorize(Roles = Technician)]`) không có đường nào đọc gói. `PackageView` (`AfterSalesViews.Package`) có đủ
trường FE cần: `packageId, kind, name, description, price, durationMonths, visitMonths, coveredDisasterTypes, coveragePercent,
perIncidentLimit, termLimit, isActive, revision, imageUrl`.

### 2.2 Giỏ báo giá của kỹ thuật viên

`QuotationTechnicianCart.cs`: mọi dòng là một sản phẩm danh mục đang bán có giá VND (`AddCartLineAsync(productId, quantity)`),
định giá lại theo danh mục lúc chốt (`IssueCartAsync`). Thuế theo `QuotationOptions.DefaultTaxRatePercent`, không giảm giá. Không
có loại dòng nào cho gói dịch vụ, và gói (`ServicePackage`, module AfterSales) không phải sản phẩm danh mục.

`QuotationView` (swagger server chung): `quotationId, quoteNumber, …, lines, equipmentSubtotal, laborCost, transportCost,
otherServiceCost, subtotal, discountAmount, taxRatePercent, taxAmount, totalAmount, …, revision, …, contractId`. Không có trường gói.

### 2.3 Mua gói hiện nay (mua riêng)

`POST /api/customers/me/after-sales/purchases` (`ServicePackageHandlers.PurchaseAsync`), chỉ Customer:

- `includeContract: true` chỉ cho hợp đồng **cũ** (không có `paymentPlan`) đang `SIGNED`: một link PayOS gồm tiền hợp đồng và
  tiền gói.
- Hợp đồng 30/70 (`contract.PaymentPlan is not null`) gửi `includeContract: true` bị từ chối `AFTER_SALES_INVALID_STATE`:
  "This contract is paid in two installments; pay its installment first, then buy the packages separately once it is fully paid."
- Không `includeContract` thì hợp đồng phải `PAID`. Với 30/70 nghĩa là đã trả đủ cả hai khoản.

FE đang làm đúng luật này: `packagePurchaseMode` (`src/features/payment-plan/paymentPlanRules.ts`) và `purchasableContracts`
(`src/features/after-sales/afterSalesDisplay.ts`) chỉ cho mua riêng khi hợp đồng 30/70 đã `PAID`.

### 2.4 Thanh toán từng khoản 30/70

`InstallmentPaymentHandlers.StartAsync` tạo **một** dòng `CheckoutItem(PaymentItemTypes.ContractInstallment, …, i.Amount, …, i.Id)`.
`InstallmentPaymentView`: `contractId, contractNumber, installmentId, sequence, kind, amount, currency, installmentStatus, dueAt,
overdue, paidAt, paidLate, paymentState, current, attempts`. Không có dòng gói, không có tổng thanh toán khác `amount`.

Tiền cọc tính bằng `PaymentPlanCalculator.Split`: `deposit = round(total × 30%, AwayFromZero)`, `balance = total − deposit`.

### 2.5 Gói đã mua và lúc bắt đầu

`SubscriptionView` có `status` (`AWAITING_PAYMENT, CHECKOUT_EXPIRED, PAID, ACTIVE, EXPIRED, CANCELLATION_REQUESTED, CANCELLED`),
`startsAt, endsAt, coverageStartsAt, paidAt, …`. `SubscriptionTerms.StartTermIfPossibleAsync` chỉ đặt kỳ khi **đã xác nhận tiền
và đã bàn giao**, lấy mốc muộn hơn; gói thiên tai bắt đầu bảo vệ sau `DisasterWaitingDays` (gia hạn liền kỳ thì không chờ).
`ActivateIfDue` chuyển `PAID → ACTIVE` khi tới ngày bắt đầu.

Trong luồng 30/70, khách nghiệm thu (`InstallationCustomerAcceptance.cs:85-87`) thì dự án `COMPLETED` và `HandoverAt = now`, sau
đó khoản 70% mới mở. Vậy gói trả cùng khoản 70% sẽ bắt đầu kỳ ngay lúc tiền được xác nhận.

## 3. Xung đột nghiệp vụ cần chốt trước khi làm backend

Yêu cầu mới: gói trả 100% **cùng** khoản 70%. Backend đang ghi rõ điều ngược lại là quyết định đã chốt:

- `guides/payment-30-70/BACKEND_CHANGE_REPORT.md`: "After-sales: 100% upfront, unchanged (no bundling with a 30/70 contract)".
- `AfterSalesContracts.cs:16`: "paid per installment; never bundled with a package checkout".
- `ServicePackageHandlers.cs:253`: "its balance is never bundled with packages".

Cần nhóm (và người viết backend) đồng ý bỏ quyết định đó. Các câu hỏi cần trả lời cùng lúc:

1. **Chốt giá gói lúc nào.** Đề xuất: như dòng sản phẩm, chụp lúc gắn để xem trước và chụp lại lúc chốt báo giá; từ lúc chốt thì
   bất biến (báo giá, hợp đồng, thanh toán dùng bản chụp đó).
2. **Gói ngừng bán giữa chừng.** Đề xuất: lúc chốt mà gói đã ngừng bán thì chặn chốt (`SERVICE_PACKAGE_INACTIVE`, kèm gói nào),
   như `QUOTATION_PRICE_MISSING` của dòng hàng. Đã chốt rồi thì giữ bản chụp.
3. **Bản sửa báo giá.** Đề xuất: bản sửa chép các gói của bản trước (rồi chụp lại giá lúc chốt bản sửa).
4. **Khách đồng ý mà không lấy gói.** Hiện chỉ có "khách muốn sửa" để lập bản sửa bỏ gói; có cần cho bỏ gói ngay ở màn trình bày không.
5. **Thuế.** Giá gói hiện là giá cuối, không cộng VAT. Gói đi kèm có giữ như vậy không.
6. **Tổng hợp đồng.** Đề xuất: `contract.totalAmount` vẫn chỉ là chi phí lắp đặt (30/70 tính trên số này), tiền gói là dòng
   riêng của khoản 2, giống `includeContract` hiện nay ("the contract total never changes").
7. **Đơn gói tạo lúc nào và ở trạng thái nào.** Nếu tạo `ServiceSubscription` ngay khi khách đồng ý thì nó chờ nhiều ngày tới khi
   khoản 70% mở; `AWAITING_PAYMENT` hiện gắn với `CheckoutExpiresAt` và các sweep hết hạn. Cần trạng thái riêng (vd.
   `AWAITING_BALANCE`) hoặc chỉ tạo đơn khi mở thanh toán khoản 2.
8. **Huỷ trước khoản 70%.** Công trình huỷ, khách đổi ý trước khi trả cọc, hợp đồng huỷ: gói chưa thu tiền thì huỷ theo. Nhóm
   không làm hoàn tiền, nên không có trường hợp đã thu tiền gói mà phải trả lại nếu gói chỉ thu cùng khoản 70%.
9. **Quá hạn khoản 70%.** Hồ sơ thu hồi công nợ (`collections`) tính trên khoản 70% thôi hay cả tiền gói.
10. **Tiền mặt.** Quản lý xác nhận thu tiền mặt khoản 2 phải đối chiếu tổng (70% + gói), như combined cash checkout hiện có.
11. **Báo cáo tài chính.** Khoản 2 gộp phải tách dòng installment và dòng gói, mỗi dòng tính một lần (như `PaymentItemTypes`).

## 4. Đề xuất hợp đồng API (chưa có, để backend quyết định)

Tên đường đặt theo các đường kỹ thuật viên đang có (`/api/technician/quotations/{id}/lines`,
`/api/technician/contracts/{id}/installments/{sequence}/payment`). Mọi lệnh ghi gửi `revision` và trả lại `QuotationView` mới,
lệch revision thì `409 QUOTATION_STALE_REVISION`, giống giỏ hiện nay.

### 4.1 Danh mục cho kỹ thuật viên

```
GET /api/technician/service-packages?kind=MAINTENANCE|DISASTER_PROTECTION
Role: Technician (có thể mở cho Sales / Manager / Admin để đọc)
200: PackageView[]  (chỉ isActive = true, giống đường của Customer)
```

### 4.2 Gắn, đổi, bỏ gói trong giỏ nháp

```
PUT    /api/technician/quotations/{quotationId}/service-packages/{kind}
       body { "packageId": "uuid", "revision": 7 }
       Gắn gói cho loại đó; loại đó đã có gói thì thay (mỗi loại tối đa một gói, số lượng luôn 1, không có ô giá).
DELETE /api/technician/quotations/{quotationId}/service-packages/{kind}?revision=7
200: QuotationView
Lỗi: 404 (không phải kỹ thuật viên đã khảo sát), 409 QUOTATION_NOT_DRAFT, 409 QUOTATION_STALE_REVISION,
     404 SERVICE_PACKAGE_NOT_FOUND (hoặc kind không khớp), 409 SERVICE_PACKAGE_INACTIVE
```

Dùng `PUT …/{kind}` để "đổi gói" là một lệnh nguyên tử, không phải bỏ rồi thêm (tránh trạng thái giữa chừng khi lỗi).

### 4.3 Trường mới của `QuotationView`

```jsonc
{
  "servicePackages": [
    {
      "quotationPackageId": "uuid",
      "packageId": "uuid",
      "kind": "MAINTENANCE",
      "name": "Bảo trì cơ bản",
      "description": "…",
      "imageUrl": null,
      "price": 2000000,
      "durationMonths": 12,
      "visitMonths": [6, 12],
      "coveredDisasterTypes": [],
      "coveragePercent": null,
      "perIncidentLimit": null,
      "termLimit": null,
      "snapshotAt": "2026-11-24T05:00:00Z",
    },
  ],
  "installationTotal": 50000000, // = totalAmount hiện nay (thiết bị, vật tư, thuế)
  "maintenancePackagesTotal": 2000000,
  "disasterPackagesTotal": 3000000,
  "servicePackagesTotal": 5000000,
  "grandTotal": 55000000,
}
```

`totalAmount` giữ nghĩa cũ (chi phí lắp đặt) để màn cũ không đổi số. Báo giá cũ trả `servicePackages: []` và các tổng gói 0.

### 4.4 Chốt, bản sửa, khách đồng ý

- `POST /api/technician/quotations/{id}/issue`: chụp lại giá gói, gói ngừng bán thì chặn (mục 3.2).
- `POST /api/technician/quotations/{id}/revisions`: chép gói sang bản nháp mới.
- Ghi khách đồng ý (`on-site-decision` AGREED): hợp đồng 30/70 lấy `installationTotal` để chia, lưu bản chụp gói vào hợp đồng.

### 4.5 Hợp đồng và thanh toán khoản 2

```jsonc
// ContractView / ContractPaymentPlanView thêm
"servicePackages": [ /* bản chụp như 4.3, kèm subscriptionId và status khi đã tạo đơn */ ],
"servicePackagesTotal": 5000000

// InstallmentView, InstallmentPaymentView của sequence 2 thêm
"packagesAmount": 5000000,
"checkoutAmount": 40000000,           // = amount (70% lắp đặt) + packagesAmount
"lines": [
  { "type": "CONTRACT_INSTALLMENT", "amount": 35000000 },
  { "type": "MAINTENANCE_PACKAGE", "subscriptionId": "uuid", "amount": 2000000 },
  { "type": "DISASTER_PACKAGE", "subscriptionId": "uuid", "amount": 3000000 }
]
```

- Sequence 1: chỉ `CONTRACT_INSTALLMENT` (30% lắp đặt), `packagesAmount = 0`. Không bao giờ thu tiền gói ở khoản 1.
- Sequence 2: `StartAsync` (customer, technician) tạo một link PayOS / một lần tiền mặt gồm dòng khoản 70% và các dòng gói.
  Không có lần thanh toán bắt buộc riêng cho gói đi kèm.
- Xác nhận tiền: khoản 70% qua `PaymentPlanLedger`, dòng gói qua `AfterSalesPaymentSettlement` (→ `PAID` → `StartTermIfPossible`).
- `GET /api/contracts/{id}/installments/2/payment` (đọc của nhân viên) trả cùng các trường trên.

### 4.6 Trạng thái gói cho nhân viên

```
GET /api/contracts/{contractId}/service-packages
Role: Sales, Technician, Manager, Admin (đọc, giống GET /api/contracts)
200: SubscriptionView[] của hợp đồng
```

Khách đã có `GET /api/customers/me/after-sales/subscriptions` (lọc theo `contractId` ở FE).

## 5. FE đã làm trên nhánh này

| File                                                                                       | Nội dung                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/quotations/bundledPackageRules.ts`                                           | Luật: chỉ giỏ nháp kỹ thuật viên sửa gói; chọn = thêm / đổi gói cùng loại / chặn (trùng, ngừng bán, đã chốt); tổng theo loại; chia 30/70 như `PaymentPlanCalculator.Split`; lịch trả (khoản 1 = 30% lắp đặt, khoản 2 = 70% + 100% gói), ưu tiên số của backend; trạng thái gói suy từ `SubscriptionView` |
| `src/features/quotations/BundledPackagePicker.tsx`                                         | Hộp thoại "Thêm gói dịch vụ": hai loại gói, ảnh, tên, mô tả, giá, thời hạn, quyền lợi theo loại; nút Chọn / Đổi / Đã chọn / Ngừng bán; tải, rỗng, lỗi; khoá khi đang gửi                                                                                                                                 |
| `src/features/quotations/BundledPackagesSection.tsx`                                       | Khối "Gói dịch vụ đi kèm" (bảng riêng, Đổi / Bỏ / Thêm gói dịch vụ), bảng tổng tách lắp đặt và gói, nhãn trạng thái gói                                                                                                                                                                                  |
| `src/features/payment-plan/BundledPaymentBreakdown.tsx`                                    | Bảng hai khoản: lắp đặt, gói dịch vụ, phải trả; ghi tạm tính khi chưa có số của backend                                                                                                                                                                                                                  |
| `tests/bundled-packages-rules.test.mjs`                                                    | 26 test luật (mục 7)                                                                                                                                                                                                                                                                                     |
| `src/features/after-sales/PackageList.tsx`, `src/features/quotations/QuotationContent.tsx` | Chỉ thêm `export` cho `PackageCover`, `TotalRow` để dùng lại; giao diện không đổi                                                                                                                                                                                                                        |

Kiểu `BundledPackage` của FE là bản chụp tối thiểu (`PackageTerms` + `packageId, name, description, imageUrl`), không phụ thuộc
tên trường backend sẽ chọn; khi có API chỉ cần một hàm đổi từ view của backend sang kiểu này.

Chưa gắn vào màn nào, nên màn hiện tại của mọi vai trò không đổi.

## 6. Việc FE làm tiếp khi backend xong

1. Thêm đường vào `src/services/api/endpoints.ts`, hàm vào `technicianQuotationService.ts`, kiểu vào `technicianQuotationsRes.ts`
   / `quotationsRes.ts` / `paymentPlanRes.ts`, mutation vào `useTechnicianQuotations.ts` (cùng mẫu revision + invalidate).
2. Gắn khối (các file dưới đây đang khoá giao diện, chủ sở hữu tự sửa hoặc mở khoá):
   - `TechnicianQuotationPanel.tsx` `CartEditor`: `BundledPackagesSection` editable + `BundledPackagePicker` dưới bảng dòng hàng,
     thay `QuotationTotals` bằng `BundledQuotationTotals` khi có gói. `IssuedQuotation`: khối chỉ đọc.
   - `OnSiteQuotation.tsx` `PresentQuotationDialog`: khối chỉ đọc + `BundledPaymentBreakdown` trước khi ghi khách đồng ý.
   - `QuotationReadPanel.tsx` (kinh doanh, quản lý, quản trị), `ContractSnapshotPanel.tsx` (bản chụp hợp đồng),
     `src/features/contracts/contractPrint.ts` (bản in hợp đồng).
   - `InstallmentPlanPanel.tsx` / `InstallmentPaymentBlock.tsx`: khoản 2 hiện `checkoutAmount` và dòng gói của backend, không tự cộng.
   - Trang hợp đồng của khách và nhân viên: `BundledPackageStatus` theo `SubscriptionView`.
3. Chỉ hiện khối khi backend trả trường (`Array.isArray(quotation.servicePackages)`), để server chưa nâng cấp không thấy nút chết.

## 7. Kiểm thử

`npm test` chạy `tests/bundled-packages-rules.test.mjs` (26 test). Các TC cần API thì chưa chạy được.

| ID    | Kịch bản               | Trạng thái                                                                                           |
| ----- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| TC-01 | Báo giá không có gói   | Đạt: màn không đổi (chưa gắn); luật: không gói thì đúng 30/70                                        |
| TC-02 | Thêm gói bảo trì       | Luật đạt (chọn = thêm). Lưu: BLOCKED (4.2)                                                           |
| TC-03 | Thêm gói thiên tai     | Luật đạt. Lưu: BLOCKED                                                                               |
| TC-04 | Thêm cả hai loại       | Luật đạt (tổng theo loại, hết loại thì tắt nút thêm). Lưu: BLOCKED                                   |
| TC-05 | Chọn trùng             | Luật đạt (chặn)                                                                                      |
| TC-06 | Bỏ gói ở bản nháp      | Luật tổng đạt. Lưu: BLOCKED                                                                          |
| TC-07 | Đổi gói                | Luật đạt (cùng loại là đổi). Lưu: BLOCKED                                                            |
| TC-08 | Chọn gói ngừng bán     | Luật đạt (chặn); backend vẫn phải từ chối `SERVICE_PACKAGE_INACTIVE`                                 |
| TC-09 | Sửa báo giá đã chốt    | Luật đạt (khoá); backend vẫn phải từ chối `QUOTATION_NOT_DRAFT`                                      |
| TC-10 | Admin đổi giá gói      | Luật đạt (tổng dùng bản chụp). Bản chụp phía server: BLOCKED                                         |
| TC-11 | Bản sửa báo giá        | BLOCKED (mục 3.3)                                                                                    |
| TC-12 | Trả khoản 1            | Luật xem trước đạt (chỉ 30% lắp đặt). Thanh toán: BLOCKED                                            |
| TC-13 | Trả khoản 2            | Luật xem trước đạt (70% + 100% gói). Thanh toán gộp: BLOCKED, backend đang cấm (mục 3)               |
| TC-14 | Thanh toán lỗi         | Luật đạt (chưa xác nhận thì không thành đã trả). Luồng PayOS: BLOCKED                                |
| TC-15 | Đã trả, chưa bàn giao  | Luật đạt (Chờ bàn giao, không bao giờ hiện đang hiệu lực khi backend chưa ACTIVE)                    |
| TC-16 | Đã trả và đã bàn giao  | Luật đạt (hiện theo ACTIVE của backend)                                                              |
| TC-17 | Gọi API không đủ quyền | Không áp dụng: FE không thêm lời gọi API nào; lỗi 401 / 403 vẫn qua `errorMessage` hiện có           |
| TC-18 | Tải lại trang          | BLOCKED (cần lựa chọn được lưu ở backend)                                                            |
| TC-19 | Hai người sửa cùng lúc | BLOCKED; khi có API dùng cơ chế `revision` + `QUOTATION_STALE_REVISION` sẵn có                       |
| TC-20 | Mua gói riêng như cũ   | Đạt: không đổi mã mua gói; luật `packagePurchaseMode` đã có test trong `payment-plan-rules.test.mjs` |

E2E cho luồng báo giá có gói và thanh toán khoản 2: chưa viết được vì chưa có API.
