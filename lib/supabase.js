import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// REPLACE THESE WITH YOUR KEYS FROM STEP 2
const supabaseUrl = 'https://uktjzlgveewxpyllhjhk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdGp6bGd2ZWV3eHB5bGxoamhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTg5NTEsImV4cCI6MjA4MTQ3NDk1MX0.sP-DTEdiiPILFKiLqobQ4mDaoBUe9ijzT3d1F714WUw';

// Conditionally import AsyncStorage only for native platforms
let AsyncStorage = null;
let AppState = null;

if (Platform.OS !== 'web') {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
  AppState = require('react-native').AppState;
}

// Create storage adapter that works in both native and web
const getStorageAdapter = () => {
  if (Platform.OS === 'web') {
    // For web, use localStorage if available, otherwise use memory storage
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        getItem: (key) => {
          try {
            return Promise.resolve(window.localStorage.getItem(key));
          } catch (error) {
            return Promise.resolve(null);
          }
        },
        setItem: (key, value) => {
          try {
            window.localStorage.setItem(key, value);
            return Promise.resolve();
          } catch (error) {
            return Promise.resolve();
          }
        },
        removeItem: (key) => {
          try {
            window.localStorage.removeItem(key);
            return Promise.resolve();
          } catch (error) {
            return Promise.resolve();
          }
        },
      };
    }
    // Fallback to memory storage for SSR
    const memoryStorage = new Map();
    return {
      getItem: (key) => Promise.resolve(memoryStorage.get(key) || null),
      setItem: (key, value) => {
        memoryStorage.set(key, value);
        return Promise.resolve();
      },
      removeItem: (key) => {
        memoryStorage.delete(key);
        return Promise.resolve();
      },
    };
  }
  // For native platforms, use AsyncStorage
  return AsyncStorage;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Tells Supabase to handle app background/foreground states (native only)
if (Platform.OS !== 'web' && AppState) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}