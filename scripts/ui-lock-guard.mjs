#!/usr/bin/env node
// Hook PreToolUse của Claude Code: giữ các file giao diện đã khoá trong ui-locks.txt.
// - Người không phải chủ sở hữu (git config user.name không nằm trong dòng "owner:"): chặn (deny).
// - Chủ sở hữu: hỏi xác nhận (ask) để phiên AI không lỡ tay sửa đè giao diện đã chốt.
// Kiểm Edit / Write / MultiEdit / NotebookEdit theo đường dẫn; Bash / PowerShell theo đường dẫn có trong lệnh kèm dấu hiệu ghi
// (best-effort, không thay được review). Lỗi bất kỳ trong hook thì cho qua để không khoá cứng phiên làm việc.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOCK_FILE = path.join(ROOT, 'ui-locks.txt')

const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()

function readLocks() {
  const owners = []
  const paths = []
  for (const raw of readFileSync(LOCK_FILE, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const owner = /^owner:\s*(.+)$/i.exec(line)
    if (owner) owners.push(owner[1].trim().toLowerCase())
    else paths.push(norm(line))
  }
  return { owners, paths }
}

function isLocked(rel, paths) {
  return paths.some((p) => (p.endsWith('/**') ? rel.startsWith(p.slice(0, -2)) : rel === p))
}

function toRepoRelative(file, cwd) {
  const abs = path.resolve(cwd || ROOT, file)
  const rel = path.relative(ROOT, abs)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null
  return norm(rel)
}

// Lệnh ghi / xoá / khôi phục file. Bỏ các chuyển hướng vô hại trước khi dò ">"
const WRITE_HINT =
  /(^|[^<>&\d])>{1,2}(?!&)|\bsed\s+-[a-z]*i|\bperl\s+-[a-z]*i|\btee\b|\b(mv|cp|rm|del|truncate|patch)\b|--write\b|\bwrite(file|_text|FileSync)?\s*\(|\bopen\([^)]*['"][wa]\+?['"]|\bgit\s+(checkout|restore|reset|stash|apply|am|mv|rm|clean)\b|\b(Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|Rename-Item|Clear-Content)\b/i
// Lệnh ghi đè hàng loạt không nêu tên file
const BROAD_WRITE =
  /\bgit\s+(reset\s+--hard|checkout\s+(--\s+)?\.(\s|$)|restore\s+(--\S+\s+)*\.(\s|$)|stash\b|clean\b)|\bprettier\b[^|;&]*--write\s+\.(\s|$)/i

function commandTargets(command, paths) {
  const cmd = norm(command.replace(/\d?>\s*\/dev\/null|\d?>\s*\$null|2>&1/gi, ''))
  if (BROAD_WRITE.test(command))
    return paths
      .filter((p) => !p.endsWith('/**'))
      .slice(0, 5)
      .concat('…')
  if (!WRITE_HINT.test(command)) return []
  return paths.filter((p) => {
    const plain = p.endsWith('/**') ? p.slice(0, -3) : p
    return (
      cmd.includes(plain) ||
      (!p.endsWith('/**') && new RegExp(`(^|[\\s/'"])${escape(path.posix.basename(plain))}`).test(cmd))
    )
  })
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function gitUser() {
  try {
    return execFileSync('git', ['config', 'user.name'], { cwd: ROOT, encoding: 'utf8' }).trim().toLowerCase()
  } catch {
    return ''
  }
}

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  )
  process.exit(0)
}

try {
  if (!existsSync(LOCK_FILE)) process.exit(0)
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
  const tool = input.tool_name ?? ''
  const args = input.tool_input ?? {}
  const { owners, paths } = readLocks()
  if (paths.length === 0) process.exit(0)

  let hits = []
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
    const rel = toRepoRelative(args.file_path ?? args.notebook_path ?? '', input.cwd)
    if (rel && isLocked(rel, paths)) hits = [rel]
  } else if ((tool === 'Bash' || tool === 'PowerShell') && typeof args.command === 'string') {
    hits = commandTargets(args.command, paths)
  }
  if (hits.length === 0) process.exit(0)

  const list = hits.join(', ')
  const user = gitUser()
  const ownerText = owners.join(', ') || 'chủ sở hữu'
  if (user && owners.includes(user))
    decide('ask', `Giao diện đã khoá trong ui-locks.txt: ${list}. Bạn (${user}) là chủ sở hữu, xác nhận nếu muốn sửa.`)
  decide(
    'deny',
    `Không sửa: ${list} là giao diện đã khoá bởi ${ownerText} (ui-locks.txt). Không sửa, không ghi đè, không khôi phục các file này; ` +
      `báo người dùng cần ${ownerText} tự sửa hoặc gỡ khoá. Nếu chỉ cần dùng lại, tạo component / file mới thay vì sửa file khoá.`,
  )
} catch {
  process.exit(0)
}
