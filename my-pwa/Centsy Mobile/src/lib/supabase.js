import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ixzorpcphlmfbkmcyqfs.supabase.co'
const supabaseAnonKey = 'sb_publishable_-wqj3ZC6FXVeUcO3KmFmLQ_4ziq7nI5'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})