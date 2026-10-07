import { apiRequest } from './api'
import type { Budget, BudgetCreate, BudgetUpdate } from '../types/api'

export async function listBudgets(): Promise<Budget[]> {
  return apiRequest<Budget[]>('/budgets')
}

export async function createBudget(data: BudgetCreate): Promise<Budget> {
  return apiRequest<Budget>('/budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBudget(budgetId: string, data: BudgetUpdate): Promise<Budget> {
  return apiRequest<Budget>(`/budgets/${budgetId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteBudget(budgetId: string): Promise<void> {
  await apiRequest<void>(`/budgets/${budgetId}`, { method: 'DELETE' })
}
