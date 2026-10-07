import { apiRequest } from './api'
import type { AICategoryRequest, AICategoryResponse, AIEconomyResponse, AIAskRequest, AIAskResponse, AIInsightResponse } from '../types/api'

export async function askYourMoney(data: AIAskRequest): Promise<AIAskResponse> {
  return apiRequest<AIAskResponse>('/ai/ask', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getEconomyPulse(): Promise<AIEconomyResponse> {
  return apiRequest<AIEconomyResponse>('/ai/economy-pulse', {
    method: 'POST',
  })
}

export async function generateMonthlyStory(): Promise<AIInsightResponse> {
  return apiRequest<AIInsightResponse>('/ai/monthly-story', {
    method: 'POST',
  })
}

export async function suggestExpenseCategory(data: AICategoryRequest): Promise<AICategoryResponse> {
  return apiRequest<AICategoryResponse>('/ai/categorize', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
