import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

export const Chip = ({ label, tone = 'muted' }) => {
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text style={[styles.text, tone === 'accent' ? styles.textAccent : null]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  muted: {
    backgroundColor: '#efe8e2',
  },
  accent: {
    backgroundColor: '#ffe7d8',
  },
  success: {
    backgroundColor: '#e1f5eb',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.inkMuted,
  },
  textAccent: {
    color: theme.colors.accentDark,
  },
})