// Tải swagger của backend đang chạy về docs/api/swagger.json (npm run sync:api [url]), sau đó chạy `npm run gen:api`.
// Backend đặt schemaId bằng tên đầy đủ (SmartSolar.Api.Contracts.Auth.LoginRequest...) nên đổi về tên ngắn trước khi ghi.
// Chỗ nào bản cũ đã có tên thì giữ đúng tên đó để import trong src/ không đổi (vd. AfterSalesReasonRequest).
// Mặc định đọc từ API_PROXY_TARGET (giống proxy của Vite), truyền URL để lấy chỗ khác.
import fs from 'node:fs'
import path from 'node:path'
import * as prettier from 'prettier'
import { loadEnv } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
const target = path.join(root, 'docs/api/swagger.json')

function swaggerUrl() {
  const arg = process.argv[2]
  if (arg) return arg
  const base = (loadEnv('development', root, '').API_PROXY_TARGET || 'http://localhost:8080')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '')
  return `${base}/swagger/v1/swagger.json`
}

const url = swaggerUrl()
const res = await fetch(url)
if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
const remote = await res.json()
const local = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : { paths: {}, components: {} }

const src = remote.components?.schemas ?? {}
const old = local.components?.schemas ?? {}
const PREFIX = '#/components/schemas/'
const refName = (ref) => ref.slice(PREFIX.length)

// `ApiResponse`1[[X, asm], [Y, asm]]` -> ['ApiResponse', ['X', 'Y']]
function parseGeneric(full) {
  const tick = full.indexOf('`')
  if (tick < 0) return [full, []]
  const base = full.slice(0, tick)
  const args = []
  let depth = 0
  let start = -1
  const body = full.slice(full.indexOf('[', tick))
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '[') {
      depth++
      if (depth === 2) start = i + 1
    } else if (ch === ']') {
      if (depth === 2) args.push(stripAssembly(body.slice(start, i)))
      depth--
    }
  }
  return [base, args]
}

// "X, SmartSolar.Modules, Version=..." -> "X" (dấu phẩy nằm trong [[...]] của generic lồng thì giữ)
function stripAssembly(text) {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') depth++
    else if (text[i] === ']') depth--
    else if (text[i] === ',' && depth === 0) return text.slice(0, i).trim()
  }
  return text.trim()
}

const lastPart = (name) => name.split('.').pop()
// InstallationWorkflow -> Installation, như InstallationQuotationLineRequest đã có
const namespaceOf = (name) => (name.split('.').slice(-2, -1)[0] ?? '').replace(/Workflow$/, '')

// Tên ngắn trùng nhau ở hai namespace (vd. ReasonRequest của AfterSales và InstallationWorkflow)
const shortCount = new Map()
for (const full of Object.keys(src)) {
  if (full.includes('`')) continue
  const short = lastPart(full)
  shortCount.set(short, (shortCount.get(short) ?? 0) + 1)
}

// Kiểu Swashbuckle mặc định: ApiResponse<PagedResult<X>> -> XPagedResultApiResponse
function canonical(full) {
  const [base, args] = parseGeneric(full)
  const short = lastPart(base)
  if (args.length) return args.map(canonical).join('And') + short
  if (base === 'System.Object') return 'Object'
  return (shortCount.get(short) ?? 0) > 1 ? namespaceOf(base) + short : short
}

// Gom tên bản cũ đặt cho từng schema (đi cả path lẫn các schema lồng nhau) trước khi đổi,
// để path mới chưa có trong bản cũ cũng dùng đúng tên đó thay vì sinh tên thứ hai
const hints = new Map() // tên đầy đủ -> các tên ngắn bản cũ đã dùng
function collect(node, before) {
  if (!node || typeof node !== 'object' || !before || typeof before !== 'object') return
  if (Array.isArray(node)) return node.forEach((item, i) => collect(item, before[i]))
  if (typeof node.$ref === 'string' && typeof before.$ref === 'string') {
    const full = refName(node.$ref)
    const names = hints.get(full) ?? hints.set(full, []).get(full)
    if (!names.includes(refName(before.$ref))) names.push(refName(before.$ref))
    return
  }
  for (const key of Object.keys(node)) collect(node[key], before[key])
}
collect(remote.paths, local.paths)
const walked = new Set()
for (let again = true; again;) {
  again = false
  for (const [full, names] of [...hints]) {
    for (const name of names) {
      if (walked.has(`${full}|${name}`)) continue
      walked.add(`${full}|${name}`)
      collect(src[full], old[name])
      again = true
    }
  }
}

const out = {} // tên ngắn -> schema đã đổi $ref
const owner = new Map() // tên ngắn -> tên đầy đủ
const primary = new Map() // tên đầy đủ -> tên ngắn dùng khi không có gợi ý
const pending = []

function nameFor(full, hint) {
  if (hint && (!owner.has(hint) || owner.get(hint) === full)) return claim(hint, full, hint)
  if (primary.has(full)) return primary.get(full)
  let name = canonical(full)
  for (let i = 2; owner.has(name) && owner.get(name) !== full; i++) name = `${canonical(full)}${i}`
  return claim(name, full, hint)
}

function claim(name, full, hint) {
  if (!primary.has(full)) primary.set(full, name)
  if (!owner.has(name)) {
    owner.set(name, full)
    pending.push([name, full, hint ? old[hint] : old[name]])
  }
  return name
}

// Đi song song bản mới và bản cũ cùng vị trí: $ref nào bản cũ có tên thì lấy tên đó làm gợi ý
function rewrite(node, before) {
  if (Array.isArray(node)) return node.map((item, i) => rewrite(item, before?.[i]))
  if (!node || typeof node !== 'object') return node
  if (typeof node.$ref === 'string' && node.$ref.startsWith(PREFIX)) {
    const hint = typeof before?.$ref === 'string' ? refName(before.$ref) : undefined
    return { ...node, $ref: PREFIX + nameFor(refName(node.$ref), hint) }
  }
  const copy = {}
  for (const [key, value] of Object.entries(node)) copy[key] = rewrite(value, before?.[key])
  return copy
}

for (const [full, names] of hints) {
  const name = names.find((n) => !owner.has(n))
  if (name) claim(name, full, name)
}
const paths = rewrite(remote.paths, local.paths)
for (const full of Object.keys(src)) nameFor(full)
while (pending.length) {
  const [name, full, before] = pending.shift()
  out[name] = rewrite(src[full], before)
}

const schemas = Object.fromEntries(
  Object.keys(out)
    .sort()
    .map((name) => [name, out[name]]),
)
const result = { ...remote, paths, components: { ...remote.components, schemas } }
const options = (await prettier.resolveConfig(target)) ?? {}
fs.writeFileSync(target, await prettier.format(JSON.stringify(result), { ...options, filepath: target }))

// Báo khác biệt so với bản cũ để biết màn nào sẽ gọi hụt
const ops = (spec) =>
  new Set(Object.entries(spec.paths ?? {}).flatMap(([p, o]) => Object.keys(o).map((m) => `${m.toUpperCase()} ${p}`)))
const before = ops(local)
const after = ops(result)
const added = [...after].filter((op) => !before.has(op))
const removed = [...before].filter((op) => !after.has(op))
console.log(`${url}\n-> docs/api/swagger.json: ${after.size} endpoint, ${Object.keys(schemas).length} schema`)
if (added.length) console.log(`\nThêm ${added.length}:\n  ${added.join('\n  ')}`)
if (removed.length) console.log(`\nBackend không còn ${removed.length}:\n  ${removed.join('\n  ')}`)
