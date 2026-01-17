import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field } from '../components/Field'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'
import { formatCurrency } from '../utils'

export const BudgetScreen = ({
  categories,
  goals,
  bills,
  onUpdateCategories,
  onUpdateGoals,
  onUpdateBills,
}) => {
  const [categoryDraft, setCategoryDraft] = useState({
    name: '',
    planned: '',
  })
  const [goalDraft, setGoalDraft] = useState({
    name: '',
    amount: '',
    target: '',
  })
  const [billDraft, setBillDraft] = useState({
    name: '',
    amount: '',
    date: '',
  })

  const handleAddCategory = () => {
    if (!categoryDraft.name.trim()) return
    const planned = Number(categoryDraft.planned || 0)
    onUpdateCategories([
      ...categories,
      { name: categoryDraft.name.trim(), planned, actual: planned },
    ])
    setCategoryDraft({ name: '', planned: '' })
  }

  const handleAddGoal = () => {
    if (!goalDraft.name.trim()) return
    const amount = Number(goalDraft.amount || 0)
    const target = Number(goalDraft.target || 0)
    onUpdateGoals([...goals, { name: goalDraft.name.trim(), amount, target }])
    setGoalDraft({ name: '', amount: '', target: '' })
  }

  const handleAddBill = () => {
    if (!billDraft.name.trim()) return
    const amount = Number(billDraft.amount || 0)
    onUpdateBills([
      ...bills,
      {
        name: billDraft.name.trim(),
        amount,
        date: billDraft.date || 'Upcoming',
        recurringDay: null,
      },
    ])
    setBillDraft({ name: '', amount: '', date: '' })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Budget space</Text>
      <SectionCard title="Categories" subtitle="Plan what each category can spend.">
        {categories.map((item) => (
          <View style={styles.row} key={item.name}>
            <View>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                Planned {formatCurrency(item.planned)}
                {'\n'}
                Actual {formatCurrency(item.actual)}
              </Text>
            </View>
          </View>
        ))}
        <View style={styles.formBlock}>
          <Field
            label="Category name"
            value={categoryDraft.name}
            onChangeText={(value) =>
              setCategoryDraft((prev) => ({ ...prev, name: value }))
            }
            placeholder="Groceries"
          />
          <Field
            label="Planned"
            value={categoryDraft.planned}
            onChangeText={(value) =>
              setCategoryDraft((prev) => ({ ...prev, planned: value }))
            }
            keyboardType="numeric"
            placeholder="$"
          />
          <TouchableOpacity style={styles.action} onPress={handleAddCategory}>
            <Text style={styles.actionText}>Add category</Text>
          </TouchableOpacity>
        </View>
      </SectionCard>

      <SectionCard title="Goals" subtitle="Track savings and debt milestones.">
        {goals.map((goal) => (
          <View style={styles.row} key={goal.name}>
            <View>
              <Text style={styles.rowTitle}>{goal.name}</Text>
              <Text style={styles.rowMeta}>
                {formatCurrency(goal.amount)} of {formatCurrency(goal.target)}
              </Text>
            </View>
          </View>
        ))}
        <View style={styles.formBlock}>
          <Field
            label="Goal name"
            value={goalDraft.name}
            onChangeText={(value) =>
              setGoalDraft((prev) => ({ ...prev, name: value }))
            }
            placeholder="Emergency fund"
          />
          <Field
            label="Current"
            value={goalDraft.amount}
            onChangeText={(value) =>
              setGoalDraft((prev) => ({ ...prev, amount: value }))
            }
            keyboardType="numeric"
            placeholder="$"
          />
          <Field
            label="Target"
            value={goalDraft.target}
            onChangeText={(value) =>
              setGoalDraft((prev) => ({ ...prev, target: value }))
            }
            keyboardType="numeric"
            placeholder="$"
          />
          <TouchableOpacity style={styles.action} onPress={handleAddGoal}>
            <Text style={styles.actionText}>Add goal</Text>
          </TouchableOpacity>
        </View>
      </SectionCard>

      <SectionCard title="Bills" subtitle="Upcoming monthly bills you plan around.">
        {bills.map((bill) => (
          <View style={styles.row} key={`${bill.name}-${bill.date}`}>
            <View>
              <Text style={styles.rowTitle}>{bill.name}</Text>
              <Text style={styles.rowMeta}>
                Due {bill.date}
                {'\n'}
                Amount {formatCurrency(bill.amount)}
              </Text>
            </View>
          </View>
        ))}
        <View style={styles.formBlock}>
          <Field
            label="Bill name"
            value={billDraft.name}
            onChangeText={(value) =>
              setBillDraft((prev) => ({ ...prev, name: value }))
            }
            placeholder="Utilities"
          />
          <Field
            label="Amount"
            value={billDraft.amount}
            onChangeText={(value) =>
              setBillDraft((prev) => ({ ...prev, amount: value }))
            }
            keyboardType="numeric"
            placeholder="$"
          />
          <Field
            label="Due date"
            value={billDraft.date}
            onChangeText={(value) =>
              setBillDraft((prev) => ({ ...prev, date: value }))
            }
            placeholder="Mar 24"
          />
          <TouchableOpacity style={styles.action} onPress={handleAddBill}>
            <Text style={styles.actionText}>Add bill</Text>
          </TouchableOpacity>
        </View>
      </SectionCard>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  rowMeta: {
    fontSize: 12,
    color: theme.colors.inkMuted,
    marginTop: 4,
  },
  formBlock: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  action: {
    backgroundColor: theme.colors.ink,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
})