// Sinh type DTO từ docs/api/swagger.json vào src/types/req và src/types/res (npm run gen:api)
// File sinh ra luôn bị ghi đè, không sửa tay. File res chỉ chứa schema của `data` vì client.ts đã bỏ wrapper
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const swagger = JSON.parse(fs.readFileSync(path.join(root, 'docs/api/swagger.json'), 'utf8'))
const schemas = swagger.components?.schemas ?? {}
const outDir = path.join(root, 'src/types')

const refName = (ref) => ref.split('/').pop()
const isWrapper = (name) => {
  const props = schemas[name]?.properties ?? {}
  return 'isSuccess' in props && 'data' in props
}
const fileKey = (tag) => tag.charAt(0).toLowerCase() + tag.slice(1).replace(/[^A-Za-z0-9]/g, '')

const owner = new Map() // schema thuộc file nào: 'req/authReq' | 'res/authRes' | 'res/apiRes'
owner.set('ApiError', 'res/apiRes')

function claim(name, file) {
  if (owner.has(name) || !schemas[name]) return
  owner.set(name, file)
  for (const ref of refsOf(schemas[name])) claim(ref, file)
}

function refsOf(schema, acc = []) {
  if (!schema || typeof schema !== 'object') return acc
  if (schema.$ref) acc.push(refName(schema.$ref))
  for (const value of Object.values(schema)) if (typeof value === 'object') refsOf(value, acc)
  return acc
}

const jsonSchema = (content) => content?.['application/json']?.schema
for (const ops of Object.values(swagger.paths ?? {})) {
  for (const op of Object.values(ops)) {
    const key = fileKey(op.tags?.[0] ?? 'common')
    const body = jsonSchema(op.requestBody?.content)
    if (body?.$ref) claim(refName(body.$ref), `req/${key}Req`)
    for (const [code, response] of Object.entries(op.responses ?? {})) {
      if (!code.startsWith('2')) continue
      const ref = jsonSchema(response.content)?.$ref
      if (!ref) continue
      const name = refName(ref)
      const data = isWrapper(name) ? schemas[name].properties.data?.$ref : ref
      if (data) claim(refName(data), `res/${key}Res`)
    }
  }
}

// Đổi JSON schema sang type TS
function tsType(schema, file, imports) {
  if (!schema || Object.keys(schema).filter((k) => k !== 'nullable' && k !== 'description').length === 0)
    return 'unknown'
  let type
  if (schema.$ref) {
    const name = refName(schema.$ref)
    const target = owner.get(name)
    if (target && target !== file) (imports.get(target) ?? imports.set(target, new Set()).get(target)).add(name)
    type = name === 'ApiError' ? 'ApiErrorBody' : name
  } else if (schema.enum) type = schema.enum.map((v) => JSON.stringify(v)).join(' | ')
  else if (schema.type === 'array') type = `${wrap(tsType(schema.items, file, imports))}[]`
  else if (schema.type === 'integer' || schema.type === 'number') type = 'number'
  else if (schema.type === 'string') type = schema.format === 'binary' ? 'Blob' : 'string'
  else if (schema.type === 'boolean') type = 'boolean'
  else if (schema.type === 'object' || schema.properties) {
    if (!schema.properties && schema.additionalProperties)
      type = `Record<string, ${tsType(schema.additionalProperties, file, imports)}>`
    else type = objectType(schema, file, imports, '')
  } else type = 'unknown'
  return schema.nullable && type !== 'unknown' ? `${type} | null` : type
}

const wrap = (t) => (t.includes('|') ? `(${t})` : t)

function objectType(schema, file, imports, indent) {
  const required = new Set(schema.required ?? [])
  const lines = Object.entries(schema.properties ?? {}).map(([prop, value]) => {
    const doc = value.format ? `${indent}  /** Format: ${value.format} */\n` : ''
    return `${doc}${indent}  ${prop}${required.has(prop) ? '' : '?'}: ${tsType(value, file, imports)}`
  })
  return lines.length ? `{\n${lines.join('\n')}\n${indent}}` : 'Record<string, never>'
}

const HEADER = '/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */\n'

const files = new Map()
for (const [name, file] of owner) (files.get(file) ?? files.set(file, []).get(file)).push(name)
if (!files.has('res/apiRes')) files.set('res/apiRes', [])

// Xoá file sinh lần trước để endpoint bị gỡ khỏi swagger không để lại kiểu thừa.
for (const dir of ['req', 'res']) {
  const full = path.join(outDir, dir)
  fs.mkdirSync(full, { recursive: true })
  for (const f of fs.readdirSync(full))
    if (fs.readFileSync(path.join(full, f), 'utf8').startsWith(HEADER)) fs.rmSync(path.join(full, f))
}

for (const [file, names] of files) {
  const imports = new Map()
  const blocks = names.sort().map((name) => {
    const alias = file === 'res/apiRes' && name === 'ApiError' ? 'ApiErrorBody' : name
    const doc = name === 'ApiError' ? '/** Phần `error` trong wrapper *ApiResponse (schema ApiError). */\n' : ''
    return `${doc}export type ${alias} = ${tsType({ ...schemas[name], nullable: false }, file, imports)}`
  })
  if (file === 'res/apiRes') {
    blocks.push(
      [
        '/** Dạng chung của mọi wrapper *ApiResponse; client.ts mở wrapper và trả `data`. */',
        'export type ApiResponse<T> = {',
        '  isSuccess?: boolean',
        '  traceId?: string | null',
        '  data?: T',
        '  error?: ApiErrorBody',
        '}',
      ].join('\n'),
    )
  }
  const importLines = [...imports]
    .map(
      ([from, set]) =>
        `import type { ${[...set]
          .sort()
          .map((n) => (n === 'ApiError' ? 'ApiErrorBody' : n))
          .join(', ')} } from '@/types/${from}'`,
    )
    .join('\n')
  const text = HEADER + (importLines ? `${importLines}\n` : '') + '\n' + blocks.join('\n\n') + '\n'
  fs.writeFileSync(path.join(outDir, `${file}.ts`), text)
  console.log(`src/types/${file}.ts: ${names.length} schema`)
}
