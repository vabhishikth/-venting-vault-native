import { Ionicons } from '@expo/vector-icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../../components/GlassCard';
import { supabase } from '../../lib/supabase';

// --- CONFIGURATION ---
const FLARES = {
  void: { color: '#3b82f6', label: 'THE VOID', icon: 'moon', haptic: Haptics.ImpactFeedbackStyle.Heavy },
  static: { color: '#eab308', label: 'THE STATIC', icon: 'flash', haptic: Haptics.ImpactFeedbackStyle.Light },
  fracture: { color: '#ef4444', label: 'THE FRACTURE', icon: 'alert-circle', haptic: Haptics.NotificationFeedbackType.Error },
};

type FlareType = keyof typeof FLARES;

export default function PodScreen() {
  // UI State
  const [activeZone, setActiveZone] = useState<FlareType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Refs for Gesture Logic
  const activeZoneRef = useRef<FlareType | null>(null);
  const incomingFlareRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Resonance State
  const [incomingFlare, setIncomingFlare] = useState<any>(null); 
  const [isConnected, setIsConnected] = useState(false); 
  const [peerPresence, setPeerPresence] = useState(false); 
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Sync Refs
  useEffect(() => { incomingFlareRef.current = incomingFlare; }, [incomingFlare]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  // 0. AUTH CHECK
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserId(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) setCurrentUserId(session.user.id);
        else setCurrentUserId(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 1. LISTEN FOR NEW FLARES (Don't auto-load old ones)
  useEffect(() => {
    // Only listen for NEW flares - don't fetch old ones on mount
    const subscription = supabase
      .channel('public:active_flares')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'active_flares' }, (payload) => {
        // Only show flares from others (not our own)
        if (payload.new.sender_id !== currentUserIdRef.current) {
          setIncomingFlare(payload.new);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  // 2. RESONANCE CHANNEL
  useEffect(() => {
    if (!incomingFlare || !currentUserId) return;

    const channel = supabase.channel(`resonance_room:${incomingFlare.id}`, {
      config: { broadcast: { self: true } },
    });

    channel.on('broadcast', { event: 'touch_state' }, ({ payload }) => {
      if (payload.userId !== currentUserId) { 
         setPeerPresence(payload.isTouching);
      }
    });

    channel.subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [incomingFlare, currentUserId]);

  // 3. HEARTBEAT LOOP (The Magic)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    // Trigger only if I AM TOUCHING (isConnected) AND FRIEND IS TOUCHING (peerPresence)
    if (isConnected && peerPresence) {
      console.log("Starting Heartbeat Loop...");
      const triggerHeartbeat = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => {
           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 150);
      };
      triggerHeartbeat(); // Immediate first beat
      interval = setInterval(triggerHeartbeat, 1200); 
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, peerPresence]);

  // --- DEBUG HELPER ---
  const simulatePeer = () => {
      // Toggle logic for easier testing
      setPeerPresence(prev => !prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // --- ACTIONS ---
  const sendFlare = async (type: FlareType) => {
    let userId = currentUserIdRef.current;
    if (!userId) {
        const { data } = await supabase.auth.getSession();
        if (data.session) userId = data.session.user.id;
    }
    if (!userId) { Alert.alert("Error", "Please sign in again."); return; }

    Alert.alert(`Signal Sent`, `Waiting for the Pod...`);
    const { data, error } = await supabase
        .from('active_flares')
        .insert([{ sender_id: userId, flare_type: type, status: 'ignited' }])
        .select().single();
    
    if (data) setIncomingFlare(data);
  };

  const broadcastTouch = async (isTouching: boolean) => {
    setIsConnected(isTouching);
    const userId = currentUserIdRef.current;
    if (channelRef.current && userId) {
        await channelRef.current.send({
            type: 'broadcast',
            event: 'touch_state',
            payload: { userId: userId, isTouching }
        });
    }
  };

  // --- GESTURE ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (incomingFlareRef.current) {
            broadcastTouch(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
            setIsDragging(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (incomingFlareRef.current) return;
        const { dx, dy } = gestureState;
        let newZone: FlareType | null = null;
        if (dy > 20) newZone = 'fracture';
        else if (dy < -20) newZone = (dx < 0) ? 'void' : 'static';

        if (newZone !== activeZoneRef.current) {
          activeZoneRef.current = newZone;
          setActiveZone(newZone);
          if (newZone) {
             if (newZone === 'fracture') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
             else Haptics.impactAsync(FLARES[newZone].haptic as any);
          }
        }
      },
      onPanResponderRelease: () => {
        if (incomingFlareRef.current) {
             broadcastTouch(false);
        } else {
             setIsDragging(false);
             Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true }).start();
             const finalZone = activeZoneRef.current;
             if (finalZone) sendFlare(finalZone);
             activeZoneRef.current = null;
             setActiveZone(null);
        }
      },
    })
  ).current;

  const currentTheme = incomingFlare ? FLARES[incomingFlare.flare_type as FlareType] : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#000000']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>{incomingFlare ? 'ACTIVE SIGNAL' : 'THE POD'}</Text>
            <Text style={styles.headerSub}>
                {incomingFlare 
                    ? (isConnected && peerPresence ? 'RESONANCE LINKED' : 'HOLD TO CONNECT') 
                    : (isDragging ? 'DRAG TO SELECT' : 'HOLD TO SIGNAL')}
            </Text>
        </View>

        <View style={styles.emitterContainer}>
            {!incomingFlare && (
                <Animated.View style={[styles.radialMenu, { transform: [{ scale: scaleAnim }], opacity: scaleAnim }]}>
                    <View style={[styles.orbPosition, { top: -80, left: -80 }]}><View style={[styles.orb, { backgroundColor: '#3b82f6', opacity: activeZone === 'void' ? 1 : 0.3 }]} /><Text style={styles.orbLabel}>VOID</Text></View>
                    <View style={[styles.orbPosition, { top: -80, right: -80 }]}><View style={[styles.orb, { backgroundColor: '#eab308', opacity: activeZone === 'static' ? 1 : 0.3 }]} /><Text style={styles.orbLabel}>STATIC</Text></View>
                    <View style={[styles.orbPosition, { bottom: -100 }]}><View style={[styles.orb, { backgroundColor: '#ef4444', opacity: activeZone === 'fracture' ? 1 : 0.3 }]} /><Text style={styles.orbLabel}>FRACTURE</Text></View>
                </Animated.View>
            )}
            {incomingFlare && (
                 <View style={[styles.pulseRing, { borderColor: currentTheme?.color, transform: [{ scale: isConnected ? 1.2 : 1 }], borderWidth: isConnected && peerPresence ? 4 : 2 }]} />
            )}
            <View {...panResponder.panHandlers} style={styles.fingerprintWrapper} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <View style={[styles.fingerprintBtn, incomingFlare && { borderColor: currentTheme?.color }, activeZone && { borderColor: FLARES[activeZone].color }]}>
                    <Ionicons name={incomingFlare ? currentTheme?.icon as any : (activeZone ? FLARES[activeZone].icon : "finger-print") as any} size={48} color={incomingFlare ? currentTheme?.color : (activeZone ? FLARES[activeZone].color : "#334155")} />
                </View>
            </View>
        </View>

        <GlassCard style={styles.statusCard}>
            {loading ? <ActivityIndicator color="#22d3ee" /> : (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    {peerPresence && <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80'}} />}
                    <Text style={[styles.statusText, peerPresence && { color: '#4ade80', fontWeight: 'bold' }]}>
                        {incomingFlare 
                            ? (peerPresence ? "CONNECTED TO SIMULATION" : "Waiting for Peer...") 
                            : "Hold & drag to send a signal"}
                    </Text>
                </View>
            )}
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 15, justifyContent: 'center' }}>
                {incomingFlare && (
                    <>
                        {/* DEBUG BUTTON: Click this to simulate a friend */}
                        <Pressable onPress={simulatePeer} style={{ backgroundColor: peerPresence ? '#4ade8020' : '#22d3ee10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 }}>
                            <Text style={{ color: peerPresence ? '#4ade80' : '#22d3ee', fontSize: 10, fontWeight: 'bold' }}>
                                {peerPresence ? "SIMULATION ACTIVE" : "SIMULATE FRIEND"}
                            </Text>
                        </Pressable>
                        <Pressable onPress={() => { setIncomingFlare(null); setIsConnected(false); setPeerPresence(false); }}><Ionicons name="close-circle" size={20} color="#ef4444" /></Pressable>
                    </>
                )}
            </View>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: 80, paddingBottom: 100 },
  header: { alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  headerSub: { color: '#64748b', marginTop: 8, fontSize: 14, fontWeight: '600' },
  emitterContainer: { alignItems: 'center', justifyContent: 'center', height: 350 },
  radialMenu: { position: 'absolute', width: 300, height: 300, justifyContent: 'center', alignItems: 'center' },
  orbPosition: { position: 'absolute', alignItems: 'center' },
  orb: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },
  orbLabel: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  fingerprintWrapper: { alignItems: 'center', justifyContent: 'center', width: 120, height: 120 },
  fingerprintBtn: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1e293b', zIndex: 10 },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: '#334155', opacity: 0.5 },
  statusCard: { padding: 20, alignItems: 'center' },
  statusText: { color: '#64748b', fontSize: 12 },
});
