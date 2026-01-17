import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { theme } from '../theme'
import { supabase } from '../lib/supabase'

export const AuthScreen = () => {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!email || !password) {
      setStatus('Add your email and password to continue.')
      return
    }
    setLoading(true)
    setStatus('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setStatus('Check your inbox to confirm your email.')
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Centsy Mobile</Text>
        <Text style={styles.subtitle}>Fresh budgeting momentum on the go.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={theme.colors.inkMuted}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          secureTextEntry={true}
          placeholder="Password"
          placeholderTextColor={theme.colors.inkMuted}
          value={password}
          onChangeText={setPassword}
        />
        {status ? <Text style={styles.status}>{status}</Text> : null}
        <TouchableOpacity
          style={[styles.button, loading ? styles.buttonDisabled : null]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.link}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          <Text style={styles.linkText}>
            {mode === 'login'
              ? 'New here? Create an account.'
              : 'Already have an account? Sign in.'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  hero: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.inkMuted,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  input: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  status: {
    color: theme.colors.accentDark,
    fontSize: 12,
  },
  button: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  link: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkText: {
    color: theme.colors.inkMuted,
    fontSize: 13,
  },
})