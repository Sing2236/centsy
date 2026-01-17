import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

export const MetricPill = ({ label, value, helper }) => {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: '#f7f2ed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
    flex: 1,
    minWidth: 140,
  },
  label: {
    fontSize: 12,
    color: theme.colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.inkMuted,
  },
})