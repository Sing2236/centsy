export type Stock = {
  symbol: string
  shares: number
  price: number
  monthly: number
}

export type BudgetCategory = {
  name: string
  planned: number
  actual: number
}

export type BudgetGoal = {
  name: string
  amount: number
  target: number
}

export type ForumPost = {
  id: string
  user_id: string
  title: string
  body: string
  tags: string[]
  category: string
  created_at: string
  updated_at: string
}

export type ForumComment = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
}

export type UserProfile = {
  user_id: string
  username: string
  username_updated_at: string
  created_at: string
}

export type BudgetBill = {
  name: string
  date: string
  amount: number
  recurringDay: number | null
}

export type SpendEntry = {
  id: string
  merchant: string
  category: string
  amount: number
  date: string
  note: string
}

export type SpendDraft = {
  amount?: number
  category?: string
  merchant?: string
  date?: string
  isRefund?: boolean
}

export type SpendCompleteResult = {
  type: 'complete'
  entry: SpendEntry
  summary: string
}

export type SpendDraftResult = {
  type: 'draft'
  missingAmount: boolean
  missingCategory: boolean
  draft: SpendDraft
}

export type ParsedSpend = SpendCompleteResult | SpendDraftResult

export type MarketingView =
  | 'home'
  | 'features'
  | 'about'
  | 'dev-notes'
  | 'investors'
  | 'terms'
  | 'privacy'
  | 'app'
  | 'budgeting-app'
  | 'cash-flow-budgeting'
  | 'paycheck-planning'

export type AppView =
  | 'workspace'
  | 'cashflow'
  | 'spend'
  | 'planner'
  | 'insights'
  | 'invest'
  | 'copilot'
  | 'concierge'
  | 'personalize'

export type UiAction = {
  view: AppView
  panel?: 'cadence' | 'strategy' | 'labels' | 'schedule' | null
}
