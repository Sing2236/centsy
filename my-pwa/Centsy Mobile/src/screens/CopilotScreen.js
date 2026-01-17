import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'
import { formatCurrency } from '../utils'
import { supabase } from '../lib/supabase'

export const CopilotScreen = ({
  leftToBudget,
  bankBalanceAfterBills,
  spendVariance,
  suggestedActions,
  budgetSnapshot,
  onApplyUpdates,
}) => {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState(null)
  const [pendingSummary, setPendingSummary] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Tell me what you want to adjust and I will draft the next steps.',
    },
  ])

  const quickSummary = useMemo(() => {
    const items = []
    if (bankBalanceAfterBills < 0) {
      items.push(`You are short ${formatCurrency(Math.abs(bankBalanceAfterBills))} after bills.`)
    } else {
      items.push(`You have ${formatCurrency(bankBalanceAfterBills)} left after bills.`)
    }
    if (leftToBudget < 0) {
      items.push(`You are over budget by ${formatCurrency(Math.abs(leftToBudget))}.`)
    } else {
      items.push(`You have ${formatCurrency(leftToBudget)} to allocate.`)
    }
    if (spendVariance > 0) {
      items.push(`Spending is over plan by ${formatCurrency(spendVariance)}.`)
    }
    return items
  }, [bankBalanceAfterBills, leftToBudget, spendVariance])

  const handleApply = () => {
    if (!pendingUpdates) return
    if (onApplyUpdates) {
      onApplyUpdates(pendingUpdates)
    }
    setPendingUpdates(null)
    setPendingSummary('')
    setMessages((prev) => [...prev, { role: 'assistant', content: 'Applied.' }])
  }

  const handleClearPending = () => {
    setPendingUpdates(null)
    setPendingSummary('')
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const userMessage = input.trim()
    const normalized = userMessage.toLowerCase()
    setInput('')

    const applyIntentWords = new Set([
      'apply',
      'add it',
      'do it',
      'yes',
      'confirm',
      'ok',
      'okay',
      'sure',
      'yep',
      'go ahead',
    ])
    if (applyIntentWords.has(normalized) && pendingUpdates) {
      handleApply()
      return
    }
    if (/\b(cancel|never mind|nevermind|stop)\b/.test(normalized)) {
      handleClearPending()
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Canceled.' }])
      return
    }
    if (
      /\b(what can you do|help|capabilities|commands|how can you help|what do you do)\b/.test(
        normalized
      )
    ) {
      const helpMessage = [
        'I can update your budget, bills, goals, and spend log, plus nudge cash flow.',
        'Try: \"Add rent $1400\" or \"Set groceries to $350\" or \"Log $45 groceries at Target\".',
        'I will draft updates and ask you to Apply changes.',
      ].join('\n')
      setMessages((prev) => [...prev, { role: 'assistant', content: helpMessage }])
      return
    }

    const nextMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(nextMessages)
    setSending(true)
    handleClearPending()

    try {
      const { data, error } = await supabase.functions.invoke('budget-coach', {
        body: {
          messages: nextMessages.slice(-12),
          budget: budgetSnapshot,
        },
      })

      if (error) throw error
      if (data?.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Copilot error: ${data.error}` },
        ])
        return
      }

      const reply = data?.reply || 'I could not generate a reply yet.'
      const updates = data?.updates
      if (updates && typeof updates === 'object' && Object.keys(updates).length > 0) {
        setPendingUpdates(updates)
        setPendingSummary(data?.summary || 'Review these updates?')
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: reply },
          { role: 'assistant', content: 'Ready. Tap Apply changes to confirm.' },
        ])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I couldn't reach the AI. ${message}` },
      ])
    } finally {
      setSending(false)
    }
  }

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
        <Text style={styles.pageTitle}>Copilot</Text>
        <SectionCard title="Snapshot" subtitle="What the budget is saying today.">
          {quickSummary.map((item, index) => (
            <Text style={styles.guidance} key={`summary-${index}`}>
              {item}
            </Text>
          ))}
        </SectionCard>

        <SectionCard title="Suggestions" subtitle="Drafted edits and next actions.">
          {pendingUpdates ? (
            <View style={styles.pendingBlock}>
              <Text style={styles.pendingSummary}>
                {pendingSummary || 'Review these updates?'}
              </Text>
              <View style={styles.pendingActions}>
                <TouchableOpacity style={styles.action} onPress={handleApply}>
                  <Text style={styles.actionText}>Apply changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostButton} onPress={handleClearPending}>
                  <Text style={styles.ghostText}>Keep current</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            suggestedActions.map((item, index) => (
              <Text style={styles.guidance} key={`suggested-${index}`}>
                {item}
              </Text>
            ))
          )}
        </SectionCard>

        <SectionCard title="Chat" subtitle="Ask for specific changes or guidance.">
          <View style={styles.chatWindow}>
            {messages.map((message, index) => (
              <View
                key={`chat-${index}`}
                style={[
                  styles.chatBubble,
                  message.role === 'user' ? styles.chatUser : styles.chatAssistant,
                ]}
              >
                <Text style={styles.chatText}>{message.content}</Text>
              </View>
            ))}
            {sending ? (
              <View style={[styles.chatBubble, styles.chatAssistant]}>
                <Text style={styles.chatText}>Drafting changes and next steps...</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask for a budget change..."
              placeholderTextColor={theme.colors.inkMuted}
            />
            <TouchableOpacity
              style={[styles.chatSend, sending ? styles.chatSendDisabled : null]}
              onPress={handleSend}
              disabled={sending}
            >
              <Text style={styles.chatSendText}>{sending ? 'Thinking...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
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
  guidance: {
    fontSize: 14,
    color: theme.colors.inkMuted,
  },
  chatWindow: {
    gap: 10,
  },
  chatBubble: {
    padding: 12,
    borderRadius: theme.radius.md,
    maxWidth: '85%',
  },
  chatUser: {
    backgroundColor: '#ffe7d8',
    alignSelf: 'flex-end',
  },
  chatAssistant: {
    backgroundColor: '#f3ede6',
    alignSelf: 'flex-start',
  },
  chatText: {
    fontSize: 14,
    color: theme.colors.ink,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  pendingBlock: {
    gap: theme.spacing.sm,
  },
  pendingSummary: {
    fontSize: 13,
    color: theme.colors.ink,
  },
  pendingActions: {
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
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostText: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  chatSend: {
    backgroundColor: theme.colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
  },
  chatSendDisabled: {
    opacity: 0.6,
  },
  chatSendText: {
    color: '#fff',
    fontWeight: '700',
  },
})
