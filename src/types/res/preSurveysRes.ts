// Viết tay vì swagger không có schema response (tag PreSurveys)

export type CreatePreSurveyResponse = {
  /** Format: uuid */
  preSurveyId: string
}

export type SubmitPreSurveyResponse = {
  /** Format: uuid */
  surveyRequestId: string
}
