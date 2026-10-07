import { apiRequest } from './api'
import type { Income, IncomeCreate, IncomeUpdate, PaginatedResponse } from '../types/api'

export async function listIncome(params: {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
} = {}): Promise<PaginatedResponse<Income>> {
  const query = new URLSearchParams()
  query.set('page', String(params.page ?? 1))
  query.set('page_size', String(params.pageSize ?? 100))
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)

  return apiRequest<PaginatedResponse<Income>>(`/income?${query.toString()}`)
}

export async function createIncome(data: IncomeCreate): Promise<Income> {
  return apiRequest<Income>('/income', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateIncome(incomeId: string, data: IncomeUpdate): Promise<Income> {
  return apiRequest<Income>(`/income/${incomeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteIncome(incomeId: string): Promise<void> {
  await apiRequest<void>(`/income/${incomeId}`, { method: 'DELETE' })
}
