export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

// Money and other Decimal values are strings at the API boundary to preserve precision.
export type Money = string;
export type DecimalString = string;

export interface ErrorDetail {
  code: string;
  detail: string;
}

export interface ErrorResponse {
  error: ErrorDetail;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface User {
  id: UUID;
  email: string;
  full_name: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

export interface Category {
  id: UUID;
  name: string;
  icon: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CategoryCreate {
  name: string;
  icon?: string | null;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string | null;
}

export interface Expense {
  id: UUID;
  category_id: UUID;
  amount: Money;
  description: string;
  expense_date: ISODate;
  notes: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface ExpenseCreate {
  category_id: UUID;
  amount: Money;
  description: string;
  expense_date: ISODate;
  notes?: string | null;
}

export interface ExpenseUpdate {
  category_id?: UUID;
  amount?: Money;
  description?: string;
  expense_date?: ISODate;
  notes?: string | null;
}

export interface Income {
  id: UUID;
  amount: Money;
  source: string;
  income_date: ISODate;
  notes: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface IncomeCreate {
  amount: Money;
  source: string;
  income_date: ISODate;
  notes?: string | null;
}

export interface IncomeUpdate {
  amount?: Money;
  source?: string;
  income_date?: ISODate;
  notes?: string | null;
}

export interface Budget {
  id: UUID;
  category_id: UUID | null;
  name: string;
  amount: Money;
  period: "monthly";
  start_date: ISODate;
  end_date: ISODate;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface BudgetCreate {
  category_id?: UUID | null;
  name: string;
  amount: Money;
  period?: "monthly";
  start_date: ISODate;
  end_date: ISODate;
}

export interface BudgetUpdate {
  category_id?: UUID | null;
  name?: string;
  amount?: Money;
  period?: "monthly";
  start_date?: ISODate;
  end_date?: ISODate;
}

export interface SavingsGoal {
  id: UUID;
  name: string;
  target_amount: Money;
  current_amount: Money;
  target_date: ISODate | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  remaining_amount: Money;
  progress_percentage: DecimalString;
}

export interface SavingsGoalCreate {
  name: string;
  target_amount: Money;
  current_amount?: Money;
  target_date?: ISODate | null;
}

export interface SavingsGoalUpdate {
  name?: string;
  target_amount?: Money;
  current_amount?: Money;
  target_date?: ISODate | null;
}

export interface FinancialInsight {
  id: UUID;
  insight_type: string;
  title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  generated_at: ISODateTime;
  expires_at: ISODateTime | null;
}

export interface CategorySpending {
  category_id: UUID;
  category_name: string;
  amount: Money;
  percentage: DecimalString;
}

export interface MonthlyTrend {
  month: string;
  income: Money;
  expenses: Money;
  net_cash_flow: Money;
}

export interface BudgetUtilization {
  budget_id: UUID;
  budget_name: string;
  limit: Money;
  spent: Money;
  remaining: Money;
  utilization_percentage: DecimalString;
}

export interface AnalyticsSummary {
  start_date: ISODate;
  end_date: ISODate;
  total_income: Money;
  total_expenses: Money;
  net_cash_flow: Money;
  savings_rate: DecimalString;
  category_breakdown: CategorySpending[];
  monthly_trends: MonthlyTrend[];
  budget_utilization: BudgetUtilization[];
}

export interface MoneyLeak {
  category_id: UUID;
  category_name: string;
  current_amount: Money;
  previous_amount: Money;
  increase_amount: Money;
  increase_percentage: DecimalString;
  explanation: string;
}

export interface MoneyLeakReport {
  start_date: ISODate;
  end_date: ISODate;
  comparison_start_date: ISODate;
  comparison_end_date: ISODate;
  leaks: MoneyLeak[];
}

export interface SpendingForecast {
  start_date: ISODate;
  end_date: ISODate;
  observed_end_date: ISODate;
  elapsed_days: number;
  remaining_days: number;
  total_days: number;
  observed_spend: Money;
  projected_spend: Money;
  daily_run_rate: Money;
  explanation: string;
}

export interface AIAskRequest {
  question: string;
}

export interface AIAskResponse {
  answer: string;
  supporting_insight: FinancialInsight | null;
}

export interface AIWebSource {
  title: string;
  url: string;
}

export interface AIEconomyResponse {
  title: string;
  content: string;
  sources: AIWebSource[];
  updated_at: string;
}

export interface AIInsightRequest {
  insight_type: string;
}

export interface AIInsightResponse {
  insight: FinancialInsight;
}

export interface AICategoryRequest {
  description: string;
}

export interface AICategoryResponse {
  category_id: UUID;
  category_name: string;
  confidence: number;
  reason: string;
}
