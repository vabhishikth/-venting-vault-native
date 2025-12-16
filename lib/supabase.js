import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

// REPLACE THESE WITH YOUR KEYS FROM STEP 2
const supabaseUrl = 'https://uktjzlgveewxpyllhjhk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdGp6bGd2ZWV3eHB5bGxoamhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTg5NTEsImV4cCI6MjA4MTQ3NDk1MX0.sP-DTEdiiPILFKiLqobQ4mDaoBUe9ijzT3d1F714WUw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tells Supabase to handle app background/foreground states
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});