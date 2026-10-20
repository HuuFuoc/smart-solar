# Smart Solar – Web Portal

## Git rules

- Never add `Co-Authored-By` or any AI-attribution trailer to commits or PRs. Applies to every agent and contributor.
- Conventional Commits: `type(scope): summary`.

## Hai bộ component, MỘT hệ token

Repo có hai thư mục component vì hai nhánh việc dựng song song, nhưng từ 22/09/2026 cả
hai ăn chung một hệ token trong `src/styles/globals.css`:

- `src/components/common/ui` (file kebab-case, token `canvas/fg/accent…`): MỌI portal đăng nhập. Các portal nhân viên
  (kinh doanh `/ops`, quản trị `/admin`, kỹ thuật viên `/tech` – `/field` chuyển về `/tech` –, quản lý `/manage`) dùng chung
  shell `components/layout/app-shell.tsx` (từ 08/10/2026, theo yêu cầu "admin phải đồng bộ"); khách hàng `/customer` có khung
  riêng `components/layout/customer-shell.tsx` (cùng ngày, theo yêu cầu "khách hàng phải là giao diện khác"), xem "Layout chung".
  Từ lượt màu 08/10/2026 portal kit cũng dùng icon Material Symbols (qua `Icon` của bộ Stitch) và có thêm `IconButton`,
  `SearchInput`, `Segmented` (`segmented.tsx`), `PanelAside`, `WithTooltip` (`tooltip.tsx`). Từ 10/10/2026 có `Combobox`
  (`combobox.tsx`): ô nhập kèm danh sách cho danh sách dài, lọc không phân biệt dấu ("ben thanh" ra "Phường Bến Thành"), giá
  trị vẫn là chuỗi; dùng cho phường/xã và gợi ý tên vật cản. `WizardSteps` (`wizard-steps.tsx`): thanh bước của form nhiều
  bước (vòng số + đường nối, bước xong có ✓ + tóm tắt và bấm được để quay lại; điện thoại là khối gọn "Bước 3/5: …" + thanh
  tiến độ + "Tiếp theo: …"), khác `Stepper` (dải tiến độ hành trình, chỉ để xem). Nhật ký audit `UI_AUDIT.md` chỉ giữ ở máy,
  không có trên git.
- `src/components/common/stitch-ui` (file PascalCase, token `surface/on-surface/primary…`,
  Material Symbols): trang công khai/xác thực, hộp thoại hết phiên, `/styleguide` (chỉ chạy ở dev) và các màn
  mock đã ẩn của admin/kỹ thuật viên. Shell Stitch (`AppShell`, `Sidebar`, `TopHeader`) và `config/nav.ts` đã xoá.
  (Hộp thoại đổi mật khẩu đã chuyển sang portal kit: `features/auth/components/ChangePasswordDialog.tsx`.)
- Token của bộ Stitch nay chỉ là bí danh trỏ vào token của portal kit (màu nền/chữ/đường
  kẻ, bán kính, bóng, họ chữ, thang chữ). Sửa giá trị ở block portal kit là cả hai đổi theo;
  ĐỪNG đặt lại hex hay px trong block Stitch.
- Bộ Stitch đặt style body trên root riêng của nó (`AppShell`, `StyleguidePage`), không đặt trên `<body>`.

## Quy tắc giao diện dùng chung (bắt buộc)

Rút ra từ 4 lượt audit giao diện; áp cho CẢ HAI bộ component.

1. **Bán kính: một giá trị 6px cho mọi thứ** (người dùng 08/10/2026: "cái nút nào cũng phải được bo góc chứ không phải
   chỗ có chỗ không") – nút, ô nhập, nhãn, mục menu, thẻ, dialog, thông báo, toast. Hai token `--radius-control` và
   `--radius-container` vẫn tách tên nhưng phải bằng nhau; mọi `rounded-*` của bộ Stitch đã ánh xạ về chúng. Không bo
   một nửa (`rounded-r-*`). Phần tử lồng sát trong khung có đệm dùng bán kính đồng tâm (ô của `Segmented`:
   `calc(var(--radius-control) - 3px)`). `rounded-full` chỉ cho hình tròn thật (avatar, chấm, điểm mốc tiến độ).
2. **Bóng chỉ cho lớp nổi** – dialog, drawer, menu (`--shadow-pop`). Thẻ tĩnh phân tách
   bằng nền và viền. `shadow-sm`/`shadow-md` trong bộ Stitch đã bị tắt.
3. **Thang chữ 5 bậc**: 13 / 15 / 18 / 24 / 32 px. Không dùng `text-[Npx]` cho chữ; cỡ icon
   giữ trong nhóm 16/20/24.
4. **Một màu thương hiệu, mỗi màu một vai trò** (lượt màu 08/10/2026, ghi đầy đủ ở đầu `globals.css`). Không thêm
   màu nhấn mới, không tô màu chỉ để trang trí; thêm sắc độ thì thêm token vào `globals.css` (cả 3 khối sáng/tối),
   không hard-code ở trang.
   - `accent` (xanh lá): nút đặc duy nhất của trang, mục menu / tab / trang / lựa chọn đang chọn, tiến độ đã xong.
     Sắc độ: `accent-soft` (nền "đang chọn", nền nút `soft`), `accent-muted` (mục đang mở trên rail, hover nút soft),
     `accent-line` (viền control đang chọn / bộ lọc đang áp dụng), `accent-fg` (chữ link, nhãn nút soft).
   - `danger` (đỏ): **thông báo và yêu cầu cần xử lý** (số đếm việc chờ, chờ nhận, quá hạn, chưa hẹn, thiếu thông số),
     lỗi, thao tác phá huỷ. Người dùng chốt 08/10/2026: "thông báo hay yêu cầu" phải đỏ. Mỗi sự việc chỉ báo đỏ MỘT lần
     trên một màn: số đỏ ở menu thì số trên tab cùng màn là xám; nhãn "Chờ hơn 1 ngày" trên dòng thì không thêm vạch đỏ
     ở lề; "Chưa hẹn" ở đầu trang chi tiết thì dòng thời gian chỉ ghi chữ. Khối đỏ đặc (số đếm, nút xoá đặc) dùng
     `danger-fill` + `on-danger`; chữ đỏ dùng `danger`.
   - `warn` (vàng): lưu ý không đòi làm ngay (dữ liệu chưa làm mới được, không vẽ được 3D, sản phẩm đã ngừng bán).
   - `ok` đang hoạt động / đúng tiến độ; `info` đang xử lý, thông tin cần đọc; `neutral` đã xong / không hoạt động.
   - Màu vật thể / dữ liệu (09/10/2026): `pv-glass` + `pv-frame` vẽ tấm pin trên mặt bằng 2D (màu vật liệu, không mang nghĩa
     trạng thái; 3D dùng hex cùng tông vì three.js không đọc token); `chart-1` là cột biểu đồ một chuỗi (đo bằng validator của
     skill dataviz ≥ 3:1 trên canvas ở cả hai chế độ). Chữ trên biểu đồ vẫn dùng token chữ (`fg-2`, `fg-3`), không dùng màu cột.
   - `scrim`: lớp phủ sau hộp thoại / drawer / hộp hết phiên, luôn làm tối trang (bg-fg/40 cũ làm SÁNG trang ở chế độ tối vì `fg`
     gần trắng – kiểm thử 09/10/2026).
   - Bề mặt: `rail` (vùng điều hướng ngả xanh nhạt), `surface-2` (cột phụ `PanelAside`, khối quy tắc), lớp phủ
     `hover` / `pressed` (tính từ màu chữ, đúng trên mọi nền). Mọi cặp chữ/nền đạt ≥ 4,5:1 ở cả hai chế độ, kể cả chữ
     trên lớp phủ rê chuột (đo bằng script, 08/10/2026).
   - Chế độ tối KHÔNG dùng xanh bạc hà sáng trên nền đen (khuôn "giao diện AI"): `accent` tối là xanh đậm 50% với chữ
     trắng như chế độ sáng; chữ màu thương hiệu (link) luôn dùng `accent-fg`, không bao giờ `text-accent` hay
     `text-primary` (hai token đó là màu nền nút, ở chế độ tối không đủ tương phản làm chữ).
   - Biến thể `dark:` của Tailwind theo đúng giao diện đang dùng như token (`@custom-variant dark` đầu `globals.css`:
     `data-theme`, không đặt thì theo hệ thống). Mặc định Tailwind chỉ đọc `prefers-color-scheme`: máy để tối mà chọn "Sáng"
     thì `dark:bg-fg` vẫn chạy và logo thành khối đen (người dùng báo 10/10/2026). Đừng viết `@media (prefers-color-scheme)` riêng.
     Giao diện đã lưu được áp bằng script trong `<head>` của `index.html` trước khi trang vẽ lần đầu (20/10/2026; trước đó ở
     `main.tsx`, phải chờ JS). Cần biết giao diện đang hiện thật (kể cả "theo hệ thống") thì dùng `useResolvedTheme()`.
5. **Nhãn trạng thái**: `Badge` – mọi trạng thái là nhãn nền nhạt cùng hình dạng (bán kính 6px), màu theo vai trò ở
   mục 4; `icon` chỉ cho thông báo cần làm ngay ở đầu trang. `Count` – số đếm cạnh mục menu/tab: `attention` = việc đang
   chờ người xem, nền đỏ như số thông báo; còn lại nền xám. Việc cần làm ngay hiện thành Badge đỏ có icon ở mô tả đầu
   trang (vd. "2 yêu cầu chờ hơn 1 ngày"). Nhãn trạng thái không bao giờ có viền; nút `soft` (cùng nền xanh nhạt) luôn
   có viền xanh mảnh, nên "Đang bán" và "Mở bán lại" không trông giống nhau.
6. **Không có chrome trang trí**: nhãn IN HOA giãn chữ, chip "badge" không mang thông tin,
   ô icon trang trí cạnh tiêu đề, mũi tên "→" dán sau nhãn link, dấu "•" nối chuỗi meta,
   chấm nhấp nháy `animate-pulse`. Chuyển động chỉ dùng cho trạng thái tải và phản hồi thao tác (hover, nhấn).
   Icon (Material Symbols qua `Icon` trong `components/common/stitch-ui/Icon.tsx`, dùng cho cả hai bộ) chỉ khi nó nói
   thêm điều chữ chưa nói hoặc giúp nhận ra nhanh: mục menu, hàng tài khoản; nút tạo (+), sửa, xoá, gọi, email, bản đồ,
   lưu nháp, xoá bộ lọc, hiện mật khẩu, thử lại; `Notice` loại ok/warn/danger, toast, thông báo đầu trang. KHÔNG icon
   cho nút điều hướng bước (Tiếp tục, Quay lại), nút gửi form, nút hành động chính của dòng, `Notice` loại
   neutral/info, từng dòng chữ hay từng nhãn. Cỡ 16/20/24px (`text-[20px]`); đang chọn dùng bản tô đặc `icon-fill`.
   Icon nằm trong ô 1em và chỉ hiện khi font đã tải (`html.icons-ready`, gắn ở `main.tsx`), nên mạng chậm không lộ chữ
   tên icon.
7. **Khoảng cách** theo thang 4/8/12/16/24/32/48/64 (`space-*` của bộ Stitch đã theo thang này).
8. **Chạm**: control cao tối thiểu 44px dưới `lg`.
9. **Thứ bậc thao tác** (`Button`): `primary` nút đặc, một nút mỗi màn; `soft` hành động chính của từng dòng / khối
   (Nhận yêu cầu, Mở yêu cầu, Mở bán lại), nền xanh nhạt + viền; `secondary` nút trắng có viền; `ghost` thao tác kín
   đáo (`bleed={false}` khi nằm trong cụm nút); `danger` viền đỏ cho phá huỷ hoàn tác được trong hộp thoại (Ngừng bán);
   `danger-quiet` nút xoá lặp lại trên từng dòng (xám khi nghỉ, đỏ khi rê / focus, đứng sau vạch ngăn) để cột thao tác
   không thành dải đỏ; `danger-solid` nút đặc đỏ chỉ để xác nhận việc không hoàn tác (Xoá). Cùng một thao tác dùng cùng
   một kiểu ở mọi màn (vd. "Sửa" luôn là `secondary` sm có icon). Nút chỉ có icon dùng `IconButton` (`label` = aria-label,
   `tooltip` = chữ ngắn khi label dài); tooltip thật dùng `WithTooltip` (`ui/tooltip.tsx`: hiện cả khi focus bàn phím,
   vẽ ra body nên khung cuộn không cắt, tự né mép màn hình), không dùng `title`.
   Link trong nội dung dùng utility `ui-link` (màu thương hiệu + gạch chân). Chọn một trong vài lựa chọn ngang hàng
   dùng `Segmented`, không dùng dãy nút đặc. Bộ lọc đang áp dụng: `Select active`. Ô tìm: `SearchInput`.

# Web portal (Stitch kit cho trang công khai, portal kit cho mọi portal đăng nhập)

## Stack

- Vite + React + TypeScript, react-router (giữ nguyên như package.json hiện tại – KHÔNG chuyển sang Next.js)
- Tailwind CSS v4 qua `@tailwindcss/vite` (`@theme` trong `src/styles/globals.css`)
- shadcn/ui cho primitives (dialog, dropdown, tabs, checkbox…) – restyle theo token bên dưới
- Font: portal dùng Schibsted Grotesk (`globals.css`, thiếu dấu tiếng Việt U+1EA0–1EF1 – xem `docs/design/landing-brief.md`); trang công khai dùng Be Vietnam Pro (`@fontsource/be-vietnam-pro`, nạp trong `PublicLayout`). Plus Jakarta Sans đã bỏ.
- Icon: Material Symbols Outlined – link Google Fonts trong `index.html`; giữ đúng tên icon như trong file thiết kế (`grid_view`, `solar_power`, `manage_accounts`…)
- State/data: màn đang hiện đều gọi API thật (auth, sản phẩm, đánh giá sơ bộ, yêu cầu khảo sát); mock trong `src/data/*.ts` chỉ còn phục vụ các màn đã ẩn (xem "Chỉ hiện màn có dữ liệu thật")

## Nguồn thiết kế (KHÔNG sửa thư mục này)

`design/stitch/stitch_smart_solar_customer_portal/` là bản export từ Google Stitch. Mỗi màn hình có:

- `design/stitch/stitch_smart_solar_customer_portal/<screen>/code.html` – markup tham chiếu (Tailwind CDN)
- `design/stitch/stitch_smart_solar_customer_portal/<screen>/screen.png` – ảnh kết quả mong đợi. LUÔN mở ảnh này để đối chiếu, không chỉ đọc HTML.
- `design/stitch/stitch_smart_solar_customer_portal/solaris_home_design_system/DESIGN.md` – nguồn sự thật cho màu, typography, spacing, radius, shadow, spec component.

## Quy tắc thiết kế của bộ Stitch (đã lệch khỏi DESIGN.md ở 4 điểm)

DESIGN.md trong thư mục `design/stitch/…` vẫn là nguồn tham chiếu về bố cục và tên token,
nhưng GIÁ TRỊ token nay lấy theo hệ chung ở trên. Những chỗ cố ý lệch:

| Hạng mục | DESIGN.md | Trong code hiện tại |
| --- | --- | --- |
| Màu nền / chữ | `surface=#f8f9ff`, `on-surface=#0d1c2e` (ngả xanh) | trỏ vào `--canvas`, `--fg` của portal kit (trung tính) |
| Màu nhấn | `primary=#004328`, `primary-container=#0d5c3a` | cả hai trỏ vào `--accent` |
| Bán kính | `rounded-lg/xl/2xl` (8–16px) | ánh xạ về 3px / 6px |
| Bóng | 3 cấp elevation | chỉ một bóng cho lớp nổi, thẻ tĩnh không bóng |
| Badge | pill `rounded-full` tô nền theo trạng thái | chỉ trạng thái cần chú ý mới tô nền |

1. Dùng đúng tên token Tailwind như file gốc: `bg-surface`, `bg-surface-container-lowest`,
   `text-on-surface-variant`, `bg-primary-container text-on-primary`, `text-headline-md`,
   `text-label-sm`, `px-space-md`, `gap-space-sm`, `rounded-xl`… Không bịa hex mới, không dùng
   `gray-500`/`slate-*` mặc định của Tailwind.
2. Tên bậc chữ giữ nguyên (`display-lg`, `headline-xl/lg/md`, `body-xl/lg/md/sm`,
   `label-lg/md/sm`, `data-metric`) nhưng tất cả đã ánh xạ về thang 5 bậc 13/15/18/24/32.
3. Viền thẻ dùng `border-outline-card`; không thêm `shadow-*` cho thẻ tĩnh.

## Kiến trúc thư mục

```
index.html                     # lang="vi", meta/OG tiếng Việt, link Material Symbols
src/
  main.tsx                     # createRoot + <App/> + globals.css
  App.tsx                      # <AppProviders><RouterProvider router={router}/></AppProviders>
  styles/globals.css           # @import "tailwindcss" + @theme tokens; landing.css cho trang chủ
  routes/
    router.tsx                 # createBrowserRouter: RootLayout + publicRoutes + protectedRoutes + 404
    publicRoutes.tsx           # route không cần đăng nhập: /, /products, /coming-soon, màn xác thực, /403, /styleguide
    protectedRoutes.tsx        # mỗi portal một lời gọi portal({ role, path, Layout, start, pages }): RequireRole + layout
                               # + khung chờ + index/đường lạ chuyển về `start`; /field chuyển về /tech
    lazyPage.ts                # page(() => import('@/pages/…'), 'TênTrang'): khai báo ở đầu file route
                               # (const TênTrang = page(…)), route ghi `lazy: TênTrang`; giữ tách chunk mỗi trang
    paths.ts                   # ROUTES (khoá camelCase, mỗi portal một nhóm, trang chủ portal là `home`; trong nhóm:
                               # màn có route ở trên, màn mock đã ẩn dưới dòng "Màn mock đã ẩn"), withId, techTaskPath…
    RequireRole.tsx            # route bảo vệ theo vai trò + AuthLoadingScreen
    notFound.ts                # ném Response 404 cho errorElement
  context/
    AppProviders.tsx           # QueryClientProvider + AuthProvider + Toaster (sonner)
    AuthProvider.tsx           # phiên đăng nhập, useAuth
  components/
    layout/                    # app-shell (shell chung của mọi portal) và mọi layout route:
                               # AdminLayout, TechLayout, AuthLayout, PublicLayout, RootLayout, customer-/ops-/manage-layout
    common/ui/                 # portal kit (kebab-case) + query-boundary
    common/stitch-ui/          # bộ Stitch (PascalCase, barrel index.ts): StatusBadge, MetricCard, DataTable, TaskCard, Timeline, ChecklistItem, PhotoGrid…
    common/tech/               # khối dùng ở nhiều nghiệp vụ kỹ thuật viên: SectionCard, ActionDock, JobHeaderCard, MeasurementCard…
  features/
    auth/                      # components/ (AuthCard, PasswordRules, ForbiddenCard, SessionExpiredModal, ChangePasswordDialog…)
    landing/components/        # section trang chủ, classes.ts, reveal, theme-toggle, survey-link
    surveys/ installations/ tasks/ warranty/   # components/ riêng của từng nghiệp vụ kỹ thuật viên
    dashboard/                 # components/ chỉ dùng ở màn tổng quan admin và kỹ thuật viên
    users/ roles/ products/    # components/ riêng của các màn admin
  pages/                       # màn gắn với route: admin/ tech/ customer/ ops/ field/ manage/ auth/ public/ + trang lẻ
  data/                        # dữ liệu tĩnh cho UI: mock từng màn (surveys.ts, tasks.ts, session.ts…, customer.ts, manage.ts…)
                               # và nội dung chữ (auth.ts, landing.ts)
  services/                    # API của mọi nghiệp vụ, mỗi file một nhóm: authService.ts, me.ts, productService.ts,
                               # preSurveyService.ts, bookingService.ts, adminUserService.ts…
    api/                       # client.ts (axios, mở wrapper, refresh), errors.ts (ApiError), tokens.ts
  types/                       # sinh bằng `npm run gen:api` (scripts/gen-api-types.mjs), KHÔNG sửa tay
    req/                       # request DTO theo tag swagger: authReq.ts, …
    res/                       # response DTO: apiRes.ts (ApiResponse<T>, ApiErrorBody), authRes.ts, …
  common/                      # enum của app, mỗi nghiệp vụ một file: preSurvey.ts, simulation.ts, product.ts, user.ts,
                               # scheduling.ts, role.ts (USER_ROLES, ROLE_LABELS, ROLE_ALIASES). CHỈ hằng số, không hàm
  config/                      # portals.ts (menu của mọi portal), roles.ts (hàm theo vai trò), demoAccounts.ts
  hooks/                       # hook react-query của mọi nghiệp vụ (useAuthMutations, useProducts, usePreSurveys, useBooking,
                               # useAdminUsers…) và hook giao diện: useMockQuery, useTheme, useElementWidth (bề rộng khung cho
                               # SVG vẽ bằng pixel), useViewportHeight (chiều cao khung nhìn cho hình vẽ cao vừa màn hình)
  utils/                       # cn, cx, format, img, jwt
public/placeholders/           # thay cho ảnh lh3.googleusercontent.com
```

Quy tắc đặt file (tái cấu trúc 29/09/2026):

- `pages/` chỉ ghép UI và gọi hook. Component dùng ở MỘT nghiệp vụ nằm trong
  `features/<nghiệp vụ>/components/`; dùng ở nhiều nghiệp vụ thì vào `components/common/`.
- Feature chỉ còn `components/`. API của mọi nghiệp vụ gom ở `src/services/<tên>Service.ts`, hook react-query ở
  `src/hooks/use<Tên>.ts` (20/10/2026, trước đó nằm trong `features/<nghiệp vụ>/services/` và `.../hooks/`);
  `services/api/` chỉ giữ HTTP client dùng chung. Import qua `@/services/…` và `@/hooks/…`.
  Một trách nhiệm chỉ ở một nơi.
- Enum (20/10/2026): tập giá trị cố định của một trường (mã backend hoặc lựa chọn trên giao diện) kèm nhãn tiếng Việt / màu
  Badge / gợi ý nằm ở `src/common/<nghiệp vụ>.ts`, đặt tên IN HOA số nhiều (`PRODUCT_STATUSES`, `ROLE_CODES`,
  `SIMULATION_WARNINGS`). Hàm tra nhãn và định dạng (`productStatusMeta`, `formatPower`…) ở
  `features/<nghiệp vụ>/components/*Display.ts`, đọc bảng từ `common/`. Không dùng `enum` của TypeScript
  (`erasableSyntaxOnly`); kiểu giá trị lấy từ `types/` (union sinh từ swagger).
- DTO nằm ở `src/types/`: request trong `types/req/<nghiệp vụ>Req.ts`, response trong
  `types/res/<nghiệp vụ>Res.ts`. Các file này sinh từ swagger (không tự đoán field, không sửa tay);
  service và hook import kiểu từ đây. Ngoại lệ: swagger của tag Customers, PreSurveys, SurveyRequests, PreSurveySurface,
  Simulations chỉ khai "200 OK" nên `customersRes.ts`, `preSurveysRes.ts`, `surveyRequestsRes.ts`, `preSurveySurfaceRes.ts`,
  `simulationsRes.ts` viết tay theo contract backend (đối chiếu response thật 09/10/2026; không có header tự sinh nên
  `gen:api` không xoá); backend khai response thì `gen:api` ghi đè. Cùng lý do, luồng 1 (12/10/2026) viết tay
  `surveySlotsRes.ts`, `customerSurveyRequestsRes.ts`, `technicianAvailabilityRes.ts`, `technicianAppointmentsRes.ts`,
  `adminTechniciansRes.ts`, `adminUsersRes.ts` theo record C# của backend `main` (4d12e4d); request của các tag đó sinh
  bình thường. `provincesRes.ts` cũng viết tay: kiểu của API công khai provinces.open-api.vn (không thuộc swagger).
- `docs/api/swagger.json` lấy từ backend `main` 4d12e4d khi không có backend chạy: `dotnet build` bản `git archive` của
  repo backend rồi `swagger tofile` (Swashbuckle.AspNetCore.Cli 6.6.2) với biến môi trường giả cho chuỗi kết nối và khoá
  JWT; không đụng DB nào.
- Nghiệp vụ chưa có endpoint đọc dữ liệu từ `data/*.ts` và bị ẩn khỏi menu/route (mục dưới). Khi backend có
  endpoint: thêm `types/req|res/<nghiệp vụ>*.ts`, rồi `src/services/<tên>Service.ts` + `src/hooks/use<Tên>.ts`, bỏ file trong `data/`,
  rồi mở lại route + mục menu.

## Chỉ hiện màn có dữ liệu thật (05/10/2026)

Menu và route chỉ có màn đổ dữ liệu thật từ backend; màn mock giữ code trong `pages/<portal>/` nhưng không có route,
đường dẫn cũ trong portal rơi vào route `*` và chuyển về trang chủ portal. Đang hiện:

- `/customer` → `/customer/assessment`: đánh giá sơ bộ 5 bước (hồ sơ → địa điểm → mặt lắp → mô phỏng → xem lại và gửi),
  `features/pre-surveys`. Các bước (người dùng 10/10/2026 chọn): `WizardSteps` có tóm tắt từng bước đã xong và bấm để quay
  lại (trừ hồ sơ – không sửa được); tiêu đề trang kèm một câu hướng dẫn của bước (`STEP_HINTS`); nút chính ghi tên bước sau
  ("Tiếp tục: Mặt lắp"); đổi bước do khách bấm thì cuộn về đầu trang và focus tiêu đề ẩn "Bước N/5: …" của bước.
- `/ops` → `/ops/surveys` + `/ops/surveys/:id`: yêu cầu khảo sát chờ nhận / của tôi / chi tiết (kèm mô phỏng khách đã chọn).
- `/customer/products(/:id)`, `/ops/products(/:id)`: catalog sản phẩm (GET /api/products) bản portal kit, `pages/catalog-page.tsx`.

**Mặt lắp + mô phỏng do backend tính** (BE nhánh `feature/presurvey-flow`, commit 833ff3c, nối 09/10/2026; tài liệu tích hợp
của BE: `Solar-Client-dnl/fe.md`). Người dùng chốt 09/10/2026: số liệu khai tự tính từ mặt lắp, bỏ mô phỏng FE giả định 3:2
(`roofLayout.ts`, `RoofScene.tsx`, `RoofSimulation.tsx` đã xoá), cho gửi khi chưa chạy mô phỏng (chỉ nhắc), editor 2D lấy ô
nhập làm nguồn chính + kéo thả vật cản.
- Bước mặt lắp (`SurfaceEditor.tsx`, form + luật kiểm tra ở `surfaceForm.ts` bám `UpdatePreSurveySurfaceCommandValidator`):
  rộng × dài theo dốc (mét, đo trên mặt nghiêng), độ dốc, hướng (la bàn `CompassPicker`), tối đa 50 vật cản chữ nhật. Quy ước
  của BE: gốc (0, 0) góc trên-trái = mép cao, X theo chiều rộng, Y xuôi dốc, (xM, yM) là góc trên-trái của vật cản. Hình
  `SurfacePlan.tsx` (SVG vẽ bằng pixel qua `hooks/useElementWidth.ts`) dùng chung cho editor (chọn, kéo thả, phím mũi tên
  0,1 m / Shift 1 m) và kết quả (tấm pin, vùng lùi mép, vùng cách vật cản). Tổng diện tích = rộng × dài, dùng được = trừ diện
  tích hợp của vật cản, "có vật cản" = có ≥ 1 vật cản; khách tick "Tự khai diện tích" để sửa hai ô diện tích.
  Nhập vật cản (người dùng chọn 10/10/2026 "hình + cột sửa bên phải", vì bản cũ lặp 7 nhãn mỗi vật cản và xa hình nên "rối"):
  hình bên trái, `ObstaclePanel.tsx` bên phải (lg) gồm danh sách gọn (số thứ tự trùng số trên hình, tên, cỡ, dấu lỗi; cuộn
  trong khung) và ô sửa của MỘT vật cản đang chọn (chọn ở danh sách hay bấm trên hình). Thêm / nhân bản luôn thêm vào cuối
  để số trên hình không đổi, focus ô tên; tên có gợi ý (`OBSTACLE_NAME_SUGGESTIONS`); xoá có "Hoàn tác" trong toast (ghi vào
  form mới nhất qua ref); chưa chọn gì mà có lỗi thì ô sửa mở vật cản lỗi đầu tiên. Điện thoại: hình trên, cột sửa dưới.
  Ô số của vật cản báo lỗi ngay khi gõ (`liveObstacleErrors`, ô trống chưa báo); vật cản to hơn mặt lắp báo ở ô cỡ ("Bề dọc lớn
  hơn chiều dài mặt lắp") – theo chiều đó kéo trên hình đứng im là đúng; hình chỉ vẽ phần vật cản nằm trong mặt lắp (người test
  10/10/2026: gõ 1000000 thì hình "tràn", kéo dọc "không được").
- Địa điểm (`SiteFields` ở `AssessmentFields.tsx`): dự án chỉ nhận công trình ở TP.HCM (người dùng 10/10/2026). Địa chỉ 2 cấp
  theo đơn vị hành chính từ 01/07/2025 (người dùng chốt): tỉnh cố định "Thành phố Hồ Chí Minh" (ô chỉ đọc), phường/xã bắt buộc,
  chọn bằng `Combobox` từ API công khai provinces.open-api.vn v2 (`/api/v2/p/79?depth=2`, 168 phường/xã/đặc khu, gồm Bình
  Dương và Bà Rịa – Vũng Tàu cũ) – backend không có API địa giới nên FE gọi thẳng bằng fetch (`src/services/provinceService.ts`,
  `src/hooks/useHcmWards.ts`, tải một lần mỗi phiên; địa chỉ gốc ở `VITE_PROVINCES_API_URL`, không khai thì dùng
  `https://provinces.open-api.vn/api/v2`); không còn ô quận/huyện (`district` gửi null). API lỗi thì vẫn gõ tay được
  + nút thử lại. Địa điểm đã lưu mà không sửa gì thì đi tiếp, không kiểm tra lại (địa chỉ cũ khai tự do trước ngày đó không
  bị bắt chọn lại và tạo bản nháp mới). Toạ độ nằm ngoài khung TP.HCM (`isInHcm` ở `preSurveyDisplay.ts`) thì cảnh báo vàng,
  vẫn cho lưu (người dùng chốt), lặp lại ở bước mô phỏng và kết quả; mục khí hậu ghi toạ độ + link bản đồ. Lý do: một bản
  nháp thật nhập sai toạ độ ra khí hậu Nam Cực (−49 °C) và mọi lần chạy "chưa có sản lượng".
- Lưu mặt lắp (`saveSurface` ở `assessment-page.tsx`): lần đầu POST /pre-surveys (số liệu khai + độ dốc + hướng) rồi PUT
  .../surface; các lần sau chỉ ghi phần đổi (`surfaceDiffers`, `declaredDiffers`). **Độ dốc / hướng của mặt lắp dùng chung cột
  với form cũ** (PUT /pre-surveys/{id} ghi đè, đổi giá trị là mọi mô phỏng thành "cũ"), nên PUT surface trước rồi mới PUT số
  liệu khai với đúng độ dốc / hướng đó. `expectedRevision` là revision của bản form đang sửa; 409 PRE_SURVEY_CONCURRENTLY_MODIFIED
  → khách chọn "Tải bản mới nhất" hoặc "Lưu đè", không tự ghi đè.
- Backend không có API liệt kê bản nháp của khách: id bản nháp + địa điểm nhớ ở `assessmentDraft.ts` (localStorage theo tài
  khoản); mở lại trang thì GET .../surface rồi làm tiếp ở bước mặt lắp / mô phỏng; 403/404/đã gửi thì bỏ nháp.
- Giữ dữ liệu khi rời trang (người dùng 10/10/2026: "không giữ lại giá trị của form nếu back qua back lại", chọn giữ trên trình
  duyệt thay vì tự lưu lên server): bước nằm trên địa chỉ (`?buoc=ho-so|dia-diem|mat-lap|mo-phong|xem-lai`, mỗi lần chuyển bước
  là một mục lịch sử nên Back / Forward của trình duyệt đi giữa các bước; không cho vượt bước chưa mở được). Mọi ô chưa gửi +
  bước đang làm ghi vào `assessment-work` (localStorage theo tài khoản, `readWork` / `writeWork`) mỗi lần đổi; mở lại trang về
  đúng bước, mặt lắp trên máy chỉ dùng khi thuộc đúng bản nháp đang mở (server đã đổi revision thì hiện xung đột ngay). Gửi
  xong / bỏ nháp thì xoá. Mặt lắp khác bản đã lưu: bước mặt lắp ghi "Chưa lưu lên hệ thống", bước mô phỏng / xem lại có khung
  nhắc (`surfaceChanged`) vì hai bước đó dùng bản đã lưu.
- Bước mô phỏng (`SimulationWorkspace.tsx`, form ở `simulationForm.ts` bám `CreateSimulationCommandValidator`): tấm pin
  `SOLAR_PANEL` đang bán đủ công suất + kích thước, Áp mái (FLUSH) / Khung nghiêng (RACK: góc + hướng riêng), khoảng cách mm
  (để trống = mặc định của BE; số mặc định hiện mờ trong ô bằng placeholder – không điền sẵn vì gửi số lên sẽ mất nguồn
  "mặc định" trong kết quả), tổn hao %. POST gửi `expectedGeometryVersion`; 201 tạo mới / 200 dùng lại; giới hạn 10 lần /
  phút / người (429 + Retry-After, mã lỗi `AUTH_TOO_MANY_REQUESTS`) → nút đếm ngược. BE tự chọn lần tạo / dùng lại gần nhất làm
  "Mô phỏng chính" (không có API chọn lại); `isStale` = tính theo mặt lắp cũ.
- Kết quả (`SimulationResult.tsx`, dùng chung khách hàng / sales, nạp qua `SimulationViewer.tsx`): số tấm, kWp, kWh/năm
  (null là "chưa có dữ liệu", không bao giờ 0), mặt bằng 2D / 3D, `EnergyChart.tsx` (cột một chuỗi theo skill dataviz, tooltip +
  phím mũi tên + bảng số liệu), cảnh báo kỹ thuật và giới hạn dịch theo mã (bảng mã ở `common/simulation.ts`, hàm ở `simulationDisplay.ts`; mã lạ in câu
  gốc của BE).
  3D `SimulationScene.tsx` dựng thẳng từ toạ độ BE (E/N/U, trục Z lên, `camera.up = (0,0,1)`, tấm pin là một `InstancedMesh`
  hộp đơn vị mặt trước ở z = 0), `three` + `@react-three/fiber` nạp bằng `React.lazy`. Lịch sử các lần chạy: `SimulationHistory.tsx`
  (cao khoảng ba dòng rưỡi rồi cuộn trong khung, lần đang xem luôn cuộn tới; tiêu đề có số lần chạy – người dùng 10/10/2026).
- Sales (`pages/ops/survey-request-page.tsx`): `selectedSimulation` của yêu cầu + các lần chạy khác, chỉ đọc (BE trả 403 nếu
  sales POST); yêu cầu gửi khi chưa có mô phỏng thì hiện "Khách chưa chạy mô phỏng".
- **Hình vẽ to và nằm giữa** (người dùng 10/10/2026: "những chỗ cần phải to và nằm ở giữa thì lại là một mẩu"):
  - Bước mặt lắp và mô phỏng rộng hết trang: khối nhập liệu (kích thước + hướng / cấu hình mô phỏng) chiếm 2/3 hàng đầu cạnh
    cột phụ của trang (truyền qua prop `aside`), hình vẽ và kết quả rộng hết ở dưới (ở bước mặt lắp, khối vật cản chia hình +
    cột sửa, xem mục trên). Thứ tự DOM là thứ tự trên điện thoại (cột phụ xuống cuối), từ lg cột phụ mới được đặt lên hàng đầu
    (`lg:col-start-3 lg:row-start-1`). Bước hồ sơ, địa điểm, xem lại giữ form 2/3 + cột phụ 1/3.
  - `SurfacePlan` phóng vừa khung như "vừa khung" của phần mềm vẽ: rộng bằng khung, cao tới phần khung nhìn còn thấy
    (`useViewportHeight` trừ 200px cho thanh trên, thanh thao tác và nhãn), không còn trần 420px / 80 px/m; hình căn giữa,
    chú thích (`caption`) nằm ngay dưới hình. Khung 3D 4:3, khung rộng từ 60rem (container query) thì cao vừa khung nhìn.
  - Trang sales giữ cột 2/3 (cột phụ khách hàng + tiến độ cao hơn phần số liệu, đưa mô phỏng xuống rộng hết trang sẽ để lại
    khoảng trống lớn); cột phụ dính khi cuộn để cạnh mặt bằng / 3D không trống.
- `/admin` → `/admin/products`: quản lý sản phẩm (`pages/admin/products-page.tsx`, bộ portal kit; tấm pin thiếu
  công suất/kích thước được tô cảnh báo vì mô phỏng không dùng được). Backend ẩn sản phẩm INACTIVE khỏi GET danh sách
  và GET chi tiết với mọi vai trò (dò 08/10/2026), nên: tạo mới luôn ACTIVE; "Ngừng bán" hỏi xác nhận, có "Hoàn tác";
  sản phẩm đã ngừng bán được nhớ trong localStorage (`features/products/hiddenProducts.ts`) để "Mở bán lại" — chỉ trên
  trình duyệt đã bấm. Khi backend có cách liệt kê sản phẩm ngừng bán thì bỏ cơ chế này.
- `/tech/products(/:id)`, `/manage/products(/:id)`: danh mục sản phẩm thật (GET /api/products, bản portal kit) cho kỹ
  thuật viên và quản lý. Không còn trang giữ chỗ "chưa có chức năng" (08/10/2026); `/field/*` chuyển về `/tech`.

**Luồng 1: đặt lịch khảo sát → phân công → kỹ thuật viên nhận việc** (backend `main` 4d12e4d, nối 12/10/2026; tài liệu bàn
giao BE "SmartSolar – Tài liệu bàn giao tích hợp FE/BE" 12/10/2026, contract đối chiếu bằng code backend chứ không theo bảng
"Agent/Hardening" của tài liệu). Hiển thị trong `features/scheduling` (`schedulingDisplay.ts`: giờ Việt Nam, nhãn trạng thái,
đường đi, lý do không xếp được; bảng mã ở `common/scheduling.ts`), tài khoản trong `features/users`. Luồng dừng ở "Nhận việc": không có "Hoàn thành khảo sát".
- Giờ nghiệp vụ là giờ Việt Nam bất kể máy: hiển thị qua `Intl` với `timeZone: 'Asia/Ho_Chi_Minh'` (cả `formatDateTime` cũ),
  ngày gửi API là chuỗi `YYYY-MM-DD` tính theo giờ Việt Nam (không `new Date('2026-10-20')`), giờ hẹn gửi kèm `+07:00`.
- Khách `/customer/requests(/:id)` (`pages/customer/request(s)-page.tsx`): gửi đánh giá xong hộp thoại dẫn thẳng tới "Chọn giờ
  khảo sát". `SlotPicker`: lưới 30 ngày (giới hạn đặt trước của BE) theo cột thứ + các giờ BE trả (GET /survey-slots) –
  không tự vẽ khung giờ rồi đoán giờ trống; sau 15:30 mở sẵn ngày mai. Đặt (201; gửi lại đúng giờ → 200 `created=false`, vẫn
  là thành công), đổi giờ / huỷ khi lịch còn BOOKED và chưa tới giờ; 409 SURVEY_SLOT_UNAVAILABLE thì tải lại giờ và bỏ chọn.
  Khách không bao giờ thấy kỹ thuật viên đang được giữ chỗ, chỉ thấy người được phân công chính thức.
- **Toạ độ công trình bắt buộc** ở bước địa điểm (trước đó gập lại, không bắt buộc): không có toạ độ BE không xếp được giờ
  (PROPERTY_SITE_LOCATION_REQUIRED) và không có API sửa địa điểm. Địa điểm cũ thiếu toạ độ thì bước địa điểm bắt khai lại (tạo
  địa điểm + bản nháp mới), gửi bị chặn; yêu cầu đã gửi thiếu toạ độ thì trang đặt giờ hướng dẫn liên hệ kinh doanh.
- Sales `/ops/surveys/:id`: khối lịch khảo sát đứng đầu cột chính (`SalesSchedulePanel`). Khách đã đặt → phân công (danh sách
  kỹ thuật viên rảnh của BE, người đang giữ chỗ chọn sẵn, mỗi người kèm chặng đường Vietmap); đã phân công → "Đổi kỹ thuật
  viên" (PUT reassign) hoặc "Đổi giờ" (chọn ngày + giờ, "Xem kỹ thuật viên rảnh" với `startsAt` rồi PUT reschedule kèm người).
  Không cập nhật lạc quan; lỗi thì lịch cũ giữ nguyên. Nhãn đỏ đầu trang: "Chưa phân công kỹ thuật viên".
- Kỹ thuật viên `/tech/jobs(/:id)` "Việc của tôi" (trang chủ), `/tech/schedule?ngay=` "Lịch làm việc": danh sách theo ngày,
  chi tiết (đường tới, công trình, khách, số liệu khai, mô phỏng khách chọn qua `SimulationViewer`), nút "Nhận việc"
  (gửi lại khi đã nhận vẫn là thành công). Số đỏ ở menu = lịch sắp tới chờ nhận việc.
- Quản trị `/admin/users(/:id)` "Tài khoản" (trang chủ admin) và `/admin/technicians(/:id)`, quản lý `/manage/technicians(/:id)`
  (trang chủ quản lý; dùng chung `pages/technician(s)-page.tsx`). Tài khoản: tạo không có mật khẩu (link đặt mật khẩu chỉ gửi qua
  email, dùng chính trang `/reset-password`; môi trường tắt email thì báo rõ link CHƯA gửi), sửa, vai trò, trạng thái, gửi link,
  xoá mềm; không tự khoá / xoá chính mình. Kỹ thuật viên: lịch theo ngày, hồ sơ nhận lịch (nơi xuất phát, số lịch / ngày, giờ rời
  sớm nhất), giờ làm theo tuần, lịch nghỉ (`?muc=lich|nhan-lich|gio-lam|nghi`). Thay đổi làm hỏng lịch đã có bị BE từ chối
  (409 + danh sách lịch, `ConflictList`; ACCOUNT_HAS_ACTIVE_WORK ở trang tài khoản) – không tự huỷ lịch nào. Số đỏ ở menu = kỹ
  thuật viên chưa có nơi xuất phát.
- Chặng đường không tính được thì ghi rõ trạng thái, không bao giờ in "0 phút"; thiếu dữ liệu kẹt xe ghi "Không có dữ liệu giao
  thông", không suy ra "thông thoáng"; lịch ngày chỉ dùng số của chặng OK (đang tính lại / cũ / lỗi thì ghi trạng thái).
- Thử cả luồng không cần DB thật: chạy pipeline backend bằng `AuthApiFactory` của bộ test (SQLite trong bộ nhớ, Vietmap /
  PVGIS giả, email bắt lại) sau một proxy cổng 8090, rồi `API_PROXY_TARGET=http://localhost:8090 npm run dev -- --port 3000`.
  Factory dùng một kết nối SQLite chung nên proxy phải phục vụ tuần tự (nhiều request song song làm EF ném NullReference).

Mở lại một màn: khai báo trang ở đầu `routes/protectedRoutes.tsx`, thêm một dòng vào `pages` của portal, chuyển đường dẫn của nó lên
phần "có route" trong `routes/paths.ts`, rồi thêm mục menu trong `config/portals.ts` (mọi portal). Sidebar/header không đặt số liệu giả (tên người dùng,
thông báo, chip trạng thái): người dùng lấy từ `useAuth`.

## Layout chung

**Hai khung, theo người dùng** (08/10/2026: "khách hàng phải là 1 cái giao diện khác chứ tại sao lại y chang bên quản trị"):

- **Nhân viên** – kinh doanh `/ops`, quản trị `/admin`, kỹ thuật viên `/tech`, quản lý `/manage` – dùng `app-shell.tsx`: công cụ
  làm việc cả ngày, rail trái + bố cục gọn (mục Mật độ bên dưới).
- **Khách hàng** `/customer` dùng `customer-shell.tsx`: đi theo website công khai – thanh trên dính với logo đầy đủ (bấm về trang chủ công khai `/`, 20/10/2026), menu chữ
  (mục đang mở đậm + gạch chân xanh), nút tài khoản ghi tên người đang đăng nhập (chữ cái đầu + tên) và mở bảng chức năng
  (Đổi mật khẩu, Giao diện, Đăng xuất; Esc / bấm ra ngoài thì đóng); nội dung căn giữa tối đa 1200px (`max-w-landing`), lề 16/24px như `<main>` của portal để
  ActionBar và Table lấn mép đúng; font Be Vietnam Pro 400/500/600 (như trang công khai); trang con có dòng định vị
  "Sản phẩm / <tên>"; điện thoại có nút Menu mở bảng gồm menu + tài khoản. Control bên trong vẫn là portal kit.

Khung nhân viên (`app-shell.tsx`): rail cố định bên trái `w-52` (208px) trên nền `rail`, `<main>` lề 24px. Đầu rail là biểu tượng
thương hiệu (`public/images/mark-96.png`, nền trong suốt) + "Smart Solar" + tên portal (ngắt dòng cân bằng `text-balance`); mỗi mục
menu có icon (`icon` trong `config/portals.ts`, bắt buộc). Mục menu bo đủ 4 góc, thẳng mép với mọi hàng khác của rail; mục đang mở
có nền `accent-muted` + vạch accent 3px nằm trong mép trái + icon tô đặc; nhóm chứa nó đậm lên. Rail chia ba phần: đầu, menu
(`flex-1`, tự cuộn), chân (Thu gọn + Tài khoản, không dính đè) – nhóm Tài khoản mở hết trên màn thấp chỉ làm menu ngắn lại.
Trên cùng nội dung có thanh định vị dính (`LocationBar`): portal / nhóm / mục / trang chi tiết.
Dưới `lg`: thanh trên mảnh (biểu tượng + nút "Menu" có icon, kèm gợi ý việc đang chờ `collapsedHint`) mở rail thành drawer rộng
288px (`w-72`, nút đóng là icon ✕). Từ `lg`, "Thu gọn menu" (nhớ trong localStorage, `hooks/useSidebarCollapsed.ts`) thu rail thành
cột icon 64px: icon mục menu kèm số đếm ở góc, tooltip thật (`WithTooltip`, bên phải, hiện cả khi focus bàn phím); nút thu gọn /
mở rộng là cùng một nút nên focus không mất.
Cuối rail: "Thu gọn menu", rồi nhóm **Tài khoản phân tầng** (góp ý 08/10/2026 "không bày tài khoản ra, phân tầng chức năng
nhỏ"): mặc định chỉ một hàng ghi tên người đang đăng nhập (chữ cái đầu + tên; rail hẹp nên khi chưa có họ tên thì ghi phần
trước "@" của email; trạng thái mở / đóng nhớ trong localStorage); bấm mới mở tầng con thụt vào có đường dọc: email đầy đủ +
vai trò (chỉ đọc), Đổi mật khẩu, Giao diện (mở thêm tầng Tự động / Sáng / Tối, lựa chọn đang dùng có nền "đang chọn"
+ dấu tích), Đăng xuất (đỏ khi rê chuột). Mọi hàng cùng chiều cao (44px drawer, 36px desktop). Rail thu gọn chỉ còn nút icon
Tài khoản, bấm thì rail mở và nhóm mở sẵn.
**Chỉ khách hàng thấy "Đổi mật khẩu"** (`canChangeOwnPassword` trong `config/roles.ts`, người dùng chốt 08/10/2026): tài khoản nội
bộ do quản trị cấp; backend vẫn cho mọi vai trò gọi API, đây chỉ là ẩn ở giao diện.
Bảng (`Table`): khi chia cột, dòng tô nền khi rê chuột, bảng lấn 12px mỗi bên để nền không cắt sát chữ; dưới lg xếp khối
nhãn/giá trị (ô là lưới `justify-items: start`, cột nhãn tối đa 12rem). Bảng nhiều cột có cụm thao tác dùng `stack="xl"` (xếp
khối đến 1280px: ở 1024px chia cột thì tên bị bóp còn vài chữ mỗi dòng) và gộp cột phụ vào dòng phụ của cột chính từ xl đến
2xl, như bảng sản phẩm admin. Bảng mà cả dòng là một link (danh mục sản phẩm) phủ link tên lên cả dòng bằng `::after`,
dòng `relative cursor-pointer`; tên giữ màu chữ chính, rê chuột mới xanh + gạch chân.
Trang chi tiết hoặc wizard đặt mắt xích cuối bằng `usePageCrumb(tên)` (`components/layout/page-crumb.tsx`), không tự làm link "quay lại". Số đếm thật cạnh mục menu truyền qua
`badges` của layout (`ops-layout`: hàng chờ; `AdminLayout`: tổng sản phẩm). Làm 1 lần trong layout route với `<Outlet/>`,
KHÔNG copy rail vào từng page; layout còn được vẽ làm khung chờ (`hydrateFallbackElement`) TRƯỚC `RequireRole` nên
query trong layout phải chờ `useAuth().user` đúng vai trò mới gọi API.

Mật độ (bố cục gọn 05/10/2026, cho khung nhân viên và cả hai bộ component; cổng khách hàng thì nội dung căn giữa tối đa 1200px): lề nội dung 24px (`px-6`, bộ Stitch `px-space-lg`), không giới hạn bề rộng `<main>`; rail portal kit `w-52`; khoảng cách tiêu đề trang → nội dung 24px; giữa cột/khối 24px (`gap-6`); giữa các Panel 16px + đường kẻ; `ListRow` `py-4`. Thêm màn mới thì theo đúng các bậc này, đừng quay lại 48px.

Menu Admin (subtitle "Quản trị hệ thống"): Tổng quan, Người dùng, Vai trò & quyền, Sản phẩm,
Danh mục dịch vụ, Nhóm hàng, Kho tri thức AI, Cấu hình kỹ thuật, Báo cáo, Cài đặt hệ thống.

Menu Kỹ thuật viên (subtitle "Kỹ thuật hiện trường"): Tổng quan, Việc của tôi (badge số),
Khảo sát, Lắp đặt, Bảo hành & bảo trì, Lịch làm việc; cuối sidebar là khối user (tên, chức danh)
+ Cảnh báo + Tài khoản + Đổi mật khẩu + Đăng xuất.

## Màn công khai & xác thực

Trang chủ và các màn xác thực KHÔNG dùng `AppShell`/sidebar.

- `PublicLayout` + trang chủ `/` (người dùng đổi hướng 20/10/2026, bản trước là thi công cho doanh nghiệp / nhà xưởng):
  nền tảng tư vấn lắp đặt, bảo hành và bảo trì điện mặt trời cho **hộ gia đình**. Thứ tự: hero → "Giải pháp" (`#giai-phap`,
  ba việc nền tảng làm, link tới `/products`) → "Quy trình làm việc" (`#quy-trinh`, 4 bước: Cung cấp thông tin → Tư vấn và
  khảo sát → Báo giá và lắp đặt → Bảo hành, bảo trì; điểm mốc tròn đánh số, màu trung tính) → dải CTA → footer. Không bịa
  số liệu tiết kiệm, số khách, chứng nhận, đánh giá, thông tin liên hệ. Nút "Đăng ký khảo sát" đi theo `surveyPath`
  (`features/landing/components/survey-link.ts`): chưa đăng nhập → `/register`, khách hàng → `/customer/assessment`, nhân viên
  → portal của mình. Nội dung ở `src/data/landing.ts`; token riêng (`font-vn`, `max-w-landing`, `ld-*`) ở `src/styles/landing.css`.
  - Header dính: Giải pháp, Quy trình, Sản phẩm, Đăng nhập, nút "Đăng ký khảo sát", nút sáng / tối (`theme-toggle.tsx`) ở mép
    phải. Dưới lg: logo + nút sáng / tối + nút "Menu" mở bảng liên kết dưới header (Esc đóng, trả focus về nút Menu). Nút sáng /
    tối: khung 40px bo 6px (theo quy tắc bán kính, không tròn) + vùng bấm 44px, icon 20px là giao diện sẽ chuyển sang, tên đọc
    cố định "Giao diện tối" + `aria-pressed`, tooltip `WithTooltip side="bottom"` (phía trên bị khuất ở đỉnh màn hình).
  - Hero ảnh ngày (giao diện sáng) / đêm (tối): hai ảnh người dùng cung cấp `public/images/smart-solar-{day,night}-4k.png`
    (3840 × 2160, giữ nguyên, trang không tải). Bản dùng thật ở `public/images/hero/`: `wide` 16:9 (1280–3840, từ 768px) và
    `crop` vuông cắt phần bên trái (640–1600, điện thoại), mỗi bản AVIF + WebP, sinh bằng Pillow. Từ lg chữ căn giữa trên
    vùng trời (nhà hai bên, pin nửa dưới), lớp phủ `ld-hero-veil` pha từ `--canvas` nên tự theo giao diện; dưới lg chữ đứng trên
    nền trang, ảnh nằm dưới và tan vào nền. Tiêu đề `ld-display` 32/44/56px, 64px ở màn ≥ 1920 × 1000, 44px ở laptop thấp.
    Tương phản đo trên điểm ảnh nền xấu nhất ≥ 5:1 cả hai giao diện (20/10/2026).
  - Ảnh theo `useResolvedTheme` (data-theme hoặc hệ thống). Ảnh của giao diện đang dùng tải trước trong `index.html` (cùng
    srcset / sizes / media với `heroImages` – đổi một chỗ phải đổi cả hai, nếu không tải đôi); ảnh còn lại tải lúc trình duyệt
    rảnh, bỏ qua nếu bật tiết kiệm dữ liệu. Đổi giao diện: ảnh mới chưa tải xong thì giữ ảnh cũ; crossfade 600ms bằng opacity
    (`.ld-hero-img`: ảnh mới hiện dần ở trên, ảnh cũ chỉ ẩn sau khi ảnh mới hiện hẳn, không lộ nền); giảm chuyển động thì đổi ngay.
  - Mô hình 3D một tấm pin trong section "Giải pháp" (người dùng 20/10/2026; `solar-panel-showcase.tsx` + `solar-panel-scene.tsx`):
    từ lg ở cột trái dưới phần chữ (danh sách bên phải `row-span-2`), dưới lg đứng sau danh sách; khung 4:3. Dựng hoàn toàn
    bằng hình học + vật liệu trong code (tấm 1722 × 1134 × 35 mm, 120 nửa cell xanh đen vẽ bằng canvas dưới kính clearcoat, khung
    nhôm có gờ, mặt sau có tấm nền, 3 hộp đấu dây, cáp, nhãn trơn không ghi thông số); môi trường phản chiếu là phòng chụp tự dựng
    (RoomEnvironment của three cho vệt sáng gắt làm cell bạc màu). Kéo / vuốt ngang để xoay quanh tâm (bàn xoay, nghiêng dọc
    trong khoảng hẹp để không chạm đất), phím mũi tên khi focus, không tự xoay, không phóng to / dịch chuyển; `touch-action:
    pan-y` nên vuốt dọc vẫn cuộn trang. Bóng VSM trên mặt đất trong suốt, mờ dần theo bán kính (chèn vào shader của
    `ShadowMaterial`; r186 đã bỏ `PCFSoftShadowMap`). Ánh sáng / bóng theo `useResolvedTheme`. Chỉ tải three.js khi khung cách
    màn hình 300px; máy không có WebGL2, bật tiết kiệm dữ liệu hoặc lỗi renderer thì hiện ảnh tĩnh
    `public/images/landing/solar-panel-{light,dark}.webp` – chụp từ chính khung hình đầu của cảnh (đổi camera / tư thế / ánh
    sáng thì chụp lại, nếu không lúc canvas thay ảnh sẽ thấy nhảy). Điện thoại / cảm ứng: dpr ≤ 1,5, bản đồ bóng và hoạ tiết nhỏ hơn.
  Chuyển động chỉ transform/opacity, không thư viện: `ld-rise` (chữ, nút hero), khối nội dung bọc `<Reveal>`
  (IntersectionObserver, hiện một lần khi cuộn tới). `prefers-reduced-motion` tắt hết và hiện nội dung ngay. Favicon sinh từ
  `public/images/Logo.png` (`public/favicon-32/48.png`, `apple-touch-icon.png`).
- `AuthLayout` – theo `auth_portal`: lưới 12 cột, panel `primary-container` bên trái
  (`lg:col-span-5`: tiêu đề "Chuyển dịch Năng lượng Xanh cho Ngôi nhà Việt", ảnh nhà, 2 ô số liệu
  1.240 kWh / ~3,85 Tr ₫), `<Outlet/>` trong card trắng bên phải (`lg:col-span-7`), footer chỉ còn
  dòng bản quyền. Dưới `lg` ẩn panel trái. Các chip trang trí (chip "nền tảng", chip vai trò,
  chip bảo mật) và hai vệt blur đã bỏ theo quy tắc giao diện chung.
- BỎ thanh tab "Auth Hub" trong `auth_portal/code.html`: đó chỉ là tab demo của Stitch để xem 5 view trong 1 file. Header của `AuthLayout` chỉ giữ logo + link về trang chủ; mỗi view là một route riêng.
- Khối "Phiên làm việc hiện tại" (IP, JWT, thời gian còn lại) trong view "Trạng thái phiên" chỉ để demo – KHÔNG dựng.

## Bảng route

| Route             | Layout         | Trang                                                      |
| ----------------- | -------------- | ---------------------------------------------------------- |
| `/`               | `PublicLayout` | `LandingPage` – hero ngày / đêm, giải pháp, quy trình, CTA (mục "Màn công khai") |
| `/login`          | `AuthLayout`   | `LoginPage`                                                 |
| `/register`       | `AuthLayout`   | `RegisterPage`                                              |
| `/forgot-password`| `AuthLayout`   | `ForgotPasswordPage`                                        |
| `/reset-password` | `AuthLayout`   | `ResetPasswordPage` (đọc `?token=`)                         |
| `/verify-email`   | `AuthLayout`   | `VerifyEmailPage`                                           |
| `/403`            | `AuthLayout`   | `ForbiddenPage`                                             |
| `/coming-soon`    | `PublicLayout` | Trang tạm cho Kinh doanh, Quản lý, Khách hàng               |
| `/products`, `/products/:id` | `PublicLayout` | Danh mục sản phẩm công khai – GET /api/products(/{id}) |
| `/admin/*`        | `AdminLayout`  | Tài khoản, Kỹ thuật viên, Sản phẩm – bọc `<RequireRole role="admin">` |
| `/tech/*`         | `TechLayout`   | Việc của tôi, Lịch làm việc, Sản phẩm – bọc `<RequireRole role="technician">` |
| `/customer/*`     | `CustomerLayout` | Đánh giá sơ bộ, Yêu cầu khảo sát (đặt giờ), Sản phẩm – bọc `<RequireRole role="customer">` |
| `/ops/*`          | `OpsLayout`      | Yêu cầu khảo sát (nhận, phân công kỹ thuật viên) – bọc `<RequireRole role="sales">` |
| `/field/*`        | —                | chuyển về `/tech` |
| `/manage/*`       | `ManageLayout`   | Kỹ thuật viên, Sản phẩm – bọc `<RequireRole role="manager">` |
| `/styleguide`     | –              | `StyleguidePage`                                            |

`/` trả về trang chủ công khai; KHÔNG còn redirect `/` → `/admin`.

## Auth API

Auth gọi backend .NET thật, KHÔNG còn mock. Nguồn sự thật là `docs/api/swagger.json`
(tải từ `http://localhost:8080/swagger/v1/swagger.json`).

- **Base URL**: `VITE_API_BASE_URL` trong `.env.development` = `/api`. Dev đi qua
  `server.proxy` trong `vite.config.ts` (`/api` → `API_PROXY_TARGET`, mặc định
  `http://localhost:8080`) để tránh CORS. Xem `.env.example` để biết đủ biến.
- **Sinh type**: `npm run gen:api` chạy `scripts/gen-api-types.mjs`, đọc `docs/api/swagger.json` và
  ghi request body vào `src/types/req/<tag>Req.ts`, response vào `src/types/res/<tag>Res.ts`
  (bỏ wrapper *ApiResponse, chỉ giữ schema của `data`), `ApiErrorBody` + `ApiResponse<T>` vào
  `src/types/res/apiRes.ts`. KHÔNG sửa các file đó bằng tay; đổi swagger thì chạy lại lệnh.
- **Token**: `AuthTokensResponse` trả token trong body (không phải cookie httpOnly) nên
  KHÔNG dùng `withCredentials`. `accessToken` giữ trong bộ nhớ; `refreshToken` vào
  `localStorage` khi tick "Ghi nhớ đăng nhập", ngược lại `sessionStorage`
  (`src/services/api/tokens.ts`). Hạn token lấy từ `accessTokenExpiresAt` /
  `refreshTokenExpiresAt` chứ không hard-code.
- **Refresh**: interceptor trong `src/services/api/client.ts` gặp 401 thì gọi
  `POST /api/auth/refresh` theo kiểu single-flight (nhiều request cùng 401 chỉ refresh
  một lần, số còn lại xếp hàng chờ rồi retry). Refresh hỏng → xoá phiên + bắn sự kiện
  `session-expired` trên `window`; `SessionExpiredModal` lắng nghe sự kiện này.
  KHÔNG còn bộ đếm 30 phút giả lập.
- **Wrapper & lỗi**: response bọc trong `*ApiResponse { isSuccess, traceId, data, error }`;
  interceptor mở wrapper và trả thẳng `data`. Lỗi ném ra `ApiError`
  (`src/services/api/errors.ts`) có `status`, `code`, `message`, `fieldErrors`, `traceId`.
  Swagger không khai kiểu của `ApiError.details` nên `parseFieldErrors` nhận cả 3 dạng
  (`{field: [msg]}`, `[{field, message}]`, `{errors: {...}}`) và bỏ qua dạng lạ.
  Backend chưa có bảng mã lỗi cố định → ưu tiên hiển thị `message` của server, thiếu thì
  dùng câu tiếng Việt theo HTTP status.
- **Role**: `AuthTokensResponse` không có role → decode claim `role` trong accessToken
  bằng `jwt-decode` (`src/utils/jwt.ts`) rồi map qua `ROLE_ALIASES` trong
  `src/common/role.ts` (hàm `parseRole` ở `src/config/roles.ts`) về `customer | technician | sales | manager | admin`.
  Không đọc được role thì coi như đăng nhập hỏng, không đoán bừa.
- **Khôi phục phiên**: mở app mà còn `refreshToken` thì gọi refresh trước;
  `status = 'loading'` và `RequireRole` (`src/routes/RequireRole.tsx`) hiện `AuthLoadingScreen` để không đá người dùng
  về `/login` quá sớm.
- **Điều hướng**: `homePathForRole` trong `src/config/roles.ts` đưa từng vai trò về portal
  của nó – `admin` → `/admin`, `technician` → `/tech`, `sales` → `/ops`, `manager` → `/manage`,
  `customer` → `/customer`. `<RequireRole role="…">`: chưa đăng nhập → `/login` (nhớ trang đích),
  sai vai trò → `/403`.
- **API**: 9 hàm trong `src/services/authService.ts` (DTO ở `src/types/req/authReq.ts` và `src/types/res/authRes.ts`) (register, verify-email, resend-verification,
  login, refresh, logout, forgot-password, reset-password, change-password); mutation của
  react-query trong `src/hooks/useAuthMutations.ts`; login/logout nằm trong `AuthProvider`
  vì còn phải lưu token.
- **Tài khoản mẫu** ở `/login` chỉ hiện khi `import.meta.env.DEV` và lấy từ
  `.env.development.local` (không commit) – xem `src/config/demoAccounts.ts`.
- **CHỜ BACKEND**: swagger chưa có endpoint `/me` (đọc hồ sơ người đăng nhập) và token thật chỉ có `sub`, `email`, role
  (dò lại 08/10/2026), nên tên hiển thị trên nút tài khoản tạm là email. Tên lấy theo thứ tự: `/me` → claim
  `fullName` / `name` / claim name của .NET / `family_name` + `given_name` → email. Khi có `/me`, chỉ cần điền thân
  hàm `fetchCurrentUser()` trong `src/services/me.ts`; backend thêm claim họ tên thì tên tự hiện.

## Biến thể đã chốt

- Technician dashboard: dùng `technician_dashboard_1`. Bỏ qua `technician_dashboard_2`.
- My Tasks: dùng `my_tasks_1` (dạng bảng). Bỏ qua `my_tasks_2`.
- Sidebar/header technician tham chiếu từ `my_tasks_1/code.html` (logo "Smart Solar", subtitle "Field Operations"); không dùng nhãn "SOLARTECH".
- `installation_task_checklist` và `site_survey_verification` cũng mang nhãn "SOLARTECH" trong sidebar nhưng là màn riêng, VẪN DỰNG thành route riêng (`/tech/installations/:id/checklist`, `/tech/surveys/:id/verify`); chỉ thay sidebar bằng AppShell chung "Smart Solar", phần `<main>` giữ đúng thiết kế.

## Quy ước làm việc với thiết kế

- Ảnh trong `code.html` (`lh3.googleusercontent.com/...`) là link tạm → thay bằng `/placeholders/*.svg` hoặc `<img>` với ảnh cục bộ trong `public/`.
- **Chữ trên giao diện viết bằng tiếng Việt** (quyết định 22/09/2026). Bản thiết kế Stitch
  là tiếng Anh, khi dựng thì dịch sang tiếng Việt; giữ nguyên tên riêng, mã SKU, mã phiếu,
  tên hãng và thuật ngữ đã quen dùng (inverter, kWh, MPPT, SKU…). Câu chữ viết ngắn, chủ động,
  không quảng cáo: tiêu đề là tên màn hình, mô tả chỉ thêm khi nói được điều gì mới.
- Mỗi màn = 1 route + 1 file dữ liệu trong `src/data/`. Không hard-code dữ liệu trong JSX.
- Khi dựng xong một màn: chạy dev, chụp màn hình, đặt cạnh `screen.png`, liệt kê khác biệt (spacing, màu, font size, icon) rồi sửa. Chấp nhận sai lệch ≤ 4px.
- Không cài thêm thư viện UI khác (MUI, Ant, Chakra…). Ngoại lệ đã chốt: `sonner` chỉ dùng cho toast;
  `three` + `@react-three/fiber` chỉ cho 3D: mô phỏng (05/10/2026) và tấm pin ở trang chủ (20/10/2026); không thêm drei, dùng
  module trong `three/examples/jsm`.
- Không sửa bất kỳ file nào trong `design/stitch/stitch_smart_solar_customer_portal/`.

## Lệnh

- `npm run dev -- --port 3000` – Vite dev server; backend gửi link xác minh email / đặt lại mật khẩu về `http://localhost:3000`.
  Proxy `/api` trỏ `API_PROXY_TARGET` (mặc định `http://localhost:8080`). Máy có dịch vụ khác giữ 8080 (vd. PEMHTTPD đi kèm
  bộ cài PostgreSQL) thì chạy API ở cổng khác: `API_HOST_PORT=8081 docker compose -f docker-compose.pull.yml up -d` trong thư mục
  backend, rồi `API_PROXY_TARGET=http://localhost:8081 npm run dev -- --port 3000`.
  Ở dev, sửa file không phải module trong dự án (CLAUDE.md, `docs/…`) làm Vite / Tailwind tải lại CẢ trang (log `page reload`),
  mất dữ liệu đang nhập dở trong wizard và tốn một lần refresh token: đừng sửa tài liệu trong lúc đang test một luồng dài.
- `npm run build` – `tsc -b && vite build`; phải pass trước khi coi một màn là xong
- `npm run typecheck` – `tsc -b` (nhanh hơn build, dùng khi lặp)
- `npm run gen:api` – sinh lại `src/types/req` và `src/types/res` từ `docs/api/swagger.json`
- `npm run lint` – oxlint (KHÔNG dùng ESLint: repo dùng `typescript@7`, gói này không còn API JS nên typescript-eslint không chạy được)
  (Nếu package.json dùng tên script khác, dùng theo package.json.)
