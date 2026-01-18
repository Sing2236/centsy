import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

export const SectionCard = ({ title, subtitle, action, children }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? <Text style={styles.action}>{action}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.inkMuted,
    fontSize: 13,
  },
  action: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  body: {
    gap: theme.spacing.sm,
  },
})