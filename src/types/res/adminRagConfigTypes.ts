export type RagConfigurationValues = {
  generationModel: string
  temperature?: number | null
  maxOutputTokens: number
  chunkCharacters: number
  chunkOverlap: number
  topK: number
  minScore: number
  maxContextTokens: number
  maxHistoryMessages: number
  promptVersion: string
}

export type RagConfigurationView = RagConfigurationValues & {
  version: number
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED'
  supportsTemperature: boolean
  tokenParameter: string
  notes?: string | null
  basedOnVersion?: number | null
  createdBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  activatedBy?: string | null
  activatedAt?: string | null
  revision: number
}

export type RagConfigurationState = {
  bootstrap: boolean
  effective: RagConfigurationView
  active?: RagConfigurationView | null
  draft?: RagConfigurationView | null
}

export type RagGenerationModel = {
  id: string
  displayName?: string
  supportsTemperature: boolean
  tokenParameter: string
  maxOutputTokensLimit: number
}

export type RagModelCatalog = {
  models: RagGenerationModel[]
  promptVersions: string[]
}

export type RagConfigurationHistoryView = {
  items: RagConfigurationView[]
  total: number
  page: number
  pageSize: number
}

export type SaveRagConfigurationDraftRequest = Partial<RagConfigurationValues> & {
  notes?: string
  expectedRevision?: number
}

export const DEFAULT_RAG_VALUES: RagConfigurationValues = {
  generationModel: 'gpt-4.1-mini',
  temperature: 0.1,
  maxOutputTokens: 700,
  chunkCharacters: 2400,
  chunkOverlap: 300,
  topK: 6,
  minScore: 0.2,
  maxContextTokens: 3000,
  maxHistoryMessages: 6,
  promptVersion: 'v1',
}
