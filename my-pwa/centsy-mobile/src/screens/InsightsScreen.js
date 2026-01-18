import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Chip } from '../components/Chip'
import { Field } from '../components/Field'
import { MetricPill } from '../components/MetricPill'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'
import { formatCurrency } from '../utils'

export const InsightsScreen = ({
  riskScore,
  riskLabel,
  bankBalance,
  plannedBillsTotal,
  bankCoverageLabel,
  leftToBudget,
  aiGuidance,
  creditCardBalance,
  creditCardPlan,
  onUpdateCreditCardBalance,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>AI insights</Text>
      <SectionCard title="Risk score" subtitle="How tight the month is right now.">
        <View style={styles.riskHeader}>
          <Text style={styles.riskScore}>{riskScore}</Text>
          <Chip label={riskLabel} tone={riskScore < 60 ? 'accent' : 'success'} />
        </View>
        <View style={styles.metricGrid}>
          <MetricPill label="Bank balance" value={formatCurrency(bankBalance)} />
          <MetricPill label="Monthly bills" value={formatCurrency(plannedBillsTotal)} />
          <MetricPill label="Bills covered" value={bankCoverageLabel} />
          <MetricPill label="Left to budget" value={formatCurrency(leftToBudget)} />
        </View>
      </SectionCard>

      <SectionCard title="Paycheck guidance" subtitle="Dynamic advice for the next check.">
        <View style={styles.guidanceList}>
          {aiGuidance.map((item, index) => (
            <Text style={styles.guidanceText} key={`guidance-${index}`}>
              {item}
            </Text>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Credit card payoff"
        subtitle="Tailored payoff strategy based on your cash flow."
      >
        <Field
          label="Current credit card balance"
          value={String(creditCardBalance)}
          onChangeText={(value) => onUpdateCreditCardBalance(Number(value || 0))}
          keyboardType="numeric"
        />
        <View style={styles.guidanceList}>
          {creditCardPlan.items.map((item, index) => (
            <Text style={styles.guidanceText} key={`credit-${index}`}>
              {item}
            </Text>
          ))}
        </View>
        <View style={styles.metricGrid}>
          <MetricPill label="Monthly target" value={formatCurrency(creditCardPlan.basePayment)} />
          <MetricPill label="Per paycheck" value={formatCurrency(creditCardPlan.perPaycheck)} />
          <MetricPill
            label="Payoff timeline"
            value={creditCardPlan.monthsToClear ? `${creditCardPlan.monthsToClear} mo` : '--'}
          />
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
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riskScore: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  guidanceList: {
    gap: 8,
  },
  guidanceText: {
    fontSize: 14,
    color: theme.colors.inkMuted,
    lineHeight: 20,
  },
})