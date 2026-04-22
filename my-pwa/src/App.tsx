import { useEffect, useRef, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import { AboutPage } from './components/figma/AboutPage'
import { ChangelogPage } from './components/figma/ChangelogPage'
import { LandingPage } from './components/figma/LandingPage'
import { ShellHeader } from './components/figma/ShellHeader'
import { SidebarNav, type ModuleId } from './components/figma/SidebarNav'
import { SignInModal } from './components/figma/SignInModal'
import { ActivityModule } from './components/figma/modules/ActivityModule'
import { AskAiModule } from './components/figma/modules/AskAiModule'
import { BudgetModule } from './components/figma/modules/BudgetModule'
import { CashflowModule } from './components/figma/modules/CashflowModule'
import { DashboardModule } from './components/figma/modules/DashboardModule'
import { ReportsModule } from './components/figma/modules/ReportsModule'
import { SettingsModule } from './components/figma/modules/SettingsModule'
import type { BudgetBill, BudgetCategory, BudgetGoal, ForumComment, ForumPost } from './types/app'

const categoriesSeed: BudgetCategory[] = [
  { name: 'Rent', planned: 1200, actual: 1200 },
  { name: 'Groceries', planned: 420, actual: 368 },
  { name: 'Transportation', planned: 220, actual: 245 },
  { name: 'Utilities', planned: 160, actual: 142 },
  { name: 'Fun money', planned: 180, actual: 126 },
  { name: 'Savings', planned: 400, actual: 400 },
]

const goalsSeed: BudgetGoal[] = [
  { name: 'Emergency fund', amount: 3250, target: 5000 },
  { name: 'Travel fund', amount: 820, target: 2000 },
  { name: 'Debt payoff', amount: 6480, target: 9200 },
]

const billsSeed: BudgetBill[] = [
  { name: 'Rent', date: '2026-04-01', amount: 1200, recurringDay: 1 },
  { name: 'Phone', date: '2026-04-05', amount: 80, recurringDay: 5 },
  { name: 'Car insurance', date: '2026-04-12', amount: 165, recurringDay: 12 },
  { name: 'Streaming bundle', date: '2026-04-19', amount: 24, recurringDay: 19 },
]

const forumCategoriesSeed = [
  'Bills & essentials',
  'Debt payoff',
  'Saving wins',
  'Side income',
  'Family budgeting',
  'General',
]

const formatCurrency = (value: number) => {
  const rounded = Math.round(value)
  if (rounded < 0) return `-$${Math.abs(rounded).toLocaleString('en-US')}`
  return `$${rounded.toLocaleString('en-US')}`
}

const billWeekIndex = (dateLabel: string, recurringDay?: number | null) => {
  if (recurringDay) {
    if (recurringDay <= 7) return 1
    if (recurringDay <= 14) return 2
    if (recurringDay <= 21) return 3
    return 4
  }
  const parsed = new Date(dateLabel)
  const day = parsed.getDate()
  if (Number.isNaN(day)) return 1
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

type BudgetStateRecord = {
  autoSaveEnabled: boolean
  bankBalance: number
  budgetBills: BudgetBill[]
  budgetCategories: BudgetCategory[]
  budgetGenerated: boolean
  budgetGoals: BudgetGoal[]
  creditCardBalance: number
  includePartner: boolean
  incomePerPaycheck: number
  monthlyBuffer: number
  notificationBillReminders: boolean
  notificationOverBudget: boolean
  notificationWeeklySummary: boolean
  partnerIncome: number
  payFrequency: string
  primaryGoal: string
  spendEntries: Array<SpendEntryShape>
}

type SpendEntryShape = {
  id: string
  merchant: string
  category: string
  amount: number
  date: string
  note: string
}

const createSpendId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `spend-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const moduleToPath: Record<ModuleId, string> = {
  home: '/home',
  plan: '/plan',
  activity: '/activity',
  insights: '/insights',
  'ask-ai': '/ask-ai',
}

const pathToModule = (path: string): ModuleId | null => {
  switch (path) {
    case '/home':
      return 'home'
    case '/plan':
      return 'plan'
    case '/activity':
      return 'activity'
    case '/insights':
      return 'insights'
    case '/ask-ai':
      return 'ask-ai'
    default:
      return null
  }
}

const isPublicPath = (path: string) => ['/', '/login', '/about', '/changelog'].includes(path)

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('home')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authError, setAuthError] = useState('')
  const [bankBalance, setBankBalance] = useState(0)
  const [budgetBills, setBudgetBills] = useState<BudgetBill[]>(billsSeed)
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(categoriesSeed)
  const [budgetGenerated, setBudgetGenerated] = useState(false)
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>(goalsSeed)
  const [categoryDraft, setCategoryDraft] = useState({ actual: '', name: '', planned: '' })
  const [creditCardBalance, setCreditCardBalance] = useState(0)
  const [forumCategories] = useState(forumCategoriesSeed)
  const [forumComments, setForumComments] = useState<Record<string, ForumComment[]>>({})
  const [forumLoading, setForumLoading] = useState(false)
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [forumSearch, setForumSearch] = useState('')
  const [goalDraft, setGoalDraft] = useState({ amount: '', name: '', target: '' })
  const [includePartner, setIncludePartner] = useState(false)
  const [incomePerPaycheck, setIncomePerPaycheck] = useState(2100)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [monthlyBuffer, setMonthlyBuffer] = useState(150)
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [newPost, setNewPost] = useState({
    body: '',
    category: forumCategoriesSeed[0],
    title: '',
  })
  const [newSpend, setNewSpend] = useState({
    amount: '',
    category: categoriesSeed[0]?.name ?? '',
    date: new Date().toISOString().slice(0, 10),
    direction: 'expense' as 'expense' | 'refund',
    merchant: '',
    note: '',
  })
  const [notificationBillReminders, setNotificationBillReminders] = useState(true)
  const [notificationOverBudget, setNotificationOverBudget] = useState(true)
  const [notificationWeeklySummary, setNotificationWeeklySummary] = useState(true)
  const [partnerIncome, setPartnerIncome] = useState(0)
  const [payFrequency, setPayFrequency] = useState('biweekly')
  const [primaryGoal, setPrimaryGoal] = useState('stability')
  const [routePath, setRoutePath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname || '/' : '/',
  )
  const [searchValue, setSearchValue] = useState('')
  const [spendEntries, setSpendEntries] = useState<SpendEntryShape[]>([])
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)

  const navigate = (path: string, options?: { replace?: boolean }) => {
    if (typeof window !== 'undefined') {
      if (options?.replace) {
        window.history.replaceState({}, '', path)
      } else {
        window.history.pushState({}, '', path)
      }
    }
    setRoutePath(path)
  }

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(window.location.pathname || '/')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [routePath])

  useEffect(() => {
    const routeModule = pathToModule(routePath)
    if (routeModule && routeModule !== activeModule) {
      setActiveModule(routeModule)
    }
  }, [routePath, activeModule])

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      setUserEmail(data.session?.user?.email ?? null)
      setUserId(data.session?.user?.id ?? null)
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
      setUserId(session?.user?.id ?? null)
      if (session?.user?.email) {
        if (routePath === '/' || routePath === '/login') {
          navigate('/home', { replace: true })
        }
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [routePath])

  useEffect(() => {
    const loadBudgetState = async () => {
      if (!userId) return
      const { data } = await supabase
        .from('budget_state')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle()
      const saved = data?.data as BudgetStateRecord | undefined
      if (!saved) return
      setIncomePerPaycheck(saved.incomePerPaycheck ?? 2100)
      setPartnerIncome(saved.partnerIncome ?? 0)
      setPayFrequency(saved.payFrequency ?? 'biweekly')
      setPrimaryGoal(saved.primaryGoal ?? 'stability')
      setIncludePartner(saved.includePartner ?? false)
      setBankBalance(saved.bankBalance ?? 0)
      setCreditCardBalance(saved.creditCardBalance ?? 0)
      setMonthlyBuffer(saved.monthlyBuffer ?? 150)
      setNotificationWeeklySummary(saved.notificationWeeklySummary ?? true)
      setNotificationOverBudget(saved.notificationOverBudget ?? true)
      setNotificationBillReminders(saved.notificationBillReminders ?? true)
      setAutoSaveEnabled(saved.autoSaveEnabled ?? true)
      setBudgetGenerated(saved.budgetGenerated ?? false)
      setBudgetCategories(saved.budgetCategories ?? categoriesSeed)
      setBudgetGoals(saved.budgetGoals ?? goalsSeed)
      setSpendEntries(saved.spendEntries ?? [])
    }

    loadBudgetState()
  }, [userId])

  useEffect(() => {
    if (!userId || !autoSaveEnabled) return
    const save = window.setTimeout(async () => {
      await supabase.from('budget_state').upsert(
        {
          user_id: userId,
          data: {
            autoSaveEnabled,
            bankBalance,
            budgetBills,
            budgetCategories,
            budgetGenerated,
            budgetGoals,
            creditCardBalance,
            includePartner,
            incomePerPaycheck,
            monthlyBuffer,
            notificationBillReminders,
            notificationOverBudget,
            notificationWeeklySummary,
            partnerIncome,
            payFrequency,
            primaryGoal,
            spendEntries,
          } satisfies BudgetStateRecord,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
    }, 700)

    return () => window.clearTimeout(save)
  }, [
    autoSaveEnabled,
    bankBalance,
    budgetBills,
    budgetCategories,
    budgetGenerated,
    budgetGoals,
    creditCardBalance,
    includePartner,
    incomePerPaycheck,
    monthlyBuffer,
    notificationBillReminders,
    notificationOverBudget,
    notificationWeeklySummary,
    partnerIncome,
    payFrequency,
    primaryGoal,
    spendEntries,
    userId,
  ])

  useEffect(() => {
    if (activeModule !== 'activity') return
    const loadForumPosts = async () => {
      setForumLoading(true)
      const { data } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false })
      setForumPosts(
        ((data ?? []) as ForumPost[]).map((item) => ({
          ...item,
          tags: Array.isArray(item.tags) ? item.tags : [],
          category: item.category || 'General',
        })),
      )
      setForumLoading(false)
    }

    loadForumPosts()
  }, [activeModule, userId])

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  const requireLogin = (message: string) => {
    if (userEmail) return true
    showToast(message)
    navigate('/login')
    return false
  }

  const handleAuthSubmit = async () => {
    setAuthError('')
    setAuthLoading(true)

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPassword,
        })
        if (error) throw error
        showToast('Check your email to confirm your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        })
        if (error) throw error
        showToast('Logged in.')
      }
      navigate('/home', { replace: true })
      setLoginPassword('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.'
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!loginEmail.trim()) {
      setAuthError('Enter your email first.')
      return
    }
    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail)
      if (error) throw error
      setAuthError('Reset link sent.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send reset email.'
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
    showToast('Logged out.')
  }

  const handleAddCategory = () => {
    if (!categoryDraft.name.trim()) {
      showToast('Add a bill name.')
      return
    }
    setBudgetCategories((prev) => [
      ...prev,
      {
        name: categoryDraft.name.trim(),
        planned: Number(categoryDraft.planned || 0),
        actual: Number(categoryDraft.actual || 0),
      },
    ])
    setCategoryDraft({ actual: '', name: '', planned: '' })
  }

  const handleDeleteCategory = (name: string) => {
    setBudgetCategories((prev) => prev.filter((item) => item.name !== name))
    setSpendEntries((prev) => prev.filter((entry) => entry.category !== name))
  }

  const handleAddGoal = () => {
    if (!goalDraft.name.trim()) {
      showToast('Add a goal name.')
      return
    }
    setBudgetGoals((prev) => [
      ...prev,
      {
        name: goalDraft.name.trim(),
        amount: Number(goalDraft.amount || 0),
        target: Number(goalDraft.target || 0),
      },
    ])
    setGoalDraft({ amount: '', name: '', target: '' })
  }

  const handleDeleteGoal = (name: string) => {
    setBudgetGoals((prev) => prev.filter((item) => item.name !== name))
  }

  const handleBillChange = (
    index: number,
    field: 'name' | 'date' | 'amount' | 'recurringDay',
    value: string,
  ) => {
    setBudgetBills((prev) =>
      prev.map((bill, billIndex) => {
        if (billIndex !== index) return bill
        if (field === 'amount') {
          return { ...bill, amount: Number(value || 0) }
        }
        if (field === 'recurringDay') {
          return { ...bill, recurringDay: value ? Number(value) : null }
        }
        return { ...bill, [field]: value }
      }),
    )
  }

  const handleGenerateBudget = () => {
    if (!requireLogin('Log in to generate a budget.')) return
    setBudgetGenerated(true)
    showToast('Budget generated.')
  }

  const handleAddSpendEntry = () => {
    if (!newSpend.merchant.trim() || !newSpend.category) {
      showToast('Add merchant and bill.')
      return
    }
    const amount = Number(newSpend.amount || 0)
    if (!amount) {
      showToast('Add a valid amount.')
      return
    }
    const signed = newSpend.direction === 'refund' ? -Math.abs(amount) : Math.abs(amount)
    const entry = {
      id: createSpendId(),
      merchant: newSpend.merchant.trim(),
      category: newSpend.category,
      amount: signed,
      date: newSpend.date,
      note: newSpend.note.trim(),
    }
    setSpendEntries((prev) => [entry, ...prev])
    setBudgetCategories((prev) =>
      prev.map((item) =>
        item.name === entry.category ? { ...item, actual: item.actual + entry.amount } : item,
      ),
    )
    setNewSpend((prev) => ({ ...prev, amount: '', merchant: '', note: '', direction: 'expense' }))
  }

  const handleAdjustSpendEntry = (id: string, delta: number) => {
    setSpendEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, amount: entry.amount + delta } : entry)),
    )
    const target = spendEntries.find((entry) => entry.id === id)
    if (!target) return
    setBudgetCategories((prev) =>
      prev.map((item) =>
        item.name === target.category ? { ...item, actual: item.actual + delta } : item,
      ),
    )
  }

  const handleDeleteSpendEntry = (id: string) => {
    const target = spendEntries.find((entry) => entry.id === id)
    if (!target) return
    setSpendEntries((prev) => prev.filter((entry) => entry.id !== id))
    setBudgetCategories((prev) =>
      prev.map((item) =>
        item.name === target.category ? { ...item, actual: item.actual - target.amount } : item,
      ),
    )
  }

  const loadForumComments = async (postId: string) => {
    const { data } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setForumComments((prev) => ({ ...prev, [postId]: (data ?? []) as ForumComment[] }))
  }

  const handleCreatePost = async () => {
    if (!requireLogin('Log in to post.')) return
    if (!userId || !newPost.title.trim() || !newPost.body.trim()) {
      showToast('Add title and question.')
      return
    }
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: userId,
        title: newPost.title.trim(),
        body: newPost.body.trim(),
        category: newPost.category || 'General',
        tags: [],
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) {
      showToast('Could not publish.')
      return
    }
    setForumPosts((prev) => [data as ForumPost, ...prev])
    setNewPost({ body: '', category: forumCategoriesSeed[0], title: '' })
  }

  const handleDeletePost = async (postId: string) => {
    await supabase.from('forum_posts').delete().eq('id', postId)
    setForumPosts((prev) => prev.filter((post) => post.id !== postId))
  }

  const handleCreateComment = async (postId: string) => {
    if (!requireLogin('Log in to reply.')) return
    if (!userId || !newComment[postId]?.trim()) {
      showToast('Add a reply.')
      return
    }
    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        body: newComment[postId].trim(),
      })
      .select('*')
      .single()
    if (error) {
      showToast('Could not publish reply.')
      return
    }
    setForumComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), data as ForumComment],
    }))
    setNewComment((prev) => ({ ...prev, [postId]: '' }))
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    await supabase.from('forum_comments').delete().eq('id', commentId)
    setForumComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).filter((comment) => comment.id !== commentId),
    }))
  }

  const handleExportCsv = () => {
    if (!requireLogin('Log in to export.')) return
    const rows = [
      ['Metric', 'Value'],
      ['Monthly income', formatCurrency(monthlyIncome)],
      ['Bank balance', formatCurrency(bankBalance)],
      ['Left to budget', formatCurrency(leftToBudget)],
      [''],
      ['Bills'],
      ['Name', 'Planned', 'Actual'],
      ...budgetCategories.map((item) => [item.name, item.planned, item.actual]),
      [''],
      ['Goals'],
      ['Name', 'Saved', 'Target'],
      ...budgetGoals.map((item) => [item.name, item.amount, item.target]),
      [''],
      ['Spending'],
      ['Date', 'Merchant', 'Category', 'Amount', 'Note'],
      ...spendEntries.map((item) => [item.date, item.merchant, item.category, item.amount, item.note]),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'centsy-budget.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveSettings = async () => {
    if (!requireLogin('Log in to save settings.')) return
    showToast('Settings saved.')
  }

  const multiplier = payFrequency === 'weekly' ? 4 : payFrequency === 'monthly' ? 1 : 2
  const monthlyIncome = incomePerPaycheck * multiplier + (includePartner ? partnerIncome : 0)
  const totalPlannedSpend = budgetCategories.reduce((sum, item) => sum + item.planned, 0)
  const spendEntriesTotal = spendEntries.reduce((sum, item) => sum + item.amount, 0)
  const remainingSpend = totalPlannedSpend - spendEntriesTotal
  const spendVariance = spendEntriesTotal - totalPlannedSpend
  const leftToBudget = monthlyIncome - totalPlannedSpend - monthlyBuffer
  const weeklyIncome = monthlyIncome / 4
  const weeklyBillTotals = [0, 0, 0, 0]
  budgetBills.forEach((bill) => {
    weeklyBillTotals[billWeekIndex(bill.date, bill.recurringDay) - 1] += bill.amount
  })
  const weeklyAmounts = weeklyBillTotals.map((bills, index) =>
    Math.round(weeklyIncome - bills - totalPlannedSpend / 4 + (index === 0 ? bankBalance / 4 : 0)),
  )
  const maxWeekly = Math.max(...weeklyAmounts.map((amount) => Math.abs(amount)), 1)
  const weeklyAverage = weeklyAmounts.reduce((sum, amount) => sum + amount, 0) / weeklyAmounts.length
  const weekRows = weeklyAmounts.map((value, index) => ({
    label: `Week ${index + 1}`,
    value,
    width: `${Math.max((Math.abs(value) / maxWeekly) * 100, 10)}%`,
  }))
  const filteredPosts = forumPosts.filter((post) => {
    const haystack = `${post.title} ${post.body} ${post.category}`.toLowerCase()
    return haystack.includes(forumSearch.trim().toLowerCase())
  })
  const bankCoverageMonths = totalPlannedSpend > 0 ? bankBalance / totalPlannedSpend : 0
  const bankCoverageLabel = totalPlannedSpend > 0 ? `${bankCoverageMonths.toFixed(1)} months covered` : 'No bills yet'
  const nextPaycheckTotal = incomePerPaycheck + (includePartner ? partnerIncome / Math.max(multiplier, 1) : 0)
  const billsPerPaycheck = totalPlannedSpend / Math.max(multiplier, 1)
  const nextPaycheckAfterBills = nextPaycheckTotal - billsPerPaycheck
  const riskScore = Math.max(
    5,
    Math.min(
      100,
      100 -
        (leftToBudget < 0 ? 20 : 0) -
        (bankCoverageMonths < 1 ? 15 : 0) -
        (spendVariance > 0 ? 10 : 0) -
        (creditCardBalance > monthlyIncome ? 10 : 0),
    ),
  )
  const riskLabel =
    riskScore >= 80 ? 'Low risk' : riskScore >= 60 ? 'Watch list' : riskScore >= 40 ? 'Elevated' : 'High risk'
  const guidance = [
    leftToBudget < 0
      ? `Trim ${formatCurrency(Math.abs(leftToBudget))} from this month.`
      : `You still have ${formatCurrency(leftToBudget)} available to assign.`,
    bankCoverageMonths < 1
      ? `Cash covers ${bankCoverageMonths.toFixed(1)} months of planned bills.`
      : `Cash covers ${bankCoverageMonths.toFixed(1)} months of planned bills.`,
    spendVariance > 0
      ? `Spending is ${formatCurrency(spendVariance)} over plan.`
      : `Spending is ${formatCurrency(Math.abs(spendVariance))} under plan.`,
    `Set aside ${formatCurrency(billsPerPaycheck)} from the next paycheck for bills.`,
  ]
  const spendRollup = budgetCategories.map((category) => {
    const logged = spendEntries
      .filter((entry) => entry.category === category.name)
      .reduce((sum, entry) => sum + entry.amount, 0)
    return {
      name: category.name,
      planned: category.planned,
      logged,
      remaining: category.planned - logged,
      status: logged > category.planned ? 'Over' : logged > category.planned * 0.9 ? 'Close' : 'Safe',
    }
  })
  const biggestCategories = [...budgetCategories]
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 3)
    .map((item) => ({ label: item.name, value: formatCurrency(item.actual) }))
  const upcomingBills = [...budgetBills]
    .sort((a, b) => billWeekIndex(a.date, a.recurringDay) - billWeekIndex(b.date, b.recurringDay))
    .slice(0, 3)
    .map((bill) => ({
      label: `${bill.name} • ${bill.recurringDay ? `day ${bill.recurringDay}` : bill.date}`,
      value: formatCurrency(bill.amount),
    }))
  const unusualSpend = [...spendEntries]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0]
  const aiSummary = leftToBudget < 0
    ? `You are over plan this month. Focus on trimming flexible spending and checking the next bill dates.`
    : `You are currently on track. You have room left, but your next bills and spending pace still matter.`
  const homeAlerts = [
    unusualSpend
      ? `Recent unusual spend: ${unusualSpend.merchant} for ${formatCurrency(unusualSpend.amount)}.`
      : 'No unusual spending detected yet.',
    weeklyAmounts.some((value) => value < 0)
      ? `At least one upcoming week goes negative.`
      : 'No upcoming cash flow dip is currently flagged.',
    `Biggest pressure area: ${biggestCategories[0]?.label ?? 'None'}.`,
  ]
  const nextActions = [
    { title: 'Tighten this month', cta: 'Review your plan', module: 'plan' as const },
    { title: 'Clean up transactions', cta: 'Open activity', module: 'activity' as const },
    { title: 'Check risk signals', cta: 'Open insights', module: 'insights' as const },
  ]

  const dashboardStats = [
    { label: 'Left to budget', value: formatCurrency(leftToBudget), tone: 'blue' as const },
    { label: 'On track', value: leftToBudget >= 0 ? 'Yes' : 'No', tone: 'green' as const },
    { label: 'Cash coverage', value: `${(bankBalance / Math.max(totalPlannedSpend, 1)).toFixed(1)} mo`, tone: 'yellow' as const },
    { label: 'Unusual spending', value: unusualSpend ? formatCurrency(unusualSpend.amount) : 'None', tone: 'purple' as const },
  ]

  const reportRows = [
    { label: 'Monthly income', value: formatCurrency(monthlyIncome) },
    { label: 'Planned spending', value: formatCurrency(totalPlannedSpend) },
    { label: 'Logged spending', value: formatCurrency(spendEntriesTotal) },
    { label: 'Remaining before plan', value: formatCurrency(remainingSpend) },
    { label: 'Left to budget', value: formatCurrency(leftToBudget) },
    { label: 'Credit card balance', value: formatCurrency(creditCardBalance) },
  ]
  const aiBudgetContext = {
    bankBalance,
    budgetBills,
    budgetCategories,
    budgetGenerated,
    budgetGoals,
    creditCardBalance,
    includePartner,
    incomePerPaycheck,
    leftToBudget,
    monthlyBuffer,
    monthlyIncome,
    partnerIncome,
    payFrequency,
    primaryGoal,
    spendEntries,
    spendVariance,
    weeklyAverage,
    weeklyAmounts,
  }

  const showLanding = isPublicPath(routePath)
  const showAuth = routePath === '/login'
  const showSettings = routePath === '/settings'

  if (showLanding) {
    if (routePath === '/about') {
      return (
        <>
          <AboutPage
            onNavigateChangelog={() => navigate('/changelog')}
            onNavigateHome={() => navigate('/')}
            onOpenAuth={() => navigate('/login')}
          />
          {showAuth ? (
            <SignInModal
              authLoading={authLoading}
              authMode={authMode}
              email={loginEmail}
              error={authError}
              onClose={() => navigate('/', { replace: true })}
              onForgotPassword={handlePasswordReset}
              onSubmit={handleAuthSubmit}
              password={loginPassword}
              setAuthMode={setAuthMode}
              setEmail={setLoginEmail}
              setPassword={setLoginPassword}
            />
          ) : null}
          {toast ? <div className="figma-toast">{toast}</div> : null}
        </>
      )
    }

    if (routePath === '/changelog') {
      return (
        <>
          <ChangelogPage
            onNavigateAbout={() => navigate('/about')}
            onNavigateHome={() => navigate('/')}
            onOpenAuth={() => navigate('/login')}
          />
          {showAuth ? (
            <SignInModal
              authLoading={authLoading}
              authMode={authMode}
              email={loginEmail}
              error={authError}
              onClose={() => navigate('/', { replace: true })}
              onForgotPassword={handlePasswordReset}
              onSubmit={handleAuthSubmit}
              password={loginPassword}
              setAuthMode={setAuthMode}
              setEmail={setLoginEmail}
              setPassword={setLoginPassword}
            />
          ) : null}
          {toast ? <div className="figma-toast">{toast}</div> : null}
        </>
      )
    }

    return (
      <>
        <LandingPage
          onEnterApp={(module) => {
            setActiveModule(module)
            navigate(moduleToPath[module])
          }}
          onNavigateAbout={() => navigate('/about')}
          onNavigateChangelog={() => navigate('/changelog')}
          onOpenAuth={() => navigate('/login')}
        />
        {showAuth ? (
          <SignInModal
            authLoading={authLoading}
            authMode={authMode}
            email={loginEmail}
            error={authError}
            onClose={() => navigate('/', { replace: true })}
            onForgotPassword={handlePasswordReset}
            onSubmit={handleAuthSubmit}
            password={loginPassword}
            setAuthMode={setAuthMode}
            setEmail={setLoginEmail}
            setPassword={setLoginPassword}
          />
        ) : null}
        {toast ? <div className="figma-toast">{toast}</div> : null}
      </>
    )
  }

  return (
    <div className="figma-app">
      <SidebarNav
        activeModule={activeModule}
        setActiveModule={(module) => navigate(moduleToPath[module])}
      />

      <div className="figma-main">
        <ShellHeader
          activeModule={activeModule}
          onOpenAuth={() => navigate('/login')}
          onOpenSettings={() => navigate('/settings')}
          onLogout={handleLogout}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          userEmail={userEmail}
        />

        <main className="figma-content">
          {activeModule === 'home' ? (
            <DashboardModule
              aiSummary={aiSummary}
              biggestCategories={biggestCategories}
              nextActions={nextActions}
              onJump={(module) => navigate(moduleToPath[module])}
              recentAlerts={homeAlerts}
              stats={dashboardStats}
              upcomingBills={upcomingBills}
            />
          ) : null}
          {activeModule === 'plan' ? (
            <BudgetModule
              budgetCategories={budgetCategories}
              budgetGoals={budgetGoals}
              categoryDraft={categoryDraft}
              formatCurrency={formatCurrency}
              goalDraft={goalDraft}
              incomePerPaycheck={incomePerPaycheck}
              includePartner={includePartner}
              onAddCategory={handleAddCategory}
              onAddGoal={handleAddGoal}
              onAddSpendEntry={handleAddSpendEntry}
              onAdjustSpendEntry={handleAdjustSpendEntry}
              onDeleteCategory={handleDeleteCategory}
              onDeleteGoal={handleDeleteGoal}
              onDeleteSpendEntry={handleDeleteSpendEntry}
              onGenerateBudget={handleGenerateBudget}
              partnerIncome={partnerIncome}
              payFrequency={payFrequency}
              primaryGoal={primaryGoal}
              recentSpends={spendEntries.slice(0, 5)}
              setCategoryDraft={(updater) => setCategoryDraft((prev) => updater(prev))}
              setGoalDraft={(updater) => setGoalDraft((prev) => updater(prev))}
              setIncludePartner={setIncludePartner}
              setIncomePerPaycheck={setIncomePerPaycheck}
              setNewSpend={(updater) => setNewSpend((prev) => updater(prev))}
              setPartnerIncome={setPartnerIncome}
              setPayFrequency={setPayFrequency}
              setPrimaryGoal={setPrimaryGoal}
              spendDraft={newSpend}
              updateCategoryActual={(name, value) =>
                setBudgetCategories((prev) =>
                  prev.map((item) => (item.name === name ? { ...item, actual: value } : item)),
                )
              }
              updateCategoryPlanned={(name, value) =>
                setBudgetCategories((prev) =>
                  prev.map((item) => (item.name === name ? { ...item, planned: value } : item)),
                )
              }
              updateGoalAmount={(name, value) =>
                setBudgetGoals((prev) =>
                  prev.map((item) => (item.name === name ? { ...item, amount: value } : item)),
                )
              }
              updateGoalTarget={(name, value) =>
                setBudgetGoals((prev) =>
                  prev.map((item) => (item.name === name ? { ...item, target: value } : item)),
                )
              }
            />
          ) : null}
          {activeModule === 'activity' ? (
            <ActivityModule
              budgetCategories={budgetCategories}
              commentsByPost={forumComments}
              filteredPosts={filteredPosts}
              forumCategories={forumCategories}
              forumLoading={forumLoading}
              forumSearch={forumSearch}
              formatCurrency={formatCurrency}
              loadComments={loadForumComments}
              newComment={newComment}
              newPost={newPost}
              newSpend={newSpend}
              onAddSpendEntry={handleAddSpendEntry}
              onAdjustSpendEntry={handleAdjustSpendEntry}
              onDeleteComment={handleDeleteComment}
              onDeletePost={handleDeletePost}
              onDeleteSpendEntry={handleDeleteSpendEntry}
              onPostComment={handleCreateComment}
              onPostThread={handleCreatePost}
              setForumSearch={setForumSearch}
              setNewComment={setNewComment}
              setNewPost={setNewPost}
              setNewSpend={setNewSpend}
              spendEntries={spendEntries}
              spendRollup={spendRollup}
              userEmail={userEmail}
              userId={userId}
            />
          ) : null}
          {activeModule === 'insights' ? (
            <div className="figma-module-stack">
              <CashflowModule
                budgetBills={budgetBills}
                formatCurrency={formatCurrency}
                leftToBudget={formatCurrency(leftToBudget)}
                lowestWeek={formatCurrency(Math.min(...weeklyAmounts))}
                monthlyIncome={formatCurrency(monthlyIncome)}
                onBillChange={handleBillChange}
                stressCount={weeklyAmounts.filter((value) => value < 0).length}
                weeks={weekRows}
              />
              <ReportsModule
                bankBalance={bankBalance}
                bankCoverageLabel={bankCoverageLabel}
                creditCardBalance={creditCardBalance}
                guidance={guidance}
                nextPaycheckAfterBills={formatCurrency(nextPaycheckAfterBills)}
                onExportCsv={handleExportCsv}
                reportRows={reportRows}
                riskLabel={riskLabel}
                riskScore={riskScore}
                setBankBalance={setBankBalance}
                setCreditCardBalance={setCreditCardBalance}
              />
            </div>
          ) : null}
          {activeModule === 'ask-ai' ? (
            <AskAiModule
              bankBalance={bankBalance}
              budget={aiBudgetContext}
              budgetCategories={budgetCategories}
              creditCardBalance={creditCardBalance}
              leftToBudget={leftToBudget}
              monthlyIncome={monthlyIncome}
              spendVariance={spendVariance}
              weeklyAverage={weeklyAverage}
            />
          ) : null}
        </main>
      </div>

      {showAuth ? (
        <SignInModal
          authLoading={authLoading}
          authMode={authMode}
          email={loginEmail}
          error={authError}
          onClose={() => navigate(moduleToPath[activeModule], { replace: true })}
          onForgotPassword={handlePasswordReset}
          onSubmit={handleAuthSubmit}
          password={loginPassword}
          setAuthMode={setAuthMode}
          setEmail={setLoginEmail}
          setPassword={setLoginPassword}
        />
      ) : null}

      {showSettings ? (
        <div className="figma-modal-backdrop" role="presentation" onClick={() => navigate(moduleToPath[activeModule], { replace: true })}>
          <div className="figma-settings-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="figma-modal-head">
              <div>
                <span className="figma-pill">Settings</span>
                <h3>Preferences</h3>
              </div>
              <button className="figma-icon-button" type="button" onClick={() => navigate(moduleToPath[activeModule], { replace: true })}>
                ×
              </button>
            </div>
            <SettingsModule
              autoSaveEnabled={autoSaveEnabled}
              includePartner={includePartner}
              monthlyBuffer={monthlyBuffer}
              notificationBillReminders={notificationBillReminders}
              notificationOverBudget={notificationOverBudget}
              notificationWeeklySummary={notificationWeeklySummary}
              onSave={handleSaveSettings}
              setAutoSaveEnabled={setAutoSaveEnabled}
              setIncludePartner={setIncludePartner}
              setMonthlyBuffer={setMonthlyBuffer}
              setNotificationBillReminders={setNotificationBillReminders}
              setNotificationOverBudget={setNotificationOverBudget}
              setNotificationWeeklySummary={setNotificationWeeklySummary}
              userEmail={userEmail}
            />
          </div>
        </div>
      ) : null}

      {toast ? <div className="figma-toast">{toast}</div> : null}
    </div>
  )
}
