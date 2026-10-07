import { apiRequest } from './api'
import type { AnalyticsSummary, MoneyLeakReport, SpendingForecast } from '../types/api'

export async function getAnalyticsSummary(startDate: string, endDate: string): Promise<AnalyticsSummary> {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate })
  return apiRequest<AnalyticsSummary>(`/analytics/summary?${query.toString()}`)
}

export async function getMoneyLeaks(startDate: string, endDate: string): Promise<MoneyLeakReport> {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate })
  return apiRequest<MoneyLeakReport>(`/analytics/money-leaks?${query.toString()}`)
}

export async function getSpendingForecast(startDate: string, endDate: string): Promise<SpendingForecast> {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate })
  return apiRequest<SpendingForecast>(`/analytics/spending-forecast?${query.toString()}`)
}
