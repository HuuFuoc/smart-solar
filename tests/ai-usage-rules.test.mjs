// Luật trang Chi phí AI (AiUsageDashboardService, RagConfigurationRules.Validate) và tab Cấu hình AI (registry model) của
// backend nhánh cloud RAG 4fb5b95. `CEILINGS` là `ceilings` thật của GET /admin/rag-budget trên server chung (17/11/2026).
// Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  budgetFormOf,
  budgetFormProblems,
  budgetUpdate,
  defaultUsageRange,
  formatUsd,
  parseUsd,
  reviewProblems,
  usageRangeError,
} from '../src/features/ai-usage/aiUsageRules.ts'
import {
  costControlChanges,
  costControlsOf,
  defaultRagValues,
  isModelUsable,
  modelOptions,
  modelPriceText,
  withModel,
} from '../src/features/admin-settings/ragConfigRules.ts'

const CEILINGS = {
  chunkCharactersMin: 400,
  chunkCharactersMax: 8000,
  chunkOverlapRule: '0 <= chunkOverlap <= chunkCharacters / 2',
  topKMin: 1,
  topKMax: 10,
  minScoreMin: 0,
  minScoreMax: 1,
  maxContextTokensMin: 500,
  maxContextTokensMax: 6000,
  maxOutputTokensMin: 64,
  maxOutputTokensMax: 1500,
  temperatureMin: 0,
  temperatureMax: 1,
  maxHistoryMessagesMin: 0,
  maxHistoryMessagesMax: 20,
  userRequestsPerDayMin: 1,
  userRequestsPerDayMax: 200,
  userConcurrencyMin: 1,
  userConcurrencyMax: 2,
  globalConcurrencyMin: 1,
  globalConcurrencyMax: 10,
  maxQuestionCharactersMin: 100,
  maxQuestionCharactersMax: 2000,
  generationTimeoutSecondsMin: 5,
  generationTimeoutSecondsMax: 60,
  dailyBudgetUsdMax: 10,
  monthlyBudgetUsdMax: 100,
  monthlyIngestionBudgetUsdMax: 10,
}

const BUDGET = {
  activeVersion: 2,
  bootstrap: false,
  generationEnabled: true,
  dailyBudgetUsd: 1,
  monthlyBudgetUsd: 4,
  monthlyIngestionBudgetUsd: 0.5,
  userRequestsPerDay: 30,
  userConcurrency: 1,
  globalConcurrency: 3,
  maxQuestionCharacters: 1000,
  generationTimeoutSeconds: 30,
  ceilings: CEILINGS,
}

describe('chi phí AI: khoảng ngày (UTC, tối đa 92 ngày)', () => {
  test('mặc định từ ngày 1 của tháng UTC tới hôm nay UTC, kể cả khi giờ Việt Nam đã sang ngày khác', () => {
    assert.deepEqual(defaultUsageRange(new Date('2026-11-17T23:30:00+07:00')), { from: '2026-11-01', to: '2026-11-17' })
    assert.deepEqual(defaultUsageRange(new Date('2026-12-01T03:00:00+07:00')), { from: '2026-11-01', to: '2026-11-30' })
  })
  test('đúng: 1 ngày và đúng 92 ngày; quy tắc: 93 ngày, ngày đầu sau ngày cuối, thiếu ngày thì báo', () => {
    assert.equal(usageRangeError('2026-11-17', '2026-11-17'), null)
    assert.equal(usageRangeError('2026-08-18', '2026-11-17'), null)
    assert.match(usageRangeError('2026-08-17', '2026-11-17'), /tối đa 92 ngày \(đang chọn 93 ngày\)/)
    assert.match(usageRangeError('2026-11-18', '2026-11-17'), /trước hoặc bằng/)
    for (const bad of ['', '17/11/2026', '2026-13-40']) assert.match(usageRangeError(bad, '2026-11-17'), /Chọn đủ/)
  })
})

describe('chi phí AI: tiền USD', () => {
  test('tối đa 6 chữ số lẻ; số dương nhỏ hơn 0,000001 không thành 0', () => {
    assert.equal(formatUsd(0), '0 USD')
    assert.equal(formatUsd(8e-7), '< 0,000001 USD')
    assert.equal(formatUsd(0.00064), '0,00064 USD')
    assert.equal(formatUsd(0.9999992), '0,999999 USD')
    assert.equal(formatUsd(null), '—')
    assert.equal(formatUsd(Number.NaN), '—')
  })
  test('ô nhập nhận dấu phẩy; sai số chữ số lẻ, số âm, chữ thì không nhận', () => {
    assert.equal(parseUsd('0,00031', 6), 0.00031)
    assert.equal(parseUsd(' 1.5 ', 2), 1.5)
    for (const bad of ['1.555', '-1', 'abc', '', '1,2,3']) assert.equal(parseUsd(bad, 2), null)
  })
  test('đối soát: chi phí 0–100 USD (6 chữ số lẻ), ghi chú 1–500 ký tự', () => {
    assert.deepEqual(reviewProblems('0', 'Hoá đơn ngày 20/11'), {})
    assert.deepEqual(reviewProblems('0,000310', 'x'), {})
    assert.ok(reviewProblems('', 'x').cost)
    assert.ok(reviewProblems('100,5', 'x').cost)
    assert.ok(reviewProblems('0,0000001', 'x').cost)
    assert.ok(reviewProblems('1', '   ').note)
    assert.ok(reviewProblems('1', 'a'.repeat(501)).note)
  })
})

describe('chi phí AI: sửa ngân sách và giới hạn', () => {
  test('form lấy số đang áp dụng; không đổi gì thì không gửi', () => {
    const form = budgetFormOf(BUDGET)
    assert.equal(form.monthlyIngestionBudgetUsd, '0,5')
    assert.deepEqual(budgetFormProblems(form, CEILINGS), {})
    assert.equal(budgetUpdate(BUDGET, form, true, 'không đổi'), null)
  })
  test('chỉ gửi ô đã đổi kèm expectedActiveVersion; tắt soạn câu trả lời cũng là một thay đổi', () => {
    const form = { ...budgetFormOf(BUDGET), dailyBudgetUsd: '0,5' }
    assert.deepEqual(budgetUpdate(BUDGET, form, true, '  Giảm cuối tháng '), {
      expectedActiveVersion: 2,
      dailyBudgetUsd: 0.5,
      notes: 'Giảm cuối tháng',
    })
    assert.deepEqual(budgetUpdate(BUDGET, budgetFormOf(BUDGET), false, ''), {
      expectedActiveVersion: 2,
      generationEnabled: false,
    })
  })
  test('quy tắc: vượt trần, quá 2 chữ số lẻ, ngày lớn hơn tháng, không phải số nguyên thì báo đúng ô', () => {
    const problems = budgetFormProblems(
      {
        ...budgetFormOf(BUDGET),
        monthlyBudgetUsd: '101',
        monthlyIngestionBudgetUsd: '0,555',
        userConcurrency: '3',
        maxQuestionCharacters: '99',
        generationTimeoutSeconds: '1,5',
      },
      CEILINGS,
    )
    assert.deepEqual(Object.keys(problems).sort(), [
      'generationTimeoutSeconds',
      'maxQuestionCharacters',
      'monthlyBudgetUsd',
      'monthlyIngestionBudgetUsd',
      'userConcurrency',
    ])
    const dailyOverMonthly = budgetFormProblems({ ...budgetFormOf(BUDGET), dailyBudgetUsd: '5' }, CEILINGS)
    assert.match(dailyOverMonthly.dailyBudgetUsd, /ngân sách tháng/)
  })
})

const MODELS = [
  {
    id: 'gpt-6-luna',
    supportsTemperature: false,
    tokenParameter: 'max_completion_tokens',
    maxOutputTokensLimit: 300,
    usable: true,
    reasoningEfforts: ['none', 'low'],
    defaultReasoningEffort: 'none',
    inputUsdPerMillion: 0.15,
    cachedInputUsdPerMillion: 0.075,
    outputUsdPerMillion: 0.6,
    isDefault: true,
  },
  {
    id: 'qwen3:1.7b',
    supportsTemperature: true,
    tokenParameter: 'max_tokens',
    maxOutputTokensLimit: 1000,
    usable: true,
    reasoningEfforts: [],
  },
  {
    id: 'gpt-4.1-mini',
    supportsTemperature: true,
    tokenParameter: 'max_tokens',
    maxOutputTokensLimit: 1500,
    usable: false,
  },
]
const CATALOG = { models: MODELS, promptVersions: ['v1', 'v2'], limits: CEILINGS }
const VALUES = {
  generationModel: 'qwen3:1.7b',
  temperature: 0.1,
  reasoningEffort: null,
  maxOutputTokens: 700,
  chunkCharacters: 2400,
  chunkOverlap: 300,
  topK: 6,
  minScore: 0.2,
  maxContextTokens: 3000,
  maxHistoryMessages: 6,
  promptVersion: 'v1',
}

describe('cấu hình AI: registry model', () => {
  test('chỉ chọn model dùng được; model đang dùng mà không còn dùng được thì đứng đầu và bị khoá', () => {
    assert.deepEqual(
      modelOptions(CATALOG, 'qwen3:1.7b').map((o) => [o.model.id, o.disabled]),
      [
        ['gpt-6-luna', false],
        ['qwen3:1.7b', false],
      ],
    )
    assert.deepEqual(modelOptions(CATALOG, 'gpt-4.1-mini')[0], { model: MODELS[2], disabled: true })
    assert.equal(modelOptions(CATALOG, 'model-la')[0].disabled, true)
    assert.equal(isModelUsable(CATALOG, 'gpt-4.1-mini'), false)
    assert.equal(isModelUsable(undefined, 'gì cũng được'), true)
  })
  test('đổi sang model không nhận độ ngẫu nhiên: gửi null, mức suy luận mặc định, token trả lời không vượt trần model', () => {
    assert.deepEqual(
      (({ temperature, reasoningEffort, maxOutputTokens }) => ({ temperature, reasoningEffort, maxOutputTokens }))(
        withModel(VALUES, MODELS[0]),
      ),
      { temperature: null, reasoningEffort: 'none', maxOutputTokens: 300 },
    )
    const back = withModel(
      { ...VALUES, generationModel: 'gpt-6-luna', temperature: null, reasoningEffort: 'low' },
      MODELS[1],
    )
    assert.equal(back.temperature, 0.1)
    assert.equal(back.reasoningEffort, null)
  })
  test('giá trị mặc định theo model mặc định của registry, không dùng tên model viết sẵn; không có model dùng được thì null', () => {
    const d = defaultRagValues(CATALOG)
    assert.equal(d.generationModel, 'gpt-6-luna')
    assert.equal(d.temperature, null)
    assert.equal(d.maxOutputTokens, 300)
    assert.equal(d.maxContextTokens, 2000)
    assert.equal(defaultRagValues({ models: [MODELS[2]], promptVersions: [] }), null)
    assert.equal(defaultRagValues(undefined), null)
  })
  test('giá theo 1 triệu token; registry chưa có giá thì không hiện', () => {
    assert.equal(modelPriceText(MODELS[0]), 'Vào 0,15 USD, đọc lại 0,075 USD, ra 0,6 USD cho 1 triệu token')
    assert.equal(modelPriceText(MODELS[1]), null)
  })
  test('bản nháp còn giữ giới hạn chi phí cũ thì báo đúng ô; lưu bản nháp gửi kèm giới hạn đang dùng', () => {
    const active = { ...VALUES, dailyBudgetUsd: 0.5, generationEnabled: true, userRequestsPerDay: 30 }
    const draft = { ...VALUES, dailyBudgetUsd: 1, generationEnabled: true, userRequestsPerDay: 30 }
    assert.deepEqual(costControlChanges(draft, active), ['dailyBudgetUsd'])
    assert.deepEqual(costControlChanges(null, active), [])
    assert.deepEqual(costControlsOf(active), { generationEnabled: true, dailyBudgetUsd: 0.5, userRequestsPerDay: 30 })
  })
})
