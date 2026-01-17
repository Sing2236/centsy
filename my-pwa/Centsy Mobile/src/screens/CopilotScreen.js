import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'
import { formatCurrency } from '../utils'

export const CopilotScreen = ({
  leftToBudget,
  bankBalanceAfterBills,
  spendVariance,
  suggestedActions,
}) => {
  const [input, setInput] = useState('')
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

  const handleSend = () => {
    if (!input.trim()) return
    const userMessage = input.trim()
    const reply = userMessage.toLowerCase().includes('cut')
      ? 'Start with the top two discretionary categories and trim 10-15% for the next two weeks.'
      : userMessage.toLowerCase().includes('debt')
        ? 'Focus extra payments on the highest APR card and automate minimums on the rest.'
        : 'I can help map that change into your budget. Tell me which bill or category to adjust.'
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: reply },
    ])
    setInput('')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Copilot</Text>
      <SectionCard title="Snapshot" subtitle="What the budget is saying today.">
        {quickSummary.map((item, index) => (
          <Text style={styles.guidance} key={`summary-${index}`}>
            {item}
          </Text>
        ))}
      </SectionCard>

      <SectionCard title="Suggestions" subtitle="Next actions you can take now.">
        {suggestedActions.map((item, index) => (
          <Text style={styles.guidance} key={`suggested-${index}`}>
            {item}
          </Text>
        ))}
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
        </View>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask for a budget change..."
            placeholderTextColor={theme.colors.inkMuted}
          />
          <TouchableOpacity style={styles.chatSend} onPress={handleSend}>
            <Text style={styles.chatSendText}>Send</Text>
          </TouchableOpacity>
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
  chatSend: {
    backgroundColor: theme.colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
  },
  chatSendText: {
    color: '#fff',
    fontWeight: '700',
  },
})