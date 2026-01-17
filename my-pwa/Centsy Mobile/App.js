import { StatusBar } from 'expo-status-bar'
import { Feather } from '@expo/vector-icons'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { supabase } from './src/lib/supabase'
import { billsSeed, categoriesSeed, goalsSeed } from './src/data'
import { formatCurrency } from './src/utils'
import { theme } from './src/theme'
import { AuthScreen } from './src/screens/AuthScreen'
import { BudgetScreen } from './src/screens/BudgetScreen'
import { CashflowScreen } from './src/screens/CashflowScreen'
import { SpendingScreen } from './src/screens/SpendingScreen'
import { InsightsScreen } from './src/screens/InsightsScreen'
import { MoreScreen } from './src/screens/MoreScreen'
import { PlannerScreen } from './src/screens/PlannerScreen'
import { CopilotScreen } from './src/screens/CopilotScreen'
import { PreferencesScreen } from './src/screens/PreferencesScreen'

const Tab = createBottomTabNavigator()
const MoreStack = createNativeStackNavigator()

const toNumber = (value, fallback) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toBoolean = (value, fallback) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  if (typeof value === 'number') return value !== 0
  return fallback
}

const toEnum = (value, allowed, fallback) => {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback
}

const buildPaycheckGuidance = (options) => {
  const items = []
  if (!options.bankBalance) {
    items.push('Add your bank balance for more accurate guidance.')
  } else if (options.bankBalanceAfterBills < 0) {
    items.push(
      `You are short ${formatCurrency(Math.abs(options.bankBalanceAfterBills))} for monthly bills.`
    )
  } else if (options.bankCoverageMonths >= 2) {
    items.push(
      `You have ${options.bankCoverageMonths.toFixed(1)} months of bill coverage. Consider boosting savings or debt payoff.`
    )
  } else if (options.bankCoverageMonths < 1) {
    items.push(
      `Your balance covers ${options.bankCoverageMonths.toFixed(1)} months of bills. Protect cash flow until you reach one month.`
    )
  } else {
    items.push(
      `You can cover monthly bills with ${formatCurrency(options.bankBalanceAfterBills)} left.`
    )
  }
  if (options.plannedBillsTotal > options.monthlyIncome) {
    items.push(
      `Bills exceed income by ${formatCurrency(options.plannedBillsTotal - options.monthlyIncome)}. Cut bills or add income.`
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
  if (options.leftToBudget < 0) {
    items.push(
      `Your plan is over budget by ${formatCurrency(Math.abs(options.leftToBudget))}. Reduce bills or boost income.`
    )
  } else if (options.leftToBudget < 150) {
    items.push(
      `Flex is tight. Cap spending at ${formatCurrency(options.dailyFlexTarget)} per day to stay on track.`
    )
  } else {
    items.push(
      `Aim for ${formatCurrency(options.dailyFlexTarget)} per day or ${formatCurrency(options.weeklyFlexTarget)} per week of flexible spend.`
    )
  }
  if (options.spendVariance > 0) {
    items.push(
      `Spending is over plan by ${formatCurrency(options.spendVariance)}. Pause non-essentials to catch up.`
    )
  } else if (options.spendVariance < -50) {
    items.push(
      `You are under plan by ${formatCurrency(Math.abs(options.spendVariance))}. Consider sending surplus to savings or debt.`
    )
  }
  return items.slice(0, 5)
}

const buildCreditCardGuidance = (options) => {
  const items = []
  const paymentCapacity = Math.max(0, options.leftToBudget)
  const basePayment =
    paymentCapacity > 0
      ? Math.min(options.balance, Math.max(25, Math.round(paymentCapacity * 0.6)))
      : 0
  const perPaycheck =
    basePayment > 0 ? basePayment / Math.max(1, options.effectiveMultiplier) : 0
  const monthsToClear = basePayment > 0 ? Math.ceil(options.balance / basePayment) : 0

  if (options.balance <= 0) {
    items.push('No credit card balance logged. Keep utilization under 30% and pay in full if possible.')
    return { items, basePayment: 0, perPaycheck: 0, monthsToClear: 0 }
  }

  if (options.bankBalanceAfterBills < 0) {
    items.push(
      `Cash is short by ${formatCurrency(Math.abs(options.bankBalanceAfterBills))} after bills. Focus on minimums and stabilize.`
    )
  }
  if (options.monthlyIncome > 0 && options.balance > options.monthlyIncome) {
    items.push(
      `Balance is above one month of income (${formatCurrency(options.monthlyIncome)}). Consider a 0% transfer or consolidation if rates are high.`
    )
  }
  if (paymentCapacity <= 0) {
    items.push(
      `You are over budget by ${formatCurrency(Math.abs(options.leftToBudget))}. Create monthly room before accelerating payoff.`
    )
  } else if (basePayment >= options.balance) {
    items.push(`You can clear the balance this month with ${formatCurrency(basePayment)}.`)
  } else {
    items.push(
      `Target ${formatCurrency(basePayment)} per month (${formatCurrency(perPaycheck)} per ${options.payFrequencyLabel.toLowerCase()} paycheck).`
    )
    if (monthsToClear > 0) {
      items.push(`At that pace you clear the balance in about ${monthsToClear} months.`)
    }
  }
  if (options.nextPaycheckAfterBills < 0) {
    items.push(
      `Next paycheck is tight by ${formatCurrency(Math.abs(options.nextPaycheckAfterBills))}. Split payments across checks to stay current.`
    )
  }
  items.push(
    options.debtStrategy === 'snowball'
      ? 'Snowball: pay extra toward the smallest balance while keeping minimums on the rest.'
      : 'Avalanche: pay extra toward the highest APR while keeping minimums on the rest.'
  )
  return { items, basePayment, perPaycheck, monthsToClear }
}

const MoreStackNavigator = ({ plannerProps, copilotProps, preferencesProps }) => {
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen name="More" options={{ headerShown: false }}>
        {(props) => <MoreScreen {...props} />}
      </MoreStack.Screen>
      <MoreStack.Screen name="Planner" options={{ headerShown: false }}>
        {() => <PlannerScreen {...plannerProps} />}
      </MoreStack.Screen>
      <MoreStack.Screen name="Copilot" options={{ headerShown: false }}>
        {() => <CopilotScreen {...copilotProps} />}
      </MoreStack.Screen>
      <MoreStack.Screen name="Preferences" options={{ headerShown: false }}>
        {() => <PreferencesScreen {...preferencesProps} />}
      </MoreStack.Screen>
    </MoreStack.Navigator>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [isHydrating, setIsHydrating] = useState(false)
  const saveTimer = useRef(null)

  const [incomePerPaycheck, setIncomePerPaycheck] = useState(2100)
  const [partnerIncome, setPartnerIncome] = useState(0)
  const [payFrequency, setPayFrequency] = useState('biweekly')
  const [primaryGoal, setPrimaryGoal] = useState('stability')
  const [autoSuggest, setAutoSuggest] = useState(true)
  const [includePartner, setIncludePartner] = useState(false)
  const [bankBalance, setBankBalance] = useState(0)
  const [creditCardBalance, setCreditCardBalance] = useState(0)
  const [payDates, setPayDates] = useState([''])
  const [monthlyBuffer, setMonthlyBuffer] = useState(150)
  const [debtStrategy, setDebtStrategy] = useState('avalanche')
  const [budgetCategories, setBudgetCategories] = useState(categoriesSeed)
  const [budgetGoals, setBudgetGoals] = useState(goalsSeed)
  const [budgetBills, setBudgetBills] = useState(billsSeed)
  const [spendEntries, setSpendEntries] = useState([])

  const multiplier = payFrequency === 'weekly' ? 4 : payFrequency === 'monthly' ? 1 : 2
  const effectiveMultiplier = Math.max(1, multiplier)
  const monthlyIncome = incomePerPaycheck * effectiveMultiplier + (includePartner ? partnerIncome : 0)
  const plannedBillsTotal = budgetBills.reduce((sum, bill) => sum + bill.amount, 0)
  const plannedCategoryTotal = budgetCategories.reduce((sum, cat) => sum + cat.planned, 0)
  const leftToBudget = monthlyIncome - plannedBillsTotal - plannedCategoryTotal - monthlyBuffer
  const bankBalanceAfterBills = bankBalance - plannedBillsTotal
  const bankCoverageMonths = plannedBillsTotal > 0 ? bankBalance / plannedBillsTotal : 0
  const bankCoverageLabel = plannedBillsTotal > 0 ? `${bankCoverageMonths.toFixed(1)} months` : '--'
  const nextPaycheckTotal = incomePerPaycheck + (includePartner ? partnerIncome / effectiveMultiplier : 0)
  const billsPerPaycheck = plannedBillsTotal / effectiveMultiplier
  const nextPaycheckAfterBills = nextPaycheckTotal - billsPerPaycheck
  const dailyFlexTarget = leftToBudget / 30
  const weeklyFlexTarget = leftToBudget / 4
  const spendEntriesTotal = spendEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const spendVariance = spendEntriesTotal - plannedCategoryTotal

  const riskScore = (() => {
    let score = 100
    if (plannedBillsTotal > monthlyIncome) score -= 20
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
    payFrequency === 'weekly' ? 'Weekly' : payFrequency === 'monthly' ? 'Monthly' : 'Every 2 weeks'

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
        plannedBillsTotal,
        monthlyIncome,
        bankCoverageMonths,
        spendVariance,
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
      plannedBillsTotal,
      monthlyIncome,
      bankCoverageMonths,
      spendVariance,
    ]
  )

  const creditCardPlan = useMemo(
    () =>
      buildCreditCardGuidance({
        balance: creditCardBalance,
        leftToBudget,
        bankBalanceAfterBills,
        nextPaycheckAfterBills,
        payFrequencyLabel,
        debtStrategy,
        monthlyIncome,
        effectiveMultiplier,
      }),
    [
      creditCardBalance,
      leftToBudget,
      bankBalanceAfterBills,
      nextPaycheckAfterBills,
      payFrequencyLabel,
      debtStrategy,
      monthlyIncome,
      effectiveMultiplier,
    ]
  )

  const cashflowMetrics = {
    monthlyIncome,
    plannedBillsTotal,
    bankBalanceAfterBills,
    billsPerPaycheck,
    leftToBudget,
  }

  const currentBudgetState = useMemo(
    () => ({
      incomePerPaycheck,
      partnerIncome,
      payFrequency,
      primaryGoal,
      autoSuggest,
      includePartner,
      bankBalance,
      creditCardBalance,
      payDates,
      monthlyBuffer,
      debtStrategy,
      budgetCategories,
      budgetGoals,
      budgetBills,
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
      creditCardBalance,
      payDates,
      monthlyBuffer,
      debtStrategy,
      budgetCategories,
      budgetGoals,
      budgetBills,
      spendEntries,
    ]
  )

  const applyCopilotUpdates = (updates) => {
    if (!updates || typeof updates !== 'object') return

    if (updates.incomePerPaycheck !== undefined) {
      setIncomePerPaycheck(toNumber(updates.incomePerPaycheck, incomePerPaycheck))
    }
    if (updates.partnerIncome !== undefined) {
      setPartnerIncome(toNumber(updates.partnerIncome, partnerIncome))
    }
    if (updates.payFrequency !== undefined) {
      setPayFrequency(toEnum(updates.payFrequency, ['weekly', 'biweekly', 'monthly'], payFrequency))
    }
    if (updates.primaryGoal !== undefined) {
      setPrimaryGoal(
        toEnum(updates.primaryGoal, ['stability', 'debt', 'savings'], primaryGoal)
      )
    }
    if (updates.autoSuggest !== undefined) {
      setAutoSuggest(toBoolean(updates.autoSuggest, autoSuggest))
    }
    if (updates.includePartner !== undefined) {
      setIncludePartner(toBoolean(updates.includePartner, includePartner))
    }
    if (updates.bankBalance !== undefined) {
      setBankBalance(toNumber(updates.bankBalance, bankBalance))
    }
    if (updates.creditCardBalance !== undefined) {
      setCreditCardBalance(toNumber(updates.creditCardBalance, creditCardBalance))
    }
    if (updates.payDates !== undefined && Array.isArray(updates.payDates)) {
      setPayDates(updates.payDates)
    }
    if (updates.monthlyBuffer !== undefined) {
      setMonthlyBuffer(toNumber(updates.monthlyBuffer, monthlyBuffer))
    }
    if (updates.debtStrategy !== undefined) {
      setDebtStrategy(
        toEnum(updates.debtStrategy, ['avalanche', 'snowball'], debtStrategy)
      )
    }
    if (updates.budgetCategories !== undefined && Array.isArray(updates.budgetCategories)) {
      const nextCategories = updates.budgetCategories.map((category, index) => ({
        name:
          typeof category.name === 'string' && category.name.trim()
            ? category.name.trim()
            : `Category ${index + 1}`,
        planned: toNumber(category.planned, 0),
        actual: toNumber(category.actual, 0),
      }))
      setBudgetCategories(nextCategories)
    }
    if (updates.budgetGoals !== undefined && Array.isArray(updates.budgetGoals)) {
      const nextGoals = updates.budgetGoals.map((goal, index) => ({
        name:
          typeof goal.name === 'string' && goal.name.trim()
            ? goal.name.trim()
            : `Goal ${index + 1}`,
        amount: toNumber(goal.amount, 0),
        target: toNumber(goal.target, 0),
      }))
      setBudgetGoals(nextGoals)
    }
    if (updates.budgetBills !== undefined && Array.isArray(updates.budgetBills)) {
      const nextBills = updates.budgetBills.map((bill, index) => ({
        name:
          typeof bill.name === 'string' && bill.name.trim()
            ? bill.name.trim()
            : `Bill ${index + 1}`,
        date: typeof bill.date === 'string' && bill.date.trim() ? bill.date.trim() : 'Upcoming',
        amount: toNumber(bill.amount, 0),
        recurringDay:
          typeof bill.recurringDay === 'number' && Number.isFinite(bill.recurringDay)
            ? bill.recurringDay
            : null,
      }))
      setBudgetBills(nextBills)
    }
    if (updates.spendEntries !== undefined && Array.isArray(updates.spendEntries)) {
      const nextEntries = updates.spendEntries.map((entry) => ({
        id:
          typeof entry.id === 'string' && entry.id.trim()
            ? entry.id
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        merchant: typeof entry.merchant === 'string' ? entry.merchant : 'Copilot entry',
        category: typeof entry.category === 'string' ? entry.category : 'General',
        amount: toNumber(entry.amount, 0),
        date:
          typeof entry.date === 'string' && entry.date.trim()
            ? entry.date
            : new Date().toISOString().slice(0, 10),
        note: typeof entry.note === 'string' ? entry.note : '',
      }))
      setSpendEntries(nextEntries)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const loadBudget = async () => {
      if (!session?.user?.id) return
      setIsHydrating(true)
      const { data, error } = await supabase
        .from('budget_state')
        .select('data')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (!error && data?.data) {
        const saved = data.data || {}
        setIncomePerPaycheck(toNumber(saved.incomePerPaycheck, incomePerPaycheck))
        setPartnerIncome(toNumber(saved.partnerIncome, 0))
        setPayFrequency(toEnum(saved.payFrequency, ['weekly', 'biweekly', 'monthly'], 'biweekly'))
        setPrimaryGoal(toEnum(saved.primaryGoal, ['stability', 'debt', 'savings'], 'stability'))
        setAutoSuggest(toBoolean(saved.autoSuggest, true))
        setIncludePartner(toBoolean(saved.includePartner, false))
        setBankBalance(toNumber(saved.bankBalance, 0))
        setCreditCardBalance(toNumber(saved.creditCardBalance, 0))
        setPayDates(Array.isArray(saved.payDates) ? saved.payDates : [''])
        setMonthlyBuffer(toNumber(saved.monthlyBuffer, 150))
        setDebtStrategy(toEnum(saved.debtStrategy, ['avalanche', 'snowball'], 'avalanche'))
        setBudgetCategories(Array.isArray(saved.budgetCategories) ? saved.budgetCategories : categoriesSeed)
        setBudgetGoals(Array.isArray(saved.budgetGoals) ? saved.budgetGoals : goalsSeed)
        setBudgetBills(Array.isArray(saved.budgetBills) ? saved.budgetBills : billsSeed)
        setSpendEntries(Array.isArray(saved.spendEntries) ? saved.spendEntries : [])
      }
      setIsHydrating(false)
    }
    loadBudget()
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id || isHydrating) return
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
    }
    saveTimer.current = setTimeout(async () => {
      await supabase.from('budget_state').upsert(
        {
          user_id: session.user.id,
          data: currentBudgetState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }, 800)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [currentBudgetState, session?.user?.id, isHydrating])

  if (!session) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <AuthScreen />
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    )
  }

  if (isHydrating) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Syncing your budget...</Text>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    )
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <NavigationContainer>
            <StatusBar style="dark" />
          <Tab.Navigator
            screenOptions={({ route }) => {
              const iconName = (() => {
                if (route.name === 'Budget') return 'pie-chart'
                if (route.name === 'Cash Flow') return 'repeat'
                if (route.name === 'Spending') return 'credit-card'
                if (route.name === 'Insights') return 'bar-chart-2'
                return 'more-horizontal'
              })()

              return {
                headerShown: false,
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: theme.colors.inkMuted,
                tabBarIcon: ({ color, size }) => (
                  <Feather name={iconName} color={color} size={size} />
                ),
                tabBarStyle: {
                  backgroundColor: '#fff',
                  borderTopColor: theme.colors.border,
                  height: 64,
                  paddingBottom: 8,
                },
                tabBarLabelStyle: {
                  fontSize: 11,
                  fontWeight: '600',
                },
              }
            }}
          >
              <Tab.Screen name="Budget">
                {() => (
                  <BudgetScreen
                    categories={budgetCategories}
                    goals={budgetGoals}
                    bills={budgetBills}
                    onUpdateCategories={setBudgetCategories}
                    onUpdateGoals={setBudgetGoals}
                    onUpdateBills={setBudgetBills}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="Cash Flow">
                {() => (
                  <CashflowScreen
                    incomePerPaycheck={incomePerPaycheck}
                    partnerIncome={partnerIncome}
                    includePartner={includePartner}
                    payFrequency={payFrequency}
                    bankBalance={bankBalance}
                    creditCardBalance={creditCardBalance}
                    monthlyBuffer={monthlyBuffer}
                    payDates={payDates}
                    metrics={cashflowMetrics}
                    onUpdate={(patch) => {
                      if (patch.incomePerPaycheck !== undefined) {
                        setIncomePerPaycheck(patch.incomePerPaycheck)
                      }
                      if (patch.partnerIncome !== undefined) {
                        setPartnerIncome(patch.partnerIncome)
                      }
                      if (patch.includePartner !== undefined) {
                        setIncludePartner(patch.includePartner)
                      }
                      if (patch.payFrequency !== undefined) {
                        setPayFrequency(patch.payFrequency)
                      }
                      if (patch.bankBalance !== undefined) {
                        setBankBalance(patch.bankBalance)
                      }
                      if (patch.creditCardBalance !== undefined) {
                        setCreditCardBalance(patch.creditCardBalance)
                      }
                      if (patch.monthlyBuffer !== undefined) {
                        setMonthlyBuffer(patch.monthlyBuffer)
                      }
                      if (patch.payDates !== undefined) {
                        setPayDates(patch.payDates)
                      }
                    }}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="Spending">
                {() => (
                  <SpendingScreen
                    entries={spendEntries}
                    plannedSpendTotal={plannedCategoryTotal}
                    onUpdateEntries={setSpendEntries}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="Insights">
                {() => (
                  <InsightsScreen
                    riskScore={riskScore}
                    riskLabel={riskLabel}
                    bankBalance={bankBalance}
                    plannedBillsTotal={plannedBillsTotal}
                    bankCoverageLabel={bankCoverageLabel}
                    leftToBudget={leftToBudget}
                    aiGuidance={aiGuidance}
                    creditCardBalance={creditCardBalance}
                    creditCardPlan={creditCardPlan}
                    onUpdateCreditCardBalance={setCreditCardBalance}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="More">
                {() => (
                <MoreStackNavigator
                  plannerProps={{ bills: budgetBills, goals: budgetGoals }}
                    copilotProps={{
                      leftToBudget,
                      bankBalanceAfterBills,
                      spendVariance,
                      suggestedActions: aiGuidance.slice(0, 3),
                      budgetSnapshot: currentBudgetState,
                      onApplyUpdates: applyCopilotUpdates,
                    }}
                    preferencesProps={{
                      primaryGoal,
                      debtStrategy,
                      autoSuggest,
                      onUpdate: (patch) => {
                        if (patch.primaryGoal) setPrimaryGoal(patch.primaryGoal)
                        if (patch.debtStrategy) setDebtStrategy(patch.debtStrategy)
                        if (patch.autoSuggest !== undefined) setAutoSuggest(patch.autoSuggest)
                      },
                      onSignOut: async () => {
                        await supabase.auth.signOut()
                      },
                    }}
                  />
                )}
              </Tab.Screen>
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    gap: 12,
  },
  loadingText: {
    color: theme.colors.inkMuted,
    fontSize: 14,
  },
})
