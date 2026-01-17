import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'

export const PreferencesScreen = ({
  primaryGoal,
  debtStrategy,
  autoSuggest,
  onUpdate,
  onSignOut,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Preferences</Text>
      <SectionCard title="Primary goal" subtitle="Guide your AI insights.">
        <View style={styles.toggleRow}>
          {['stability', 'debt', 'savings'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.toggle, primaryGoal === option ? styles.toggleActive : null]}
              onPress={() => onUpdate({ primaryGoal: option })}
            >
              <Text
                style={[
                  styles.toggleText,
                  primaryGoal === option ? styles.toggleTextActive : null,
                ]}
              >
                {option === 'stability'
                  ? 'Stability'
                  : option === 'debt'
                    ? 'Pay off debt'
                    : 'Build savings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Debt strategy" subtitle="How you want to tackle balances.">
        <View style={styles.toggleRow}>
          {['avalanche', 'snowball'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.toggle, debtStrategy === option ? styles.toggleActive : null]}
              onPress={() => onUpdate({ debtStrategy: option })}
            >
              <Text
                style={[
                  styles.toggleText,
                  debtStrategy === option ? styles.toggleTextActive : null,
                ]}
              >
                {option === 'avalanche' ? 'Avalanche' : 'Snowball'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Auto-suggest" subtitle="Surface bills and insights automatically.">
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggle, autoSuggest ? styles.toggleActive : null]}
            onPress={() => onUpdate({ autoSuggest: !autoSuggest })}
          >
            <Text style={[styles.toggleText, autoSuggest ? styles.toggleTextActive : null]}>
              {autoSuggest ? 'Auto-suggest on' : 'Auto-suggest off'}
            </Text>
          </TouchableOpacity>
        </View>
      </SectionCard>

      <TouchableOpacity style={styles.signOut} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
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
  signOut: {
    backgroundColor: theme.colors.ink,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontWeight: '700',
  },
})