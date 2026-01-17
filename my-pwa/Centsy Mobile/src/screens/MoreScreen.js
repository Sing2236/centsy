import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { theme } from '../theme'
import { SectionCard } from '../components/SectionCard'

export const MoreScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>More</Text>
      <SectionCard title="Planner" subtitle="Upcoming bills and goal pacing.">
        <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Planner')}>
          <Text style={styles.actionText}>Open Planner</Text>
        </TouchableOpacity>
      </SectionCard>
      <SectionCard title="Copilot" subtitle="AI suggestions and next actions.">
        <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Copilot')}>
          <Text style={styles.actionText}>Open Copilot</Text>
        </TouchableOpacity>
      </SectionCard>
      <SectionCard title="Preferences" subtitle="Adjust goals and notifications.">
        <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Preferences')}>
          <Text style={styles.actionText}>Open Preferences</Text>
        </TouchableOpacity>
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
  action: {
    backgroundColor: theme.colors.ink,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
})