import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './App.extra.css'
import { supabase } from './supabaseClient'
import centsyLogo from './assets/centsy-logo.svg'

type Stock = {
  symbol: string
  shares: number
  price: number
  monthly: number
}

type ForumPost = {
  id: string
  user_id: string
  title: string
  body: string
  tags: string[]
  category: string
  created_at: string
  updated_at: string
}

type ForumComment = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
}

type UserProfile = {
  user_id: string
  username: string
  username_updated_at: string
  created_at: string
}

type BudgetBill = {
  name: string
  date: string
  amount: number
  recurringDay: number | null
}

type SpendEntry = {
  id: string
  merchant: string
  category: string
  amount: number
  date: string
  note: string
}

type SpendDraft = {
  amount?: number
  category?: string
  merchant?: string
  date?: string
  isRefund?: boolean
}

type SpendCompleteResult = {
  type: 'complete'
  entry: SpendEntry
  summary: string
}

type SpendDraftResult = {
  type: 'draft'
  missingAmount: boolean
  missingCategory: boolean
  draft: SpendDraft
}

type ParsedSpend = SpendCompleteResult | SpendDraftResult

type BudgetState = {
  incomePerPaycheck: number
  partnerIncome: number
  payFrequency: string
  primaryGoal: string
  autoSuggest: boolean
  includePartner: boolean
  bankBalance: number
  payDates: string[]
  monthlyBuffer: number
  notificationWeeklySummary: boolean
  notificationOverBudget: boolean
  notificationBillReminders: boolean
  notificationReminderDays: number
  autoSaveEnabled: boolean
  budgetGenerated: boolean
  budgetCategories: typeof categoriesSeed
  budgetGoals: typeof goalsSeed
  budgetBills: BudgetBill[]
  labels: string[]
  scheduleBias: number
  debtStrategy: string
  stocks: Stock[]
  robinhoodConnected: boolean
  monthlyInvestment: number
  expectedReturn: number
  spendEntries: SpendEntry[]
}

type UiAction = {
  view: AppView
  panel?: 'cadence' | 'strategy' | 'labels' | 'schedule' | null
}

type MarketingView =
  | 'home'
  | 'features'
  | 'about'
  | 'dev-notes'
  | 'investors'
  | 'terms'
  | 'privacy'
  | 'app'

type AppView =
  | 'workspace'
  | 'cashflow'
  | 'spend'
  | 'planner'
  | 'insights'
  | 'invest'
  | 'copilot'
  | 'concierge'
  | 'personalize'

const categoriesSeed = [
  { name: 'Rent', planned: 1200, actual: 1200 },
  { name: 'Groceries', planned: 420, actual: 368 },
  { name: 'Transportation', planned: 220, actual: 245 },
  { name: 'Utilities', planned: 160, actual: 142 },
  { name: 'Fun money', planned: 180, actual: 126 },
  { name: 'Savings', planned: 400, actual: 400 },
]

const goalsSeed = [
  { name: 'Emergency fund', amount: 3250, target: 5000 },
  { name: 'Travel fund', amount: 820, target: 2000 },
  { name: 'Debt payoff', amount: 6480, target: 9200 },
]

const billsSeed: BudgetBill[] = [
  { name: 'Rent', date: 'Mar 1', amount: 1200, recurringDay: null },
  { name: 'Phone', date: 'Mar 5', amount: 80, recurringDay: null },
  { name: 'Car insurance', date: 'Mar 12', amount: 165, recurringDay: null },
  { name: 'Streaming bundle', date: 'Mar 19', amount: 24, recurringDay: null },
]

const spendStepOptions = [-5, -1, 1, 5]

const spendEntriesSeed: SpendEntry[] = []

const usernamePattern = /^[A-Za-z0-9_]{3,20}$/

const devNotesSeed = [
  {
    title: 'Community usernames + Savings Concierge fixes',
    date: 'Jan 02, 2026',
    summary:
      'Username onboarding now prompts on first login, posts/replies show @names, and usernames are editable every 30 days in Preferences. Savings Concierge output now renders reliably and strips stray JSON fields.',
    tag: 'Community',
  },
  {
    title: 'AI Insights + paycheck planning',
    date: 'Jan 12, 2026',
    summary:
      'AI Insights now includes a risk score, bill-by-bill paycheck allocations, and a bank balance input that updates guidance instantly. Added pay date tracking so biweekly and monthly paychecks map cleanly into planning.',
    tag: 'Insights',
  },
  {
    title: 'Copilot removals tightened',
    date: 'Jan 05, 2026',
    summary:
      'Removal requests now take priority over spend logging, so bills, categories, goals, labels, stocks, and spend entries can be deleted with Apply.',
    tag: 'Copilot',
  },
  {
    title: 'Community upgrades shipped',
    date: 'Dec 24, 2025',
    summary:
      'Categories, tags, and search are now live in the community feed to keep threads easier to find.',
    tag: 'Community',
  },
  {
    title: 'Spending tracker is live',
    date: 'Dec 23, 2025',
    summary:
      'Log every purchase, link it to a bill, and watch your budget update in real time.',
    tag: 'Updates',
  },
  {
    title: 'Bill reminders now send automatically',
    date: 'Dec 22, 2025',
    summary:
      'Recurring bills can trigger Resend reminders based on your lead-day setting.',
    tag: 'Infrastructure',
  },
  {
    title: 'Preferences got a manual save button',
    date: 'Dec 21, 2025',
    summary:
      'Auto-save is still on, but you now have a clear Save Preferences action.',
    tag: 'Quality',
  },
]

const forumCategoriesSeed = [
  'Bills & essentials',
  'Debt payoff',
  'Saving wins',
  'Side income',
  'Family budgeting',
  'General',
]

const savingsConciergeContext = [
  'Mode: Savings Concierge.',
  'Goal: help the user lower recurring bills and subscriptions.',
  'Provide step-by-step negotiation or cancellation scripts (phone/chat/email).',
  'Include: prep checklist, negotiation script, fallback offer, and follow-up note.',
  'Use Budget Space data to prioritize the biggest savings opportunities.',
  'Do not claim actions were completed; give clear next steps and ask for details.',
  'Only suggest budget updates when the user explicitly asks to update amounts.',
].join(' ')

const marketingViewFromParam = (value: string | null): MarketingView => {
  switch (value) {
    case 'features':
      return 'features'
    case 'about':
      return 'about'
    case 'dev-notes':
      return 'dev-notes'
    case 'investors':
      return 'investors'
    case 'updates':
      return 'dev-notes'
    case 'terms':
      return 'terms'
    case 'privacy':
      return 'privacy'
    case 'app':
      return 'app'
    default:
      return 'home'
  }
}

const marketingViewToParam = (view: MarketingView) => {
  switch (view) {
    case 'features':
      return 'features'
    case 'about':
      return 'about'
    case 'dev-notes':
      return 'updates'
    case 'investors':
      return 'investors'
    case 'terms':
      return 'terms'
    case 'privacy':
      return 'privacy'
    case 'app':
      return 'app'
    default:
      return ''
  }
}

const formatCurrency = (value: number) => {
  const rounded = Math.round(value)
  if (rounded < 0) {
    return `-$${Math.abs(rounded).toLocaleString('en-US')}`
  }
  return `$${rounded.toLocaleString('en-US')}`
}

const statusFor = (planned: number, actual: number) => {
  if (actual <= planned * 0.9) return 'ahead'
  if (actual <= planned * 1.05) return 'on-track'
  return 'over'
}

const goalStatus = (amount: number, target: number) => {
  if (target <= 0) return 'on-track'
  const ratio = amount / target
  if (ratio >= 1) return 'on-track'
  if (ratio >= 0.6) return 'ahead'
  return 'over'
}

const goalPace = (amount: number, target: number) => {
  if (target <= 0) return '0%'
  return `${Math.min(100, Math.round((amount / target) * 100))}%`
}

const billWeekIndex = (dateLabel: string, recurringDay?: number | null) => {
  if (recurringDay && !Number.isNaN(recurringDay)) {
    const day = Math.min(31, Math.max(1, recurringDay))
    if (day <= 7) return 1
    if (day <= 14) return 2
    if (day <= 21) return 3
    return 4
  }
  const isoMatch = dateLabel.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) {
    const parsed = new Date(dateLabel)
    const day = parsed.getDate()
    if (!Number.isNaN(day)) {
      if (day <= 7) return 1
      if (day <= 14) return 2
      if (day <= 21) return 3
      return 4
    }
  }
  const weekMatch = dateLabel.match(/week\s*(\d+)/i)
  if (weekMatch) {
    const week = Math.min(4, Math.max(1, Number(weekMatch[1])))
    return Number.isNaN(week) ? 1 : week
  }
  const dayMatch = dateLabel.match(/(\d{1,2})/)
  if (dayMatch) {
    const day = Number(dayMatch[1])
    if (day <= 7) return 1
    if (day <= 14) return 2
    if (day <= 21) return 3
    return 4
  }
  return 1
}

const billDueDay = (bill: { date: string; recurringDay?: number | null }) => {
  if (bill.recurringDay && !Number.isNaN(bill.recurringDay)) {
    return Math.min(31, Math.max(1, bill.recurringDay))
  }
  const extracted = extractDayFromLabel(bill.date)
  return extracted ?? 99
}

const formatDateForInput = (dateLabel: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateLabel)) {
    return dateLabel
  }
  return ''
}

const extractDayFromLabel = (dateLabel: string) => {
  const isoMatch = dateLabel.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) {
    const parsed = new Date(dateLabel)
    const day = parsed.getDate()
    return Number.isNaN(day) ? null : day
  }
  const match = dateLabel.match(/(\d{1,2})/)
  if (!match) return null
  const day = Number(match[1])
  return Number.isNaN(day) ? null : day
}

const formatBillDateLabel = (bill: { date: string; recurringDay?: number | null }) =>
  bill.recurringDay ? `Monthly on ${bill.recurringDay}` : bill.date

const findNameMatch = (names: string[], text: string) => {
  const normalized = text.toLowerCase()
  return (
    [...names]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .find((name) => normalized.includes(name.toLowerCase())) ?? null
  )
}

const parseLooseAmount = (text: string) => {
  const match = text.match(
    /(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?/
  )
  if (!match) return null
  const normalized = match[0].replace(/,/g, '')
  const value = Number.parseFloat(normalized)
  return Number.isNaN(value) ? null : value
}

const parseMonthFromText = (text: string) => {
  const normalized = text.toLowerCase()
  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]
  const index = months.findIndex((month) => normalized.includes(month))
  if (index >= 0) return index + 1
  const shortMonths = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ]
  const shortIndex = shortMonths.findIndex((month) =>
    normalized.includes(month)
  )
  return shortIndex >= 0 ? shortIndex + 1 : null
}

const formatIsoDate = (year: number, month: number, day: number) => {
  const safeMonth = String(month).padStart(2, '0')
  const safeDay = String(day).padStart(2, '0')
  return `${year}-${safeMonth}-${safeDay}`
}

const buildPaycheckGuidance = (options: {
  bankBalance: number
  bankBalanceAfterBills: number
  billsPerPaycheck: number
  nextPaycheckAfterBills: number
  nextPaycheckTotal: number
  payFrequencyLabel: string
  leftToBudget: number
  dailyFlexTarget: number
  weeklyFlexTarget: number
}) => {
  const items: string[] = []
  if (!options.bankBalance) {
    items.push('Add your bank balance for more accurate paycheck guidance.')
  } else if (options.bankBalanceAfterBills < 0) {
    items.push(
      `You are short ${formatCurrency(Math.abs(options.bankBalanceAfterBills))} for monthly bills.`
    )
  } else {
    items.push(
      `You can cover monthly bills with ${formatCurrency(options.bankBalanceAfterBills)} left.`
    )
  }
  if (options.nextPaycheckTotal > 0) {
    items.push(
      `Set aside about ${formatCurrency(options.billsPerPaycheck)} from your next ${options.payFrequencyLabel.toLowerCase()} paycheck for bills.`
    )
    items.push(
      options.nextPaycheckAfterBills < 0
        ? `Your next paycheck is short ${formatCurrency(Math.abs(options.nextPaycheckAfterBills))} after bills.`
        : `You will have about ${formatCurrency(options.nextPaycheckAfterBills)} from your next paycheck for goals and spending.`
    )
  }
  items.push(
    options.leftToBudget < 0
      ? `Your plan is over budget by ${formatCurrency(Math.abs(options.leftToBudget))}. Reduce bills or boost income.`
      : `Aim for ${formatCurrency(options.dailyFlexTarget)} per day or ${formatCurrency(options.weeklyFlexTarget)} per week of flexible spend.`
  )
  return items
}

const formatShortDate = (value: string) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatLongDate = (value: string) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const extractReplyFromJsonString = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed.includes('"reply"')) return null
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    const jsonText = candidate.slice(start, end + 1)
    try {
      const parsed = JSON.parse(jsonText) as { reply?: unknown }
      return typeof parsed.reply === 'string' ? parsed.reply : null
    } catch {
      // fall through to regex extraction
    }
  }
  const summaryMatch = candidate.match(
    /"reply"\s*:\s*"([\s\S]*?)"\s*,\s*"summary"\s*:/
  )
  const updatesMatch = candidate.match(
    /"reply"\s*:\s*"([\s\S]*?)"\s*,\s*"updates"\s*:/
  )
  const fallbackMatch =
    summaryMatch || updatesMatch || candidate.match(/"reply"\s*:\s*"([\s\S]*?)"\s*(?:,|})/)
  if (!fallbackMatch) return null
  return fallbackMatch[1]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}


function App() {
  const [budgetGenerated, setBudgetGenerated] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)
  const [budgetCategories, setBudgetCategories] = useState(categoriesSeed)
  const [budgetGoals, setBudgetGoals] = useState(goalsSeed)
  const [budgetBills, setBudgetBills] = useState<BudgetBill[]>(billsSeed)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: '',
    planned: '',
    actual: '',
  })
  const [newGoal, setNewGoal] = useState({
    name: '',
    target: '',
  })
  const [robinhoodConnected, setRobinhoodConnected] = useState(false)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [expectedReturn, setExpectedReturn] = useState(7)
  const [monthlyInvestment, setMonthlyInvestment] = useState(200)
  const [spendEntries, setSpendEntries] = useState<SpendEntry[]>(spendEntriesSeed)
  const [editingSpendId, setEditingSpendId] = useState<string | null>(null)
  const [editSpendValues, setEditSpendValues] = useState({
    merchant: '',
    amount: '',
    category: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    direction: 'expense' as 'expense' | 'refund',
  })
  const [newSpend, setNewSpend] = useState({
    merchant: '',
    amount: '',
    category: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    direction: 'expense' as 'expense' | 'refund',
  })
  const [incomePerPaycheck, setIncomePerPaycheck] = useState(2100)
  const [partnerIncome, setPartnerIncome] = useState(0)
  const [payFrequency, setPayFrequency] = useState('biweekly')
  const [primaryGoal, setPrimaryGoal] = useState('stability')
  const [autoSuggest, setAutoSuggest] = useState(true)
  const [includePartner, setIncludePartner] = useState(false)
  const [bankBalance, setBankBalance] = useState(0)
  const [showBankBalanceEditor, setShowBankBalanceEditor] = useState(false)
  const [payDates, setPayDates] = useState<string[]>([''])
  const [monthlyBuffer, setMonthlyBuffer] = useState(150)
  const [notificationWeeklySummary, setNotificationWeeklySummary] = useState(true)
  const [notificationOverBudget, setNotificationOverBudget] = useState(true)
  const [notificationBillReminders, setNotificationBillReminders] = useState(true)
  const [notificationReminderDays, setNotificationReminderDays] = useState(3)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryValues, setEditCategoryValues] = useState({
    planned: '',
    actual: '',
  })
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [editGoalValues, setEditGoalValues] = useState({
    name: '',
    amount: '',
    target: '',
  })
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [usernamePromptDismissed, setUsernamePromptDismissed] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [activePanel, setActivePanel] = useState<
    'cadence' | 'strategy' | 'labels' | 'schedule' | null
  >(null)
  const [debtStrategy, setDebtStrategy] = useState('avalanche')
  const [labels, setLabels] = useState(['Essential', 'Lifestyle', 'Savings'])
  const [newLabel, setNewLabel] = useState('')
  const [scheduleBias, setScheduleBias] = useState(0)
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([
    {
      role: 'assistant',
      content:
        'Budget Copilot ready. Tell me what to change.',
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [savingsStep, setSavingsStep] = useState<'bill' | 'target' | 'plan'>(
    'bill'
  )
  const [savingsBill, setSavingsBill] = useState('')
  const [savingsTarget, setSavingsTarget] = useState('')
  const [savingsMethod, setSavingsMethod] = useState<'phone' | 'chat' | 'email'>(
    'phone'
  )
  const [savingsProvider, setSavingsProvider] = useState('')
  const [savingsNotes, setSavingsNotes] = useState('')
  const [savingsPlan, setSavingsPlan] = useState('')
  const [savingsLoading, setSavingsLoading] = useState(false)
  const [savingsError, setSavingsError] = useState('')
  const [savingsPendingUpdates, setSavingsPendingUpdates] =
    useState<Partial<BudgetState> | null>(null)
  const [savingsPendingSummary, setSavingsPendingSummary] = useState('')
  const [pendingUpdates, setPendingUpdates] = useState<Partial<BudgetState> | null>(
    null
  )
  const [pendingSpendDraft, setPendingSpendDraft] = useState<SpendDraft | null>(
    null
  )
  const [pendingLocalAction, setPendingLocalAction] = useState<{
    actions: Array<
      | 'resetBudget'
      | 'clearBills'
      | 'clearGoals'
      | 'clearSchedule'
      | 'clearLabels'
      | 'resetPreferences'
      | 'resetEverything'
    >
  } | null>(null)
  const [pendingSummary, setPendingSummary] = useState('')
  const [allocationSortMode, setAllocationSortMode] = useState<'due' | 'custom'>(
    'due'
  )
  const [allocationOrder, setAllocationOrder] = useState<string[]>([])
  const [pendingUiAction, setPendingUiAction] = useState<UiAction | null>(null)
  const [pendingUtilityAction, setPendingUtilityAction] = useState<
    'exportCsv' | null
  >(null)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')
  const [waitlistMessage, setWaitlistMessage] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [forumComments, setForumComments] = useState<
    Record<string, ForumComment[]>
  >({})
  const [forumLoading, setForumLoading] = useState(false)
  const [forumError, setForumError] = useState('')
  const [activeForumPostId, setActiveForumPostId] = useState<string | null>(null)
  const [forumCategories, setForumCategories] = useState(forumCategoriesSeed)
  const [profileByUserId, setProfileByUserId] = useState<Record<string, string>>(
    {}
  )
  const [newCategoryName, setNewCategoryName] = useState('')
  const [forumSearch, setForumSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTag, setSelectedTag] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [newPost, setNewPost] = useState({
    title: '',
    body: '',
    tags: '',
    category: '',
  })
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [activeView, setActiveView] = useState<AppView>('workspace')
  const [categoryRange, setCategoryRange] = useState({ min: 0, max: 3000 })
  const [onboardingCollapsed, setOnboardingCollapsed] = useState(false)
  const [showIncomeEditor, setShowIncomeEditor] = useState(false)
  const currentYear = new Date().getFullYear()
  const showSetupGuide = !budgetGenerated && !onboardingCollapsed
  const showLegacySteps = !budgetGenerated && !showSetupGuide

  const basePath =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/centsy')
      ? '/centsy'
      : ''
  const viewParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('view')
      : null
  const isCommunityPage = viewParam === 'community'
  const initialMarketingView = isCommunityPage
    ? 'home'
    : marketingViewFromParam(viewParam)
  const [marketingView, setMarketingView] =
    useState<MarketingView>(initialMarketingView)
  const [isNavOpen, setIsNavOpen] = useState(false)
  const communityUrl = `${basePath}/?view=community`
  const homeUrl = `${basePath}/`
  const termsPdfUrl = `${basePath}/terms.pdf`
  const privacyPdfUrl = `${basePath}/privacy.pdf`

  const builderRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const plannerRef = useRef<HTMLDivElement | null>(null)
  const personalizeRef = useRef<HTMLDivElement | null>(null)
  const hasAutoDirected = useRef(false)
  const saveTimer = useRef<number | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isHydrating, setIsHydrating] = useState(false)
  const [isBudgetTransitioning, setIsBudgetTransitioning] = useState(false)

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setUserEmail(data.session?.user?.email ?? null)
      setUserId(data.session?.user?.id ?? null)
    }
    getSession()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
      setUserId(session?.user?.id ?? null)
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setUserProfile(null)
        setUsernameDraft('')
        setShowUsernameModal(false)
        setUsernamePromptDismissed(false)
        setProfileLoaded(false)
        return
      }
      setProfileLoaded(false)
      setUsernamePromptDismissed(false)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, username_updated_at, created_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        showToast('Could not load your profile.')
        setUserProfile(null)
        setUsernameDraft('')
        setProfileLoaded(true)
        return
      }
      if (data) {
        const profile = data as UserProfile
        setUserProfile(profile)
        setUsernameDraft(profile.username ?? '')
        setProfileByUserId((prev) => ({
          ...prev,
          [profile.user_id]: profile.username,
        }))
        setProfileLoaded(true)
        return
      }
      setUserProfile(null)
      setUsernameDraft('')
      setProfileLoaded(true)
    }
    loadProfile()
  }, [userId])

  useEffect(() => {
    if (!userId || !profileLoaded) return
    if (!userProfile?.username && !usernamePromptDismissed) {
      setShowUsernameModal(true)
      return
    }
    if (userProfile?.username) {
      setShowUsernameModal(false)
    }
  }, [userId, userProfile, usernamePromptDismissed, profileLoaded])

  useEffect(() => {
    if (isCommunityPage) {
      loadForumPosts()
    }
  }, [isCommunityPage, userId])

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return
      const nextParam = new URLSearchParams(window.location.search).get('view')
      if (nextParam === 'community') return
      setMarketingView(marketingViewFromParam(nextParam))
      setIsNavOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!newSpend.category && budgetCategories.length > 0) {
      setNewSpend((prev) => ({ ...prev, category: budgetCategories[0].name }))
    }
  }, [budgetCategories, newSpend.category])

  useEffect(() => {
    if (!newPost.category && forumCategories.length > 0) {
      setNewPost((prev) => ({ ...prev, category: forumCategories[0] }))
    }
  }, [forumCategories, newPost.category])

  useEffect(() => {
    if (!isBudgetTransitioning || marketingView !== 'app') return
    scrollTo(workspaceRef)
    const timer = window.setTimeout(() => {
      setIsBudgetTransitioning(false)
    }, 650)
    return () => window.clearTimeout(timer)
  }, [isBudgetTransitioning, marketingView])

  const marketingUrlFor = (view: MarketingView) => {
    const param = marketingViewToParam(view)
    return param ? `${basePath}/?view=${param}` : `${basePath}/`
  }

  const getDefaultAppView = () => (budgetGenerated ? 'workspace' : 'personalize')

  const handleMarketingNav = (
    view: MarketingView,
    options?: { appView?: AppView }
  ) => {
    setMarketingView(view)
    setIsNavOpen(false)
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', marketingUrlFor(view))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    if (view === 'app') {
      setActiveView(options?.appView ?? getDefaultAppView())
    }
  }

  useEffect(() => {
    if (marketingView !== 'app') return
    if (!budgetGenerated && !hasAutoDirected.current) {
      setActiveView('personalize')
      hasAutoDirected.current = true
      return
    }
    if (budgetGenerated && hasAutoDirected.current && activeView === 'personalize') {
      setActiveView('workspace')
      hasAutoDirected.current = false
    }
  }, [marketingView, budgetGenerated, activeView])

  const currentBudgetState = useMemo<BudgetState>(
    () => ({
      incomePerPaycheck,
      partnerIncome,
      payFrequency,
      primaryGoal,
      autoSuggest,
      includePartner,
      bankBalance,
      payDates,
      monthlyBuffer,
      notificationWeeklySummary,
      notificationOverBudget,
      notificationBillReminders,
      notificationReminderDays,
      autoSaveEnabled,
      budgetGenerated,
      budgetCategories,
      budgetGoals,
      budgetBills,
      labels,
      scheduleBias,
      debtStrategy,
      stocks,
      robinhoodConnected,
      monthlyInvestment,
      expectedReturn,
      spendEntries,
    }),
    [
      incomePerPaycheck,
      partnerIncome,
      payFrequency,
      primaryGoal,
      autoSuggest,
      includePartner,
      bankBalance,
      payDates,
      monthlyBuffer,
      notificationWeeklySummary,
      notificationOverBudget,
      notificationBillReminders,
      notificationReminderDays,
      autoSaveEnabled,
      budgetGenerated,
      budgetCategories,
      budgetGoals,
      budgetBills,
      labels,
      scheduleBias,
      debtStrategy,
      stocks,
      robinhoodConnected,
      monthlyInvestment,
      expectedReturn,
      spendEntries,
    ]
  )

  const savingsCandidates = useMemo(
    () => {
      const source =
        budgetBills.length > 0
          ? budgetBills.map((bill) => ({ name: bill.name, amount: bill.amount }))
          : budgetCategories.map((category) => ({
              name: category.name,
              amount: category.planned,
            }))
      return source
        .filter((item) => item.name.trim().length > 0)
        .sort((a, b) => b.amount - a.amount)
    },
    [budgetBills, budgetCategories]
  )

  useEffect(() => {
    if (!savingsCandidates.length) return
    const hasMatch = savingsCandidates.some((item) => item.name === savingsBill)
    if (!savingsBill || !hasMatch) {
      setSavingsBill(savingsCandidates[0].name)
    }
  }, [savingsBill, savingsCandidates])

  useEffect(() => {
    const targetCount = payFrequency === 'biweekly' ? 2 : 1
    setPayDates((prev) => {
      const trimmed = prev.slice(0, targetCount)
      if (trimmed.length < targetCount) {
        return [...trimmed, ...Array.from({ length: targetCount - trimmed.length }, () => '')]
      }
      return trimmed
    })
  }, [payFrequency])

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current)
    }
    toastTimer.current = window.setTimeout(() => setToast(''), 2500)
  }

  const getUsernameValidationError = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return 'Choose a username to continue.'
    if (!usernamePattern.test(trimmed)) {
      return 'Use 3-20 letters, numbers, or underscores.'
    }
    return ''
  }

  const getUsernameNextChangeDate = (updatedAt?: string | null) => {
    if (!updatedAt) return null
    const parsed = new Date(updatedAt)
    if (Number.isNaN(parsed.getTime())) return null
    const next = new Date(parsed)
    next.setDate(next.getDate() + 30)
    return next
  }

  const getUsernameCooldownDays = (updatedAt?: string | null) => {
    const nextChange = getUsernameNextChangeDate(updatedAt)
    if (!nextChange) return 0
    const diffMs = nextChange.getTime() - Date.now()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const formatForumUsername = (id: string) => {
    const username = profileByUserId[id]
    return username ? `@${username}` : 'Member'
  }

  const usernameCooldownDays = getUsernameCooldownDays(
    userProfile?.username_updated_at
  )
  const usernameNextChangeDate = getUsernameNextChangeDate(
    userProfile?.username_updated_at
  )
  const usernameChangeLocked =
    Boolean(userProfile?.username) && usernameCooldownDays > 0

  const requireLogin = (message: string) => {
    if (userEmail) return true
    showToast(message)
    setShowLogin(true)
    return false
  }

  const openBudgetSpace = (appView?: AppView) => {
    if (!requireLogin('Please log in to open Budget Space.')) {
      return
    }
    handleMarketingNav('app', { appView: appView ?? getDefaultAppView() })
    if (!budgetGenerated) {
      setOnboardingCollapsed(false)
      showToast('Start with your pay details, then build your budget.')
      return
    }
    showToast('Budget Space opened.')
  }

  const scrollTo = (ref: { current: HTMLDivElement | null }) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }


  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      showToast('Add a bill name first.')
      return
    }
    if (
      budgetCategories.some(
        (category) =>
          category.name.toLowerCase() === newCategory.name.trim().toLowerCase()
      )
    ) {
      showToast('That bill already exists.')
      return
    }
    setBudgetCategories((prev) => [
      ...prev,
      {
        name: newCategory.name,
        planned: Number(newCategory.planned || 0),
        actual: Number(newCategory.actual || 0),
      },
    ])
    setNewCategory({ name: '', planned: '', actual: '' })
    setShowCategoryForm(false)
    showToast('Bill added to your budget.')
  }

  const handleQuickAdd = (name: string) => {
    const exists = budgetCategories.some(
      (category) => category.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) {
      showToast('That bill already exists.')
      return
    }
    setBudgetCategories((prev) => [
      ...prev,
      { name, planned: 0, actual: 0 },
    ])
    showToast(`${name} added to your budget.`)
  }

  const handleEditCategory = (name: string) => {
    const category = budgetCategories.find((item) => item.name === name)
    if (!category) return
    setEditingCategory(name)
    setEditCategoryValues({
      planned: String(category.planned),
      actual: String(category.actual),
    })
  }

  const handleSaveCategory = (name: string) => {
    const plannedValue = Number(editCategoryValues.planned || 0)
    const actualValue = Number(editCategoryValues.actual || 0)
    setBudgetCategories((prev) =>
      prev.map((category) =>
        category.name === name
          ? {
              ...category,
              planned: plannedValue,
              actual: actualValue,
            }
          : category
      )
    )
    setBudgetBills((prev) =>
      prev.map((bill) =>
        bill.name.toLowerCase() === name.toLowerCase()
          ? { ...bill, amount: plannedValue }
          : bill
      )
    )
    setEditingCategory(null)
    showToast(`${name} updated.`)
  }

  const handleDeleteCategory = (name: string) => {
    setBudgetCategories((prev) => prev.filter((category) => category.name !== name))
    setBudgetBills((prev) =>
      prev.filter((bill) => bill.name.toLowerCase() !== name.toLowerCase())
    )
    setEditingCategory(null)
    showToast(`${name} removed from monthly bills and schedule.`)
  }

  const updateCategoryValue = (
    name: string,
    field: 'planned' | 'actual',
    value: number
  ) => {
    setBudgetCategories((prev) =>
      prev.map((category) =>
        category.name === name ? { ...category, [field]: value } : category
      )
    )
  }

  const adjustCategoryActual = (name: string, delta: number) => {
    if (!delta || Number.isNaN(delta)) return
    setBudgetCategories((prev) =>
      prev.map((category) =>
        category.name === name
          ? { ...category, actual: category.actual + delta }
          : category
      )
    )
  }

  const createSpendId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `spend-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const handleAddSpendEntry = () => {
    if (!newSpend.merchant.trim()) {
      showToast('Add a merchant or item first.')
      return
    }
    const amountValue = Number(newSpend.amount || 0)
    if (!amountValue || amountValue <= 0) {
      showToast('Enter a valid amount.')
      return
    }
    if (!newSpend.category) {
      showToast('Select a bill to track.')
      return
    }
    const signedAmount =
      newSpend.direction === 'refund' ? -Math.abs(amountValue) : Math.abs(amountValue)
    const entry: SpendEntry = {
      id: createSpendId(),
      merchant: newSpend.merchant.trim(),
      category: newSpend.category,
      amount: signedAmount,
      date: newSpend.date || new Date().toISOString().slice(0, 10),
      note: newSpend.note.trim(),
    }
    setSpendEntries((prev) => [entry, ...prev])
    adjustCategoryActual(entry.category, entry.amount)
    setNewSpend((prev) => ({
      ...prev,
      merchant: '',
      amount: '',
      note: '',
      direction: 'expense',
    }))
    showToast('Spend logged.')
  }

  const handleAdjustSpendEntry = (entryId: string, delta: number) => {
    if (!delta || Number.isNaN(delta)) return
    setSpendEntries((prev) => {
      const target = prev.find((entry) => entry.id === entryId)
      if (!target) return prev
      adjustCategoryActual(target.category, delta)
      return prev.map((entry) =>
        entry.id === entryId ? { ...entry, amount: entry.amount + delta } : entry
      )
    })
  }

  const handleDeleteSpendEntry = (entryId: string) => {
    setSpendEntries((prev) => {
      const target = prev.find((entry) => entry.id === entryId)
      if (!target) return prev
      adjustCategoryActual(target.category, -target.amount)
      return prev.filter((entry) => entry.id !== entryId)
    })
    setEditingSpendId((prev) => (prev === entryId ? null : prev))
    showToast('Spend removed.')
  }

  const handleEditSpendEntry = (entryId: string) => {
    const entry = spendEntries.find((item) => item.id === entryId)
    if (!entry) return
    setEditingSpendId(entryId)
    setEditSpendValues({
      merchant: entry.merchant,
      amount: String(Math.abs(entry.amount)),
      category: entry.category,
      date: entry.date || new Date().toISOString().slice(0, 10),
      note: entry.note,
      direction: entry.amount < 0 ? 'refund' : 'expense',
    })
  }

  const handleCancelSpendEdit = () => {
    setEditingSpendId(null)
  }

  const handleSaveSpendEntry = (entryId: string) => {
    const merchant = editSpendValues.merchant.trim() || 'Spend entry'
    const amountValue = Number(editSpendValues.amount || 0)
    if (!amountValue || amountValue <= 0) {
      showToast('Enter a valid amount.')
      return
    }
    if (!editSpendValues.category) {
      showToast('Select a bill to track.')
      return
    }
    const signedAmount =
      editSpendValues.direction === 'refund'
        ? -Math.abs(amountValue)
        : Math.abs(amountValue)
    const nextDate =
      editSpendValues.date || new Date().toISOString().slice(0, 10)
    const nextNote = editSpendValues.note.trim()
    setSpendEntries((prev) => {
      const target = prev.find((entry) => entry.id === entryId)
      if (!target) return prev
      const nextEntry = {
        ...target,
        merchant,
        category: editSpendValues.category,
        amount: signedAmount,
        date: nextDate,
        note: nextNote,
      }
      if (target.category !== nextEntry.category) {
        adjustCategoryActual(target.category, -target.amount)
        adjustCategoryActual(nextEntry.category, nextEntry.amount)
      } else {
        adjustCategoryActual(target.category, nextEntry.amount - target.amount)
      }
      return prev.map((entry) => (entry.id === entryId ? nextEntry : entry))
    })
    setEditingSpendId(null)
    showToast('Spend updated.')
  }

  const handleEditGoal = (name: string) => {
    const goal = budgetGoals.find((item) => item.name === name)
    if (!goal) return
    setEditingGoal(name)
    setEditGoalValues({
      name: goal.name,
      amount: String(goal.amount),
      target: String(goal.target),
    })
  }

  const handleSaveGoal = (name: string) => {
    const trimmedName = editGoalValues.name.trim()
    if (!trimmedName) {
      showToast('Add a goal name first.')
      return
    }
    const amount = Number(editGoalValues.amount || 0)
    const target = Number(editGoalValues.target || 0)
    setBudgetGoals((prev) =>
      prev.map((goal) =>
        goal.name === name ? { ...goal, name: trimmedName, amount, target } : goal
      )
    )
    setEditingGoal(null)
    showToast(`${trimmedName} updated.`)
  }

  const handleAddGoal = () => {
    if (!newGoal.name.trim()) {
      showToast('Add a goal name first.')
      return
    }
    setBudgetGoals((prev) => [
      ...prev,
      {
        name: newGoal.name,
        amount: 0,
        target: Number(newGoal.target || 1000),
      },
    ])
    setNewGoal({ name: '', target: '' })
    setShowGoalForm(false)
      showToast('Goal added. Update the target any time.')
  }

  const handleDeleteGoal = (name: string) => {
    setBudgetGoals((prev) => prev.filter((goal) => goal.name !== name))
    if (editingGoal === name) {
      setEditingGoal(null)
    }
    showToast(`${name} removed.`)
  }


  const handleGenerateBudget = () => {
    if (!requireLogin('Please log in to generate your budget.')) {
      return
    }
    if (autoSuggest) {
      const baseIncome = 4200
      const scale = monthlyIncome > 0 ? monthlyIncome / baseIncome : 1
      let nextCategories = categoriesSeed.map((category) => ({
        ...category,
        planned: Math.round(category.planned * scale),
        actual: Math.round(category.actual * scale),
      }))
      if (primaryGoal === 'debt') {
        nextCategories = [
          ...nextCategories,
          { name: 'Debt payments', planned: Math.round(250 * scale), actual: 0 },
        ]
      }
      if (primaryGoal === 'savings') {
        nextCategories = [
          ...nextCategories,
          { name: 'High-yield savings', planned: Math.round(300 * scale), actual: 0 },
        ]
      }
      setBudgetCategories(nextCategories)
    }
    setBudgetGenerated(true)
    setShowCategoryForm(false)
    setShowGoalForm(false)
    showToast('Budget generated.')
    setIsBudgetTransitioning(true)
    if (marketingView === 'app') {
      setActiveView('workspace')
      return
    }
    handleMarketingNav('app')
  }

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('Enter email and password to continue.')
      return
    }
    setAuthLoading(true)
    const email = loginEmail.trim()
    const password = loginPassword.trim()
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        showToast(error.message)
      } else {
        setShowLogin(false)
        showToast('Check your email to confirm your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        showToast(error.message)
      } else {
        setShowLogin(false)
        showToast('Logged in. Welcome back.')
      }
    }
    setAuthLoading(false)
    setLoginPassword('')
  }

  const handlePasswordReset = async () => {
    const email = loginEmail.trim()
    if (!email) {
      showToast('Enter your email to reset your password.')
      return
    }
    setAuthLoading(true)
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/?view=app` : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    if (error) {
      showToast(error.message)
    } else {
      showToast('Check your email for a reset link.')
    }
    setAuthLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSaveState('idle')
    showToast('Logged out.')
  }

  const openUsernameModal = () => {
    setUsernameDraft(userProfile?.username ?? '')
    setUsernameError('')
    setShowUsernameModal(true)
    setUsernamePromptDismissed(false)
  }

  const closeUsernameModal = () => {
    setShowUsernameModal(false)
    setUsernameError('')
    if (!userProfile?.username) {
      setUsernamePromptDismissed(true)
    }
  }

  const handleUsernameSave = async () => {
    if (!userId) {
      showToast('Please log in to set a username.')
      return
    }
    const trimmed = usernameDraft.trim()
    const validationError = getUsernameValidationError(trimmed)
    if (validationError) {
      setUsernameError(validationError)
      return
    }
    if (userProfile?.username && trimmed === userProfile.username) {
      showToast('That username is already saved.')
      setShowUsernameModal(false)
      return
    }
    const cooldownDays = getUsernameCooldownDays(userProfile?.username_updated_at)
    if (userProfile?.username && cooldownDays > 0) {
      showToast(
        `Username updates are available in ${cooldownDays} day${
          cooldownDays === 1 ? '' : 's'
        }.`
      )
      return
    }
    setUsernameSaving(true)
    setUsernameError('')
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          username: trimmed,
          username_updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('user_id, username, username_updated_at, created_at')
      .single()
    if (error) {
      const message = error.message.toLowerCase().includes('duplicate')
        ? 'That username is already taken.'
        : 'Could not save your username.'
      showToast(message)
      setUsernameSaving(false)
      return
    }
    const profile = data as UserProfile
    setUserProfile(profile)
    setUsernameDraft(profile.username)
    setProfileByUserId((prev) => ({
      ...prev,
      [profile.user_id]: profile.username,
    }))
    setShowUsernameModal(false)
    showToast('Username saved.')
    setUsernameSaving(false)
  }

  const handleManualPreferencesSave = async () => {
    if (!requireLogin('Please log in to save your preferences.')) {
      return
    }
    if (!userId) {
      showToast('Missing account session.')
      return
    }
    setSaveState('saving')
    const { error } = await supabase.from('budget_state').upsert(
      {
        user_id: userId,
        data: currentBudgetState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (error) {
      setSaveState('idle')
      showToast('Save failed. Check connection.')
      return
    }
    setSaveState('saved')
    showToast('Preferences saved.')
  }

  const handleBillChange = (
    index: number,
    field: 'name' | 'date' | 'amount',
    value: string
  ) => {
    setBudgetBills((prev) =>
      prev.map((bill, billIndex) => {
        if (billIndex !== index) return bill
        if (field === 'amount') {
          return { ...bill, amount: Number(value || 0) }
        }
        return { ...bill, [field]: value }
      })
    )
  }

  const handleBillRecurringToggle = (index: number, enabled: boolean) => {
    setBudgetBills((prev) =>
      prev.map((bill, billIndex) => {
        if (billIndex !== index) return bill
        if (!enabled) {
          return { ...bill, recurringDay: null }
        }
        const inferredDay = extractDayFromLabel(bill.date) ?? 1
        return { ...bill, recurringDay: inferredDay }
      })
    )
  }

  const handleBillRecurringDayChange = (index: number, value: string) => {
    const nextDay = Math.min(31, Math.max(1, Number(value || 1)))
    setBudgetBills((prev) =>
      prev.map((bill, billIndex) =>
        billIndex === index ? { ...bill, recurringDay: nextDay } : bill
      )
    )
  }

  const handleDeleteBill = (index: number) => {
    setBudgetBills((prev) => prev.filter((_bill, billIndex) => billIndex !== index))
    showToast('Bill removed.')
  }

  const handleScheduleBill = (
    name: string,
    date: string,
    amount: number,
    recurringDay?: number | null
  ) => {
    setBudgetBills((prev) => {
      const billIndex = prev.findIndex(
        (bill) => bill.name.toLowerCase() === name.toLowerCase()
      )
      if (billIndex < 0) {
        return [
          ...prev,
          { name, date, amount, recurringDay: recurringDay ?? null },
        ]
      }
      return prev.map((bill, index) => {
        if (index !== billIndex) return bill
        const nextRecurringDay =
          recurringDay === undefined ? bill.recurringDay ?? null : recurringDay
        return {
          ...bill,
          date,
          amount,
          recurringDay: nextRecurringDay,
        }
      })
    })
  }

  const handleAddLabel = () => {
    if (!newLabel.trim()) {
      showToast('Label name is required.')
      return
    }
    if (labels.includes(newLabel.trim())) {
      showToast('Label already exists.')
      return
    }
    setLabels((prev) => [...prev, newLabel.trim()])
    setNewLabel('')
    showToast('Label added.')
  }

  const handleRemoveLabel = (label: string) => {
    setLabels((prev) => prev.filter((item) => item !== label))
    showToast('Label removed.')
  }

  const normalizeCategory = (value: string) => value.trim().replace(/\s+/g, ' ')

  const parseTags = (value: string) => {
    const normalized = value
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
    return Array.from(new Set(normalized))
  }

  const ensureCategory = (value: string) =>
    normalizeCategory(value || '') || 'General'

  const loadUserProfiles = async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    const missing = uniqueIds.filter((id) => !profileByUserId[id])
    if (!missing.length) return
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .in('user_id', missing)
    if (error) {
      return
    }
    if (!data?.length) return
    setProfileByUserId((prev) => {
      const next = { ...prev }
      data.forEach((profile) => {
        if (profile.username) {
          next[profile.user_id] = profile.username
        }
      })
      return next
    })
  }

  const loadForumPosts = async () => {
    setForumLoading(true)
    setForumError('')
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setForumError('Could not load community posts.')
    } else {
      const formatted = (data ?? []).map((item) => ({
        ...item,
        tags: Array.isArray(item.tags)
          ? item.tags.map((tag: string) => String(tag).toLowerCase())
          : [],
        category: ensureCategory(item.category),
      }))
      setForumPosts(formatted as ForumPost[])
      const categorySet = new Set(forumCategoriesSeed)
      formatted.forEach((post) => {
        if (post.category) {
          categorySet.add(post.category)
        }
      })
      setForumCategories(Array.from(categorySet))
      loadUserProfiles(formatted.map((post) => post.user_id))
    }
    setForumLoading(false)
  }

  const loadForumComments = async (postId: string) => {
    const { data, error } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) {
      showToast('Could not load replies.')
      return
    }
    setForumComments((prev) => ({ ...prev, [postId]: (data ?? []) as ForumComment[] }))
    loadUserProfiles((data ?? []).map((comment) => comment.user_id))
  }

  const handleAddForumCategory = () => {
    const normalized = normalizeCategory(newCategoryName)
    if (!normalized) {
      showToast('Add a category name.')
      return
    }
    if (forumCategories.some((category) => category.toLowerCase() === normalized.toLowerCase())) {
      showToast('That category already exists.')
      return
    }
    setForumCategories((prev) => [...prev, normalized])
    setNewCategoryName('')
    setNewPost((prev) => ({
      ...prev,
      category: prev.category || normalized,
    }))
    showToast('Category added.')
  }

  const handleCreatePost = async () => {
    if (!requireLogin('Please log in to post.')) {
      return
    }
    if (!userProfile?.username) {
      showToast('Set a username to post in the community.')
      openUsernameModal()
      return
    }
    const title = newPost.title.trim()
    const body = newPost.body.trim()
    if (!title || !body) {
      showToast('Title and question are required.')
      return
    }
    if (!userId) {
      showToast('Please log in to post.')
      return
    }
    const tags = parseTags(newPost.tags)
    const category = ensureCategory(newPost.category)
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: userId,
        title,
        body,
        tags,
        category,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) {
      showToast('Could not publish your post.')
      return
    }
    setForumPosts((prev) => [{ ...(data as ForumPost), category }, ...prev])
    setForumCategories((prev) =>
      prev.some((item) => item.toLowerCase() === category.toLowerCase())
        ? prev
        : [...prev, category]
    )
    setNewPost({ title: '', body: '', tags: '', category: category })
    showToast('Post published.')
  }

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from('forum_posts').delete().eq('id', postId)
    if (error) {
      showToast('Could not delete the post.')
      return
    }
    setForumPosts((prev) => prev.filter((post) => post.id !== postId))
    setActiveForumPostId((prev) => (prev === postId ? null : prev))
    setForumComments((prev) => {
      const next = { ...prev }
      delete next[postId]
      return next
    })
    showToast('Post removed.')
  }

  const handleCreateComment = async (postId: string) => {
    if (!requireLogin('Please log in to reply.')) {
      return
    }
    if (!userProfile?.username) {
      showToast('Set a username to reply in the community.')
      openUsernameModal()
      return
    }
    const body = newComment[postId]?.trim()
    if (!body) {
      showToast('Reply cannot be empty.')
      return
    }
    if (!userId) {
      showToast('Please log in to reply.')
      return
    }
    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        body,
      })
      .select('*')
      .single()
    if (error) {
      showToast('Could not publish your reply.')
      return
    }
    setForumComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), data as ForumComment],
    }))
    setNewComment((prev) => ({ ...prev, [postId]: '' }))
    showToast('Reply posted.')
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const { error } = await supabase
      .from('forum_comments')
      .delete()
      .eq('id', commentId)
    if (error) {
      showToast('Could not delete the reply.')
      return
    }
    setForumComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).filter((comment) => comment.id !== commentId),
    }))
    showToast('Reply removed.')
  }

  const applyBudgetUpdates = (updates: Partial<BudgetState>) => {
    const normalizeCategories = (
      items: Array<{ name: string; planned: number | string; actual: number | string }>
    ) =>
      items.map((item) => ({
        name: item.name,
        planned: Number(item.planned ?? 0),
        actual: Number(item.actual ?? 0),
      }))
    const normalizeGoals = (
      items: Array<{ name: string; amount: number | string; target: number | string }>
    ) =>
      items.map((item) => ({
        name: item.name,
        amount: Number(item.amount ?? 0),
        target: Number(item.target ?? 0),
      }))
    const normalizeBills = (
      items: Array<{
        name: string
        date: string
        amount: number | string
        recurringDay?: number | null
      }>
    ) =>
      items.map((item) => ({
        name: item.name,
        date: item.date && item.date.trim() ? item.date : 'Unscheduled',
        amount: Number(item.amount ?? 0),
        recurringDay:
          item.recurringDay !== undefined && item.recurringDay !== null
            ? Number(item.recurringDay)
            : null,
      }))
    const mergeCategoriesWithBills = (
      categories: typeof categoriesSeed,
      bills: Array<{ name: string; amount: number }>
    ) => {
      const existing = new Set(
        categories.map((category) => category.name.toLowerCase())
      )
      const additions = bills
        .filter((bill) => bill.name && !existing.has(bill.name.toLowerCase()))
        .map((bill) => ({
          name: bill.name,
          planned: Number(bill.amount ?? 0),
          actual: 0,
        }))
      return additions.length ? [...categories, ...additions] : categories
    }
    const normalizeStocks = (
      items: Array<{
        symbol: string
        shares: number | string
        price: number | string
        monthly: number | string
      }>
    ) =>
      items.map((item) => ({
        symbol: item.symbol,
        shares: Number(item.shares ?? 0),
        price: Number(item.price ?? 0),
        monthly: Number(item.monthly ?? 0),
      }))
    const normalizeSpendEntries = (
      items: Array<{
        id: string
        merchant: string
        category: string
        amount: number | string
        date: string
        note?: string
      }>
    ) =>
      items.map((item) => ({
        id: item.id || createSpendId(),
        merchant: item.merchant ?? '',
        category: item.category ?? '',
        amount: Number(item.amount ?? 0),
        date: item.date ?? '',
        note: item.note ?? '',
      }))
    const sumSpendEntriesByCategory = (
      items: Array<{ category: string; amount: number }>
    ) => {
      const totals = new Map<string, { total: number; label: string }>()
      items.forEach((entry) => {
        const label = entry.category ?? ''
        const key = label.trim().toLowerCase()
        if (!key) return
        const existing = totals.get(key)
        if (existing) {
          existing.total += entry.amount
        } else {
          totals.set(key, { total: entry.amount, label })
        }
      })
      return totals
    }
    const hasBudgetCategoriesUpdate = Object.prototype.hasOwnProperty.call(
      updates,
      'budgetCategories'
    )

    if ('incomePerPaycheck' in updates && updates.incomePerPaycheck !== undefined) {
      setIncomePerPaycheck(Number(updates.incomePerPaycheck))
    }
    if ('partnerIncome' in updates && updates.partnerIncome !== undefined) {
      setPartnerIncome(Number(updates.partnerIncome))
    }
    if ('payFrequency' in updates && updates.payFrequency) {
      setPayFrequency(updates.payFrequency)
    }
    if ('primaryGoal' in updates && updates.primaryGoal) {
      setPrimaryGoal(updates.primaryGoal)
    }
    if ('autoSuggest' in updates && updates.autoSuggest !== undefined) {
      setAutoSuggest(updates.autoSuggest)
    }
    if ('includePartner' in updates && updates.includePartner !== undefined) {
      setIncludePartner(updates.includePartner)
    }
    if ('bankBalance' in updates && updates.bankBalance !== undefined) {
      setBankBalance(Number(updates.bankBalance))
    }
    if ('payDates' in updates && Array.isArray(updates.payDates)) {
      setPayDates(updates.payDates.map((date) => String(date ?? '')).slice(0, 2))
    }
    if ('monthlyBuffer' in updates && updates.monthlyBuffer !== undefined) {
      setMonthlyBuffer(Number(updates.monthlyBuffer))
    }
    if (
      'notificationWeeklySummary' in updates &&
      updates.notificationWeeklySummary !== undefined
    ) {
      setNotificationWeeklySummary(updates.notificationWeeklySummary)
    }
    if (
      'notificationOverBudget' in updates &&
      updates.notificationOverBudget !== undefined
    ) {
      setNotificationOverBudget(updates.notificationOverBudget)
    }
    if (
      'notificationBillReminders' in updates &&
      updates.notificationBillReminders !== undefined
    ) {
      setNotificationBillReminders(updates.notificationBillReminders)
    }
    if (
      'notificationReminderDays' in updates &&
      updates.notificationReminderDays !== undefined
    ) {
      setNotificationReminderDays(Number(updates.notificationReminderDays))
    }
    if ('autoSaveEnabled' in updates && updates.autoSaveEnabled !== undefined) {
      setAutoSaveEnabled(updates.autoSaveEnabled)
    }
    if ('budgetGenerated' in updates && updates.budgetGenerated !== undefined) {
      setBudgetGenerated(updates.budgetGenerated)
    }
    const nextCategories =
      'budgetCategories' in updates && Array.isArray(updates.budgetCategories)
        ? normalizeCategories(updates.budgetCategories)
        : null
    const nextBills =
      'budgetBills' in updates && Array.isArray(updates.budgetBills)
        ? normalizeBills(updates.budgetBills)
        : null
    if (nextBills) {
      setBudgetBills(nextBills)
    }
    if (nextCategories) {
      setBudgetCategories(
        nextBills ? mergeCategoriesWithBills(nextCategories, nextBills) : nextCategories
      )
    } else if (nextBills) {
      setBudgetCategories((prev) => mergeCategoriesWithBills(prev, nextBills))
    }
    if ('budgetGoals' in updates && Array.isArray(updates.budgetGoals)) {
      setBudgetGoals(normalizeGoals(updates.budgetGoals))
    }
    if ('labels' in updates && Array.isArray(updates.labels)) {
      setLabels(updates.labels)
    }
    if ('scheduleBias' in updates && updates.scheduleBias !== undefined) {
      setScheduleBias(updates.scheduleBias)
    }
    if ('debtStrategy' in updates && updates.debtStrategy) {
      setDebtStrategy(updates.debtStrategy)
    }
    if ('stocks' in updates && Array.isArray(updates.stocks)) {
      setStocks(normalizeStocks(updates.stocks))
    }
    if ('robinhoodConnected' in updates && updates.robinhoodConnected !== undefined) {
      setRobinhoodConnected(updates.robinhoodConnected)
    }
    if ('monthlyInvestment' in updates && updates.monthlyInvestment !== undefined) {
      setMonthlyInvestment(Number(updates.monthlyInvestment))
    }
    if ('expectedReturn' in updates && updates.expectedReturn !== undefined) {
      setExpectedReturn(Number(updates.expectedReturn))
    }
    const nextSpendEntries =
      'spendEntries' in updates && Array.isArray(updates.spendEntries)
        ? normalizeSpendEntries(updates.spendEntries)
        : null
    if (nextSpendEntries) {
      setSpendEntries(nextSpendEntries)
    }
    if (nextSpendEntries && !hasBudgetCategoriesUpdate) {
      const previousCategories = new Set(
        spendEntries
          .map((entry) => entry.category.trim().toLowerCase())
          .filter(Boolean)
      )
      const totals = sumSpendEntriesByCategory(nextSpendEntries)
      const affected = new Set([...previousCategories, ...totals.keys()])
      setBudgetCategories((prev) => {
        const next = prev.map((category) => {
          const key = category.name.trim().toLowerCase()
          if (!affected.has(key)) {
            return category
          }
          const nextTotal = totals.get(key)?.total ?? 0
          return { ...category, actual: nextTotal }
        })
        totals.forEach((value, key) => {
          const exists = next.some(
            (category) => category.name.trim().toLowerCase() === key
          )
          if (!exists) {
            next.push({ name: value.label, planned: 0, actual: value.total })
          }
        })
        return next
      })
    }
  }

  const applyLocalAction = (action: {
    actions: Array<
      | 'resetBudget'
      | 'clearBills'
      | 'clearGoals'
      | 'clearSchedule'
      | 'clearLabels'
      | 'resetPreferences'
      | 'resetEverything'
    >
  }) => {
    const actions = new Set(action.actions)
    const resetEverything = actions.has('resetEverything')
    const resetBudget = actions.has('resetBudget') || resetEverything
    const clearBills = actions.has('clearBills') || resetEverything
    const clearGoals = actions.has('clearGoals') || resetEverything
    const clearSchedule = actions.has('clearSchedule') || resetEverything
    const resetPreferences = actions.has('resetPreferences') || resetEverything
    const clearLabels = actions.has('clearLabels')

    if (resetBudget) {
      setBudgetCategories(categoriesSeed)
      setBudgetGoals(goalsSeed)
      setBudgetBills(billsSeed)
      setSpendEntries([])
      setBudgetGenerated(true)
    } else {
      if (clearBills) {
        setBudgetCategories([])
        setBudgetBills([])
        setSpendEntries([])
      }
      if (clearGoals) {
        setBudgetGoals([])
      }
      if (clearSchedule) {
        setBudgetBills([])
      }
    }

    if (resetPreferences) {
      setIncomePerPaycheck(2100)
      setPartnerIncome(0)
      setPayFrequency('biweekly')
      setPrimaryGoal('stability')
      setAutoSuggest(true)
      setIncludePartner(false)
      setBankBalance(0)
      setPayDates([''])
      setMonthlyBuffer(150)
      setNotificationWeeklySummary(true)
      setNotificationOverBudget(true)
      setNotificationBillReminders(true)
      setNotificationReminderDays(3)
      setAutoSaveEnabled(true)
      setDebtStrategy('avalanche')
      setScheduleBias(0)
    }

    if (resetEverything) {
      setLabels(['Essential', 'Lifestyle', 'Savings'])
    } else if (clearLabels) {
      setLabels([])
    }
  }

  const describeLocalActions = (action: {
    actions: Array<
      | 'resetBudget'
      | 'clearBills'
      | 'clearGoals'
      | 'clearSchedule'
      | 'clearLabels'
      | 'resetPreferences'
      | 'resetEverything'
    >
  }) => {
    const descriptions: Record<string, string> = {
      resetBudget: 'reset your budget to defaults',
      clearBills: 'clear all bills',
      clearGoals: 'clear all goals',
      clearSchedule: 'clear the bill schedule',
      clearLabels: 'clear your labels',
      resetPreferences: 'reset your preferences',
      resetEverything: 'reset everything',
    }
    return action.actions.map((item) => descriptions[item]).filter(Boolean)
  }

  const applyPendingChanges = () => {
    if (pendingLocalAction) {
      applyLocalAction(pendingLocalAction)
    } else if (pendingUpdates) {
      applyBudgetUpdates(pendingUpdates)
    } else if (pendingUiAction) {
      if (marketingView !== 'app') {
        handleMarketingNav('app', { appView: pendingUiAction.view })
      } else {
        setActiveView(pendingUiAction.view)
      }
      if (pendingUiAction.panel !== undefined) {
        setActivePanel(pendingUiAction.panel ?? null)
      }
    } else if (pendingUtilityAction === 'exportCsv') {
      handleExportCsv()
    } else {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Nothing to apply yet.' },
      ])
      return
    }
    setPendingUpdates(null)
    setPendingLocalAction(null)
    setPendingSummary('')
    setPendingSpendDraft(null)
    setPendingUiAction(null)
    setPendingUtilityAction(null)
    showToast('Changes applied.')
    setChatMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: 'Changes applied.',
      },
    ])
  }

  const moveAllocation = (id: string, direction: 'up' | 'down') => {
    setAllocationSortMode('custom')
    setAllocationOrder((prev) => {
      const index = prev.indexOf(id)
      if (index === -1) return prev
      const next = [...prev]
      const swapWith = direction === 'up' ? index - 1 : index + 1
      if (swapWith < 0 || swapWith >= next.length) return prev
      ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
      return next
    })
  }

  const handleWaitlistSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = waitlistEmail.trim().toLowerCase()
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!isValid) {
      setWaitlistStatus('error')
      setWaitlistMessage('Enter a valid email to join the waitlist.')
      return
    }
    setWaitlistLoading(true)
    setWaitlistStatus('idle')
    setWaitlistMessage('')
    try {
      const { error } = await supabase.from('waitlist_signups').insert({
        email,
        source: 'landing',
        created_at: new Date().toISOString(),
      })
      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes('duplicate') || message.includes('unique')) {
          setWaitlistStatus('success')
          setWaitlistMessage('This user is already signed up.')
        } else {
          setWaitlistStatus('error')
          setWaitlistMessage('Waitlist signup failed. Try again soon.')
        }
      } else {
        setWaitlistStatus('success')
        setWaitlistMessage('You are on the list. Watch your inbox for updates.')
        setWaitlistEmail('')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Waitlist signup failed.'
      setWaitlistStatus('error')
      setWaitlistMessage(message)
    } finally {
      setWaitlistLoading(false)
    }
  }

  const getLocalCopilotAction = (message: string) => {
    const text = message.toLowerCase()
    const isNegated =
      /\b(don't|do not|dont)\b/.test(text) &&
      /\b(delete|clear|reset|remove|wipe)\b/.test(text)
    if (isNegated) {
      return null
    }

    const matchesAny = (phrases: string[]) =>
      phrases.some((phrase) => text.includes(phrase))

    const resetEverything = matchesAny([
      'reset everything',
      'reset all',
      'start over',
      'factory reset',
      'wipe everything',
    ])
    const resetBudget = matchesAny([
      'reset budget',
      'fresh budget',
      'new budget',
      'start a new budget',
    ])
    const clearBills =
      matchesAny([
        'delete all bills',
        'delete bills',
        'remove all bills',
        'clear bills',
        'clear all bills',
      ]) || resetEverything
    const clearGoals =
      matchesAny(['clear goals', 'delete goals', 'remove goals']) ||
      resetEverything
    const clearSchedule =
      matchesAny([
        'clear schedule',
        'clear bill schedule',
        'clear cash flow schedule',
        'remove schedule',
      ]) || resetEverything
    const wantsClearLabels = matchesAny([
      'clear labels',
      'remove labels',
      'delete labels',
    ])
    const clearLabels = wantsClearLabels && !resetEverything
    const resetPreferences =
      matchesAny(['reset preferences', 'reset settings', 'clear preferences']) ||
      resetEverything

    if (
      !resetBudget &&
      !clearBills &&
      !clearGoals &&
      !clearSchedule &&
      !clearLabels &&
      !resetPreferences &&
      !resetEverything
    ) {
      return null
    }

    const actions: Array<
      | 'resetBudget'
      | 'clearBills'
      | 'clearGoals'
      | 'clearSchedule'
      | 'clearLabels'
      | 'resetPreferences'
      | 'resetEverything'
    > = []

    if (resetBudget || resetEverything) {
      actions.push('resetBudget')
    } else {
      if (clearBills) {
        actions.push('clearBills')
      }
      if (clearGoals) {
        actions.push('clearGoals')
      }
      if (clearSchedule) {
        actions.push('clearSchedule')
      }
    }

    if (resetPreferences) {
      actions.push('resetPreferences')
    }

    if (resetEverything) {
      actions.push('resetEverything')
    } else if (clearLabels) {
      actions.push('clearLabels')
    }

    return { actions }
  }

  const parseAmount = (text: string) => {
    const match = text.match(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})/)
    if (!match) return null
    const normalized = match[0].replace(/,/g, '')
    const value = Number.parseFloat(normalized)
    return Number.isNaN(value) ? null : value
  }

  const parseBillsFromText = (text: string) => {
    const amountRegex = /(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})/g
    const tail = text.includes(':') ? text.split(':').slice(1).join(':') : text
    const lines = tail
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const chunks = lines.length > 1 ? lines : [tail.trim()]
    const items: Array<{ name: string; amount: number }> = []
    const missing: string[] = []

    chunks.forEach((chunk) => {
      const amountMatches = [...chunk.matchAll(amountRegex)]
      if (amountMatches.length === 0) {
        if (/^[A-Z\s]+$/.test(chunk)) {
          return
        }
        missing.push(chunk)
        return
      }
      if (amountMatches.length === 1 && lines.length > 1) {
        const amount = parseAmount(chunk) ?? 0
        const name = chunk.replace(amountRegex, '').trim()
        if (name) {
          items.push({ name, amount })
        }
        return
      }
      let cursor = 0
      amountMatches.forEach((match) => {
        const namePart = chunk.slice(cursor, match.index).trim()
        const amount = parseAmount(match[0]) ?? 0
        if (namePart) {
          items.push({ name: namePart, amount })
        }
        cursor = (match.index ?? 0) + match[0].length
      })
      const trailing = chunk.slice(cursor).trim()
      if (trailing) {
        missing.push(trailing)
      }
    })

    const normalized = items
      .map((item) => ({
        name: item.name.replace(/\s+/g, ' ').trim(),
        amount: item.amount,
      }))
      .filter((item) => item.name.length > 0)
    const totalAmountMatches = [...tail.matchAll(amountRegex)].length
    if (normalized.length < 2 && totalAmountMatches < 2) {
      return null
    }
    return { items: normalized, missing }
  }

  const parseCurrencyValue = (value: string) => {
    const normalized = value.replace(/,/g, '')
    const parsed = Number.parseFloat(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }

  const parseSpendAmount = (text: string) => {
    const dollarMatch = text.match(
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/
    )
    if (dollarMatch) {
      return parseCurrencyValue(dollarMatch[1])
    }
    const wordMatch = text.match(
      /\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usd)\b/i
    )
    if (wordMatch) {
      return parseCurrencyValue(wordMatch[1])
    }
    const verbMatch = text.match(
      /\b(?:spend|spent|pay|paid|expense|purchase|bought|buy|charge|charged|log)\b[^0-9$]{0,12}(\$?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i
    )
    if (verbMatch) {
      return parseCurrencyValue(verbMatch[1].replace(/^\$/, ''))
    }
    return null
  }

  const detectSpendDate = (text: string) => {
    const isoMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/)
    if (isoMatch) {
      return { date: isoMatch[0], explicit: true }
    }
    const lower = text.toLowerCase()
    const today = new Date()
    const toIso = (date: Date) => date.toISOString().slice(0, 10)
    if (lower.includes('yesterday')) {
      const adjusted = new Date(today)
      adjusted.setDate(today.getDate() - 1)
      return { date: toIso(adjusted), explicit: true }
    }
    if (lower.includes('tomorrow')) {
      const adjusted = new Date(today)
      adjusted.setDate(today.getDate() + 1)
      return { date: toIso(adjusted), explicit: true }
    }
    if (lower.includes('today') || lower.includes('tonight') || lower.includes('this month')) {
      return { date: toIso(today), explicit: true }
    }
    const monthMatch = text.match(
      /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b/i
    )
    if (monthMatch) {
      const parsed = new Date(`${monthMatch[0]} ${currentYear}`)
      if (!Number.isNaN(parsed.getTime())) {
        return { date: toIso(parsed), explicit: true }
      }
    }
    return { date: toIso(today), explicit: false }
  }

  const findSpendCategory = (text: string) => {
    const normalized = text.toLowerCase()
    const sorted = [...budgetCategories]
      .map((category) => category.name)
      .sort((a, b) => b.length - a.length)
    const matched = sorted.find((name) => normalized.includes(name.toLowerCase()))
    if (matched) {
      return matched
    }
    const fallback = text.match(/\b(?:to|toward|towards|for|on)\s+([a-z][\w\s&-]{2,})/i)
    if (fallback) {
      return normalizeCategory(fallback[1])
    }
    return null
  }

  const parseSpendMerchant = (text: string) => {
    const match = text.match(/\b(?:at|from)\s+([a-z0-9][a-z0-9&' .-]{1,40})/i)
    if (!match) return null
    const value = match[1].trim()
    const trimmed = value
      .split(
        /\s+(?:for|on|to|toward|towards|yesterday|today|tomorrow|this)\b/i
      )[0]
      .trim()
    return trimmed || null
  }

  const mergeSpendDraft = (draft: SpendDraft | null, text: string) => {
    const next: SpendDraft = { ...(draft ?? {}) }
    const amount = parseSpendAmount(text)
    if (amount !== null) {
      next.amount = amount
    }
    const category = findSpendCategory(text)
    if (category) {
      next.category = category
    }
    const merchant = parseSpendMerchant(text)
    if (merchant) {
      next.merchant = merchant
    }
    if (/\b(refund|reimbursement|credit|returned|return)\b/i.test(text)) {
      next.isRefund = true
    }
    const detected = detectSpendDate(text)
    if (detected.explicit) {
      next.date = detected.date
    }
    return next
  }

  const buildSpendEntry = (draft: SpendDraft): SpendCompleteResult | null => {
    if (!draft.amount || !draft.category) {
      return null
    }
    const signedAmount = draft.isRefund
      ? -Math.abs(draft.amount)
      : Math.abs(draft.amount)
    const entry: SpendEntry = {
      id: createSpendId(),
      merchant: draft.merchant ?? 'Copilot entry',
      category: draft.category,
      amount: signedAmount,
      date: draft.date ?? new Date().toISOString().slice(0, 10),
      note: '',
    }
    const summary = draft.isRefund
      ? `Add refund of ${formatCurrency(Math.abs(signedAmount))} to ${draft.category}?`
      : `Add ${formatCurrency(Math.abs(signedAmount))} spend to ${draft.category}?`
    return { type: 'complete', entry, summary }
  }

  const parseSpendFromText = (text: string): ParsedSpend | null => {
    const lower = text.toLowerCase()
    const amount = parseSpendAmount(text)
    const category = findSpendCategory(text)
    const merchant = parseSpendMerchant(text)
    const hasSpendSignal = amount !== null || category !== null || merchant !== null
    const spendIntent =
      (hasSpendSignal &&
        /\b(spent|expense|purchase|bought|buy|pay|paid|charge|charged|log|refund)\b/.test(
          lower
        )) ||
      (/\bspend\b/.test(lower) && amount !== null)
    if (!spendIntent) {
      return null
    }
    const detectedDate = detectSpendDate(text)
    const isRefund = /\b(refund|reimbursement|credit|returned|return)\b/.test(lower)
    if (!amount || !category) {
      const draft: SpendDraft = {
        amount: amount ?? undefined,
        category: category ?? undefined,
        merchant: merchant ?? undefined,
        isRefund: isRefund || undefined,
      }
      if (detectedDate.explicit) {
        draft.date = detectedDate.date
      }
      return { type: 'draft', missingAmount: !amount, missingCategory: !category, draft }
    }
    return buildSpendEntry({
      amount,
      category,
      merchant: merchant ?? undefined,
      date: detectedDate.explicit ? detectedDate.date : undefined,
      isRefund,
    })
  }

  const parseRemovalRequest = (text: string) => {
    const normalized = text.toLowerCase()
    if (!/\b(remove|delete|drop|erase)\b/.test(normalized)) {
      return null
    }
    if (/\b(all|everything|reset|wipe|clear)\b/.test(normalized)) {
      return null
    }
    if (/\b(schedule|notification|preference|settings)\b/.test(normalized)) {
      return null
    }

    const wantsBill = /\bbill\b/.test(normalized)
    const wantsCategory = /\bcategory\b/.test(normalized)
    const wantsGoal = /\bgoal\b/.test(normalized)
    const wantsLabel = /\blabel\b/.test(normalized)
    const wantsStock = /\b(stock|holding|investment|ticker|shares)\b/.test(
      normalized
    )
    const wantsSpend = /\b(spend|transaction|purchase|expense|entry|charge)\b/.test(
      normalized
    )

    const findNameMatch = (names: string[]) =>
      [...names]
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .find((name) => normalized.includes(name.toLowerCase())) ?? null

    const billMatch = findNameMatch(
      budgetBills.map((bill) => bill.name.trim())
    )
    const categoryMatch = findNameMatch(
      budgetCategories.map((category) => category.name.trim())
    )
    const goalMatch = findNameMatch(budgetGoals.map((goal) => goal.name.trim()))
    const labelMatch = findNameMatch(labels.map((label) => label.trim()))
    const stockMatch = findNameMatch(
      stocks.map((stock) => stock.symbol.trim())
    )

    const findSpendMatch = () => {
      if (!spendEntries.length) return null
      if (/\b(last|latest|recent)\b/.test(normalized)) {
        return spendEntries[0]
      }
      const merchant = parseSpendMerchant(text)
      const category = findSpendCategory(text)
      const amount = parseSpendAmount(text)
      const dateInfo = detectSpendDate(text)
      const merchantNeedle = merchant?.toLowerCase()
      const categoryNeedle = category?.toLowerCase()
      return (
        spendEntries.find((entry) => {
          if (
            merchantNeedle &&
            !entry.merchant.toLowerCase().includes(merchantNeedle)
          ) {
            return false
          }
          if (
            categoryNeedle &&
            entry.category.toLowerCase() !== categoryNeedle
          ) {
            return false
          }
          if (amount !== null && Math.abs(entry.amount) !== Math.abs(amount)) {
            return false
          }
          if (dateInfo.explicit && entry.date !== dateInfo.date) {
            return false
          }
          return true
        }) ?? null
      )
    }

    const hasSpendHint =
      wantsSpend ||
      /\b(spend|transaction|purchase|expense|entry|charge)\b/.test(normalized) ||
      !!parseSpendMerchant(text) ||
      !!findSpendCategory(text)
    const spendMatch = hasSpendHint ? findSpendMatch() : null

    if (wantsBill) {
      return billMatch
        ? { kind: 'bill' as const, name: billMatch }
        : { kind: 'missing' as const, target: 'bill' as const }
    }
    if (wantsCategory) {
      return categoryMatch
        ? { kind: 'category' as const, name: categoryMatch }
        : { kind: 'missing' as const, target: 'category' as const }
    }
    if (wantsGoal) {
      return goalMatch
        ? { kind: 'goal' as const, name: goalMatch }
        : { kind: 'missing' as const, target: 'goal' as const }
    }
    if (wantsLabel) {
      return labelMatch
        ? { kind: 'label' as const, name: labelMatch }
        : { kind: 'missing' as const, target: 'label' as const }
    }
    if (wantsStock) {
      return stockMatch
        ? { kind: 'stock' as const, symbol: stockMatch }
        : { kind: 'missing' as const, target: 'stock' as const }
    }
    if (wantsSpend) {
      return spendMatch
        ? { kind: 'spend' as const, entry: spendMatch }
        : { kind: 'missing' as const, target: 'spend' as const }
    }

    const matches: Array<{ kind: string; label: string; value: string }> = []
    if (billMatch) {
      matches.push({ kind: 'bill', label: `bill "${billMatch}"`, value: billMatch })
    }
    if (categoryMatch) {
      matches.push({
        kind: 'category',
        label: `category "${categoryMatch}"`,
        value: categoryMatch,
      })
    }
    if (goalMatch) {
      matches.push({ kind: 'goal', label: `goal "${goalMatch}"`, value: goalMatch })
    }
    if (labelMatch) {
      matches.push({
        kind: 'label',
        label: `label "${labelMatch}"`,
        value: labelMatch,
      })
    }
    if (stockMatch) {
      matches.push({
        kind: 'stock',
        label: `stock "${stockMatch}"`,
        value: stockMatch,
      })
    }
    if (spendMatch) {
      const spendLabel = spendMatch.merchant
        ? `spend at "${spendMatch.merchant}"`
        : 'spend entry'
      matches.push({
        kind: 'spend',
        label: spendLabel,
        value: spendMatch.id,
      })
    }

    if (matches.length === 1) {
      const match = matches[0]
      if (match.kind === 'bill') {
        return { kind: 'bill' as const, name: match.value }
      }
      if (match.kind === 'category') {
        return { kind: 'category' as const, name: match.value }
      }
      if (match.kind === 'goal') {
        return { kind: 'goal' as const, name: match.value }
      }
      if (match.kind === 'label') {
        return { kind: 'label' as const, name: match.value }
      }
      if (match.kind === 'stock') {
        return { kind: 'stock' as const, symbol: match.value }
      }
      if (match.kind === 'spend' && spendMatch) {
        return { kind: 'spend' as const, entry: spendMatch }
      }
    }

    if (matches.length > 1) {
      return {
        kind: 'ambiguous' as const,
        options: matches.map((match) => match.label),
      }
    }

    return { kind: 'missing' as const, target: 'item' as const }
  }

  const mergeBills = (
    current: BudgetBill[],
    additions: Array<{ name: string; amount: number }>
  ) => {
    const next = [...current]
    additions.forEach((bill) => {
      const nameKey = bill.name.toLowerCase()
      const index = next.findIndex(
        (item) => item.name.toLowerCase() === nameKey
      )
      if (index >= 0) {
        next[index] = {
          ...next[index],
          amount: bill.amount > 0 ? bill.amount : next[index].amount,
        }
      } else {
        next.push({
          name: bill.name,
          date: 'Unscheduled',
          amount: bill.amount,
          recurringDay: null,
        })
      }
    })
    return next
  }

  const mergeCategoriesFromBills = (
    current: typeof categoriesSeed,
    additions: Array<{ name: string; amount: number }>
  ) => {
    const next = [...current]
    additions.forEach((bill) => {
      const nameKey = bill.name.toLowerCase()
      const index = next.findIndex(
        (item) => item.name.toLowerCase() === nameKey
      )
      if (index >= 0) {
        next[index] = {
          ...next[index],
          planned: bill.amount > 0 ? bill.amount : next[index].planned,
        }
      } else {
        next.push({ name: bill.name, planned: bill.amount, actual: 0 })
      }
    })
    return next
  }

  const handleSendChat = async () => {
    const userMessage = chatInput.trim()
    if (!userMessage) return
    const normalizedMessage = userMessage.toLowerCase()
    const nextMessages = [
      ...chatMessages,
      { role: 'user' as const, content: userMessage },
    ]
    setChatMessages(nextMessages)
    setChatInput('')
    const applyIntentWords = new Set([
      'apply',
      'add it',
      'do it',
      'yes',
      'confirm',
      'ok',
      'okay',
      'sure',
      'yep',
      'go ahead',
    ])
    if (applyIntentWords.has(normalizedMessage)) {
      if (normalizedMessage === 'apply' || pendingLocalAction || pendingUpdates) {
        applyPendingChanges()
        return
      }
    }
    if (/\b(cancel|never mind|nevermind|stop)\b/.test(normalizedMessage)) {
      setPendingUpdates(null)
      setPendingLocalAction(null)
      setPendingSummary('')
      setPendingSpendDraft(null)
      setPendingUiAction(null)
      setPendingUtilityAction(null)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Canceled.' }])
      return
    }

    if (
      /\b(what can you do|help|capabilities|commands|how can you help|what do you do)\b/.test(
        normalizedMessage
      )
    ) {
      const helpMessage = [
        'Here is what I can do in Budget Space:',
        '- Navigate: Budget, Cash flow, Spending, Planner, AI Insights, Preferences, Copilot, and open Bill Schedule.',
        '- Money inputs: bank balance, income + pay cadence, partner income, pay dates, cash buffer.',
        '- Bills: add/update/remove bills, bulk add, set due dates or monthly recurring days, shift schedule bias.',
        '- Categories + goals: add/update planned amounts, add/update goals and targets.',
        '- Labels + spend log: add labels, log or remove spend entries.',
        '- Preferences: debt strategy, autosuggest, autosave, notifications + reminder lead days.',
        '- Investments: add stocks, monthly investment, expected return.',
        '- Utilities: export CSV, reset/clear actions (with confirmation).',
        'Summary: I can update any Budget Space data and move you to any view. I always stage changes and ask you to Apply.',
      ].join('\n')
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: helpMessage },
      ])
      return
    }
    setChatLoading(true)

    setPendingUpdates(null)
    setPendingLocalAction(null)
    setPendingSummary('')
    setPendingUiAction(null)
    setPendingUtilityAction(null)

    if (pendingSpendDraft) {
      const hasSpendFollowup =
        parseSpendAmount(userMessage) !== null ||
        findSpendCategory(userMessage) !== null ||
        parseSpendMerchant(userMessage) !== null ||
        detectSpendDate(userMessage).explicit ||
        /\b(refund|reimbursement|credit|returned|return)\b/i.test(userMessage)
      if (hasSpendFollowup) {
        const mergedDraft = mergeSpendDraft(pendingSpendDraft, userMessage)
        const built = buildSpendEntry(mergedDraft)
        if (built) {
          setPendingSpendDraft(null)
          setPendingUpdates({ spendEntries: [built.entry, ...spendEntries] })
          setPendingSummary(built.summary)
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'Spend ready. Click Apply changes to confirm.',
            },
          ])
        } else {
          setPendingSpendDraft(mergedDraft)
          const missingAmount = !mergedDraft.amount
          const missingCategory = !mergedDraft.category
          const question =
            missingAmount && missingCategory
              ? 'How much and which category?'
              : missingAmount
              ? 'How much was it?'
              : 'Which category should I use?'
          setChatMessages((prev) => [
            ...prev,
            { role: 'assistant', content: question },
          ])
        }
        setChatLoading(false)
        return
      }
      setPendingSpendDraft(null)
    }

    const parsedBills = parseBillsFromText(userMessage)
    if (parsedBills) {
      setPendingSpendDraft(null)
      const nextBills = mergeBills(budgetBills, parsedBills.items)
      const nextCategories = mergeCategoriesFromBills(
        budgetCategories,
        parsedBills.items
      )
      const missingCount = parsedBills.missing.length
      const missingNote = missingCount
        ? ` I could not find amounts for: ${parsedBills.missing.join(', ')}.`
        : ''
      setPendingUpdates({
        budgetBills: nextBills,
        budgetCategories: nextCategories,
      })
      setPendingSummary(
        `Add ${parsedBills.items.length} bills to your budget?${missingNote}`
      )
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Parsed those bills. Click Apply changes to confirm.',
        },
      ])
      setChatLoading(false)
      return
    }

    const removal = parseRemovalRequest(userMessage)
    if (removal) {
      setPendingSpendDraft(null)
      if (removal.kind === 'missing') {
        const question = (() => {
          switch (removal.target) {
            case 'bill':
              return 'Which bill should I remove?'
            case 'category':
              return 'Which category should I remove?'
            case 'goal':
              return 'Which goal should I remove?'
            case 'label':
              return 'Which label should I remove?'
            case 'stock':
              return 'Which stock should I remove?'
            case 'spend':
              return 'Which spend should I remove?'
            default:
              return 'What should I remove (bill, category, goal, label, stock, or spend)?'
          }
        })()
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: question },
        ])
        setChatLoading(false)
        return
      }
      if (removal.kind === 'ambiguous') {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I found multiple matches: ${removal.options.join(', ')}. Which one should I remove?`,
          },
        ])
        setChatLoading(false)
        return
      }

      if (removal.kind === 'bill') {
        const nextBills = budgetBills.filter(
          (bill) => bill.name.toLowerCase() !== removal.name.toLowerCase()
        )
        const nextCategories = budgetCategories.filter(
          (category) =>
            category.name.toLowerCase() !== removal.name.toLowerCase()
        )
        const removedFromBills = nextBills.length !== budgetBills.length
        const removedFromCategories =
          nextCategories.length !== budgetCategories.length
        if (!removedFromBills && !removedFromCategories) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I couldn't find a bill named "${removal.name}".`,
            },
          ])
          setChatLoading(false)
          return
        }
        setPendingUpdates({
          budgetBills: nextBills,
          budgetCategories: nextCategories,
        })
        setPendingSummary(`Remove ${removal.name} from your bills?`)
      } else if (removal.kind === 'category') {
        const nextCategories = budgetCategories.filter(
          (category) =>
            category.name.toLowerCase() !== removal.name.toLowerCase()
        )
        const nextBills = budgetBills.filter(
          (bill) => bill.name.toLowerCase() !== removal.name.toLowerCase()
        )
        if (nextCategories.length === budgetCategories.length) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I couldn't find a category named "${removal.name}".`,
            },
          ])
          setChatLoading(false)
          return
        }
        setPendingUpdates({
          budgetCategories: nextCategories,
          budgetBills: nextBills,
        })
        setPendingSummary(`Remove ${removal.name} from your categories?`)
      } else if (removal.kind === 'goal') {
        const nextGoals = budgetGoals.filter(
          (goal) => goal.name.toLowerCase() !== removal.name.toLowerCase()
        )
        if (nextGoals.length === budgetGoals.length) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I couldn't find a goal named "${removal.name}".`,
            },
          ])
          setChatLoading(false)
          return
        }
        setPendingUpdates({ budgetGoals: nextGoals })
        setPendingSummary(`Remove goal "${removal.name}"?`)
      } else if (removal.kind === 'label') {
        const nextLabels = labels.filter(
          (label) => label.toLowerCase() !== removal.name.toLowerCase()
        )
        if (nextLabels.length === labels.length) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I couldn't find a label named "${removal.name}".`,
            },
          ])
          setChatLoading(false)
          return
        }
        setPendingUpdates({ labels: nextLabels })
        setPendingSummary(`Remove label "${removal.name}"?`)
      } else if (removal.kind === 'stock') {
        const nextStocks = stocks.filter(
          (stock) => stock.symbol.toLowerCase() !== removal.symbol.toLowerCase()
        )
        if (nextStocks.length === stocks.length) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I couldn't find a stock named "${removal.symbol}".`,
            },
          ])
          setChatLoading(false)
          return
        }
        setPendingUpdates({ stocks: nextStocks })
        setPendingSummary(`Remove ${removal.symbol} holding?`)
      } else if (removal.kind === 'spend') {
        const nextSpendEntries = spendEntries.filter(
          (entry) => entry.id !== removal.entry.id
        )
        if (nextSpendEntries.length === spendEntries.length) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I couldn't find that spend entry.`,
            },
          ])
          setChatLoading(false)
          return
        }
        const spendLabel = removal.entry.merchant
          ? ` at ${removal.entry.merchant}`
          : ''
        setPendingUpdates({ spendEntries: nextSpendEntries })
        setPendingSummary(
          `Remove ${formatCurrency(Math.abs(removal.entry.amount))}${spendLabel}?`
        )
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Ready. Click Apply changes to confirm.',
        },
      ])
      setChatLoading(false)
      return
    }

    const parsedSpend = parseSpendFromText(userMessage)
    if (parsedSpend) {
      if (parsedSpend.type === 'complete') {
        setPendingSpendDraft(null)
        const nextEntries = [parsedSpend.entry, ...spendEntries]
        setPendingUpdates({ spendEntries: nextEntries })
        setPendingSummary(parsedSpend.summary)
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Spend ready. Click Apply changes to confirm.',
          },
        ])
      } else {
        setPendingSpendDraft(parsedSpend.draft ?? null)
        const missingAmount = parsedSpend.missingAmount
        const missingCategory = parsedSpend.missingCategory
        const question =
          missingAmount && missingCategory
            ? 'How much and which category?'
            : missingAmount
            ? 'How much was it?'
            : 'Which category should I use?'
        setChatMessages((prev) => [...prev, { role: 'assistant', content: question }])
      }
      setChatLoading(false)
      return
    }

    const localAction = getLocalCopilotAction(userMessage)
    if (localAction) {
      setPendingSpendDraft(null)
      const describedActions = describeLocalActions(localAction)
      setPendingLocalAction(localAction)
      setPendingSummary(
        `I can ${describedActions.join(', ')}. Click Apply changes to confirm.`
      )
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Ready. Click Apply changes to confirm.',
        },
      ])
      setChatLoading(false)
      return
    }

    const uiIntent = (() => {
      const wantsOpen = /\b(open|show|go to|switch to|take me to|navigate)\b/.test(
        normalizedMessage
      )
      if (!wantsOpen) return null
      if (/\b(ai insights|insights)\b/.test(normalizedMessage)) {
        return { view: 'insights' as AppView }
      }
      if (/\b(budget space|budget view|budget tab)\b/.test(normalizedMessage)) {
        return { view: 'workspace' as AppView }
      }
      if (/\b(cash flow|cashflow)\b/.test(normalizedMessage)) {
        return { view: 'cashflow' as AppView }
      }
      if (/\b(spending|spend log|spend)\b/.test(normalizedMessage)) {
        return { view: 'spend' as AppView }
      }
      if (/\b(planner|plan)\b/.test(normalizedMessage)) {
        return { view: 'planner' as AppView }
      }
      if (/\b(copilot)\b/.test(normalizedMessage)) {
        return { view: 'copilot' as AppView }
      }
      if (/\b(preferences|settings)\b/.test(normalizedMessage)) {
        return { view: 'personalize' as AppView }
      }
      if (/\b(bill schedule|schedule editor)\b/.test(normalizedMessage)) {
        return { view: 'planner' as AppView, panel: 'schedule' as const }
      }
      return null
    })()

    if (uiIntent) {
      setPendingSpendDraft(null)
      setPendingUiAction(uiIntent)
      setPendingSummary(
        `Switch to ${uiIntent.view}${uiIntent.panel ? ' schedule editor' : ''}?`
      )
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ready. Click Apply changes to confirm.' },
      ])
      setChatLoading(false)
      return
    }

    if (/\b(export|download)\b/.test(normalizedMessage)) {
      setPendingSpendDraft(null)
      setPendingUtilityAction('exportCsv')
      setPendingSummary('Export your budget CSV?')
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ready. Click Apply changes to confirm.' },
      ])
      setChatLoading(false)
      return
    }

    const preferenceUpdates: Partial<BudgetState> = {}
    const preferenceNotes: string[] = []
    const needsFollowup: string[] = []

    if (/\b(bank balance|balance|checking|savings balance)\b/.test(normalizedMessage)) {
      const amount = parseLooseAmount(userMessage)
      if (amount === null) {
        needsFollowup.push('What is your current bank balance?')
      } else {
        preferenceUpdates.bankBalance = amount
        preferenceNotes.push(`Bank balance → ${formatCurrency(amount)}`)
      }
    }

    if (/\b(pay(ed|check)?|income)\b/.test(normalizedMessage)) {
      const amount = parseLooseAmount(userMessage)
      const freq =
        /\bbiweekly|every 2 weeks|every two weeks|twice a month\b/.test(
          normalizedMessage
        )
          ? 'biweekly'
          : /\bweekly\b/.test(normalizedMessage)
          ? 'weekly'
          : /\bmonthly\b/.test(normalizedMessage)
          ? 'monthly'
          : null
      if (amount !== null) {
        preferenceUpdates.incomePerPaycheck = amount
        preferenceNotes.push(`Income → ${formatCurrency(amount)}`)
      }
      if (freq) {
        preferenceUpdates.payFrequency = freq
        preferenceNotes.push(`Cadence → ${freq}`)
      }
    }

    if (/\bpay frequency\b/.test(normalizedMessage)) {
      if (/\bbiweekly|every 2 weeks|every two weeks|twice a month\b/.test(normalizedMessage)) {
        preferenceUpdates.payFrequency = 'biweekly'
        preferenceNotes.push('Cadence → biweekly')
      } else if (/\bweekly\b/.test(normalizedMessage)) {
        preferenceUpdates.payFrequency = 'weekly'
        preferenceNotes.push('Cadence → weekly')
      } else if (/\bmonthly\b/.test(normalizedMessage)) {
        preferenceUpdates.payFrequency = 'monthly'
        preferenceNotes.push('Cadence → monthly')
      }
    }

    if (/\bpartner income|spouse income|partner pay\b/.test(normalizedMessage)) {
      const amount = parseLooseAmount(userMessage)
      if (amount === null) {
        needsFollowup.push('What is your partner income per paycheck?')
      } else {
        preferenceUpdates.partnerIncome = amount
        preferenceUpdates.includePartner = true
        preferenceNotes.push(
          `Partner income → ${formatCurrency(amount)} (included)`
        )
      }
    }

    if (/\b(buffer|cash buffer|safety buffer)\b/.test(normalizedMessage)) {
      const amount = parseLooseAmount(userMessage)
      if (amount === null) {
        needsFollowup.push('What monthly buffer should I set?')
      } else {
        preferenceUpdates.monthlyBuffer = amount
        preferenceNotes.push(`Monthly buffer → ${formatCurrency(amount)}`)
      }
    }

    if (/\b(snowball|avalanche)\b/.test(normalizedMessage)) {
      preferenceUpdates.debtStrategy = /\bsnowball\b/.test(normalizedMessage)
        ? 'snowball'
        : 'avalanche'
      preferenceNotes.push(`Debt strategy → ${preferenceUpdates.debtStrategy}`)
    }

    if (/\bautosuggest\b/.test(normalizedMessage)) {
      if (/\b(turn off|disable|stop)\b/.test(normalizedMessage)) {
        preferenceUpdates.autoSuggest = false
        preferenceNotes.push('Auto-suggest → off')
      } else if (/\b(turn on|enable)\b/.test(normalizedMessage)) {
        preferenceUpdates.autoSuggest = true
        preferenceNotes.push('Auto-suggest → on')
      }
    }

    if (/\bautosave\b/.test(normalizedMessage)) {
      if (/\b(turn off|disable|stop)\b/.test(normalizedMessage)) {
        preferenceUpdates.autoSaveEnabled = false
        preferenceNotes.push('Auto-save → off')
      } else if (/\b(turn on|enable)\b/.test(normalizedMessage)) {
        preferenceUpdates.autoSaveEnabled = true
        preferenceNotes.push('Auto-save → on')
      }
    }

    if (/\bweekly summary|weekly summaries\b/.test(normalizedMessage)) {
      if (/\b(turn off|disable|stop)\b/.test(normalizedMessage)) {
        preferenceUpdates.notificationWeeklySummary = false
        preferenceNotes.push('Weekly summary → off')
      } else if (/\b(turn on|enable)\b/.test(normalizedMessage)) {
        preferenceUpdates.notificationWeeklySummary = true
        preferenceNotes.push('Weekly summary → on')
      }
    }

    if (/\bover budget alert|overbudget alert|over budget alerts\b/.test(normalizedMessage)) {
      if (/\b(turn off|disable|stop)\b/.test(normalizedMessage)) {
        preferenceUpdates.notificationOverBudget = false
        preferenceNotes.push('Over-budget alerts → off')
      } else if (/\b(turn on|enable)\b/.test(normalizedMessage)) {
        preferenceUpdates.notificationOverBudget = true
        preferenceNotes.push('Over-budget alerts → on')
      }
    }

    if (/\bbill reminders?\b/.test(normalizedMessage)) {
      if (/\b(turn off|disable|stop)\b/.test(normalizedMessage)) {
        preferenceUpdates.notificationBillReminders = false
        preferenceNotes.push('Bill reminders → off')
      } else {
        preferenceUpdates.notificationBillReminders = true
        preferenceNotes.push('Bill reminders → on')
      }
      const leadMatch = normalizedMessage.match(/(\d{1,2})\s*day/)
      if (leadMatch) {
        const lead = Number(leadMatch[1])
        if (!Number.isNaN(lead)) {
          preferenceUpdates.notificationReminderDays = lead
          preferenceNotes.push(`Reminder lead days → ${lead}`)
        }
      }
    }

    if (/\bpay dates?|paydays?\b/.test(normalizedMessage)) {
      const isoMatches =
        userMessage.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []
      let parsedDates: string[] = []
      if (isoMatches.length) {
        parsedDates = isoMatches
      } else {
        const dayMatches = [
          ...userMessage.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\b/g),
        ]
        const days = dayMatches
          .map((match) => Number(match[1]))
          .filter((day) => day >= 1 && day <= 31)
        if (days.length) {
          const now = new Date()
          const year = now.getFullYear()
          const month =
            parseMonthFromText(userMessage) ?? now.getMonth() + 1
          parsedDates = days.slice(0, 2).map((day) =>
            formatIsoDate(year, month, day)
          )
        }
      }
      if (!parsedDates.length) {
        needsFollowup.push('What pay dates should I use?')
      } else {
        preferenceUpdates.payDates = parsedDates
        if (parsedDates.length === 2) {
          preferenceUpdates.payFrequency = 'biweekly'
        }
        preferenceNotes.push(`Pay dates → ${parsedDates.join(', ')}`)
      }
    }

    if (/\bshift bill schedule|shift bills\b/.test(normalizedMessage)) {
      if (/\bearlier|forward|front\b/.test(normalizedMessage)) {
        preferenceUpdates.scheduleBias = -1
        preferenceNotes.push('Schedule bias → -1')
      } else if (/\blater|end|back\b/.test(normalizedMessage)) {
        preferenceUpdates.scheduleBias = 1
        preferenceNotes.push('Schedule bias → 1')
      } else if (/\beven\b/.test(normalizedMessage)) {
        preferenceUpdates.scheduleBias = 0
        preferenceNotes.push('Schedule bias → 0')
      }
    }

    const stockMatch = normalizedMessage.match(
      /\b(\d+(?:\.\d+)?)\s*shares?\s+of\s+([A-Za-z]{1,5})\b/
    )
    if (stockMatch) {
      const shares = Number(stockMatch[1])
      const symbol = stockMatch[2].toUpperCase()
      const priceMatch = userMessage.match(/\bat\s*\$?(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?/i)
      const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0
      if (!Number.isNaN(shares)) {
        const nextStocks = [
          ...stocks,
          { symbol, shares, price, monthly: 0 },
        ]
        preferenceUpdates.stocks = nextStocks
        preferenceNotes.push(`Add stock → ${symbol} (${shares} @ ${price})`)
      }
    }

    if (/\bmonthly investment|invest\b/.test(normalizedMessage)) {
      const amount = parseLooseAmount(userMessage)
      if (amount !== null) {
        preferenceUpdates.monthlyInvestment = amount
        preferenceNotes.push(`Monthly investment → ${formatCurrency(amount)}`)
      }
    }

    if (/\bexpected return|return rate|roi\b/.test(normalizedMessage)) {
      const percentMatch = normalizedMessage.match(/(\d{1,2})\s*%/)
      if (percentMatch) {
        const nextReturn = Number(percentMatch[1])
        if (!Number.isNaN(nextReturn)) {
          preferenceUpdates.expectedReturn = nextReturn
          preferenceNotes.push(`Expected return → ${nextReturn}%`)
        }
      }
    }

    const billNameMatch = findNameMatch(
      budgetBills.map((bill) => bill.name.trim()),
      userMessage
    )
    if (billNameMatch && /\b(set|lower|raise|update)\b/.test(normalizedMessage)) {
      const amount = parseLooseAmount(userMessage)
      if (amount !== null) {
        const nextBills = budgetBills.map((bill) =>
          bill.name.toLowerCase() === billNameMatch.toLowerCase()
            ? { ...bill, amount }
            : bill
        )
        const nextCategories = budgetCategories.map((category) =>
          category.name.toLowerCase() === billNameMatch.toLowerCase()
            ? { ...category, planned: amount }
            : category
        )
        preferenceUpdates.budgetBills = nextBills
        preferenceUpdates.budgetCategories = nextCategories
        preferenceNotes.push(`${billNameMatch} → ${formatCurrency(amount)}`)
      }
    }

    if (billNameMatch && /\b(move|schedule)\b/.test(normalizedMessage)) {
      const dayMatch = normalizedMessage.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/)
      if (dayMatch) {
        const day = Number(dayMatch[1])
        const monthly = /\bmonthly|every month|each month\b/.test(normalizedMessage)
        const nextBills = budgetBills.map((bill) => {
          if (bill.name.toLowerCase() !== billNameMatch.toLowerCase()) return bill
          if (monthly) {
            return { ...bill, recurringDay: day, date: 'Unscheduled' }
          }
          const now = new Date()
          const year = now.getFullYear()
          const month = parseMonthFromText(userMessage) ?? now.getMonth() + 1
          const dateLabel = formatIsoDate(year, month, day)
          return { ...bill, date: dateLabel, recurringDay: null }
        })
        preferenceUpdates.budgetBills = nextBills
        preferenceNotes.push(`${billNameMatch} scheduled`)
      }
    }

    if (!billNameMatch) {
      const categoryMatch = findNameMatch(
        budgetCategories.map((category) => category.name.trim()),
        userMessage
      )
      if (categoryMatch && /\b(set|update)\b/.test(normalizedMessage)) {
        const amount = parseLooseAmount(userMessage)
        if (amount !== null) {
          const nextCategories = budgetCategories.map((category) =>
            category.name.toLowerCase() === categoryMatch.toLowerCase()
              ? { ...category, planned: amount }
              : category
          )
          preferenceUpdates.budgetCategories = nextCategories
          preferenceNotes.push(`${categoryMatch} → ${formatCurrency(amount)}`)
        }
      }
    }

    if (
      /\badd (a )?bill\b/.test(normalizedMessage) ||
      (/\badd\b/.test(normalizedMessage) &&
        !/\b(label|goal|stock|shares?|spend|transaction)\b/.test(normalizedMessage))
    ) {
      const amount = parseLooseAmount(userMessage)
      const nameMatch = userMessage.match(
        /add (?:a )?bill[:\s]+([^,]+?)(?:\s+\$|\s+for|\s+at|$)/i
      ) || userMessage.match(/add\s+(.+?)\s+\$?\d/i)
      const name = nameMatch ? nameMatch[1].trim() : null
      if (!name || amount === null) {
        needsFollowup.push('What bill name and amount should I add?')
      } else {
        const nextBills = mergeBills(budgetBills, [{ name, amount }])
        const nextCategories = mergeCategoriesFromBills(
          budgetCategories,
          [{ name, amount }]
        )
        preferenceUpdates.budgetBills = nextBills
        preferenceUpdates.budgetCategories = nextCategories
        preferenceNotes.push(`Add bill ${name} → ${formatCurrency(amount)}`)
      }
    }

    if (/\badd label\b/.test(normalizedMessage)) {
      const labelMatch = userMessage.match(/label(?: called| named)?\s+([^,]+)$/i)
      const labelName = labelMatch ? labelMatch[1].trim() : null
      if (!labelName) {
        needsFollowup.push('Which label should I add?')
      } else if (!labels.map((label) => label.toLowerCase()).includes(labelName.toLowerCase())) {
        preferenceUpdates.labels = [...labels, labelName]
        preferenceNotes.push(`Add label → ${labelName}`)
      }
    }

    const goalNameMatch = findNameMatch(
      budgetGoals.map((goal) => goal.name.trim()),
      userMessage
    )
    if (/\badd goal\b/.test(normalizedMessage) || /\bgoal:\b/i.test(userMessage)) {
      const nameMatch = userMessage.match(/goal[:\s]+([^,]+?)(?:,|$)/i)
      const name = nameMatch ? nameMatch[1].trim() : null
      const amounts = [...userMessage.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?/g)]
        .map((match) => Number(match[1].replace(/,/g, '')))
        .filter((value) => !Number.isNaN(value))
      const target = amounts[0]
      if (!name || target === undefined) {
        needsFollowup.push('What goal name and target should I add?')
      } else {
        preferenceUpdates.budgetGoals = [
          ...budgetGoals,
          { name, amount: 0, target },
        ]
        preferenceNotes.push(`Add goal ${name} → ${formatCurrency(target)}`)
      }
    } else if (goalNameMatch && /\b(update|set)\b/.test(normalizedMessage)) {
      const amounts = [...userMessage.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?/g)]
        .map((match) => Number(match[1].replace(/,/g, '')))
        .filter((value) => !Number.isNaN(value))
      if (amounts.length) {
        const mentionsTarget = /\btarget\b/.test(normalizedMessage)
        const mentionsCurrent = /\b(current|amount|saved)\b/.test(normalizedMessage)
        const nextGoals = budgetGoals.map((goal) => {
          if (goal.name.toLowerCase() !== goalNameMatch.toLowerCase()) return goal
          let nextAmount = goal.amount
          let nextTarget = goal.target
          if (amounts.length >= 2) {
            nextAmount = amounts[0]
            nextTarget = amounts[1]
          } else if (mentionsTarget && amounts.length === 1) {
            nextTarget = amounts[0]
          } else if (mentionsCurrent || amounts.length === 1) {
            nextAmount = amounts[0]
          }
          return { ...goal, amount: nextAmount, target: nextTarget }
        })
        preferenceUpdates.budgetGoals = nextGoals
        preferenceNotes.push(`Update goal ${goalNameMatch}`)
      }
    }

    if (Object.keys(preferenceUpdates).length || needsFollowup.length) {
      setPendingSpendDraft(null)
      if (needsFollowup.length) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: needsFollowup[0] },
        ])
        setChatLoading(false)
        return
      }
      setPendingUpdates(preferenceUpdates)
      setPendingSummary(
        preferenceNotes.length
          ? `Apply updates: ${preferenceNotes.join(', ')}?`
          : 'Apply updates?'
      )
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ready. Click Apply changes to confirm.' },
      ])
      setChatLoading(false)
      return
    }

    const { data, error } = await supabase.functions.invoke('budget-coach', {
      body: {
        messages: nextMessages,
        budget: currentBudgetState,
      },
    })
    if (error) {
      setChatLoading(false)
      showToast(error.message || 'Budget Copilot is unavailable.')
      return
    }
    if (data?.error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Copilot error: ${data.error}`,
        },
      ])
      setChatLoading(false)
      return
    }
    const reply = data?.reply ?? 'I am ready to help.'
    const updates = data?.updates
    if (updates && typeof updates === 'object' && Object.keys(updates).length > 0) {
      setPendingUpdates(updates)
      setPendingSummary(data?.summary ?? 'Apply these suggested updates?')
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } else {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    }
    setChatLoading(false)
  }

  const handleGenerateSavingsPlaybook = async () => {
    if (!requireLogin('Please log in to build a savings playbook.')) {
      return
    }
    const targetValue = Number(savingsTarget || 0)
    if (!savingsBill) {
      showToast('Choose a bill to target first.')
      return
    }
    if (!targetValue || targetValue <= 0) {
      showToast('Add a monthly savings target.')
      return
    }
    if (savingsLoading) {
      return
    }

    const matched = savingsCandidates.find((item) => item.name === savingsBill)
    const billAmount = matched?.amount ?? 0
    const provider = savingsProvider.trim()
    const notes = savingsNotes.trim()
    const prompt = [
      `Create a savings playbook for ${savingsBill}.`,
      billAmount ? `Current monthly amount: ${formatCurrency(billAmount)}.` : '',
      `Target savings: ${formatCurrency(targetValue)} per month.`,
      `Preferred contact: ${savingsMethod}.`,
      provider ? `Provider/company: ${provider}.` : '',
      notes ? `Notes: ${notes}.` : '',
      'Include prep checklist, negotiation script, fallback offer, and follow-up note.',
    ]
      .filter(Boolean)
      .join(' ')

    setSavingsLoading(true)
    setSavingsError('')
    setSavingsPlan('')
    setSavingsPendingUpdates(null)
    setSavingsPendingSummary('')
    setSavingsStep('plan')

    try {
      const { data, error } = await supabase.functions.invoke('budget-coach', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          budget: currentBudgetState,
          context: savingsConciergeContext,
        },
      })

      if (error) {
        setSavingsLoading(false)
        setSavingsError(error.message || 'Savings Concierge is unavailable.')
        return
      }
      if (data?.error) {
        setSavingsLoading(false)
        setSavingsError(`Concierge error: ${data.error}`)
        return
      }
      if (!data) {
        setSavingsLoading(false)
        setSavingsError('Savings Concierge did not return a response.')
        return
      }
      const replyRaw =
        typeof data?.reply === 'string' ? data.reply : 'I am ready to help.'
      const reply = extractReplyFromJsonString(replyRaw) ?? replyRaw
      if (data?.updates && typeof data.updates === 'object') {
        const updateKeys = Object.keys(data.updates)
        if (updateKeys.length > 0) {
          setSavingsPendingUpdates(data.updates)
          setSavingsPendingSummary(
            data?.summary ?? 'Apply these savings updates?'
          )
        }
      }
      setSavingsPlan(reply)
      setSavingsLoading(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Savings Concierge is unavailable.'
      setSavingsLoading(false)
      setSavingsError(message)
    }
  }

  const handleExportCsv = () => {
    if (!requireLogin('Please log in to export your budget.')) {
      return
    }
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10)
    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '')
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    }
    const rows: Array<Array<string | number>> = []

    rows.push(['Centsy Export'])
    rows.push([`Generated: ${now.toLocaleString()}`])
    rows.push([])

    rows.push(['Summary'])
    rows.push(['Metric', 'Value'])
    rows.push(['Monthly income', formatCurrency(monthlyIncome)])
    rows.push(['Bank balance', formatCurrency(bankBalance)])
    rows.push(['Bank balance after bills', formatCurrency(bankBalanceAfterBills)])
    rows.push([
      'Bills covered (months)',
      plannedBillsDisplayTotal > 0 ? bankCoverageMonths.toFixed(2) : '—',
    ])
    rows.push(['Planned monthly bills', formatCurrency(plannedBillsDisplayTotal)])
    rows.push(['Bills per paycheck', formatCurrency(billsPerPaycheck)])
    rows.push(['Next paycheck after bills', formatCurrency(nextPaycheckAfterBills)])
    rows.push(['Savings + debt', formatCurrency(savingsDebtTotal)])
    rows.push(['Left to budget', formatCurrency(leftToBudget)])
    rows.push([])

    rows.push(['Monthly bills'])
    rows.push(['Bill', 'Planned', 'Actual', 'Status'])
    budgetCategories.forEach((category) => {
      rows.push([
        category.name,
        formatCurrency(category.planned),
        formatCurrency(category.actual),
        statusFor(category.planned, category.actual),
      ])
    })
    rows.push([])

    rows.push(['Spending log'])
    rows.push(['Date', 'Merchant', 'Bill', 'Amount', 'Note'])
    spendEntries.forEach((entry) => {
      rows.push([
        entry.date,
        entry.merchant,
        entry.category,
        formatCurrency(entry.amount),
        entry.note,
      ])
    })
    rows.push([])

    rows.push(['Schedule'])
    rows.push(['Bill', 'Due date', 'Amount'])
    scheduledBills.forEach((bill) => {
      rows.push([bill.name, formatBillDateLabel(bill), formatCurrency(bill.amount)])
    })
    rows.push([])

    rows.push(['Goals'])
    rows.push(['Goal', 'Current', 'Target', 'Progress'])
    budgetGoals.forEach((goal) => {
      rows.push([
        goal.name,
        formatCurrency(goal.amount),
        formatCurrency(goal.target),
        goalPace(goal.amount, goal.target),
      ])
    })
    rows.push([])

    rows.push(['Investments'])
    rows.push(['Holding', 'Shares', 'Price', 'Monthly Buy', 'Value'])
    stocks.forEach((stock) => {
      rows.push([
        stock.symbol,
        stock.shares,
        formatCurrency(stock.price),
        formatCurrency(stock.monthly),
        formatCurrency(stock.shares * stock.price),
      ])
    })
    rows.push(['Projected value (12 mo)', formatCurrency(projectedValue)])
    rows.push(['Expected annual return', `${expectedReturn}%`])
    rows.push(['Monthly investment', formatCurrency(monthlyInvestment)])
    rows.push([])

    rows.push(['Preferences'])
    rows.push(['Pay frequency', payFrequencyLabel])
    rows.push(['Pay dates', payDates.filter(Boolean).join(' | ') || '—'])
    rows.push(['Primary goal', primaryGoal])
    rows.push(['Auto-suggest bills', autoSuggest ? 'Yes' : 'No'])
    rows.push(['Include partner income', includePartner ? 'Yes' : 'No'])
    rows.push(['Monthly buffer', formatCurrency(safetyBuffer)])
    rows.push([
      'Weekly summary',
      notificationWeeklySummary ? 'Enabled' : 'Disabled',
    ])
    rows.push([
      'Over budget alerts',
      notificationOverBudget ? 'Enabled' : 'Disabled',
    ])
    rows.push([
      'Bill reminders',
      notificationBillReminders ? 'Enabled' : 'Disabled',
    ])
    rows.push(['Reminder lead days', notificationReminderDays])
    rows.push(['Auto-save', autoSaveEnabled ? 'Enabled' : 'Disabled'])
    rows.push(['Debt strategy', debtStrategy])
    rows.push(['Labels', labels.join(' | ')])

    const csv = rows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `budgetly-export-${dateStamp}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    showToast('CSV export downloaded.')
  }

  useEffect(() => {
    const loadBudget = async () => {
      if (!userId) return
      setIsHydrating(true)
      const { data, error } = await supabase
        .from('budget_state')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        showToast('Could not load saved budget.')
        setIsHydrating(false)
        return
      }
      if (data?.data) {
        const saved = data.data as BudgetState
        setIncomePerPaycheck(saved.incomePerPaycheck ?? incomePerPaycheck)
        setPartnerIncome(saved.partnerIncome ?? 0)
        setPayFrequency(saved.payFrequency ?? 'biweekly')
        setPrimaryGoal(saved.primaryGoal ?? 'stability')
        setAutoSuggest(saved.autoSuggest ?? true)
        setIncludePartner(saved.includePartner ?? false)
        setBankBalance(saved.bankBalance ?? 0)
        setPayDates(saved.payDates ?? [''])
        setMonthlyBuffer(saved.monthlyBuffer ?? 150)
        setNotificationWeeklySummary(saved.notificationWeeklySummary ?? true)
        setNotificationOverBudget(saved.notificationOverBudget ?? true)
        setNotificationBillReminders(saved.notificationBillReminders ?? true)
        setNotificationReminderDays(saved.notificationReminderDays ?? 3)
        setAutoSaveEnabled(saved.autoSaveEnabled ?? true)
        setBudgetGenerated(saved.budgetGenerated ?? false)
        setBudgetCategories(saved.budgetCategories ?? categoriesSeed)
        setBudgetGoals(saved.budgetGoals ?? goalsSeed)
        setBudgetBills(saved.budgetBills ?? billsSeed)
        setLabels(saved.labels ?? ['Essential', 'Lifestyle', 'Savings'])
        setScheduleBias(saved.scheduleBias ?? 0)
        setDebtStrategy(saved.debtStrategy ?? 'avalanche')
        setStocks(saved.stocks ?? [])
        setRobinhoodConnected(saved.robinhoodConnected ?? false)
        setMonthlyInvestment(saved.monthlyInvestment ?? 200)
        setExpectedReturn(saved.expectedReturn ?? 7)
        setSpendEntries(saved.spendEntries ?? spendEntriesSeed)
        setSaveState('saved')
      }
      setIsHydrating(false)
    }
    loadBudget()
  }, [userId])

  useEffect(() => {
    if (marketingView !== 'investors') return
    if (typeof window === 'undefined') return
    window.location.assign('/investor-deck/slides.html')
  }, [marketingView])

  useEffect(() => {
    if (!userId || isHydrating) return
    if (!autoSaveEnabled) {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
      }
      setSaveState('idle')
      return
    }
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current)
    }
    setSaveState('saving')
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from('budget_state').upsert(
        {
          user_id: userId,
          data: currentBudgetState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      if (error) {
        setSaveState('idle')
        showToast('Save failed. Check connection.')
        return
      }
      setSaveState('saved')
    }, 800)
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
      }
    }
  }, [currentBudgetState, isHydrating, userId, autoSaveEnabled])

  const forumTagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    forumPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        const normalized = tag.toLowerCase()
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
      })
    })
    return counts
  }, [forumPosts])

  const forumCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    forumPosts.forEach((post) => {
      const category = ensureCategory(post.category)
      counts.set(category, (counts.get(category) ?? 0) + 1)
    })
    return counts
  }, [forumPosts])

  const forumTags = useMemo(
    () =>
      Array.from(forumTagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag),
    [forumTagCounts]
  )

  const filteredForumPosts = useMemo(() => {
    const search = forumSearch.trim().toLowerCase()
    return forumPosts.filter((post) => {
      const category = ensureCategory(post.category)
      if (selectedCategory !== 'all' && category !== selectedCategory) {
        return false
      }
      if (selectedTag && !post.tags.map((tag) => tag.toLowerCase()).includes(selectedTag)) {
        return false
      }
      if (!search) return true
      const haystack = `${post.title} ${post.body} ${category} ${post.tags.join(' ')}`.toLowerCase()
      return haystack.includes(search)
    })
  }, [forumPosts, forumSearch, selectedCategory, selectedTag])

  const usernameModalCloseLabel = userProfile?.username ? 'Close' : 'Not now'
  const usernameModal = showUsernameModal ? (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={closeUsernameModal}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-head">
          <h3>Choose a username</h3>
          <button className="ghost small" onClick={closeUsernameModal}>
            {usernameModalCloseLabel}
          </button>
        </div>
        <div className="modal-form">
          <label>
            Username
            <input
              type="text"
              placeholder="BudgetBuddy"
              value={usernameDraft}
              onChange={(event) => {
                setUsernameDraft(event.target.value)
                if (usernameError) {
                  setUsernameError('')
                }
              }}
            />
          </label>
          <p className="helper">
            {usernameError ||
              'Use 3-20 letters, numbers, or underscores. Update every 30 days.'}
          </p>
        </div>
        <button className="solid" onClick={handleUsernameSave} disabled={usernameSaving}>
          {usernameSaving ? 'Saving...' : 'Save username'}
        </button>
      </div>
    </div>
  ) : null

  const totalPortfolio = stocks.reduce(
    (sum, stock) => sum + stock.shares * stock.price,
    0
  )
  const totalMonthlyContribution =
    stocks.reduce((sum, stock) => sum + stock.monthly, 0) + monthlyInvestment
  const annualRate = expectedReturn / 100
  const estimatedGain =
    totalPortfolio * annualRate + totalMonthlyContribution * 12 * (annualRate / 2)
  const projectedValue =
    totalPortfolio + totalMonthlyContribution * 12 + estimatedGain
  const multiplier = payFrequency === 'weekly' ? 4 : payFrequency === 'monthly' ? 1 : 2
  const monthlyIncome =
    incomePerPaycheck * multiplier + (includePartner ? partnerIncome : 0)
  const billNames = new Set(budgetBills.map((bill) => bill.name.toLowerCase()))
  const plannedBillsTotal = budgetBills.reduce((sum, bill) => sum + bill.amount, 0)
  const plannedCategoryTotal = budgetCategories.reduce((sum, category) => {
    if (billNames.has(category.name.toLowerCase())) {
      return sum
    }
    return sum + category.planned
  }, 0)
  const monthlyBillsTotal = budgetCategories.reduce(
    (sum, category) => sum + category.planned,
    0
  )
  const plannedBillsDisplayTotal = monthlyBillsTotal
  const plannedBillsDisplayCount = budgetCategories.length
  const totalPlannedSpend = monthlyBillsTotal
  const spendEntriesTotal = spendEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0
  )
  const remainingSpend = totalPlannedSpend - spendEntriesTotal
  const spendVariance = spendEntriesTotal - totalPlannedSpend
  const spendEntriesByCategory = spendEntries.reduce((map, entry) => {
    const key = entry.category.toLowerCase()
    map.set(key, (map.get(key) ?? 0) + entry.amount)
    return map
  }, new Map<string, number>())
  const spendCategoryRows = budgetCategories.map((category) => {
    const logged = spendEntriesByCategory.get(category.name.toLowerCase()) ?? 0
    return {
      name: category.name,
      planned: category.planned,
      actual: category.actual,
      logged,
      remaining: category.planned - category.actual,
      status: statusFor(category.planned, category.actual),
    }
  })
  const spendEntriesSorted = [...spendEntries].sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  const selectedSavings = savingsCandidates.find(
    (item) => item.name === savingsBill
  )
  const selectedSavingsAmount = selectedSavings?.amount ?? 0
  const scheduledBills =
    budgetBills.length > 0
      ? budgetBills
      : budgetCategories.map((category) => ({
          name: category.name,
          date: 'Unscheduled',
          amount: category.planned,
        }))
  const savingsDebtTotal = budgetCategories.reduce((sum, category) => {
    if (/savings|debt/i.test(category.name)) {
      return sum + category.planned
    }
    return sum
  }, 0)
  const safetyBuffer = Math.max(0, monthlyBuffer)
  const leftToBudget =
    monthlyIncome -
    plannedBillsTotal -
    plannedCategoryTotal -
    monthlyInvestment -
    safetyBuffer
  const effectiveMultiplier = Math.max(1, multiplier)
  const bankBalanceAfterBills = bankBalance - plannedBillsDisplayTotal
  const bankCoverageMonths =
    plannedBillsDisplayTotal > 0 ? bankBalance / plannedBillsDisplayTotal : 0
  const bankCoverageLabel =
    plannedBillsDisplayTotal > 0 ? `${bankCoverageMonths.toFixed(1)} months` : '—'
  const nextPaycheckTotal =
    incomePerPaycheck + (includePartner ? partnerIncome / effectiveMultiplier : 0)
  const billsPerPaycheck = plannedBillsDisplayTotal / effectiveMultiplier
  const nextPaycheckAfterBills = nextPaycheckTotal - billsPerPaycheck
  const dailyFlexTarget = leftToBudget / 30
  const weeklyFlexTarget = leftToBudget / 4
  const billAllocations = scheduledBills.map((bill) => ({
    ...bill,
    allocation:
      plannedBillsDisplayTotal > 0
        ? (bill.amount / plannedBillsDisplayTotal) * nextPaycheckTotal
        : 0,
  }))
  const allocationItems = billAllocations.map((bill, index) => ({
    ...bill,
    id: `${index}-${bill.name}`,
    dueDay: billDueDay(bill),
    dueLabel: formatBillDateLabel(bill),
  }))
  useEffect(() => {
    if (!allocationItems.length) {
      setAllocationOrder([])
      return
    }
    setAllocationOrder((prev) => {
      const currentIds = new Set(allocationItems.map((item) => item.id))
      const retained = prev.filter((id) => currentIds.has(id))
      const missing = allocationItems
        .filter((item) => !retained.includes(item.id))
        .sort((a, b) => a.dueDay - b.dueDay)
        .map((item) => item.id)
      if (retained.length === prev.length && missing.length === 0) {
        return prev
      }
      return [...retained, ...missing]
    })
  }, [allocationItems])
  const orderedAllocations = useMemo(() => {
    if (allocationSortMode === 'custom' && allocationOrder.length) {
      const lookup = new Map(allocationItems.map((item) => [item.id, item]))
      const ordered = allocationOrder
        .map((id) => lookup.get(id))
        .filter((item): item is (typeof allocationItems)[number] => Boolean(item))
      const missing = allocationItems.filter(
        (item) => !allocationOrder.includes(item.id)
      )
      return [...ordered, ...missing]
    }
    return [...allocationItems].sort((a, b) => {
      if (a.dueDay !== b.dueDay) return a.dueDay - b.dueDay
      return a.name.localeCompare(b.name)
    })
  }, [allocationItems, allocationOrder, allocationSortMode])
  const riskScore = (() => {
    let score = 100
    if (plannedBillsDisplayTotal > monthlyIncome) score -= 20
    if (leftToBudget < 0) score -= 20
    if (bankBalanceAfterBills < 0) score -= 20
    if (bankCoverageMonths < 0.5) score -= 15
    if (bankCoverageMonths < 1) score -= 10
    if (spendVariance > 0) score -= 10
    return Math.min(100, Math.max(5, Math.round(score)))
  })()
  const riskLabel =
    riskScore >= 80
      ? 'Low risk'
      : riskScore >= 60
        ? 'Watch list'
        : riskScore >= 40
          ? 'Elevated risk'
          : 'High risk'
  const payFrequencyLabel =
    payFrequency === 'weekly'
      ? 'Weekly'
      : payFrequency === 'monthly'
        ? 'Monthly'
        : 'Every 2 weeks'
  const payDateCount = payFrequency === 'biweekly' ? 2 : 1
  const nextPayDateLabel =
    payDates.find((date) => date && date.trim()) ?? ''
  const nextPayDateDisplay = nextPayDateLabel
    ? formatShortDate(nextPayDateLabel)
    : '—'
  const aiGuidance = useMemo(
    () =>
      buildPaycheckGuidance({
        bankBalance,
        bankBalanceAfterBills,
        billsPerPaycheck,
        nextPaycheckAfterBills,
        nextPaycheckTotal,
        payFrequencyLabel,
        leftToBudget,
        dailyFlexTarget,
        weeklyFlexTarget,
      }),
    [
      bankBalance,
      bankBalanceAfterBills,
      billsPerPaycheck,
      nextPaycheckAfterBills,
      nextPaycheckTotal,
      payFrequencyLabel,
      leftToBudget,
      dailyFlexTarget,
      weeklyFlexTarget,
    ]
  )
  const weeklyBaseWeights = [0.3, 0.25, 0.28, 0.17]
  const weeklyWeights = weeklyBaseWeights.map(
    (_, index) =>
      weeklyBaseWeights[
        (index - scheduleBias + weeklyBaseWeights.length) % weeklyBaseWeights.length
      ]
  )
  const billWeekMap = budgetBills.map((bill, index) => ({
    ...bill,
    index,
    week: billWeekIndex(bill.date, bill.recurringDay),
  }))
  const weeklyBillTotals = billWeekMap.reduce(
    (totals, bill) => {
      const weekIndex = bill.week - 1
      totals[weekIndex] += bill.amount
      return totals
    },
    [0, 0, 0, 0]
  )
  const weeklyCategorySpend = plannedCategoryTotal / weeklyBaseWeights.length
  const weeklyInvestment = monthlyInvestment / weeklyBaseWeights.length
  const weeklyBuffer = safetyBuffer / weeklyBaseWeights.length
  const weeklyAmounts = weeklyWeights.map(
    (weight, index) =>
      monthlyIncome * weight -
      weeklyCategorySpend -
      weeklyInvestment -
      weeklyBuffer -
      weeklyBillTotals[index]
  )
  const maxWeekly = Math.max(...weeklyAmounts.map((amount) => Math.abs(amount)), 1)
  const averageWeekly = weeklyAmounts.reduce((sum, amount) => sum + amount, 0) /
    weeklyAmounts.length
  const stressWeeks = weeklyAmounts
    .map((amount, index) => ({
      label: `Week ${index + 1}`,
      amount,
      isTight: amount < averageWeekly * 0.75,
    }))
    .filter((week) => week.isTight)
  const maxWeeklyAmount = Math.max(...weeklyAmounts)
  const minWeeklyAmount = Math.min(...weeklyAmounts)
  const bestWeekIndex = weeklyAmounts.indexOf(maxWeeklyAmount) + 1
  const tightWeekIndex = weeklyAmounts.indexOf(minWeeklyAmount) + 1
  const upcomingBills = scheduledBills.slice(0, 4)
  const suggestedBillIndex = budgetBills.findIndex((bill) => /phone/i.test(bill.name))
  const fallbackBillIndex = suggestedBillIndex >= 0 ? suggestedBillIndex : 0
  const suggestedBill = budgetBills[fallbackBillIndex]
  const suggestedBillName = suggestedBill?.name ?? 'a monthly bill'
  const canApplySuggestion = Boolean(
    suggestedBill && (suggestedBill.recurringDay === null || suggestedBill.recurringDay === undefined)
  )
  const trendSource = weeklyAmounts.slice(0, 3)
  const trendMax = Math.max(...trendSource.map((amount) => Math.abs(amount)), 1)
  const trendValues = trendSource.map((amount) => Math.abs(amount) / trendMax)
  const trendAverage =
    trendSource.reduce((sum, amount) => sum + amount, 0) / trendSource.length
  const trendMinAmount = Math.min(...trendSource)
  const trendMaxAmount = Math.max(...trendSource)
  const bankGuidance = useMemo(
    () =>
      buildPaycheckGuidance({
        bankBalance,
        bankBalanceAfterBills,
        billsPerPaycheck,
        nextPaycheckAfterBills,
        nextPaycheckTotal,
        payFrequencyLabel,
        leftToBudget,
        dailyFlexTarget,
        weeklyFlexTarget,
      }),
    [
      bankBalance,
      bankBalanceAfterBills,
      billsPerPaycheck,
      nextPaycheckAfterBills,
      nextPaycheckTotal,
      payFrequencyLabel,
      leftToBudget,
      dailyFlexTarget,
      weeklyFlexTarget,
    ]
  )
  const cashflowTrendBox = (
    <div className="cashflow-trend">
      <div>
        <span className="tag">Trend view</span>
        <h4>Next 3 weeks change</h4>
        <p>Taller bars mean bigger swings. Shorter bars mean steadier weeks.</p>
      </div>
      <div className="trend-chart">
        <div className="trend-scale">
          <span>High</span>
          <span>Low</span>
        </div>
        <div className="trend-row">
          {trendValues.map((value, index) => (
            <span
              key={`trend-${index}`}
              style={{ height: `${Math.round(value * 48) + 12}px` }}
            />
          ))}
        </div>
      </div>
      <div className="trend-labels">
        <span>Week 1</span>
        <span>Week 2</span>
        <span>Week 3</span>
      </div>
      <div className="carousel-meta">
        <span>Avg: {formatCurrency(trendAverage)}</span>
        <span>
          Range: {formatCurrency(trendMinAmount)}-{formatCurrency(trendMaxAmount)}
        </span>
      </div>
    </div>
  )

  const carouselCards = [
    <div key="weekly-insights">
      <span className="tag">Weekly insights</span>
      <h4>Best week to pay big bills</h4>
      <p>
        Week {bestWeekIndex} has the strongest cushion at{' '}
        {formatCurrency(maxWeeklyAmount)}.
      </p>
      <div className="carousel-meta">
        <span>Lowest: Week {tightWeekIndex}</span>
        <span>Avg: {formatCurrency(averageWeekly)}</span>
      </div>
    </div>,
    <div key="upcoming-bills">
      <span className="tag">Upcoming bills</span>
      <h4>Next bills</h4>
      <ul className="mini-list">
        {upcomingBills.map((bill) => (
          <li key={`cashflow-bill-${bill.name}`}>
            <span>{bill.name}</span>
            <span>
              {formatBillDateLabel(bill)} · {formatCurrency(bill.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>,
    <div key="what-if-shifts">
      <span className="tag">Quick fixes</span>
      <h4>Try small changes</h4>
      <p>Move one bill by +1 week to ease Week {tightWeekIndex}.</p>
      <p>Trim a flexible bill by $30 to lift the lowest week.</p>
    </div>,
    <div key="recommended">
      <span className="tag">Recommended</span>
      <h4>Suggested move</h4>
      <p>
        Shift {suggestedBillName} to Week {bestWeekIndex} to smooth dips.
      </p>
      <button
        className="ghost small"
        type="button"
        disabled={!canApplySuggestion}
        onClick={() => {
          if (!suggestedBill) {
            showToast('Add a scheduled bill to apply a suggestion.')
            return
          }
          setBudgetBills((prev) =>
            prev.map((bill, index) =>
              index === fallbackBillIndex
                ? { ...bill, date: `Week ${bestWeekIndex}` }
                : bill
            )
          )
          showToast(`${suggestedBillName} moved to Week ${bestWeekIndex}.`)
        }}
      >
        Apply suggestion
      </button>
    </div>,
  ]
  const handleCarouselPrev = () => {
    setCarouselIndex((prev) =>
      carouselCards.length ? (prev - 1 + carouselCards.length) % carouselCards.length : 0
    )
  }
  const handleCarouselNext = () => {
    setCarouselIndex((prev) =>
      carouselCards.length ? (prev + 1) % carouselCards.length : 0
    )
  }
  const cashflowCarousel = (
    <div className="cashflow-carousel" aria-label="Cash flow highlights">
      <button
        className="carousel-arrow"
        type="button"
        onClick={handleCarouselPrev}
        aria-label="Previous highlight"
      >
        ‹
      </button>
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
        >
          {carouselCards.map((card, index) => (
            <div className="carousel-card" key={`carousel-card-${index}`}>
              {card}
            </div>
          ))}
        </div>
      </div>
      <button
        className="carousel-arrow"
        type="button"
        onClick={handleCarouselNext}
        aria-label="Next highlight"
      >
        ›
      </button>
      <div className="carousel-dots" role="tablist" aria-label="Carousel pages">
        {carouselCards.map((_card, index) => (
          <button
            key={`carousel-dot-${index}`}
            className={carouselIndex === index ? 'dot active' : 'dot'}
            type="button"
            onClick={() => setCarouselIndex(index)}
            aria-current={carouselIndex === index ? 'true' : undefined}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  )

  if (isCommunityPage) {
    return (
      <div className="forum-page">
        <header className="forum-header">
          <div className="brand">
            <span className="brand-mark">
              <img className="brand-logo" src={centsyLogo} alt="Centsy logo" />
            </span>
            <div>
              <p className="brand-name">Centsy Community</p>
              <p className="brand-tag">Real budgets, real people</p>
            </div>
          </div>
          <div className="forum-header-search">
            <input
              type="text"
              placeholder="Search posts, tags, categories"
              value={forumSearch}
              onChange={(event) => setForumSearch(event.target.value)}
            />
            {forumSearch ? (
              <button
                className="ghost small"
                type="button"
                onClick={() => setForumSearch('')}
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="forum-actions">
            <button className="ghost" onClick={() => window.location.assign(homeUrl)}>
              Back to budget
            </button>
            {userEmail ? (
              <span className="tag">Signed in</span>
            ) : (
              <button className="solid" onClick={() => setShowLogin(true)}>
                Log in
              </button>
            )}
          </div>
        </header>
        <main className="forum-main">
          <aside className="forum-rail">
            <div className="rail-card">
              <h3>Categories</h3>
              <div className="rail-filters">
                <button
                  className={selectedCategory === 'all' ? 'pill active' : 'pill'}
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                >
                  All ({forumPosts.length})
                </button>
                {forumCategories.map((category) => (
                  <button
                    className={
                      selectedCategory === category ? 'pill active' : 'pill'
                    }
                    key={`category-${category}`}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category} ({forumCategoryCounts.get(category) ?? 0})
                  </button>
                ))}
              </div>
              <div className="rail-add">
                <input
                  type="text"
                  placeholder="Add category"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                />
                <button className="ghost small" onClick={handleAddForumCategory}>
                  Add
                </button>
              </div>
            </div>
            <div className="rail-card">
              <h3>Guidelines</h3>
              <p className="muted">
                Be kind, stay on topic, and share what has worked for you.
              </p>
            </div>
          </aside>
          <section className="forum-feed">
            <div className="forum-hero">
              <div>
                <h1>Ask the community</h1>
                <p>
                  Post your question, get real answers, and share your own
                  budgeting wins.
                </p>
              </div>
              <button className="ghost" onClick={loadForumPosts}>
                Refresh
              </button>
            </div>
            <div className="forum-search">
              <input
                type="text"
                placeholder="Search posts, tags, or categories"
                value={forumSearch}
                onChange={(event) => setForumSearch(event.target.value)}
              />
              {(forumSearch || selectedTag || selectedCategory !== 'all') ? (
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => {
                    setForumSearch('')
                    setSelectedTag('')
                    setSelectedCategory('all')
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
            <div className="forum-compose">
              <h3>Start a thread</h3>
              <div className="community-form">
                <label>
                  Title
                  <input
                    type="text"
                    value={newPost.title}
                    placeholder="Ex: How do you plan for irregular bills?"
                    onChange={(event) =>
                      setNewPost((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Question
                  <textarea
                    rows={4}
                    value={newPost.body}
                    placeholder="Share the situation and what you are trying to solve."
                    onChange={(event) =>
                      setNewPost((prev) => ({ ...prev, body: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Category
                  <select
                    value={newPost.category}
                    onChange={(event) =>
                      setNewPost((prev) => ({ ...prev, category: event.target.value }))
                    }
                  >
                    {forumCategories.map((category) => (
                      <option key={`category-option-${category}`} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tags
                  <input
                    type="text"
                    value={newPost.tags}
                    placeholder="bills, debt, savings"
                    onChange={(event) =>
                      setNewPost((prev) => ({ ...prev, tags: event.target.value }))
                    }
                  />
                </label>
                {forumTags.length ? (
                  <div className="tag-row">
                    {forumTags.slice(0, 8).map((tag) => (
                      <button
                        className="tag-pill"
                        key={`quick-tag-${tag}`}
                        type="button"
                        onClick={() => {
                          const existing = parseTags(newPost.tags)
                          if (existing.includes(tag)) return
                          const next = [...existing, tag].join(', ')
                          setNewPost((prev) => ({ ...prev, tags: next }))
                        }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button className="solid small" onClick={handleCreatePost}>
                  Post question
                </button>
              </div>
            </div>
            <div className="forum-list">
              {forumLoading ? (
                <p className="muted">Loading community posts...</p>
              ) : forumError ? (
                <p className="muted">{forumError}</p>
              ) : filteredForumPosts.length ? (
                filteredForumPosts.map((post) => {
                  const isOpen = activeForumPostId === post.id
                  const comments = forumComments[post.id] ?? []
                  const authorLabel = formatForumUsername(post.user_id)
                  return (
                    <article className="forum-thread" key={post.id}>
                      <div className="thread-main">
                        <div>
                          <h4>{post.title}</h4>
                          <p className="muted">{post.body}</p>
                        </div>
                        <div className="thread-meta">
                          <span className="tag-pill static">{authorLabel}</span>
                          <span>{formatShortDate(post.created_at)}</span>
                          <span>{comments.length} replies</span>
                          <span className="tag-pill static">
                            {ensureCategory(post.category)}
                          </span>
                          {post.user_id === userId ? (
                            <button
                              className="ghost small"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {post.tags.length ? (
                        <div className="tag-row">
                  {post.tags.map((tag: string) => (
                    <span className="tag-pill" key={`${post.id}-${tag}`}>
                      {tag}
                    </span>
                  ))}
                        </div>
                      ) : null}
                      <button
                        className="ghost small"
                        onClick={() => {
                          const nextId = isOpen ? null : post.id
                          setActiveForumPostId(nextId)
                          if (nextId && !forumComments[post.id]) {
                            loadForumComments(post.id)
                          }
                        }}
                      >
                        {isOpen ? 'Hide replies' : 'View thread'}
                      </button>
                      {isOpen ? (
                        <div className="forum-replies">
                          {comments.length ? (
                            comments.map((comment) => {
                              const replyMeta = [
                                formatForumUsername(comment.user_id),
                                formatShortDate(comment.created_at),
                              ]
                                .filter(Boolean)
                                .join(' · ')
                              return (
                                <div className="forum-reply" key={comment.id}>
                                  <p>{comment.body}</p>
                                  <div className="reply-meta">
                                    <span>{replyMeta}</span>
                                    {comment.user_id === userId ? (
                                      <button
                                        className="ghost small"
                                        onClick={() =>
                                          handleDeleteComment(post.id, comment.id)
                                        }
                                      >
                                        Delete
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <p className="muted">No replies yet.</p>
                          )}
                          <div className="reply-form">
                            <textarea
                              rows={3}
                              value={newComment[post.id] ?? ''}
                              placeholder="Share a tip or ask a follow-up."
                              onChange={(event) =>
                                setNewComment((prev) => ({
                                  ...prev,
                                  [post.id]: event.target.value,
                                }))
                              }
                            />
                            <button
                              className="solid small"
                              onClick={() => handleCreateComment(post.id)}
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  )
                })
              ) : (
                <p className="muted">
                  No posts match those filters. Try a different tag or category.
                </p>
              )}
            </div>
          </section>
          <aside className="forum-rail">
            <div className="rail-card">
              <h3>Popular tags</h3>
              <input
                type="text"
                placeholder="Search tags"
                value={tagSearch}
                onChange={(event) => setTagSearch(event.target.value)}
              />
              <div className="tag-row">
                {forumTags
                  .filter((tag) => tag.includes(tagSearch.trim().toLowerCase()))
                  .slice(0, 12)
                  .map((tag) => (
                    <button
                      className={selectedTag === tag ? 'tag-pill active' : 'tag-pill'}
                      key={`tag-${tag}`}
                      type="button"
                      onClick={() =>
                        setSelectedTag((prev) => (prev === tag ? '' : tag))
                      }
                    >
                      {tag} ({forumTagCounts.get(tag) ?? 0})
                    </button>
                  ))}
              </div>
            </div>
            <div className="rail-card">
              <h3>Community tip</h3>
              <p className="muted">
                Share what you tried, what failed, and what finally clicked.
              </p>
            </div>
          </aside>
        </main>

        {showLogin ? (
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={() => setShowLogin(false)}
          >
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="card-head">
                <h3>{authMode === 'signup' ? 'Create account' : 'Log in'}</h3>
                <button
                  className="ghost small"
                  onClick={() => setShowLogin(false)}
                >
                  Close
                </button>
              </div>
              <div className="auth-toggle">
                <button
                  className={authMode === 'login' ? 'solid small' : 'ghost small'}
                  onClick={() => setAuthMode('login')}
                  type="button"
                >
                  Log in
                </button>
                <button
                  className={authMode === 'signup' ? 'solid small' : 'ghost small'}
                  onClick={() => setAuthMode('signup')}
                  type="button"
                >
                  Create account
                </button>
              </div>
              <div className="modal-form">
                <label>
                  Email
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                  />
                </label>
                {authMode === 'login' ? (
                  <button
                    className="ghost small"
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={authLoading}
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <button
                className="solid"
                onClick={handleLogin}
                disabled={authLoading}
              >
                {authLoading
                  ? 'Working...'
                  : authMode === 'signup'
                  ? 'Create account'
                  : 'Log in'}
              </button>
            </div>
          </div>
        ) : null}
        {usernameModal}
      </div>
    )
  }

  return (
    <div className="app">
      <header className="hero">
        <nav className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <img className="brand-logo" src={centsyLogo} alt="Centsy logo" />
            </span>
            <div>
              <p className="brand-name">Centsy</p>
              <p className="brand-tag">Budgeting for real life</p>
            </div>
          </div>
          <button
            className="nav-toggle"
            type="button"
            aria-label="Toggle navigation"
            aria-controls="primary-nav"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen((prev) => !prev)}
          >
            Menu
          </button>
          <div
            id="primary-nav"
            className={`nav-links ${isNavOpen ? 'open' : ''}`}
          >
            <a
              className={marketingView === 'home' ? 'nav-link active' : 'nav-link'}
              href={marketingUrlFor('home')}
              onClick={(event) => {
                event.preventDefault()
                handleMarketingNav('home')
              }}
            >
              Home
            </a>
            <a className="nav-link" href={communityUrl}>
              Community
            </a>
            <a
              className={
                marketingView === 'features' ? 'nav-link active' : 'nav-link'
              }
              href={marketingUrlFor('features')}
              onClick={(event) => {
                event.preventDefault()
                handleMarketingNav('features')
              }}
            >
              Features
            </a>
            <a
              className={marketingView === 'about' ? 'nav-link active' : 'nav-link'}
              href={marketingUrlFor('about')}
              onClick={(event) => {
                event.preventDefault()
                handleMarketingNav('about')
              }}
            >
              About
            </a>
            <a
              className={
                marketingView === 'dev-notes' ? 'nav-link active' : 'nav-link'
              }
              href={marketingUrlFor('dev-notes')}
              onClick={(event) => {
                event.preventDefault()
                handleMarketingNav('dev-notes')
              }}
            >
              Dev notes
            </a>
          </div>
          <div className="top-actions">
            {userEmail ? (
              <button className="ghost" onClick={handleLogout}>
                Log out
              </button>
            ) : (
              <button className="ghost small" onClick={() => setShowLogin(true)}>
                Log in
              </button>
            )}
            {userEmail ? (
              <span className={`save-pill ${saveState}`}>
                {saveState === 'saving' ? 'Saving...' : 'All changes saved'}
              </span>
            ) : null}
            <button className="solid" onClick={() => openBudgetSpace()}>
              Budget Space
            </button>
          </div>
        </nav>

        {marketingView === 'home' ? (
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Simple. Detailed. Yours.</p>
            <h1>Finish a full budget in minutes, not hours.</h1>
            <p className="lead">
              Answer a few questions, get a complete AI-guided budget, then edit
              as you go. See how each bill changes your weekly cash.
            </p>
            <form className="hero-waitlist" onSubmit={handleWaitlistSubmit}>
              <div className="waitlist-field">
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={waitlistEmail}
                  onChange={(event) => setWaitlistEmail(event.target.value)}
                  aria-label="Email address"
                />
                <button className="solid" type="submit" disabled={waitlistLoading}>
                  {waitlistLoading ? 'Joining...' : 'Join the waitlist'}
                </button>
              </div>
              <p className="hero-note">
                One clear next step. Get a short email series with setup tips and
                early access.
              </p>
              {waitlistMessage ? (
                <p
                  className={`waitlist-status ${
                    waitlistStatus === 'error' ? 'error' : 'success'
                  }`}
                  role="status"
                >
                  {waitlistMessage}
                </p>
              ) : null}
              {waitlistStatus === 'success' ? (
                <div className="confetti" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
            </form>
            <div className="stat-row">
              <div>
                <strong>6 min</strong>
                <span>avg setup time</span>
              </div>
              <div>
                <strong>200+</strong>
                <span>bill templates</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>edit everything</span>
              </div>
            </div>
          </div>

          <div className="hero-panel" ref={builderRef}>
            {userEmail ? (
              <>
                <div className="panel-head">
                  <h2>Budget builder</h2>
                  <p>Answer a few questions and we build your first budget.</p>
                </div>
                <div className="panel-body">
                  <label>
                    Take-home per paycheck
                    <input
                      type="number"
                      value={incomePerPaycheck}
                      onChange={(event) =>
                        setIncomePerPaycheck(Number(event.target.value || 0))
                      }
                    />
                    <span className="helper">
                      Monthly total: {formatCurrency(monthlyIncome)}
                    </span>
                  </label>
                  <label>
                    Pay frequency
                    <select
                      value={payFrequency}
                      onChange={(event) => {
                        setPayFrequency(event.target.value)
                        showToast('Pay frequency updated.')
                      }}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label>
                    Primary goal
                    <select
                      value={primaryGoal}
                      onChange={(event) => {
                        setPrimaryGoal(event.target.value)
                        showToast(`Primary goal set to ${event.target.value}.`)
                      }}
                    >
                      <option value="stability">Stability</option>
                      <option value="debt">Pay off debt</option>
                      <option value="savings">Save more</option>
                      <option value="flex">More flexibility</option>
                    </select>
                  </label>
                  <div className="toggle-row">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={autoSuggest}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setAutoSuggest(checked)
                          if (checked && budgetCategories.length === 0) {
                            setBudgetCategories(categoriesSeed)
                          }
                          showToast(
                            checked
                          ? 'Bill suggestions enabled.'
                          : 'Bill suggestions off.'
                          )
                        }}
                      />
                  <span>Auto-suggest bills</span>
                    </label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={includePartner}
                        onChange={(event) => {
                          setIncludePartner(event.target.checked)
                          showToast(
                            event.target.checked
                              ? 'Partner income enabled.'
                              : 'Partner income removed.'
                          )
                        }}
                      />
                      <span>Include partner income</span>
                    </label>
                  </div>
                  {includePartner ? (
                    <label>
                      Partner monthly income
                      <input
                        type="number"
                        value={partnerIncome}
                        onChange={(event) =>
                          setPartnerIncome(Number(event.target.value || 0))
                        }
                      />
                    </label>
                  ) : null}
                </div>
                <div className="panel-footer">
                  <button
                    className="solid"
                    onClick={handleGenerateBudget}
                    type="button"
                  >
                    Generate my budget
                  </button>
                  {budgetGenerated ? (
                    <p className="panel-note success" role="status">
                      Budget ready. Open Budget Space to review.
                    </p>
                  ) : (
                    <p className="panel-note">You can edit everything later.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="panel-head">
                  <h2>Budget builder</h2>
                  <p>Log in to keep your numbers private.</p>
                </div>
                <div className="panel-footer builder-footer">
                  <button
                    className="solid builder-login"
                    onClick={() => setShowLogin(true)}
                    type="button"
                  >
                    Log in to start
                  </button>
                  <p className="panel-note">
                    Sign in to save budgets, sync across devices, and export anytime.
                  </p>
                  <div className="panel-actions">
                    <button
                      className="ghost small"
                      type="button"
                      onClick={() => {
                        setAuthMode('signup')
                        setShowLogin(true)
                      }}
                    >
                      Create account
                    </button>
                    <button
                      className="ghost small"
                      type="button"
                      onClick={() => {
                        setAuthMode('login')
                        setShowLogin(true)
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="panel-footnote">
                    <span>2 minute setup</span>
                    <span>Private by default</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        ) : null}
      </header>

      <main>
        {marketingView === 'home' ? (
          <section className="seo-hero">
            <div className="seo-hero-copy">
              <span className="eyebrow">AI finance app</span>
              <h2>Budgeting that actually sticks</h2>
              <p>
                Centsy is an AI finance app that helps you plan bills, track daily
                spending, and keep cash flow steady without the guilt. Built for
                real life, not spreadsheets.
              </p>
            </div>
            <div className="seo-hero-highlights">
              <div>
                <strong>Track every purchase</strong>
                <span>Snacks, coffee, groceries, you name it.</span>
              </div>
              <div>
                <strong>Know what is left</strong>
                <span>Daily spend rolls up into each bill.</span>
              </div>
              <div>
                <strong>Save your cents</strong>
                <span>We keep it cents-ly: small moves, big wins.</span>
              </div>
            </div>
            <div className="section-actions">
              <a
                className="solid"
                href={marketingUrlFor('features')}
                onClick={(event) => {
                  event.preventDefault()
                  handleMarketingNav('features')
                }}
              >
                Explore features
              </a>
              <a
                className="ghost"
                href={marketingUrlFor('dev-notes')}
                onClick={(event) => {
                  event.preventDefault()
                  handleMarketingNav('dev-notes')
                }}
              >
                Read dev notes
              </a>
            </div>
          </section>
        ) : null}
        {marketingView === 'features' ? (
          <section className="features">
            <div className="section-head">
              <div>
                <h2>Features that keep you on track</h2>
                <p>Everything you need to run a calm, consistent budget.</p>
              </div>
            </div>
            <div className="feature-grid">
              <article className="feature-card">
                <h3>Smart bill planning</h3>
                <p>Auto-suggested bills, recurring dates, and clear due reminders.</p>
              </article>
              <article className="feature-card">
                <h3>Daily spending log</h3>
                <p>Log every purchase and see it roll up into each bill instantly.</p>
              </article>
              <article className="feature-card">
                <h3>Cash flow clarity</h3>
                <p>Weekly views show where you are tight before the month begins.</p>
              </article>
              <article className="feature-card">
                <h3>Goals that move</h3>
                <p>Track savings, pay down debt, and see progress stay visible.</p>
              </article>
              <article className="feature-card">
                <h3>Automated nudges</h3>
                <p>Bill reminders keep you ahead without more work.</p>
              </article>
              <article className="feature-card">
                <h3>Team-ready budgets</h3>
                <p>Include partner income and keep the plan aligned together.</p>
              </article>
            </div>
            <div className="section-actions">
              <a
                className="ghost"
                href={marketingUrlFor('about')}
                onClick={(event) => {
                  event.preventDefault()
                  handleMarketingNav('about')
                }}
              >
                About Centsy
              </a>
            </div>
          </section>
        ) : null}
        {marketingView === 'about' ? (
          <section className="about">
            <div className="section-head">
              <div>
                <h2>About Centsy</h2>
                <p>
                  Centsy is built for people who want a clearer, calmer relationship
                  with money. We turn day-to-day spending into a simple rhythm so
                  your budget feels like a plan you can actually follow. It is all
                  about saving your cents, but more cents-ly.
                </p>
              </div>
            </div>
            <div className="about-grid">
              <div>
                <h3>Human-first budgeting</h3>
                <p>
                  Budgets should guide you, not shame you. Centsy keeps it calm,
                  clear, and flexible.
                </p>
              </div>
              <div>
                <h3>Built for real life</h3>
                <p>
                  Track bills and tiny spends with the same simple workflow, so
                  every purchase has a home.
                </p>
              </div>
              <div>
                <h3>Aligned with your goals</h3>
                <p>
                  From debt payoff to savings, every update shows how todays choices
                  move you forward.
                </p>
              </div>
            </div>
            <div className="team-section">
              <img
                src="/team-ethan.png"
                alt="Ethan Huynh, creator of Centsy"
              />
              <div>
                <h3>Team</h3>
                <p>
                  Centsy is a one-person team led by Ethan Huynh, a full-stack
                  developer who builds product, design, and infrastructure end to
                  end. His focus is creating a budgeting experience that feels
                  approachable, consistent, and useful every single day. He is
                  passionate about saving money and sharing that mindset so more
                  people can feel confident about where their dollars go.
                </p>
              </div>
            </div>
            <div className="about-actions">
              <a
                className="ghost"
                href={marketingUrlFor('dev-notes')}
                onClick={(event) => {
                  event.preventDefault()
                  handleMarketingNav('dev-notes')
                }}
              >
                Read dev notes
              </a>
            </div>
          </section>
        ) : null}
        {marketingView === 'dev-notes' ? (
          <section className="dev-notes">
            <div className="section-head">
              <div>
                <h2>Dev notes & updates</h2>
                <p>Short, honest updates from the team building Centsy.</p>
              </div>
            </div>
            <div className="dev-notes-grid">
              {devNotesSeed.map((note) => (
                <article className="dev-note-card" key={note.title}>
                  <span className="tag">{note.tag}</span>
                  <h3>{note.title}</h3>
                  <p>{note.summary}</p>
                  <small>{note.date}</small>
                </article>
              ))}
            </div>
            <div className="section-actions">
              <a
                className="ghost"
                href={marketingUrlFor('home')}
                onClick={(event) => {
                  event.preventDefault()
                  handleMarketingNav('home')
                }}
              >
                Back to home
              </a>
            </div>
          </section>
        ) : null}
        {marketingView === 'investors' ? (
          <section className="investor-deck">
            <div className="section-head">
              <div>
                <h2>Investor deck</h2>
                <p>Private preview deck for investors.</p>
              </div>
              <a className="ghost" href={marketingUrlFor('home')}>
                Back to home
              </a>
            </div>
            <div className="deck-grid">
              {Array.from({ length: 11 }).map((_, index) => {
                const slideNumber = String(index + 1).padStart(2, '0')
                return (
                  <a
                    className="deck-slide"
                    key={`investor-slide-${slideNumber}`}
                    href={`/investor-deck/slide-${slideNumber}.png`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={`/investor-deck/slide-${slideNumber}.png`}
                      alt={`Investor deck slide ${slideNumber}`}
                      loading="lazy"
                    />
                    <span>Slide {slideNumber}</span>
                  </a>
                )
              })}
            </div>
          </section>
        ) : null}
        {marketingView === 'terms' ? (
          <section className="legal-page">
            <div className="legal-head">
              <div className="section-head">
                <h2>Terms and Conditions</h2>
                <p>Effective date: {currentYear}</p>
              </div>
              <a className="ghost legal-download" href={termsPdfUrl} download>
                Download PDF
              </a>
            </div>
            <div className="legal-prose">
              <p>
                These Terms and Conditions ("Terms") govern your access to and use
                of Centsy (the "Service"). By using the Service, you agree to these
                Terms.
              </p>
              <h3>1. The Service</h3>
              <p>
                Centsy provides budgeting tools, AI-guided planning, bill
                reminders, spending logs, goal tracking, exports, and community
                discussions to help you manage personal finances.
              </p>
              <h3>2. Eligibility and accounts</h3>
              <ul>
                <li>You must be at least 13 years old to use the Service.</li>
                <li>
                  Provide accurate information and keep your account credentials
                  secure.
                </li>
                <li>
                  You are responsible for activity that occurs under your
                  account.
                </li>
              </ul>
              <h3>3. Community and user content</h3>
              <ul>
                <li>
                  You retain ownership of content you submit and grant Centsy a
                  license to host and display it.
                </li>
                <li>
                  Do not post sensitive personal data in public threads or
                  violate the rights of others.
                </li>
                <li>
                  We may remove content or restrict accounts that violate these
                  Terms.
                </li>
              </ul>
              <h3>4. Acceptable use</h3>
              <ul>
                <li>Do not misuse the Service or attempt to disrupt systems.</li>
                <li>Do not scrape, reverse engineer, or bypass security.</li>
                <li>Do not upload malware, spam, or illegal content.</li>
              </ul>
              <h3>5. AI guidance and no financial advice</h3>
              <p>
                Budget insights and AI guidance are informational only and are not
                financial, legal, or tax advice. You are responsible for your
                financial decisions and outcomes.
              </p>
              <h3>6. Communications</h3>
              <p>
                We send service emails such as verification and bill reminders you
                enable. You may opt out of non-essential communications.
              </p>
              <h3>7. Changes and termination</h3>
              <p>
                We may update the Service or these Terms from time to time. We may
                suspend or terminate access for violations or to protect the
                Service and users.
              </p>
              <h3>8. Contact</h3>
              <p>
                Questions? Email us at{' '}
                <a href="mailto:support@centsy.co">support@centsy.co</a>.
              </p>
            </div>
          </section>
        ) : null}
        {marketingView === 'privacy' ? (
          <section className="legal-page">
            <div className="legal-head">
              <div className="section-head">
                <h2>Privacy Policy</h2>
                <p>Effective date: {currentYear}</p>
              </div>
              <a className="ghost legal-download" href={privacyPdfUrl} download>
                Download PDF
              </a>
            </div>
            <div className="legal-prose">
              <p>
                This Privacy Policy explains how Centsy collects, uses, and
                shares information when you use the Service.
              </p>
              <h3>1. Information we collect</h3>
              <ul>
                <li>Account data such as email address and login identifiers.</li>
                <li>
                  Budget data including bills, categories, goals, spending logs,
                  and reminder settings.
                </li>
                <li>
                  Community content you submit, such as posts, comments, and
                  tags.
                </li>
                <li>
                  Usage and device data like IP address, browser type, and
                  interactions with the Service.
                </li>
              </ul>
              <h3>2. How we use information</h3>
              <ul>
                <li>Provide, personalize, and maintain the Service.</li>
                <li>Save and sync your budgets across devices.</li>
                <li>Send verification emails and reminders you enable.</li>
                <li>Improve features, analytics, and reliability.</li>
                <li>Detect abuse and keep the Service secure.</li>
              </ul>
              <h3>3. Sharing of information</h3>
              <ul>
                <li>
                  Service providers that help us host, store, analyze, email,
                  and power AI features.
                </li>
                <li>
                  Community content you post is visible to other users.
                </li>
                <li>
                  Legal or safety disclosures when required by law.
                </li>
              </ul>
              <h3>4. Retention</h3>
              <p>
                We retain information as long as needed to provide the Service
                and meet legal obligations. You can request deletion of your
                account data.
              </p>
              <h3>5. Security</h3>
              <p>
                We use reasonable safeguards to protect data, but no system is
                100% secure. Please protect your credentials.
              </p>
              <h3>6. Your choices</h3>
              <ul>
                <li>Access, export, or delete your data on request.</li>
                <li>Update your account information in settings.</li>
                <li>Control optional notifications in preferences.</li>
              </ul>
              <h3>7. Contact</h3>
              <p>
                Questions or requests? Email{' '}
                <a href="mailto:support@centsy.co">support@centsy.co</a>.
              </p>
            </div>
          </section>
        ) : null}
        {marketingView === 'app' && userEmail ? (
          <>
        {showSetupGuide ? (
          <section className="setup-banner">
            <div className="setup-header">
              <div>
                <span className="tag">First-time flow</span>
                <h2>Build your budget in a few guided steps.</h2>
                <p>
                  Start with pay details, confirm bills, then schedule dates and log
                  a first spend.
                </p>
              </div>
              <div className="setup-actions">
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => setOnboardingCollapsed(true)}
                >
                  Hide guide
                </button>
                <button
                  className="solid small"
                  type="button"
                  onClick={() => {
                    setActiveView('personalize')
                    scrollTo(personalizeRef)
                  }}
                >
                  Start setup
                </button>
              </div>
            </div>
            <div className="setup-grid">
              <button
                className="setup-step"
                type="button"
                onClick={() => {
                  setActiveView('personalize')
                  scrollTo(personalizeRef)
                }}
              >
                <strong>1. Set pay + goals</strong>
                <span>Update income, pay timing, and your goal focus.</span>
              </button>
              <button
                className="setup-step"
                type="button"
                onClick={() => {
                  setActiveView('workspace')
                  setShowCategoryForm(true)
                  scrollTo(workspaceRef)
                  showToast('Add your monthly bills.')
                }}
              >
                <strong>2. Confirm monthly bills</strong>
                <span>Add or edit bills so cash flow stays accurate.</span>
              </button>
              <button
                className="setup-step"
                type="button"
                onClick={() => {
                  setActiveView('planner')
                  setActivePanel('schedule')
                  scrollTo(plannerRef)
                  showToast('Schedule your bill dates.')
                }}
              >
                <strong>3. Schedule bill dates</strong>
                <span>Assign due dates so weekly cash flow is real.</span>
              </button>
              <button
                className="setup-step"
                type="button"
                onClick={() => {
                  setActiveView('spend')
                  showToast('Log your first spend.')
                }}
              >
                <strong>4. Log a first spend</strong>
                <span>Track a purchase to see live rollups.</span>
              </button>
            </div>
            <div className="setup-footer">
              <p className="muted">
                Prefer guidance? Copilot can add bills, goals, and spends for you.
              </p>
              <div className="setup-actions">
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => setActiveView('copilot')}
                >
                  Open Copilot
                </button>
                <button
                  className="solid small"
                  type="button"
                  onClick={handleGenerateBudget}
                >
                  Generate budget
                </button>
              </div>
            </div>
          </section>
        ) : null}
        <section className="view-switcher">
          <div className="tab-row">
            <button
              className={activeView === 'workspace' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('workspace')}
            >
              Budget
            </button>
            <button
              className={activeView === 'cashflow' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('cashflow')}
            >
              Cash flow
            </button>
            <button
              className={activeView === 'spend' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('spend')}
            >
              Spending
            </button>
            <button
              className={activeView === 'planner' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('planner')}
            >
              Planner
            </button>
            <button
              className={activeView === 'insights' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('insights')}
            >
              AI Insights
            </button>
            <button
              className={activeView === 'copilot' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('copilot')}
            >
              Copilot
            </button>
            <button
              className={activeView === 'concierge' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('concierge')}
            >
              Savings
            </button>
            <button className="tab" onClick={() => window.location.assign(communityUrl)}>
              Community
            </button>
            <button
              className={activeView === 'personalize' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('personalize')}
            >
              Preferences
            </button>
          </div>
          {showSetupGuide ? (
            <p className="muted">
              Follow the setup guide above, then use tabs to focus on one area.
            </p>
          ) : !budgetGenerated ? (
            <div className="setup-inline">
              <span className="tag">Setup</span>
              <span>Need the quick-start guide?</span>
              <button
                className="ghost small"
                type="button"
                onClick={() => setOnboardingCollapsed(false)}
              >
                Show guide
              </button>
            </div>
          ) : (
            <p className="muted">Use tabs to focus on one area at a time.</p>
          )}
        </section>
        {showLegacySteps ? (
          <section className="how-section">
            <div className="section-head">
              <div>
                <h2>Make a budget in 4 simple steps</h2>
                <p>We guide you first. After that, you can edit everything.</p>
              </div>
            </div>
            <div className="step-grid">
              <article>
                <h3>1. Add income</h3>
                <p>Start with your take-home pay.</p>
              </article>
              <article>
                <h3>2. Pick bill templates</h3>
                <p>Use ready-made bills or add your own.</p>
              </article>
              <article>
                <h3>3. Plan monthly bills</h3>
                <p>Add due dates to see weekly cash flow.</p>
              </article>
              <article>
                <h3>4. Track gently</h3>
                <p>Track spending and adjust as you go.</p>
              </article>
            </div>
          </section>
        ) : null}

        {activeView === 'workspace' ? (
          <section className="workspace" ref={workspaceRef}>
          <div className="section-head">
            <div>
              <h2>Your budget workspace</h2>
              <p>See your money, edit bills, and track goals in one place.</p>
            </div>
            <button
              className="ghost"
              onClick={() => {
                setShowCategoryForm(true)
                scrollTo(workspaceRef)
                showToast('Monthly bills editor opened.')
              }}
            >
              Customize monthly bills
            </button>
          </div>

          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-title">
                <span>Monthly income</span>
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => setShowIncomeEditor((prev) => !prev)}
                >
                  {showIncomeEditor ? 'Done' : 'Edit'}
                </button>
              </div>
              <strong>{formatCurrency(monthlyIncome)}</strong>
              <small>
                {payFrequencyLabel} pay x{multiplier}
              </small>
              {showIncomeEditor ? (
                <div className="summary-editor">
                  <label>
                    Take-home per paycheck
                    <input
                      type="number"
                      value={incomePerPaycheck}
                      onChange={(event) =>
                        setIncomePerPaycheck(Number(event.target.value || 0))
                      }
                    />
                  </label>
                  <label>
                    Pay frequency
                    <select
                      value={payFrequency}
                      onChange={(event) => setPayFrequency(event.target.value)}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label className="toggle summary-toggle">
                    <input
                      type="checkbox"
                      checked={includePartner}
                      onChange={(event) => setIncludePartner(event.target.checked)}
                    />
                    <span>Include partner income</span>
                  </label>
                  {includePartner ? (
                    <label>
                      Partner monthly income
                      <input
                        type="number"
                        value={partnerIncome}
                        onChange={(event) =>
                          setPartnerIncome(Number(event.target.value || 0))
                        }
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="summary-card bank-card">
              <div className="summary-title">
                <span>Bank balance</span>
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => setShowBankBalanceEditor((prev) => !prev)}
                >
                  {showBankBalanceEditor ? 'Done' : 'Edit'}
                </button>
              </div>
              <strong>{formatCurrency(bankBalance)}</strong>
              <small>Cash on hand</small>
              {showBankBalanceEditor ? (
                <div className="summary-editor bank-editor">
                  <label>
                    Current balance
                    <input
                      type="number"
                      value={bankBalance}
                      onChange={(event) =>
                        setBankBalance(Number(event.target.value || 0))
                      }
                    />
                  </label>
                </div>
              ) : null}
              <div className="bank-metrics">
                <span
                  className={`bank-metric ${
                    bankBalanceAfterBills < 0 ? 'negative' : ''
                  }`}
                >
                  <span>After monthly bills</span>
                  <strong>{formatCurrency(bankBalanceAfterBills)}</strong>
                </span>
                <span className="bank-metric">
                  <span>Bills covered</span>
                  <strong>{bankCoverageLabel}</strong>
                </span>
              </div>
            </div>
            <div className="summary-card">
              <span>Planned monthly bills</span>
              <strong>{formatCurrency(plannedBillsDisplayTotal)}</strong>
              <small>{plannedBillsDisplayCount} upcoming bills</small>
            </div>
            <div className="summary-card">
              <span>Savings + debt</span>
              <strong>{formatCurrency(savingsDebtTotal)}</strong>
              <small>Targets from monthly bills</small>
            </div>
            <div
              className={`summary-card highlight ${leftToBudget < 0 ? 'negative' : ''}`}
            >
              <span>Left to budget</span>
              <strong>{formatCurrency(leftToBudget)}</strong>
              <small>
                {leftToBudget < 0
                  ? 'Over budget this month'
                  : 'Assign to bills'}
              </small>
            </div>
          </div>

          <div className="budget-grid">
            <div className="budget-card cashflow-card">
              <div className="card-head">
                <h3>Monthly Bills</h3>
                <button
                  className="ghost small"
                  onClick={() => setShowCategoryForm(true)}
                >
                  Add bill
                </button>
              </div>
              <div className="category-range">
                <label>
                  Min $
                  <input
                    type="number"
                    min="0"
                    value={categoryRange.min}
                    onChange={(event) => {
                      const nextMin = Math.max(0, Number(event.target.value || 0))
                      setCategoryRange((prev) => ({
                        min: nextMin,
                        max: nextMin >= prev.max ? nextMin + 100 : prev.max,
                      }))
                    }}
                  />
                </label>
                <label>
                  Max $
                  <input
                    type="number"
                    min={categoryRange.min + 1}
                    value={categoryRange.max}
                    onChange={(event) => {
                      const nextMax = Number(event.target.value || 0)
                      setCategoryRange((prev) => ({
                        min: nextMax <= prev.min ? Math.max(0, nextMax - 100) : prev.min,
                        max: Math.max(prev.min + 1, nextMax),
                      }))
                    }}
                  />
                </label>
              </div>
              {showCategoryForm ? (
                <div className="inline-form">
                  <input
                    type="text"
                    placeholder="Bill name"
                    value={newCategory.name}
                    onChange={(event) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    placeholder="Planned $"
                    value={newCategory.planned}
                    onChange={(event) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        planned: event.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    placeholder="Actual $"
                    value={newCategory.actual}
                    onChange={(event) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        actual: event.target.value,
                      }))
                    }
                  />
                  <div className="inline-actions">
                    <button className="solid small" onClick={handleAddCategory}>
                      Save
                    </button>
                    <button
                      className="ghost small"
                      onClick={() => setShowCategoryForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="category-header">
                <span>Monthly bill</span>
                <span>Planned</span>
                <span>Status</span>
              </div>
              <div className="category-table">
                {budgetCategories.map((category) => {
                  const status = statusFor(category.planned, category.actual)
                  const isEditing = editingCategory === category.name
                  return (
                    <div className={`category-row ${status}`} key={category.name}>
                      <div>
                        <p>{category.name}</p>
                        <span>Planned {formatCurrency(category.planned)}</span>
                        <span className="actual-value">
                          Actual {formatCurrency(category.actual)}
                        </span>
                        <span className={`status-badge ${status}`}>{status}</span>
                      </div>
                      {isEditing ? (
                        <div className="edit-fields">
                          <input
                            type="number"
                            value={editCategoryValues.planned}
                            onChange={(event) =>
                              setEditCategoryValues((prev) => ({
                                ...prev,
                                planned: event.target.value,
                              }))
                            }
                          />
                          <input
                            type="number"
                            value={editCategoryValues.actual}
                            onChange={(event) =>
                              setEditCategoryValues((prev) => ({
                                ...prev,
                                actual: event.target.value,
                              }))
                            }
                          />
                          {(() => {
                            const billIndex = budgetBills.findIndex(
                              (bill) =>
                                bill.name.toLowerCase() === category.name.toLowerCase()
                            )
                            const scheduledBill =
                              billIndex >= 0 ? budgetBills[billIndex] : null
                            const scheduledDate = scheduledBill?.date ?? ''
                            const recurringDay = scheduledBill?.recurringDay ?? null
                            const inferredDay =
                              recurringDay ?? extractDayFromLabel(scheduledDate) ?? 1
                            const isRecurring = recurringDay !== null
                            return (
                              <div className="recurring-fields">
                                <label className="toggle">
                                  <input
                                    type="checkbox"
                                    checked={isRecurring}
                                    onChange={(event) =>
                                      handleScheduleBill(
                                        category.name,
                                        scheduledDate,
                                        category.planned,
                                        event.target.checked ? inferredDay : null
                                      )
                                    }
                                  />
                                  <span>Repeats monthly</span>
                                </label>
                                {isRecurring ? (
                                  <label className="input-row">
                                    Day of month
                                    <input
                                      type="number"
                                      min="1"
                                      max="31"
                                      value={inferredDay}
                                      onChange={(event) =>
                                        handleScheduleBill(
                                          category.name,
                                          scheduledDate,
                                          category.planned,
                                          Number(event.target.value || 1)
                                        )
                                      }
                                    />
                                  </label>
                                ) : (
                                  <input
                                    type="date"
                                    value={formatDateForInput(scheduledDate)}
                                    onChange={(event) =>
                                      handleScheduleBill(
                                        category.name,
                                        event.target.value,
                                        category.planned,
                                        null
                                      )
                                    }
                                  />
                                )}
                              </div>
                            )
                          })()}
                          <div className="inline-actions">
                            <button
                              className="solid small"
                              onClick={() => handleSaveCategory(category.name)}
                            >
                              Save
                            </button>
                            <button
                              className="danger small"
                              onClick={() => handleDeleteCategory(category.name)}
                            >
                              Delete
                            </button>
                            <button
                              className="ghost small"
                              onClick={() => setEditingCategory(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <strong>{formatCurrency(category.planned)}</strong>
                          <button
                            className="ghost small"
                            onClick={() => handleEditCategory(category.name)}
                          >
                            Edit
                          </button>
                        </>
                      )}
                      <div className="category-sliders">
                        <label>
                          Planned
                          <input
                            type="range"
                            min={categoryRange.min}
                            max={categoryRange.max}
                            step="5"
                            value={category.planned}
                            onChange={(event) =>
                              updateCategoryValue(
                                category.name,
                                'planned',
                                Number(event.target.value || 0)
                              )
                            }
                          />
                        </label>
                        <label>
                          Actual
                          <input
                            type="range"
                            min={categoryRange.min}
                            max={categoryRange.max}
                            step="5"
                            value={category.actual}
                            onChange={(event) =>
                              updateCategoryValue(
                                category.name,
                                'actual',
                                Number(event.target.value || 0)
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="budget-card">
              <div className="card-head">
                <h3>Cash flow</h3>
                <span className="tag">Next 4 weeks</span>
              </div>
              <div className="cashflow">
                {weeklyAmounts.map((amount, index) => (
                  <div className="flow-row" key={`week-${index}`}>
                    <span>Week {index + 1}</span>
                    <div className="flow-bar">
                      <span
                        style={{
                          width: `${Math.max((amount / maxWeekly) * 100, 8)}%`,
                        }}
                      />
                    </div>
                    <strong>{formatCurrency(amount)}</strong>
                  </div>
                ))}
              </div>
              {cashflowTrendBox}
              <div className="hint">
                <p>Tip: move a bill or paycheck to smooth the dips.</p>
                <button
                  className="ghost small"
                  onClick={() => {
                    scrollTo(plannerRef)
                    showToast('Schedule editor opened.')
                    setActivePanel((prev) =>
                      prev === 'schedule' ? null : 'schedule'
                    )
                  }}
                >
                  Adjust bill schedule
                </button>
              </div>
            </div>
            <div className="budget-card editor-card">
              <div className="card-head">
                <h3>Goals</h3>
                <span className="tag">Edit in budget</span>
              </div>
              <div className="goal-header">
                <span>Goal</span>
                <span>Saved</span>
                <span>Status</span>
              </div>
              <div className="budget-goal-table">
                {budgetGoals.map((goal) => {
                  const status = goalStatus(goal.amount, goal.target)
                  const isEditing = editingGoal === goal.name
                  return (
                    <div className={`budget-goal-row ${status}`} key={goal.name}>
                      <div>
                        <p>{goal.name}</p>
                        <span>Target {formatCurrency(goal.target)}</span>
                        <span className={`status-badge ${status}`}>
                          {goalPace(goal.amount, goal.target)}
                        </span>
                      </div>
                      {isEditing ? (
                        <div className="edit-fields goal-edit-fields">
                          <input
                            type="text"
                            value={editGoalValues.name}
                            onChange={(event) =>
                              setEditGoalValues((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                          />
                          <input
                            type="number"
                            value={editGoalValues.amount}
                            onChange={(event) =>
                              setEditGoalValues((prev) => ({
                                ...prev,
                                amount: event.target.value,
                              }))
                            }
                          />
                          <input
                            type="number"
                            value={editGoalValues.target}
                            onChange={(event) =>
                              setEditGoalValues((prev) => ({
                                ...prev,
                                target: event.target.value,
                              }))
                            }
                          />
                          <div className="inline-actions">
                            <button
                              className="solid small"
                              onClick={() => handleSaveGoal(goal.name)}
                            >
                              Save
                            </button>
                            <button
                              className="danger small"
                              onClick={() => handleDeleteGoal(goal.name)}
                            >
                              Delete
                            </button>
                            <button
                              className="ghost small"
                              onClick={() => setEditingGoal(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <strong>{formatCurrency(goal.amount)}</strong>
                          <button
                            className="ghost small"
                            onClick={() => handleEditGoal(goal.name)}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="inline-form compact">
                <input
                  type="text"
                  placeholder="Goal name"
                  value={newGoal.name}
                  onChange={(event) =>
                    setNewGoal((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
                <input
                  type="number"
                  placeholder="Target $"
                  value={newGoal.target}
                  onChange={(event) =>
                    setNewGoal((prev) => ({
                      ...prev,
                      target: event.target.value,
                    }))
                  }
                />
                <div className="inline-actions">
                  <button className="solid small" onClick={handleAddGoal}>
                    Add goal
                  </button>
                </div>
              </div>
            </div>
          </div>
          <section className="cashflow-carousel-strip">
            <div className="card-head">
              <h3>Cash flow highlights</h3>
              <span className="tag">Use arrows</span>
            </div>
            {cashflowCarousel}
          </section>
          </section>
        ) : null}

        {activeView === 'spend' ? (
          <section className="spend-view">
          <div className="section-head">
            <div>
              <h2>Spending tracker</h2>
              <p>Log each purchase and see how it rolls up into your bills.</p>
            </div>
            <button
              className="ghost"
              onClick={() => {
                setActivePanel('schedule')
                showToast('Review your bill schedule.')
              }}
            >
              Review bill schedule
            </button>
          </div>
          <div className="summary-grid">
            <div className="summary-card">
              <span>Planned spending</span>
              <strong>{formatCurrency(totalPlannedSpend)}</strong>
              <small>{spendCategoryRows.length} tracked bills</small>
            </div>
            <div className="summary-card">
              <span>Logged spending</span>
              <strong>{formatCurrency(spendEntriesTotal)}</strong>
              <small>{spendEntries.length} entries</small>
            </div>
            <div className="summary-card">
              <span>Remaining</span>
              <strong>{formatCurrency(remainingSpend)}</strong>
              <small>Left before plan</small>
            </div>
            <div
              className={`summary-card highlight ${spendVariance > 0 ? 'negative' : ''}`}
            >
              <span>Variance</span>
              <strong>{formatCurrency(spendVariance)}</strong>
              <small>{spendVariance > 0 ? 'Over plan' : 'Under plan'}</small>
            </div>
          </div>
          <div className="spend-grid">
            <div className="spend-card">
              <div className="card-head">
                <h3>Log a purchase</h3>
                <span className="tag">Daily spend</span>
              </div>
              <div className="spend-form">
                <label>
                  Merchant or item
                  <input
                    type="text"
                    placeholder="Snacks, coffee, fuel"
                    value={newSpend.merchant}
                    onChange={(event) =>
                      setNewSpend((prev) => ({ ...prev, merchant: event.target.value }))
                    }
                  />
                </label>
                <div className="spend-form-row">
                  <label>
                    Amount
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newSpend.amount}
                      onChange={(event) =>
                        setNewSpend((prev) => ({ ...prev, amount: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Date
                    <input
                      type="date"
                      value={newSpend.date}
                      onChange={(event) =>
                        setNewSpend((prev) => ({ ...prev, date: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Bill
                    <select
                      value={newSpend.category}
                      onChange={(event) =>
                        setNewSpend((prev) => ({ ...prev, category: event.target.value }))
                      }
                    >
                      {budgetCategories.length ? (
                        budgetCategories.map((category) => (
                          <option key={`spend-${category.name}`} value={category.name}>
                            {category.name}
                          </option>
                        ))
                      ) : (
                        <option value="">Add a bill first</option>
                      )}
                    </select>
                  </label>
                </div>
                <label>
                  Note (optional)
                  <input
                    type="text"
                    placeholder="Late-night snack run"
                    value={newSpend.note}
                    onChange={(event) =>
                      setNewSpend((prev) => ({ ...prev, note: event.target.value }))
                    }
                  />
                </label>
                <div className="spend-toggle">
                  <button
                    className={newSpend.direction === 'expense' ? 'solid small' : 'ghost small'}
                    type="button"
                    onClick={() =>
                      setNewSpend((prev) => ({ ...prev, direction: 'expense' }))
                    }
                  >
                    Expense
                  </button>
                  <button
                    className={newSpend.direction === 'refund' ? 'solid small' : 'ghost small'}
                    type="button"
                    onClick={() =>
                      setNewSpend((prev) => ({ ...prev, direction: 'refund' }))
                    }
                  >
                    Refund
                  </button>
                </div>
                <button className="solid" onClick={handleAddSpendEntry}>
                  Add spend
                </button>
              </div>
              <div className="spend-log">
                <div className="card-head">
                  <h4>Recent spends</h4>
                  <span className="tag">Editable</span>
                </div>
                {editingSpendId ? (
                  <div className="spend-edit-panel">
                    <div className="card-head">
                      <h4>Edit spend</h4>
                      <span className="tag">Selected</span>
                    </div>
                    <div className="spend-form spend-edit">
                      <label>
                        Merchant
                        <input
                          type="text"
                          value={editSpendValues.merchant}
                          onChange={(event) =>
                            setEditSpendValues((prev) => ({
                              ...prev,
                              merchant: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="spend-form-row">
                        <label>
                          Amount
                          <input
                            type="number"
                            value={editSpendValues.amount}
                            onChange={(event) =>
                              setEditSpendValues((prev) => ({
                                ...prev,
                                amount: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Date
                          <input
                            type="date"
                            value={editSpendValues.date}
                            onChange={(event) =>
                              setEditSpendValues((prev) => ({
                                ...prev,
                                date: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Bill
                          <select
                            value={editSpendValues.category}
                            onChange={(event) =>
                              setEditSpendValues((prev) => ({
                                ...prev,
                                category: event.target.value,
                              }))
                            }
                          >
                            {budgetCategories.length ? (
                              budgetCategories.map((category) => (
                                <option
                                  key={`spend-edit-${category.name}`}
                                  value={category.name}
                                >
                                  {category.name}
                                </option>
                              ))
                            ) : (
                              <option value="">Add a bill first</option>
                            )}
                          </select>
                        </label>
                      </div>
                      <label>
                        Note (optional)
                        <input
                          type="text"
                          value={editSpendValues.note}
                          onChange={(event) =>
                            setEditSpendValues((prev) => ({
                              ...prev,
                              note: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="spend-toggle">
                        <button
                          className={
                            editSpendValues.direction === 'expense'
                              ? 'solid small'
                              : 'ghost small'
                          }
                          type="button"
                          onClick={() =>
                            setEditSpendValues((prev) => ({
                              ...prev,
                              direction: 'expense',
                            }))
                          }
                        >
                          Expense
                        </button>
                        <button
                          className={
                            editSpendValues.direction === 'refund'
                              ? 'solid small'
                              : 'ghost small'
                          }
                          type="button"
                          onClick={() =>
                            setEditSpendValues((prev) => ({
                              ...prev,
                              direction: 'refund',
                            }))
                          }
                        >
                          Refund
                        </button>
                      </div>
                      <div className="spend-edit-actions">
                        <button
                          className="solid small"
                          type="button"
                          onClick={() => handleSaveSpendEntry(editingSpendId)}
                        >
                          Save
                        </button>
                        <button
                          className="ghost small"
                          type="button"
                          onClick={handleCancelSpendEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {spendEntriesSorted.length ? (
                  <ul className="spend-log-list">
                    {spendEntriesSorted.map((entry) => (
                      <li className="spend-log-row" key={entry.id}>
                        <div className="spend-log-main">
                          <strong>{entry.merchant}</strong>
                            <span>
                              {entry.category} &#8250; {formatShortDate(entry.date)}
                            </span>
                          {entry.note ? <em>{entry.note}</em> : null}
                        </div>
                        <div
                          className={`spend-log-amount ${
                            entry.amount < 0 ? 'negative' : ''
                          }`}
                        >
                          {formatCurrency(entry.amount)}
                        </div>
                        <div className="spend-log-actions">
                          <div className="spend-steps">
                            {spendStepOptions.map((step) => (
                              <button
                                className="ghost small"
                                key={`${entry.id}-${step}`}
                                type="button"
                                onClick={() => handleAdjustSpendEntry(entry.id, step)}
                              >
                                {step > 0 ? `+${formatCurrency(step)}` : formatCurrency(step)}
                              </button>
                            ))}
                          </div>
                          <button
                            className="solid small"
                            type="button"
                            onClick={() => handleEditSpendEntry(entry.id)}
                          >
                            Edit
                          </button>
                          <button
                            className="danger small"
                            type="button"
                            onClick={() => handleDeleteSpendEntry(entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    No spends logged yet. Add your first snack run or coffee.
                  </p>
                )}
              </div>
            </div>
            <div className="spend-card">
              <div className="card-head">
                <h3>Bill rollup</h3>
                <span className="tag">Budget view</span>
              </div>
              <div className="spend-rollup">
                {spendCategoryRows.map((row) => (
                  <div className={`spend-rollup-row ${row.status}`} key={row.name}>
                    <div>
                      <strong>{row.name}</strong>
                      <span>
                        Planned {formatCurrency(row.planned)} • Logged{' '}
                        {formatCurrency(row.logged)}
                      </span>
                    </div>
                    <div
                      className={`spend-rollup-remaining ${
                        row.remaining < 0 ? 'negative' : ''
                      }`}
                    >
                      {formatCurrency(row.remaining)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </section>
        ) : null}

        {activeView === 'cashflow' ? (
          <section className="cashflow-view">
          <div className="section-head">
            <div>
              <h2>Cash flow view</h2>
              <p>See which weeks are tight and adjust before the month starts.</p>
            </div>
            <button
              className="ghost"
              onClick={() => {
                scrollTo(plannerRef)
                setActivePanel('schedule')
                showToast('Adjust bill timing to smooth cash flow.')
              }}
            >
              Adjust bill timing
            </button>
          </div>
          <div className="summary-grid">
            <div className="summary-card">
              <span>Monthly income</span>
              <strong>{formatCurrency(monthlyIncome)}</strong>
              <small>
                {payFrequencyLabel} pay x{multiplier}
              </small>
            </div>
            <div className="summary-card">
              <span>Planned monthly bills</span>
              <strong>{formatCurrency(plannedBillsDisplayTotal)}</strong>
              <small>{plannedBillsDisplayCount} upcoming bills</small>
            </div>
            <div className="summary-card">
              <span>Scheduled bills</span>
              <strong>{formatCurrency(plannedBillsTotal)}</strong>
              <small>{budgetBills.length} scheduled</small>
            </div>
            <div
              className={`summary-card highlight ${leftToBudget < 0 ? 'negative' : ''}`}
            >
              <span>Left to budget</span>
              <strong>{formatCurrency(leftToBudget)}</strong>
              <small>
                {leftToBudget < 0
                  ? 'Over budget this month'
                  : 'Assignable to bills'}
              </small>
            </div>
          </div>
          <div className="cashflow-grid">
            <div className="cashflow-panel">
              <div className="card-head">
                <h3>Weekly cash flow</h3>
                <span className="tag">Next 4 weeks</span>
              </div>
              <div className="cashflow">
                {weeklyAmounts.map((amount, index) => (
                  <div className="flow-row" key={`cashflow-week-${index}`}>
                    <span>Week {index + 1}</span>
                    <div className={`flow-bar ${amount < 0 ? 'negative' : ''}`}>
                      <span
                        style={{
                          width: `${Math.max((Math.abs(amount) / maxWeekly) * 100, 8)}%`,
                        }}
                      />
                    </div>
                    <strong>{formatCurrency(amount)}</strong>
                  </div>
                ))}
              </div>
              {cashflowTrendBox}
              <div className="cashflow-controls">
                <label>
                  Shift bill schedule
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={scheduleBias}
                    onChange={(event) =>
                      setScheduleBias(Number(event.target.value || 0))
                    }
                  />
                </label>
                <div className="range-labels">
                  <span>Even</span>
                  <span>Front</span>
                  <span>Mid</span>
                  <span>End</span>
                </div>
              </div>
            </div>
            <div className="cashflow-panel">
              <div className="card-head">
                <h3>Cash flow health</h3>
                <span className="tag">At a glance</span>
              </div>
              <div className="health-list">
                <div className="health-row">
                  <span>Average weekly cash</span>
                  <strong>{formatCurrency(averageWeekly)}</strong>
                </div>
                <div className="health-row">
                  <span>Lowest week</span>
                  <strong>{formatCurrency(Math.min(...weeklyAmounts))}</strong>
                </div>
                <div className="health-row">
                  <span>Tight weeks</span>
                  <strong>{stressWeeks.length}</strong>
                </div>
              </div>
              <div className="stress-note">
                {stressWeeks.length ? (
                  <p>
                    Tight in {stressWeeks.map((week) => week.label).join(', ')}.
                    Consider shifting scheduled bills or trimming one bill.
                  </p>
                ) : (
                  <p>You have a smooth month with no cash flow dips flagged.</p>
                )}
              </div>
              <button
                className="solid small"
                onClick={() => {
                  setActivePanel('schedule')
                  scrollTo(plannerRef)
                  showToast('Schedule editor opened.')
                }}
              >
                Smooth this month
              </button>
            </div>
          </div>
          <section className="cashflow-carousel-strip">
            <div className="card-head">
              <h3>Cash flow highlights</h3>
              <span className="tag">Use arrows</span>
            </div>
            {cashflowCarousel}
          </section>
          <div className="cashflow-help">
            <div className="card-head">
              <h3>How to read this view</h3>
              <span className="tag">Cash flow basics</span>
            </div>
            <div className="help-grid">
              <div>
                <h4>Weekly cash flow</h4>
                <p>
                  Each bar shows how much money is left that week. Taller bars
                  mean more room. Shorter bars mean tighter weeks.
                </p>
              </div>
              <div>
                <h4>Shift bill schedule</h4>
                <p>
                  This slider moves bills earlier or later in the month. "Even"
                  spreads cash out. "Front" or "End" shifts it to one side.
                </p>
              </div>
              <div>
                <h4>Cash flow health</h4>
                <p>
                  Average weekly cash is your usual weekly balance. Lowest week is
                  your tightest week. Tight weeks show when you dip low.
                </p>
              </div>
              <div>
                <h4>Smooth this month</h4>
                <p>
                  Jump to the schedule editor to move bill dates and smooth dips.
                </p>
              </div>
            </div>
          </div>
          </section>
        ) : null}

        {activeView === 'planner' ? (
          <section className="planner" ref={plannerRef}>
          <div className="section-head">
            <div>
              <h2>Plan bills, goals, and extras</h2>
              <p>Set dates and keep goals on track.</p>
            </div>
          </div>
          <div className="planner-grid">
            <div className="planner-card">
              <h3>Upcoming bills</h3>
              <ul>
                {scheduledBills.map((bill) => (
                  <li key={bill.name}>
                    <span>{bill.name}</span>
                    <strong>{formatCurrency(bill.amount)}</strong>
                    <em>{formatBillDateLabel(bill)}</em>
                  </li>
                ))}
              </ul>
            </div>
            <div className="planner-card">
              <h3>Goals at a glance</h3>
              <div className="goal-list">
                {budgetGoals.map((goal) => (
                  <div className="goal-row" key={goal.name}>
                    <div>
                      <p>{goal.name}</p>
                      <span>
                        {formatCurrency(goal.amount)} of {formatCurrency(goal.target)}
                      </span>
                    </div>
                    <strong>{goalPace(goal.amount, goal.target)}</strong>
                  </div>
                ))}
              </div>
              {showGoalForm ? (
                <div className="inline-form compact">
                  <input
                    type="text"
                    placeholder="Goal name"
                    value={newGoal.name}
                    onChange={(event) =>
                      setNewGoal((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    placeholder="Target $"
                    value={newGoal.target}
                    onChange={(event) =>
                      setNewGoal((prev) => ({
                        ...prev,
                        target: event.target.value,
                      }))
                    }
                  />
                  <div className="inline-actions">
                    <button className="solid small" onClick={handleAddGoal}>
                      Save goal
                    </button>
                    <button
                      className="ghost small"
                      onClick={() => setShowGoalForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="ghost small"
                  onClick={() => setShowGoalForm(true)}
                >
                  Add a goal
                </button>
              )}
            </div>
            <div className="planner-card">
              <h3>Quick add</h3>
              <div className="chip-grid">
                <button onClick={() => handleQuickAdd('Utilities')}>Utilities</button>
                <button onClick={() => handleQuickAdd('Subscriptions')}>
                  Subscriptions
                </button>
                <button onClick={() => handleQuickAdd('Kids')}>Kids</button>
                <button onClick={() => handleQuickAdd('Health')}>Health</button>
                <button onClick={() => handleQuickAdd('Pets')}>Pets</button>
                <button onClick={() => handleQuickAdd('Gifts')}>Gifts</button>
              </div>
              <p className="muted">
                Tap once to add a bill with basic defaults.
              </p>
            </div>
          </div>
          </section>
        ) : null}

        {activeView === 'insights' ? (
          <section className="ai-insights">
          <div className="section-head">
            <div>
              <h2>AI Insights</h2>
              <p>Bill-by-bill allocations, risk score, and paycheck guidance.</p>
            </div>
            <span className="tag">Live</span>
          </div>
          <div className="ai-grid">
            <div className="ai-card">
              <div className="card-head">
                <h3>Risk score</h3>
                <span className={`risk-pill ${riskScore < 60 ? 'high' : ''}`}>
                  {riskLabel}
                </span>
              </div>
              <div className="risk-score">
                <strong>{riskScore}</strong>
                <span>/ 100</span>
              </div>
              <p className="risk-explain">
                Starts at 100, then subtracts for bills above income, over-budget
                plan, bank balance short of bills, low bill coverage (under 1 month,
                extra penalty under 0.5), and overspending vs plan.
              </p>
              <div className="risk-stats">
                <span>
                  <strong>{formatCurrency(bankBalance)}</strong>
                  <small>Bank balance</small>
                </span>
                <span>
                  <strong>{formatCurrency(plannedBillsDisplayTotal)}</strong>
                  <small>Monthly bills</small>
                </span>
                <span>
                  <strong>{bankCoverageLabel}</strong>
                  <small>Bills covered</small>
                </span>
                <span>
                  <strong>{formatCurrency(leftToBudget)}</strong>
                  <small>Left to budget</small>
                </span>
              </div>
            </div>
            <div className="ai-card">
              <div className="card-head">
                <h3>Paycheck guidance</h3>
                <span className="tag">Actionable</span>
              </div>
              <div className="ai-guidance">
                {aiGuidance.map((item, index) => (
                  <p key={`ai-guidance-${index}`}>{item}</p>
                ))}
              </div>
              <div className="ai-metrics">
                <span>
                  <strong>{formatCurrency(nextPaycheckTotal)}</strong>
                  <small>Next paycheck</small>
                </span>
                <span>
                  <strong>{nextPayDateDisplay}</strong>
                  <small>Next pay date</small>
                </span>
                <span>
                  <strong>{formatCurrency(billsPerPaycheck)}</strong>
                  <small>Set aside for bills</small>
                </span>
                <span>
                  <strong>{formatCurrency(nextPaycheckAfterBills)}</strong>
                  <small>After bills</small>
                </span>
                <span>
                  <strong>{formatCurrency(weeklyFlexTarget)}</strong>
                  <small>Weekly flex</small>
                </span>
              </div>
            </div>
            <div className="ai-card">
              <div className="card-head">
                <h3>Bill-by-bill allocation</h3>
                <div className="allocation-controls">
                  <span className="tag">Next paycheck</span>
                  <div className="allocation-toggle">
                    <button
                      className={allocationSortMode === 'due' ? 'solid small' : 'ghost small'}
                      type="button"
                      onClick={() => setAllocationSortMode('due')}
                    >
                      Due date
                    </button>
                    <button
                      className={allocationSortMode === 'custom' ? 'solid small' : 'ghost small'}
                      type="button"
                      onClick={() => setAllocationSortMode('custom')}
                    >
                      Custom
                    </button>
                  </div>
                </div>
              </div>
              <div className="allocation-table">
                <div className="allocation-row header">
                  <span>Bill</span>
                  <span>Due</span>
                  <span>Planned</span>
                  <span>Allocation</span>
                  <span>Order</span>
                </div>
                {orderedAllocations.length ? (
                  orderedAllocations.map((bill, index) => (
                    <div className="allocation-row" key={`alloc-${bill.id}`}>
                      <span>{bill.name || 'Untitled bill'}</span>
                      <span>{bill.dueLabel || 'Unscheduled'}</span>
                      <span>{formatCurrency(bill.amount)}</span>
                      <span>{formatCurrency(bill.allocation)}</span>
                      <div className="allocation-actions">
                        <button
                          className="ghost small"
                          type="button"
                          onClick={() => moveAllocation(bill.id, 'up')}
                          disabled={allocationSortMode !== 'custom' || index === 0}
                        >
                          Up
                        </button>
                        <button
                          className="ghost small"
                          type="button"
                          onClick={() => moveAllocation(bill.id, 'down')}
                          disabled={
                            allocationSortMode !== 'custom' ||
                            index === orderedAllocations.length - 1
                          }
                        >
                          Down
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Add bills to see allocations.</p>
                )}
              </div>
            </div>
          </div>
          </section>
        ) : null}


        {activeView === 'copilot' ? (
          <section className="copilot">
          <div className="section-head">
            <div>
              <h2>Budget Copilot</h2>
              <p>
                Tell me what to change. I will suggest edits. Click Apply changes
                to confirm.
              </p>
            </div>
            <span className="tag">Powered by Groq</span>
          </div>
          <div className="copilot-grid">
            <div className="chat-card">
              <div className="chat-window">
                {chatMessages.length ? (
                  chatMessages.map((message, index) => (
                    <div
                      className={`chat-bubble ${message.role}`}
                      key={`${message.role}-${index}`}
                    >
                      {message.content}
                    </div>
                  ))
                ) : null}
                {chatLoading ? (
                  <div className="chat-bubble assistant">
                    Drafting changes and next steps...
                  </div>
                ) : null}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  value={chatInput}
                  placeholder="Tell me what to change."
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSendChat()
                    }
                  }}
                />
                <button className="solid small" onClick={handleSendChat}>
                  Send
                </button>
              </div>
            </div>
            <div className="suggestion-card">
              <h3>Suggestions</h3>
              {pendingUpdates ||
              pendingLocalAction ||
              pendingUiAction ||
              pendingUtilityAction ? (
                <>
                  <p>{pendingSummary}</p>
                  <div className="inline-actions">
                    <button
                      className="solid small"
                      onClick={() => {
                        applyPendingChanges()
                      }}
                    >
                      Apply changes
                    </button>
                    <button
                      className="ghost small"
                      onClick={() => {
                        setPendingUpdates(null)
                        setPendingLocalAction(null)
                        setPendingSummary('')
                      }}
                    >
                      Keep current
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">
                  Suggestions land here. Click Apply changes to confirm.
                </p>
              )}
            </div>
            <div className="insight-card">
              <div className="card-head">
                <h3>Bank + paycheck guidance</h3>
                <span className="tag">Live stats</span>
              </div>
              <div className="insight-list">
                {bankGuidance.map((item, index) => (
                  <p key={`bank-guidance-${index}`}>{item}</p>
                ))}
              </div>
              <div className="insight-stats">
                <div className="insight-stat">
                  <span>Bank balance</span>
                  <strong>{formatCurrency(bankBalance)}</strong>
                  <small>Cash on hand</small>
                </div>
                <div className="insight-stat">
                  <span>Bills this month</span>
                  <strong>{formatCurrency(plannedBillsDisplayTotal)}</strong>
                  <small>{plannedBillsDisplayCount} bills</small>
                </div>
                <div className="insight-stat">
                  <span>Bills per paycheck</span>
                  <strong>{formatCurrency(billsPerPaycheck)}</strong>
                  <small>{payFrequencyLabel} cadence</small>
                </div>
                <div className="insight-stat">
                  <span>Next paycheck left</span>
                  <strong>{formatCurrency(nextPaycheckAfterBills)}</strong>
                  <small>After bills</small>
                </div>
                <div className="insight-stat">
                  <span>Flex per day</span>
                  <strong>{formatCurrency(dailyFlexTarget)}</strong>
                  <small>Flex per week {formatCurrency(weeklyFlexTarget)}</small>
                </div>
                <div className="insight-stat">
                  <span>Bills coverage</span>
                  <strong>{bankCoverageLabel}</strong>
                  <small>Based on balance</small>
                </div>
              </div>
            </div>
          </div>
          </section>
        ) : null}

        {activeView === 'concierge' ? (
          <section className="copilot concierge">
          <div className="section-head">
            <div>
              <h2>Savings Concierge</h2>
              <p>
                Build a savings playbook with scripts and next steps.
              </p>
            </div>
            <span className="tag">Powered by Groq</span>
          </div>
          <div className="copilot-grid playbook-grid">
            <div className="chat-card playbook-card">
              <div className="card-head">
                <h3>Build the playbook</h3>
                <span className="tag">Guided</span>
              </div>
              <div className="playbook-stepper">
                <button
                  className={`playbook-step ${savingsStep === 'bill' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSavingsStep('bill')}
                >
                  1. Pick bill
                </button>
                <button
                  className={`playbook-step ${savingsStep === 'target' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSavingsStep('target')}
                >
                  2. Target + method
                </button>
                <button
                  className={`playbook-step ${savingsStep === 'plan' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSavingsStep('plan')}
                >
                  3. Review plan
                </button>
              </div>
              {savingsStep === 'bill' ? (
                <div className="playbook-section">
                  <label>
                    Bill to target
                    <select
                      value={savingsBill}
                      onChange={(event) => setSavingsBill(event.target.value)}
                    >
                      {savingsCandidates.length ? (
                        savingsCandidates.map((item) => (
                          <option key={`savings-${item.name}`} value={item.name}>
                            {item.name} {item.amount ? `(${formatCurrency(item.amount)})` : ''}
                          </option>
                        ))
                      ) : (
                        <option value="">Add a bill first</option>
                      )}
                    </select>
                  </label>
                  {savingsCandidates.length ? (
                    <>
                      <div className="chip-grid">
                        {savingsCandidates.slice(0, 6).map((item) => (
                          <button
                            key={`savings-chip-${item.name}`}
                            type="button"
                            className={savingsBill === item.name ? 'solid small' : 'ghost small'}
                            onClick={() => setSavingsBill(item.name)}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                      <p className="muted">
                        Biggest bills rise to the top. Pick one to focus on first.
                      </p>
                    </>
                  ) : (
                    <p className="muted">
                      Add a monthly bill to unlock savings playbooks.
                    </p>
                  )}
                  <div className="inline-actions">
                    <button
                      className="solid small"
                      type="button"
                      onClick={() => setSavingsStep('target')}
                      disabled={!savingsCandidates.length}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
              {savingsStep === 'target' ? (
                <div className="playbook-section">
                  <div className="playbook-fields">
                    <label>
                      Target savings per month
                      <input
                        type="number"
                        min="0"
                        placeholder="25"
                        value={savingsTarget}
                        onChange={(event) => setSavingsTarget(event.target.value)}
                      />
                    </label>
                    <label>
                      Contact method
                      <select
                        value={savingsMethod}
                        onChange={(event) =>
                          setSavingsMethod(
                            event.target.value as 'phone' | 'chat' | 'email'
                          )
                        }
                      >
                        <option value="phone">Phone call</option>
                        <option value="chat">Live chat</option>
                        <option value="email">Email</option>
                      </select>
                    </label>
                    <label>
                      Provider or company
                      <input
                        type="text"
                        placeholder="AT&T, Verizon, Gym"
                        value={savingsProvider}
                        onChange={(event) => setSavingsProvider(event.target.value)}
                      />
                    </label>
                    <label>
                      Notes (optional)
                      <input
                        type="text"
                        placeholder="Contract up in 2 months"
                        value={savingsNotes}
                        onChange={(event) => setSavingsNotes(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="inline-actions">
                    <button
                      className="ghost small"
                      type="button"
                      onClick={() => setSavingsStep('bill')}
                    >
                      Back
                    </button>
                    <button
                      className="solid small"
                      type="button"
                      onClick={handleGenerateSavingsPlaybook}
                      disabled={savingsLoading}
                    >
                      Generate playbook
                    </button>
                  </div>
                  {selectedSavingsAmount ? (
                    <p className="helper">
                      Current bill: {formatCurrency(selectedSavingsAmount)} per month.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {savingsStep === 'plan' ? (
                <div className="playbook-section">
                  <p className="muted">
                    Review the plan on the right. Adjust details and regenerate
                    if needed.
                  </p>
                  <div className="inline-actions">
                    <button
                      className="ghost small"
                      type="button"
                      onClick={() => setSavingsStep('target')}
                    >
                      Edit details
                    </button>
                    <button
                      className="solid small"
                      type="button"
                      onClick={handleGenerateSavingsPlaybook}
                      disabled={savingsLoading}
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="suggestion-card playbook-output">
              <h3>Playbook output</h3>
              {savingsLoading ? (
                <p className="muted">Drafting your savings plan...</p>
              ) : savingsError ? (
                <p className="muted">{savingsError}</p>
              ) : savingsPlan ? (
                <div className="playbook-output-body">{savingsPlan}</div>
              ) : (
                <p className="muted">
                  Fill out the steps to generate a savings playbook.
                </p>
              )}
              {savingsPendingUpdates ? (
                <div className="playbook-actions">
                  <p>{savingsPendingSummary}</p>
                  <div className="inline-actions">
                    <button
                      className="solid small"
                      onClick={() => {
                        applyBudgetUpdates(savingsPendingUpdates)
                        setSavingsPendingUpdates(null)
                        setSavingsPendingSummary('')
                        setSavingsPlan((prev) =>
                          prev
                            ? `${prev}\n\nUpdate: Savings adjustments applied.`
                            : 'Savings adjustments applied.'
                        )
                      }}
                    >
                      Apply savings
                    </button>
                    <button
                      className="ghost small"
                      onClick={() => {
                        setSavingsPendingUpdates(null)
                        setSavingsPendingSummary('')
                      }}
                    >
                      Keep current
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          </section>
        ) : null}

        {activeView === 'personalize' ? (
          <section className="personalize" ref={personalizeRef}>
          <div className="section-head">
            <div>
              <h2>Set your preferences</h2>
              <p>Update pay timing, goals, and reminders to fit your life.</p>
            </div>
          </div>
          <div className="personalize-grid">
            <div className="personal-card">
              <h3>Pay timing</h3>
              <p>Shift pay timing to see weekly cash.</p>
              <button
                className="ghost small"
                onClick={() =>
                  setActivePanel((prev) => (prev === 'cadence' ? null : 'cadence'))
                }
              >
                Set timing
              </button>
            </div>
            <div className="personal-card">
              <h3>Debt payoff style</h3>
              <p>Pick avalanche or snowball.</p>
              <button
                className="ghost small"
                onClick={() =>
                  setActivePanel((prev) => (prev === 'strategy' ? null : 'strategy'))
                }
              >
                Pick style
              </button>
            </div>
            <div className="personal-card">
              <h3>Bill labels</h3>
              <p>Group bills to keep lists tidy.</p>
              <button
                className="ghost small"
                onClick={() =>
                  setActivePanel((prev) => (prev === 'labels' ? null : 'labels'))
                }
              >
                Manage labels
              </button>
            </div>
          </div>
          <div className="preferences-grid">
            <div className="preferences-card">
              <div className="card-head">
                <h3>Budget defaults</h3>
                <span className="tag">Changes now</span>
              </div>
              <div className="preferences-form">
                <label className="input-row">
                  Pay frequency
                  <select
                    value={payFrequency}
                    onChange={(event) => setPayFrequency(event.target.value)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
                <div className="input-row">
                  Pay dates
                  <div className="paydate-row">
                    {Array.from({ length: payDateCount }).map((_, index) => (
                      <label className="paydate-field" key={`paydate-${index}`}>
                        {payFrequency === 'monthly'
                          ? 'Payday'
                          : `Payday ${index + 1}`}
                        <input
                          type="date"
                          value={payDates[index] ?? ''}
                          onChange={(event) => {
                            const next = [...payDates]
                            next[index] = event.target.value
                            setPayDates(next)
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <label className="input-row">
                  Primary goal
                  <select
                    value={primaryGoal}
                    onChange={(event) => setPrimaryGoal(event.target.value)}
                  >
                    <option value="stability">Stability</option>
                    <option value="debt">Pay off debt</option>
                    <option value="savings">Save more</option>
                    <option value="flex">More flexibility</option>
                  </select>
                </label>
                <label className="input-row">
                  Take-home per paycheck
                  <input
                    type="number"
                    value={incomePerPaycheck}
                    onChange={(event) =>
                      setIncomePerPaycheck(Number(event.target.value || 0))
                    }
                  />
                </label>
                <div className="toggle-row">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={autoSuggest}
                      onChange={(event) => setAutoSuggest(event.target.checked)}
                    />
                    <span>Auto-suggest bills</span>
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={includePartner}
                      onChange={(event) => setIncludePartner(event.target.checked)}
                    />
                    <span>Include partner income</span>
                  </label>
                </div>
                {includePartner ? (
                  <label className="input-row">
                    Partner monthly income
                    <input
                      type="number"
                      value={partnerIncome}
                      onChange={(event) =>
                        setPartnerIncome(Number(event.target.value || 0))
                      }
                    />
                  </label>
                ) : null}
              </div>
            </div>
            <div className="preferences-card">
              <div className="card-head">
                <h3>Alerts & reminders</h3>
                <span className="tag">Notifications</span>
              </div>
              <div className="preferences-form">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notificationWeeklySummary}
                    onChange={(event) =>
                      setNotificationWeeklySummary(event.target.checked)
                    }
                  />
                  <span>Weekly summary</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notificationOverBudget}
                    onChange={(event) =>
                      setNotificationOverBudget(event.target.checked)
                    }
                  />
                  <span>Over budget alerts</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notificationBillReminders}
                    onChange={(event) =>
                      setNotificationBillReminders(event.target.checked)
                    }
                  />
                  <span>Bill reminders</span>
                </label>
                <label className="input-row">
                  Reminder lead days
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={notificationReminderDays}
                    onChange={(event) =>
                      setNotificationReminderDays(Number(event.target.value || 0))
                    }
                  />
                </label>
                <p className="helper">Alerts pause while you are in the app.</p>
              </div>
            </div>
            <div className="preferences-card">
              <div className="card-head">
                <h3>Community username</h3>
                <span className="tag">Every 30 days</span>
              </div>
              <div className="preferences-form">
                <label className="input-row">
                  Username
                  <input
                    type="text"
                    value={usernameDraft}
                    onChange={(event) => {
                      setUsernameDraft(event.target.value)
                      if (usernameError) {
                        setUsernameError('')
                      }
                    }}
                    disabled={usernameChangeLocked}
                  />
                </label>
                <p className="helper">
                  {usernameError ||
                    'Use 3-20 letters, numbers, or underscores. Update every 30 days.'}
                </p>
                {usernameChangeLocked && usernameNextChangeDate ? (
                  <p className="helper">
                    Next update in {usernameCooldownDays} day
                    {usernameCooldownDays === 1 ? '' : 's'} (
                    {formatLongDate(usernameNextChangeDate.toISOString())})
                  </p>
                ) : null}
              </div>
              <div className="preferences-footer">
                <button
                  className="solid small"
                  onClick={handleUsernameSave}
                  disabled={usernameSaving || usernameChangeLocked}
                >
                  {usernameSaving
                    ? 'Saving...'
                    : userProfile?.username
                      ? 'Update username'
                      : 'Save username'}
                </button>
              </div>
            </div>
            <div className="preferences-card">
              <div className="card-head">
                <h3>Safety buffer</h3>
                <span className="tag">Cash reserve</span>
              </div>
              <div className="preferences-form">
                <label className="input-row">
                  Monthly buffer
                  <input
                    type="number"
                    min="0"
                    value={monthlyBuffer}
                    onChange={(event) =>
                      setMonthlyBuffer(Number(event.target.value || 0))
                    }
                  />
                </label>
                <p className="helper">
                  We subtract this from left-to-budget and weekly cash.
                </p>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(event) => {
                      setAutoSaveEnabled(event.target.checked)
                      showToast(
                        event.target.checked
                          ? 'Auto-save enabled.'
                          : 'Auto-save paused.'
                      )
                    }}
                  />
                  <span>Auto-save</span>
                </label>
              </div>
              <div className="preferences-footer">
                <button
                  className="ghost small"
                  onClick={() => setMonthlyBuffer(0)}
                >
                  Reset buffer
                </button>
              </div>
            </div>
          </div>
          <div className="preferences-actions">
            <button className="solid" onClick={handleManualPreferencesSave}>
              Save preferences
            </button>
          </div>
          </section>
        ) : null}

        <section className="cta app-cta">
          <div>
            <h2>Quick actions</h2>
            <p>Export your budget or re-run the builder anytime.</p>
          </div>
          <div className="cta-actions">
            <button className="ghost" onClick={handleExportCsv}>
              Export CSV
            </button>
            <button className="solid" onClick={handleGenerateBudget}>
              Create my budget
            </button>
          </div>
        </section>
          </>
        ) : null}
        {marketingView === 'app' && !userEmail ? (
          <section className="locked-state">
            <div className="locked-card">
              <span className="tag">Login required</span>
              <h2>Sign in to view your budget</h2>
              <p>Your numbers stay private until you log in.</p>
              <div className="locked-actions">
                <button className="solid" onClick={() => setShowLogin(true)}>
                  Log in to continue
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    setAuthMode('signup')
                    setShowLogin(true)
                  }}
                >
                  Create account
                </button>
              </div>
              <div className="locked-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <footer className="site-footer">
        <div className="footer-links">
          <a
            className="footer-link"
            href={marketingUrlFor('features')}
            onClick={(event) => {
              event.preventDefault()
              handleMarketingNav('features')
            }}
          >
            Features
          </a>
          <a
            className="footer-link"
            href={marketingUrlFor('about')}
            onClick={(event) => {
              event.preventDefault()
              handleMarketingNav('about')
            }}
          >
            About
          </a>
          <a
            className="footer-link"
            href={marketingUrlFor('dev-notes')}
            onClick={(event) => {
              event.preventDefault()
              handleMarketingNav('dev-notes')
            }}
          >
            Dev notes
          </a>
        </div>
        <div className="footer-links secondary">
          <a
            className="footer-link"
            href={marketingUrlFor('terms')}
            onClick={(event) => {
              event.preventDefault()
              handleMarketingNav('terms')
            }}
          >
            Terms
          </a>
          <a
            className="footer-link"
            href={marketingUrlFor('privacy')}
            onClick={(event) => {
              event.preventDefault()
              handleMarketingNav('privacy')
            }}
          >
            Privacy
          </a>
          <a className="footer-link" href={termsPdfUrl} download>
            Terms PDF
          </a>
          <a className="footer-link" href={privacyPdfUrl} download>
            Privacy PDF
          </a>
        </div>
        <p className="legal-contact">
          Questions? Contact us at{' '}
          <a href="mailto:support@centsy.co">support@centsy.co</a>.
        </p>
        <p>© {currentYear} Centsy. All rights reserved.</p>
      </footer>

      {activePanel ? (
        <div className="action-panel">
          <div className="card-head">
            <h3>
              {activePanel === 'cadence' && 'Pay cadence'}
              {activePanel === 'strategy' && 'Debt strategy'}
              {activePanel === 'labels' && 'Bill labels'}
              {activePanel === 'schedule' && 'Monthly bills schedule'}
            </h3>
            <button className="ghost small" onClick={() => setActivePanel(null)}>
              Close
            </button>
          </div>
          {activePanel === 'cadence' ? (
            <div className="panel-stack">
              <p className="muted">
                Shift how your paychecks land across the month to smooth cash flow.
              </p>
              <label>
                Payday distribution
                <input
                  type="range"
                  min="0"
                  max="3"
                  value={scheduleBias}
                  onChange={(event) =>
                    setScheduleBias(Number(event.target.value || 0))
                  }
                />
              </label>
              <div className="range-labels">
                <span>Even</span>
                <span>Front</span>
                <span>Mid</span>
                <span>End</span>
              </div>
              <button
                className="solid small"
                onClick={() => {
                  setActivePanel(null)
                  showToast('Cadence saved.')
                }}
              >
                Apply cadence
              </button>
            </div>
          ) : null}
          {activePanel === 'strategy' ? (
            <div className="panel-stack">
              <label className="radio-row">
                <input
                  type="radio"
                  name="debt-strategy"
                  value="avalanche"
                  checked={debtStrategy === 'avalanche'}
                  onChange={(event) => setDebtStrategy(event.target.value)}
                />
                Avalanche (highest interest first)
              </label>
              <label className="radio-row">
                <input
                  type="radio"
                  name="debt-strategy"
                  value="snowball"
                  checked={debtStrategy === 'snowball'}
                  onChange={(event) => setDebtStrategy(event.target.value)}
                />
                Snowball (smallest balance first)
              </label>
              <p className="muted">
                Current strategy: {debtStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'}.
              </p>
              <button
                className="solid small"
                onClick={() => {
                  setActivePanel(null)
                  showToast('Debt strategy updated.')
                }}
              >
                Save strategy
              </button>
            </div>
          ) : null}
          {activePanel === 'labels' ? (
            <div className="panel-stack">
              <div className="label-grid">
                {labels.map((label) => (
                  <div className="label-chip" key={label}>
                    <span>{label}</span>
                    <button
                      className="ghost small"
                      onClick={() => handleRemoveLabel(label)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="inline-form compact">
                <input
                  type="text"
                  placeholder="New label"
                  value={newLabel}
                  onChange={(event) => setNewLabel(event.target.value)}
                />
                <button className="solid small" onClick={handleAddLabel}>
                  Add label
                </button>
              </div>
            </div>
          ) : null}
          {activePanel === 'schedule' ? (
            <div className="panel-stack">
              <label>
                Shift bill timing
                <input
                  type="range"
                  min="0"
                  max="3"
                  value={scheduleBias}
                  onChange={(event) =>
                    setScheduleBias(Number(event.target.value || 0))
                  }
                />
              </label>
              <div className="range-labels">
                <span>Even</span>
                <span>Front</span>
                <span>Mid</span>
                <span>End</span>
              </div>
              <div className="schedule-grid">
                {budgetBills.map((bill, index) => (
                  <div className="schedule-row" key={`${bill.name}-${index}`}>
                    <input
                      type="text"
                      value={bill.name}
                      onChange={(event) =>
                        handleBillChange(index, 'name', event.target.value)
                      }
                    />
                    {bill.recurringDay !== null && bill.recurringDay !== undefined ? (
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={bill.recurringDay}
                        placeholder="Day"
                        onChange={(event) =>
                          handleBillRecurringDayChange(index, event.target.value)
                        }
                      />
                    ) : (
                      <input
                        type="text"
                        value={bill.date}
                        onChange={(event) =>
                          handleBillChange(index, 'date', event.target.value)
                        }
                      />
                    )}
                    <input
                      type="number"
                      value={bill.amount}
                      onChange={(event) =>
                        handleBillChange(index, 'amount', event.target.value)
                      }
                    />
                    <label className="toggle schedule-toggle">
                      <input
                        type="checkbox"
                        checked={
                          bill.recurringDay !== null && bill.recurringDay !== undefined
                        }
                        onChange={(event) =>
                          handleBillRecurringToggle(index, event.target.checked)
                        }
                      />
                      <span>Monthly</span>
                    </label>
                    <button
                      className="danger small"
                      type="button"
                      onClick={() => handleDeleteBill(index)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="solid small"
                onClick={() => {
                  setActivePanel(null)
                  showToast('Monthly bills updated.')
                }}
              >
                Save bill schedule
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showLogin ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowLogin(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="card-head">
              <h3>{authMode === 'signup' ? 'Create account' : 'Log in'}</h3>
              <button
                className="ghost small"
                onClick={() => setShowLogin(false)}
              >
                Close
              </button>
            </div>
            <div className="auth-toggle">
              <button
                className={authMode === 'login' ? 'solid small' : 'ghost small'}
                onClick={() => setAuthMode('login')}
                type="button"
              >
                Log in
              </button>
              <button
                className={authMode === 'signup' ? 'solid small' : 'ghost small'}
                onClick={() => setAuthMode('signup')}
                type="button"
              >
                Sign up
              </button>
            </div>
            <label>
              Email
              <input
                type="email"
                placeholder="you@email.com"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
              />
            </label>
            {authMode === 'login' ? (
              <button
                className="ghost small"
                type="button"
                onClick={handlePasswordReset}
                disabled={authLoading}
              >
                Forgot password?
              </button>
            ) : null}
            <button className="solid" onClick={handleLogin} disabled={authLoading}>
              {authLoading
                ? 'Working...'
                : authMode === 'signup'
                  ? 'Create account'
                  : 'Continue'}
            </button>
            {authMode === 'signup' ? (
              <p className="muted">
                You will receive a confirmation email before you can sign in.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {usernameModal}
      {isBudgetTransitioning ? (
        <div className="budget-transition" role="status" aria-live="polite">
          <div className="budget-transition-card">
            <div className="budget-transition-spinner" aria-hidden="true" />
            <div>
              <p>Building your budget</p>
              <span>Opening Budget Space...</span>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

export default App
