import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Field } from '../components/Field'
import { MetricPill } from '../components/MetricPill'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'
import { formatCurrency } from '../utils'

export const SpendingScreen = ({ entries, plannedSpendTotal, onUpdateEntries }) => {
  const [draft, setDraft] = useState({
    merchant: '',
    amount: '',
    category: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  })

  const handleAdd = () => {
    if (!draft.merchant.trim()) return
    const next = {
      id: `${Date.now()}-${draft.merchant}`,
      merchant: draft.merchant.trim(),
      amount: Number(draft.amount || 0),
      category: draft.category || 'General',
      date: draft.date,
      note: draft.note,
    }
    onUpdateEntries([next, ...entries])
    setDraft({
      merchant: '',
      amount: '',
      category: '',
      date: new Date().toISOString().slice(0, 10),
      note: '',
    })
  }

  const spendTotal = entries.reduce((sum, entry) => sum + entry.amount, 0)
  const variance = spendTotal - plannedSpendTotal

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Spending</Text>
        <SectionCard title="Today" subtitle="Log purchases to keep the plan tight.">
          <Field
            label="Merchant"
            value={draft.merchant}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, merchant: value }))}
            placeholder="Trader Joe's"
          />
          <Field
            label="Amount"
            value={draft.amount}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, amount: value }))}
            keyboardType="numeric"
            placeholder="$"
          />
          <Field
            label="Category"
            value={draft.category}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, category: value }))}
            placeholder="Groceries"
          />
          <Field
            label="Date"
            value={draft.date}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, date: value }))}
            placeholder="2026-01-16"
          />
          <Field
            label="Note"
            value={draft.note}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, note: value }))}
            placeholder="Optional"
          />
          <TouchableOpacity style={styles.action} onPress={handleAdd}>
            <Text style={styles.actionText}>Add spend</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Spend health" subtitle="Track progress vs your plan.">
          <View style={styles.metricGrid}>
            <MetricPill label="Total spend" value={formatCurrency(spendTotal)} />
            <MetricPill label="Planned" value={formatCurrency(plannedSpendTotal)} />
            <MetricPill
              label={variance > 0 ? 'Over plan' : 'Under plan'}
              value={formatCurrency(Math.abs(variance))}
            />
          </View>
        </SectionCard>

        <SectionCard title="Recent activity" subtitle="Latest expenses first.">
          {entries.length === 0 ? (
            <Text style={styles.muted}>No spend entries yet.</Text>
          ) : (
            entries.map((entry) => (
              <View style={styles.entryRow} key={entry.id}>
                <View>
                  <Text style={styles.rowTitle}>{entry.merchant}</Text>
                  <Text style={styles.rowMeta}>
                    Category {entry.category}
                    {'\n'}
                    Date {entry.date}
                  </Text>
                </View>
                <Text style={styles.amount}>{formatCurrency(entry.amount)}</Text>
              </View>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  action: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowTitle: {
    fontWeight: '700',
    color: theme.colors.ink,
  },
  rowMeta: {
    fontSize: 12,
    color: theme.colors.inkMuted,
    marginTop: 2,
  },
  amount: {
    fontWeight: '700',
    color: theme.colors.ink,
  },
  muted: {
    color: theme.colors.inkMuted,
  },
})