// Quét code giao diện các cổng đăng nhập theo "Quy tắc giao diện dùng chung" trong AGENTS.md
// Lỗi in ra file:dòng kèm cách sửa. Chạy: npm test
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, test } from 'node:test'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SRC = join(ROOT, 'src')

// Trang công khai, xác thực và bộ Stitch có quy ước riêng (xem CLAUDE.md)
const SKIP = [
  'components/common/stitch-ui/',
  'components/layout/AuthLayout.tsx',
  'pages/public/',
  'pages/auth/',
  'pages/StyleguidePage.tsx',
  'pages/ComingSoonPage.tsx',
  'pages/ForbiddenPage.tsx',
  'features/auth/PasswordRules.tsx',
  'features/landing/',
]

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

const portalFiles = files(SRC)
  .map((path) => ({ path, rel: relative(SRC, path).split(sep).join('/') }))
  .filter(({ rel }) => !SKIP.some((s) => rel.startsWith(s)))

const RULES = [
  {
    name: 'bo góc chỉ dùng rounded-control / rounded-container (6px)',
    re: /\brounded-(?:[tblrse]{1,2}-)?(?:xs|sm|md|lg|xl|2xl|3xl)\b/,
  },
  {
    name: 'viên thuốc: rounded-full chỉ cho hình tròn thật; số đếm dùng Count, bộ lọc dùng FilterChips / Segmented / Select',
    re: /rounded-full[^'"`]*\bpx-|\bpx-[^'"`]*rounded-full/,
  },
  { name: 'thẻ tĩnh không có bóng (bóng chỉ cho lớp nổi: shadow-pop)', re: /\bshadow-(?:2xs|xs|sm|md)\b/ },
  {
    name: 'cỡ chữ theo thang text-meta / text-body / text-title / text-figure / text-display',
    re: /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/,
  },
  {
    name: 'không text-[Npx] cho chữ; icon chỉ 16 / 20 / 24px',
    re: /\btext-\[(?!(?:16|20|24)px\])\d+px\]/,
  },
  { name: 'không chuyển động trang trí khi rê chuột (nhấc thẻ, phóng ảnh)', re: /hover:-?(?:translate|scale)/ },
  {
    name: 'không màu Tailwind thô; dùng token trong globals.css',
    re: /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(?:bg|text|border)-(?:white|black)\b/,
  },
  // `uppercase` cho ô nhập mã (SKU, mã khu vực) thì được
  { name: 'không nhãn IN HOA giãn chữ', re: /\btracking-(?:wide|wider|widest)\b/ },
  {
    name: 'không nối chữ bằng dấu · • hay mũi tên → cuối nhãn; tách cột / xuống dòng / dùng dấu phẩy',
    // "cũ → mới" giữa hai giá trị thì được
    re: /[·•]|[^>\s]\s*→\s*(?:<\/|['"`]|$)/,
    // Chỉ xét chữ hiện lên màn hình, bỏ qua comment
    text: true,
  },
]

function violations(rule) {
  const found = []
  for (const { path, rel } of portalFiles) {
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const code = rule.text ? line.replace(/\/\/.*$|\{?\/\*.*?\*\/\}?/g, '') : line
        if (rule.re.test(code)) found.push(`  src/${rel}:${i + 1}  ${line.trim().slice(0, 110)}`)
      })
  }
  return found
}

describe('quy tắc giao diện dùng chung (AGENTS.md)', () => {
  for (const rule of RULES) {
    test(rule.name, () => {
      const found = violations(rule)
      assert.equal(found.length, 0, `${rule.name}\n${found.join('\n')}`)
    })
  }
})
