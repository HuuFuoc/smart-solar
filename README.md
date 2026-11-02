# Solar Client

React 19 + Vite + TypeScript + Tailwind CSS.

```bash
npm install
npm run dev
```

## Định dạng code

Cả nhóm dùng chung một bản Prettier (cố định trong `package.json`, cấu hình ở `.prettierrc.json`), không cần cài Prettier cho cả máy.

```bash
npm run format        # định dạng lại toàn repo
npm run format:check  # chỉ kiểm tra, liệt kê file chưa đúng
```

- VS Code: cài các extension được gợi ý khi mở repo (Prettier, EditorConfig). `.vscode/settings.json` đã bật định dạng bằng Prettier mỗi khi lưu file.
- Editor khác: bật EditorConfig và chạy `npm run format` trước khi commit.
- Mọi file dùng xuống dòng LF (`.gitattributes`, `.editorconfig`).
