import { apiRequest } from './api'
import type { SavingsGoal, SavingsGoalCreate, SavingsGoalUpdate } from '../types/api'

export async function listGoals(): Promise<SavingsGoal[]> {
  return apiRequest<SavingsGoal[]>('/goals')
}

export async function createGoal(data: SavingsGoalCreate): Promise<SavingsGoal> {
  return apiRequest<SavingsGoal>('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateGoal(goalId: string, data: SavingsGoalUpdate): Promise<SavingsGoal> {
  return apiRequest<SavingsGoal>(`/goals/${goalId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteGoal(goalId: string): Promise<void> {
  await apiRequest<void>(`/goals/${goalId}`, { method: 'DELETE' })
}
