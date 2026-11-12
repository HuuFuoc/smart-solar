# Quy tắc cho agent viết giao diện (đọc trước khi sửa bất kỳ file .tsx nào)

File này dành cho mọi agent (Claude Code, Cursor, Codex, Gemini, Copilot...) và người làm giao diện trong repo.
Chi tiết và lý do nằm ở `CLAUDE.md`, mục "Quy tắc giao diện dùng chung". File này là bản rút gọn để làm theo.

`npm test` có `tests/ui-rules.test.mjs` quét code các cổng đăng nhập. Test đỏ thì sửa code cho qua, không sửa test
và không thêm file vào danh sách bỏ qua.

## Trước khi viết

1. Tìm trong `src/components/common/ui/` trước. Đã có thì dùng, không tự viết khung, thẻ, nhãn hay nút mới.
2. Đặt giao diện mới cạnh một màn đã có cùng loại (danh sách, chi tiết, form) và làm cho giống nó.
3. Không "redesign" màn đang chạy khi không ai yêu cầu. Sửa đúng phần được giao.

## Component phải dùng

| Cần                      | Dùng                                                                                       | Không tự làm                                      |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Trạng thái               | `Badge` (`ui/badge.tsx`): chữ có màu, không nền, không viền, không icon                    | Nhãn dạng viên thuốc có nền / viền / icon         |
| Số đếm cạnh tab, tiêu đề | `Count` (`attention` khi là việc đang chờ: số đỏ)                                          | Ô tròn tự vẽ bằng `rounded-full px-*`             |
| Lọc theo nhóm / tab      | `FilterChips` (tab gạch chân), `Segmented`, `Select active`                                | Dãy nút viên thuốc `rounded-full`                 |
| Ô tìm                    | `SearchInput`                                                                              | Input tự ghép icon kính lúp                       |
| Bảng / danh sách         | `Table` `Th` `Td` `Tr` (`ui/table.tsx`) hoặc `ListHead` `ListCells` `ListCell` `ListRow`   | Mỗi dòng một thẻ có viền                          |
| Nhóm theo trạng thái     | `StatusTableSection` (`ui/status-tables.tsx`)                                              | Bản sao riêng của khối đó trong từng trang        |
| Khối nội dung            | `Panel`, `PanelHeader`, `PanelBody`, `KeyValueList`                                        | Thẻ tô nền màu thương hiệu, vạch màu lề trái      |
| Nút                      | `Button` / `ButtonLink` / `IconButton`, chọn `variant` theo việc (CLAUDE.md quy tắc 9, 10) | `<button>` tự style, nút không viền               |
| Trống / đang tải / lỗi   | `EmptyState`, `Skeleton`, `QueryBoundary`, `Notice`                                        | Khung tự vẽ với `animate-pulse`                   |
| Tiêu đề trang            | `PageHeader`                                                                               | Tiêu đề kèm nhãn trạng thái viên thuốc, mô tả dài |

## Không được làm (dấu hiệu "giao diện AI")

- Bo góc khác 6px: chỉ `rounded-control` / `rounded-container`. `rounded-full` chỉ cho hình tròn thật (chấm, điểm mốc).
- Bóng dưới thẻ tĩnh (`shadow-xs/sm/md`). Bóng chỉ cho dialog, menu (`shadow-pop`).
- Nhấc thẻ, phóng ảnh khi rê chuột (`hover:-translate-y-*`, `hover:scale-*`), `transition-all`.
- Cỡ chữ ngoài thang: chỉ `text-meta` 13, `text-body` 15, `text-title` 18, `text-figure` 24, `text-display` 32.
  Không `text-xs/sm/lg/xl...`, không `text-[12px]`. Icon chỉ 16 / 20 / 24px.
- Màu Tailwind thô (`amber-500`, `emerald-600`, `bg-white`, `bg-black`) và độ mờ tự chế (`bg-surface-2/40`,
  `border-line/60`, `bg-accent-soft/55`). Chỉ dùng token trong `src/styles/globals.css`; cần sắc độ mới thì thêm token.
- Nối chữ bằng `·` `•`, mũi tên `→` sau nhãn, nhãn IN HOA giãn chữ, chữ đứng trước tiêu đề (eyebrow).
- Icon trước từng dòng chữ, từng nhãn, ô icon trang trí cạnh tiêu đề, avatar chữ cái cho người không có ảnh.
  Icon chỉ có ở nút, mục menu, `Notice` loại ok / warn / danger, toast.
- Thẻ có viền cho mỗi dòng danh sách, lưới thẻ số liệu kiểu bento, nhiều lớp khung lồng nhau.
- Đệm rộng: lề trang và khối 16px (`p-4`), khoảng giữa khối tối đa `gap-6`. Không `p-5/6/8`, `py-12`, `max-w-*` cho
  nội dung trang (trừ form nhiều bước: `mx-auto max-w-3xl`).
- Cột phụ ngắn đứng cạnh nội dung dài (để trống nửa màn). Trải thông tin thành cột hoặc xếp xuống dưới.
- Câu tự sinh: mô tả dưới tiêu đề kiểu giải thích, "... sẽ hiện ở đây", "Bước 2/5 · ...". Chỉ giữ tên tính năng,
  số liệu thật và việc người xem cần làm.
- Lặp một thông tin nhiều lần trên cùng màn (tiêu đề nhóm, nút lọc và từng dòng cùng ghi một trạng thái).
- Chữ kỹ thuật trên giao diện: backend, máy chủ, token, API, mã lỗi.

## Màu

- `danger` (đỏ) chỉ cho việc cần xử lý, lỗi, thao tác phá huỷ. Mỗi sự việc báo đỏ một lần trên một màn.
- `warn` lưu ý không gấp, `ok` đang chạy đúng, `info` đang xử lý và nút xem / mở, `neutral` đã xong.
- Chữ link dùng `ui-link` hoặc `text-accent-fg`, không `text-accent`.

## Bố cục theo cổng

- Nhân viên (`/ops`, `/admin`, `/tech`, `/manage`) dùng `app-shell.tsx`; khách hàng (`/customer`) dùng `customer-shell.tsx`.
- Trang chi tiết của khách có nút viền quay lại mục menu (shell tự vẽ). Không thay bằng breadcrumb.
- Danh sách phía khách có thanh trang 10 dòng (`PagedList` / `ListPager`).

## Comment và định dạng

- Comment tiếng Việt, một dòng, chỉ giải thích lý do code không tự nói được. Không comment kể lại JSX
  (`{/* Tiêu đề bảng */}`), không divider `/* ---- */`, không ghi ngày hay "theo yêu cầu".
- Xong việc chạy `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`.
- Commit theo Conventional Commits, không thêm dòng `Co-Authored-By` hay ghi chú do AI viết.
