import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field } from '../components/Field'
import { MetricPill } from '../components/MetricPill'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'
import { formatCurrency } from '../utils'

const frequencyLabel = (value) => {
  if (value === 'weekly') return 'Weekly'
  if (value === 'monthly') return 'Monthly'
  return 'Every 2 weeks'
}

export const CashflowScreen = ({
  incomePerPaycheck,
  partnerIncome,
  includePartner,
  payFrequency,
  bankBalance,
  creditCardBalance,
  monthlyBuffer,
  payDates,
  metrics,
  onUpdate,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Cash flow</Text>
      <SectionCard title="Paycheck setup" subtitle="Keep income and cadence up to date.">
        <Field
          label="Take-home per paycheck"
          value={String(incomePerPaycheck)}
          onChangeText={(value) => onUpdate({ incomePerPaycheck: Number(value || 0) })}
          keyboardType="numeric"
        />
        <View style={styles.toggleRow}>
          {['weekly', 'biweekly', 'monthly'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.toggle, payFrequency === option ? styles.toggleActive : null]}
              onPress={() => onUpdate({ payFrequency: option })}
            >
              <Text
                style={[
                  styles.toggleText,
                  payFrequency === option ? styles.toggleTextActive : null,
                ]}
              >
                {frequencyLabel(option)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.inlineSplit}>
          <TouchableOpacity
            style={[styles.toggle, includePartner ? styles.toggleActive : null]}
            onPress={() => onUpdate({ includePartner: !includePartner })}
          >
            <Text
              style={[styles.toggleText, includePartner ? styles.toggleTextActive : null]}
            >
              {includePartner ? 'Partner income included' : 'Add partner income'}
            </Text>
          </TouchableOpacity>
        </View>
        {includePartner ? (
          <Field
            label="Partner monthly income"
            value={String(partnerIncome)}
            onChangeText={(value) => onUpdate({ partnerIncome: Number(value || 0) })}
            keyboardType="numeric"
          />
        ) : null}
        <Field
          label="Next pay date"
          value={payDates[0] ?? ''}
          onChangeText={(value) => onUpdate({ payDates: [value] })}
          placeholder="2026-01-30"
        />
      </SectionCard>

      <SectionCard title="Cash position" subtitle="Live balances and buffers.">
        <Field
          label="Bank balance"
          value={String(bankBalance)}
          onChangeText={(value) => onUpdate({ bankBalance: Number(value || 0) })}
          keyboardType="numeric"
        />
        <Field
          label="Credit card balance"
          value={String(creditCardBalance)}
          onChangeText={(value) => onUpdate({ creditCardBalance: Number(value || 0) })}
          keyboardType="numeric"
        />
        <Field
          label="Monthly buffer"
          value={String(monthlyBuffer)}
          onChangeText={(value) => onUpdate({ monthlyBuffer: Number(value || 0) })}
          keyboardType="numeric"
        />
        <View style={styles.metricGrid}>
          <MetricPill label="Monthly income" value={formatCurrency(metrics.monthlyIncome)} />
          <MetricPill label="Bills per paycheck" value={formatCurrency(metrics.billsPerPaycheck)} />
          <MetricPill label="Bank after bills" value={formatCurrency(metrics.bankBalanceAfterBills)} />
          <MetricPill label="Left to budget" value={formatCurrency(metrics.leftToBudget)} />
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
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  toggleText: {
    fontSize: 12,
    color: theme.colors.inkMuted,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  inlineSplit: {
    flexDirection: 'row',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
})