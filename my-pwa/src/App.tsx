import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import centsyLogo from './assets/centsy-logo.svg'

type Stock = {
  symbol: string
  shares: number
  price: number
  monthly: number
}

type BudgetState = {
  incomePerPaycheck: number
  partnerIncome: number
  payFrequency: string
  primaryGoal: string
  autoSuggest: boolean
  includePartner: boolean
  monthlyBuffer: number
  notificationWeeklySummary: boolean
  notificationOverBudget: boolean
  notificationBillReminders: boolean
  notificationReminderDays: number
  autoSaveEnabled: boolean
  budgetGenerated: boolean
  budgetCategories: typeof categoriesSeed
  budgetGoals: typeof goalsSeed
  budgetBills: typeof billsSeed
  labels: string[]
  scheduleBias: number
  debtStrategy: string
  stocks: Stock[]
  robinhoodConnected: boolean
  monthlyInvestment: number
  expectedReturn: number
}

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

const billsSeed = [
  { name: 'Rent', date: 'Mar 1', amount: 1200 },
  { name: 'Phone', date: 'Mar 5', amount: 80 },
  { name: 'Car insurance', date: 'Mar 12', amount: 165 },
  { name: 'Streaming bundle', date: 'Mar 19', amount: 24 },
]

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

const billWeekIndex = (dateLabel: string) => {
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

const formatDateForInput = (dateLabel: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateLabel)) {
    return dateLabel
  }
  return ''
}

function App() {
  const [budgetGenerated, setBudgetGenerated] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)
  const [budgetCategories, setBudgetCategories] = useState(categoriesSeed)
  const [budgetGoals, setBudgetGoals] = useState(goalsSeed)
  const [budgetBills, setBudgetBills] = useState(billsSeed)
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
  const [incomePerPaycheck, setIncomePerPaycheck] = useState(2100)
  const [partnerIncome, setPartnerIncome] = useState(0)
  const [payFrequency, setPayFrequency] = useState('biweekly')
  const [primaryGoal, setPrimaryGoal] = useState('stability')
  const [autoSuggest, setAutoSuggest] = useState(true)
  const [includePartner, setIncludePartner] = useState(false)
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
  const [activePanel, setActivePanel] = useState<
    'cadence' | 'strategy' | 'labels' | 'schedule' | null
  >(null)
  const [debtStrategy, setDebtStrategy] = useState('avalanche')
  const [labels, setLabels] = useState(['Essential', 'Lifestyle', 'Savings'])
  const [newLabel, setNewLabel] = useState('')
  const [scheduleBias, setScheduleBias] = useState(0)
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Partial<BudgetState> | null>(
    null
  )
  const [pendingSummary, setPendingSummary] = useState('')
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [activeView, setActiveView] = useState<
    'workspace' | 'cashflow' | 'planner' | 'invest' | 'copilot' | 'personalize'
  >('workspace')
  const [categoryRange, setCategoryRange] = useState({ min: 0, max: 3000 })
  const currentYear = new Date().getFullYear()

  const builderRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const plannerRef = useRef<HTMLDivElement | null>(null)
  const saveTimer = useRef<number | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isHydrating, setIsHydrating] = useState(false)

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

  const currentBudgetState = useMemo<BudgetState>(
    () => ({
      incomePerPaycheck,
      partnerIncome,
      payFrequency,
      primaryGoal,
      autoSuggest,
      includePartner,
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
    }),
    [
      incomePerPaycheck,
      partnerIncome,
      payFrequency,
      primaryGoal,
      autoSuggest,
      includePartner,
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
    ]
  )

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current)
    }
    toastTimer.current = window.setTimeout(() => setToast(''), 2500)
  }

  const requireLogin = (message: string) => {
    if (userEmail) return true
    showToast(message)
    setShowLogin(true)
    return false
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
    scrollTo(workspaceRef)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSaveState('idle')
    showToast('Logged out.')
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

  const handleDeleteBill = (index: number) => {
    setBudgetBills((prev) => prev.filter((_bill, billIndex) => billIndex !== index))
    showToast('Bill removed.')
  }

  const handleScheduleBill = (name: string, date: string, amount: number) => {
    setBudgetBills((prev) => {
      const billIndex = prev.findIndex(
        (bill) => bill.name.toLowerCase() === name.toLowerCase()
      )
      if (billIndex < 0) {
        return [...prev, { name, date, amount }]
      }
      return prev.map((bill, index) =>
        index === billIndex ? { ...bill, date, amount } : bill
      )
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
      items: Array<{ name: string; date: string; amount: number | string }>
    ) =>
      items.map((item) => ({
        name: item.name,
        date: item.date,
        amount: Number(item.amount ?? 0),
      }))
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
    if ('budgetCategories' in updates && Array.isArray(updates.budgetCategories)) {
      setBudgetCategories(normalizeCategories(updates.budgetCategories))
    }
    if ('budgetGoals' in updates && Array.isArray(updates.budgetGoals)) {
      setBudgetGoals(normalizeGoals(updates.budgetGoals))
    }
    if ('budgetBills' in updates && Array.isArray(updates.budgetBills)) {
      setBudgetBills(normalizeBills(updates.budgetBills))
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
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    const nextMessages = [
      ...chatMessages,
      { role: 'user' as const, content: chatInput.trim() },
    ]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)
    setPendingUpdates(null)
    setPendingSummary('')
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
    setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    const updates = data?.updates
    if (updates && typeof updates === 'object' && Object.keys(updates).length > 0) {
      setPendingUpdates(updates)
      setPendingSummary(data?.summary ?? 'Apply these suggested updates?')
    }
    setChatLoading(false)
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
    rows.push(['Planned monthly bills', formatCurrency(plannedBillsDisplayTotal)])
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

    rows.push(['Schedule'])
    rows.push(['Bill', 'Due date', 'Amount'])
    scheduledBills.forEach((bill) => {
      rows.push([bill.name, bill.date, formatCurrency(bill.amount)])
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
        setSaveState('saved')
      }
      setIsHydrating(false)
    }
    loadBudget()
  }, [userId])

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
    week: billWeekIndex(bill.date),
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
  const canApplySuggestion = Boolean(suggestedBill)
  const trendSource = weeklyAmounts.slice(0, 3)
  const trendMax = Math.max(...trendSource.map((amount) => Math.abs(amount)), 1)
  const trendValues = trendSource.map((amount) => Math.abs(amount) / trendMax)
  const trendAverage =
    trendSource.reduce((sum, amount) => sum + amount, 0) / trendSource.length
  const trendMinAmount = Math.min(...trendSource)
  const trendMaxAmount = Math.max(...trendSource)
  const payFrequencyLabel =
    payFrequency === 'weekly'
      ? 'Weekly'
      : payFrequency === 'monthly'
        ? 'Monthly'
        : 'Every 2 weeks'
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
              {bill.date} · {formatCurrency(bill.amount)}
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
          <div className="top-actions">
            {userEmail ? (
              <button className="ghost" onClick={handleLogout}>
                Log out
              </button>
            ) : (
              <button className="ghost" onClick={() => setShowLogin(true)}>
                Log in
              </button>
            )}
            {userEmail ? (
              <span className={`save-pill ${saveState}`}>
                {saveState === 'saving' ? 'Saving...' : 'All changes saved'}
              </span>
            ) : null}
            <button
              className="solid"
              onClick={() => {
                if (!requireLogin('Please log in to start your budget.')) {
                  return
                }
                scrollTo(builderRef)
                showToast('Budget setup started.')
              }}
            >
              Create free budget
            </button>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Simple. Detailed. Yours.</p>
            <h1>Finish a full budget in minutes, not hours.</h1>
            <p className="lead">
              Answer a few questions, get a complete budget, then edit as you go.
              See how each bill changes your weekly cash.
            </p>
            <div className="hero-cta">
              <button
                className="solid"
                onClick={() => {
                  if (!requireLogin('Please log in to start your budget.')) {
                    return
                  }
                  scrollTo(builderRef)
                  showToast('Budget setup started.')
                }}
              >
                Start your budget
              </button>
            </div>
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
                      Budget ready. Scroll down to see it.
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
                <div className="panel-footer">
                  <button
                    className="solid"
                    onClick={() => setShowLogin(true)}
                    type="button"
                  >
                    Log in to start
                  </button>
                  <p className="panel-note">
                    Your budget details appear after you sign in.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {userEmail ? (
          <>
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
              className={activeView === 'planner' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('planner')}
            >
              Planner
            </button>
            <button
              className={activeView === 'copilot' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('copilot')}
            >
              Copilot
            </button>
            <button
              className={activeView === 'personalize' ? 'tab active' : 'tab'}
              onClick={() => setActiveView('personalize')}
            >
              Preferences
            </button>
          </div>
          <p className="muted">Use tabs to focus on one area at a time.</p>
        </section>
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
                            const scheduledDate =
                              billIndex >= 0 ? budgetBills[billIndex].date : ''
                            return (
                              <input
                                type="date"
                                value={formatDateForInput(scheduledDate)}
                                onChange={(event) =>
                                  handleScheduleBill(
                                    category.name,
                                    event.target.value,
                                    category.planned
                                  )
                                }
                              />
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
                    <em>{bill.date}</em>
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


        {activeView === 'copilot' ? (
          <section className="copilot">
          <div className="section-head">
            <div>
              <h2>Budget Copilot</h2>
              <p>
                Ask for simple changes or explanations. Nothing changes until you
                confirm it.
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
                ) : (
                  <p className="muted">
                    Try: “Cut $150 from dining and boost savings by $100.”
                  </p>
                )}
                {chatLoading ? (
                  <div className="chat-bubble assistant">Thinking...</div>
                ) : null}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  value={chatInput}
                  placeholder="Ask for a change or a quick check..."
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
              {pendingUpdates ? (
                <>
                  <p>{pendingSummary}</p>
                  <div className="inline-actions">
                    <button
                      className="solid small"
                      onClick={() => {
                        applyBudgetUpdates(pendingUpdates)
                        setPendingUpdates(null)
                        setPendingSummary('')
                        showToast('Updates applied.')
                      }}
                    >
                      Apply changes
                    </button>
                    <button
                      className="ghost small"
                      onClick={() => {
                        setPendingUpdates(null)
                        setPendingSummary('')
                      }}
                    >
                      Keep current
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">
                  Suggestions show up here. You decide what to apply.
                </p>
              )}
            </div>
          </div>
          </section>
        ) : null}

        {activeView === 'personalize' ? (
          <section className="personalize">
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
          </section>
        ) : null}

        <section className="cta">
          <div>
            <h2>Ready to start?</h2>
            <p>We give you a draft, then you make it yours.</p>
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
        ) : (
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
        )}
      </main>
      <footer className="site-footer">
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
                    <input
                      type="text"
                      value={bill.date}
                      onChange={(event) =>
                        handleBillChange(index, 'date', event.target.value)
                      }
                    />
                    <input
                      type="number"
                      value={bill.amount}
                      onChange={(event) =>
                        handleBillChange(index, 'amount', event.target.value)
                      }
                    />
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
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

export default App
