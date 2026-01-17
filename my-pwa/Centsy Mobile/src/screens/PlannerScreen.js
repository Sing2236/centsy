import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'
import { formatCurrency } from '../utils'

export const PlannerScreen = ({ bills, goals }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Planner</Text>
      <SectionCard title="Upcoming bills" subtitle="Next payments you are planning for.">
        {bills.length === 0 ? (
          <Text style={styles.muted}>Add bills to see this list.</Text>
        ) : (
          bills.map((bill) => (
            <View style={styles.row} key={`${bill.name}-${bill.date}`}>
              <View>
                <Text style={styles.rowTitle}>{bill.name}</Text>
                <Text style={styles.rowMeta}>{bill.date}</Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(bill.amount)}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Goals" subtitle="Progress milestones you are tracking.">
        {goals.length === 0 ? (
          <Text style={styles.muted}>Add a goal to track progress.</Text>
        ) : (
          goals.map((goal) => (
            <View style={styles.row} key={goal.name}>
              <View>
                <Text style={styles.rowTitle}>{goal.name}</Text>
                <Text style={styles.rowMeta}>
                  {formatCurrency(goal.amount)} of {formatCurrency(goal.target)}
                </Text>
              </View>
              <Text style={styles.amount}>
                {Math.round((goal.amount / Math.max(goal.target, 1)) * 100)}%
              </Text>
            </View>
          ))
        )}
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
  row: {
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
    marginTop: 4,
  },
  amount: {
    fontWeight: '700',
    color: theme.colors.ink,
  },
  muted: {
    color: theme.colors.inkMuted,
  },
})