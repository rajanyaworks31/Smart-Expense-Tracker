import { apiRequest } from './api'
import type {
  Category,
  CategoryCreate,
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  PaginatedResponse,
} from '../types/api'

export async function listCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories')
}

export async function createCategory(data: CategoryCreate): Promise<Category> {
  return apiRequest<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function listExpenses(params: {
  page?: number
  pageSize?: number
  categoryId?: string
  startDate?: string
  endDate?: string
} = {}): Promise<PaginatedResponse<Expense>> {
  const query = new URLSearchParams()
  query.set('page', String(params.page ?? 1))
  query.set('page_size', String(params.pageSize ?? 100))
  if (params.categoryId) query.set('category_id', params.categoryId)
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)

  return apiRequest<PaginatedResponse<Expense>>(`/expenses?${query.toString()}`)
}

export async function createExpense(data: ExpenseCreate): Promise<Expense> {
  return apiRequest<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateExpense(expenseId: string, data: ExpenseUpdate): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${expenseId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await apiRequest<void>(`/expenses/${expenseId}`, { method: 'DELETE' })
}
