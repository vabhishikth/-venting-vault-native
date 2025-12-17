import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true); // Start with loading to check session
  const [isSignUp, setIsSignUp] = useState(false);

  // --- CHECK FOR EXISTING SESSION ON MOUNT ---
  useEffect(() => {
    checkExistingSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      if (event === 'SIGNED_IN' && session) {
        router.replace('/(tabs)/vault');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkExistingSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Checking existing session:', !!session, error?.message);
      
      if (session) {
        // Already logged in, redirect to app
        console.log('Session found, redirecting...');
        router.replace('/(tabs)/vault');
      } else {
        // No session, show login screen
        setLoading(false);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setLoading(false);
    }
  }

  // --- 1. EMAIL AUTHENTICATION ---
  async function handleEmailAuth() {
    if (!email || !password) {
        Alert.alert("Missing Data", "Please enter both email and password.");
        return;
    }
    
    setLoading(true);
    try {
      if (isSignUp) {
        // CREATE ACCOUNT
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        Alert.alert(
            'Identity Created', 
            'Please check your email to verify your frequency.',
            [{ text: "OK" }]
        );
      } else {
        // SIGN IN
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Success -> Go to Pod
        router.replace('/(tabs)/vault');
      }
    } catch (error: any) {
      Alert.alert('Access Denied', error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 2. ANONYMOUS "GHOST" AUTHENTICATION ---
  async function handleAnonymousAuth() {
    setLoading(true);
    try {
        // Attempt A: Official Anonymous Login
        const { data, error } = await supabase.auth.signInAnonymously();
        
        // Attempt B: Ghost Protocol (Fallback if Anon Provider is disabled)
        if (error) {
            console.log("Native Anon failed, initiating Ghost Protocol...");
            
            const ghostId = Math.random().toString(36).substring(7);
            const ghostEmail = `ghost.${Date.now()}@tracker.app`;
            const ghostPassword = `secret_${ghostId}_${Date.now()}`;
            
            // 1. Create the Ghost User
            const signUpResponse = await supabase.auth.signUp({
                email: ghostEmail,
                password: ghostPassword,
            });
            
            if (signUpResponse.error) throw signUpResponse.error;

            // 2. CRITICAL FIX: Ensure we actually have a session
            // If Supabase "Confirm Email" is ON, signUp returns user but NO session.
            if (!signUpResponse.data.session) {
                 console.log("Ghost created but no session. Attempting force login...");
                 const signInResponse = await supabase.auth.signInWithPassword({
                    email: ghostEmail,
                    password: ghostPassword,
                 });
                 
                 if (signInResponse.error) {
                     // If this fails, it means Email Confirmation is strictly enforced
                     throw new Error(
                        "Ghost Access blocked. Please go to Supabase -> Authentication -> Providers -> Email -> Disable 'Confirm Email'."
                     );
                 }
            }
        }

        // Final Safety Check: Do we have a session token?
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
            throw new Error("Failed to establish secure session.");
        }

        // Success -> Go to Pod
        router.replace('/(tabs)/vault');

    } catch (error: any) {
        Alert.alert(
            'Ghost Protocol Failed', 
            error.message
        );
    } finally {
        setLoading(false);
    }
  }

  // Show loading screen while checking session
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient
          colors={['#1e1b4b', '#020617', '#050505']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadingText}>Restoring session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
    >
      {/* 1. Deep Ocean Background */}
      <View style={styles.backgroundLayer}>
        <LinearGradient
          colors={['#1e1b4b', '#020617', '#050505']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.glowOrb} />
      </View>

      {/* 2. Content */}
      <View style={styles.contentContainer}>
        <GlassCard style={styles.card}>
          
          {/* Logo */}
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={['#06b6d4', '#2563eb']}
              style={styles.logoIcon}
            >
              <Ionicons name="flash" size={32} color="white" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Venting Vault</Text>
          <Text style={styles.subtitle}>Transmute your heavy burdens into light.</Text>

          {/* Input Fields */}
          <View style={styles.inputStack}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#64748b"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {/* Main Action Button */}
          <Pressable 
            onPress={handleEmailAuth} 
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed
            ]}
          >
            {loading ? (
              <ActivityIndicator color="black" />
            ) : (
              <>
                <Ionicons 
                    name={isSignUp ? "person-add" : "finger-print"} 
                    size={24} 
                    color="black" 
                    style={{ marginRight: 8 }} 
                />
                <Text style={styles.buttonText}>
                  {isSignUp ? 'CREATE IDENTITY' : 'ACCESS VAULT'}
                </Text>
              </>
            )}
          </Pressable>

          {/* Toggle Sign In / Sign Up */}
          <Pressable onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleBtn}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already exist? Access Vault' : 'New here? Create Identity'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
             <View style={styles.dividerLine} />
             <Text style={styles.dividerText}>OR</Text>
             <View style={styles.dividerLine} />
          </View>

          {/* Anonymous "Ghost" Entry */}
          <Pressable 
            onPress={handleAnonymousAuth} 
            disabled={loading}
            style={({ pressed }) => [
                styles.ghostBtn,
                pressed && styles.buttonPressed
            ]}
          >
             <Ionicons name="eye-off-outline" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
             <Text style={styles.ghostText}>ENTER AS GHOST</Text>
          </Pressable>

        </GlassCard>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glowOrb: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    transform: [{ scaleX: 1.5 }],
  },
  contentContainer: {
    width: '100%',
    padding: 24,
    zIndex: 10,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: 24,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  inputStack: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    height: 56,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    height: '100%',
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: 'white',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'white',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  buttonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  toggleBtn: {
    marginTop: 20,
    padding: 10,
  },
  switchText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  ghostBtn: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ghostText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
  },
});
