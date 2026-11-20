# Solar-client: quy tắc cho người và AI làm việc trong repo

## Giao diện đã khoá: KHÔNG được sửa

Các file trong [ui-locks.txt](ui-locks.txt) là giao diện chủ sở hữu (**huufuoc**) đã chỉnh và chốt. Danh sách đó là nguồn duy nhất, file này không chép lại.

Nếu bạn không phải huufuoc (kể cả phiên AI chạy cho người khác):

- **Không** sửa, ghi đè, format lại, đổi tên, xoá hay khôi phục (`git checkout` / `restore` / `reset`) bất kỳ file nào trong danh sách. Không sửa cả khi chỉ đổi className, màu, khoảng cách, chữ hiển thị hay thứ tự phần tử.
- Không né luật bằng cách sửa CSS dùng chung (`src/styles/*.css`) hoặc component con để làm đổi giao diện của file đã khoá.
- Cần dùng lại thì tạo component hoặc file mới, rồi import vào chỗ mình cần. Không sửa file gốc.
- Cần đổi logic hoặc API trong file đã khoá: báo huufuoc để họ tự sửa, hoặc để họ gỡ dòng đó khỏi `ui-locks.txt` trước.
- Không sửa chính cơ chế khoá: `ui-locks.txt`, `scripts/ui-lock-guard.mjs`, `.claude/settings.json`, `.github/CODEOWNERS`, `CLAUDE.md`, `AGENTS.md`.
- Gặp xung đột merge ở file đã khoá thì giữ bản của huufuoc và báo lại, không tự chọn bản của mình.

Luật này được thực thi ở hai lớp:

1. **Claude Code**: hook `PreToolUse` trong `.claude/settings.json` chạy `scripts/ui-lock-guard.mjs`. Hook chặn Edit / Write / lệnh shell ghi vào file đã khoá khi `git config user.name` không phải owner. Với owner, hook hỏi xác nhận trước khi sửa.
2. **GitHub**: `.github/CODEOWNERS` buộc PR chạm vào file đã khoá phải được @HuuFuoc duyệt.

Khoá thêm file: thêm dòng vào `ui-locks.txt` và dòng tương ứng vào `.github/CODEOWNERS`.
