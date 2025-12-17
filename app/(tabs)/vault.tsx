import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, Path, RadialGradient, Stop } from 'react-native-svg';

// ============================================
// SCREEN COLOR THEMES
// ============================================
const SCREEN_THEMES = {
  MANUAL: ['#1e1b4b', '#0f0a2e', '#000000'], // Purple/Indigo (home)
  ECHO: ['#083344', '#0c4a6e', '#000000'], // Cyan/Teal (echo chamber)
  REGULATE: {
    box: ['#083344', '#164e63', '#000000'], // Cyan (focus)
    calm: ['#1e1b4b', '#312e81', '#000000'], // Indigo (sleep)
    sigh: ['#052e16', '#14532d', '#000000'], // Emerald (panic)
  },
  VOID: ['#0a0a0a', '#050505', '#000000'], // Ultra-dark (void)
};

// Custom Wind icon (Lucide "Wind" paths) - avoids broken lucide-react-native package
const WindIcon = ({ size = 24, color = 'white' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
    <Path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
    <Path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
  </Svg>
);

// Bioluminescent aura - SVG with Gaussian blur + radial gradient
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const AuraGlow = ({
  size,
  color,
  scale,
  opacity,
}: {
  size: number;
  color: string;
  scale: Animated.Value;
  opacity: Animated.Value;
}) => {
  const svgSize = size * 4; // Extra space for blur
  const center = svgSize / 2;
  
  return (
    <Animated.View 
      style={{ 
        position: 'absolute', 
        alignItems: 'center', 
        justifyContent: 'center',
        opacity: opacity,
        transform: [{ scale }],
      }}
    >
      <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <Defs>
          {/* Gaussian blur filter */}
          <Filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation="30" />
          </Filter>
          
          {/* Radial gradient for smooth fade */}
          <RadialGradient id="auraGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="40%" stopColor={color} stopOpacity="0.4" />
            <Stop offset="70%" stopColor={color} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        {/* Blurred circle with radial gradient */}
        <Circle
          cx={center}
          cy={center}
          r={size}
          fill="url(#auraGradient)"
          filter="url(#glow)"
        />
      </Svg>
    </Animated.View>
  );
};

// ============================================
// GRADIENT BORDER BUTTON - Glowing border effect
// ============================================
const GradientBorderButton = ({ 
  onPress, 
  text, 
  isActive = false,
}: { 
  onPress: () => void; 
  text: string; 
  isActive?: boolean;
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const innerOpacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(innerOpacity, {
        toValue: 0.7,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(innerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        alignSelf: 'center',
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          minWidth: 180,
          height: 48,
          borderRadius: 24,
          overflow: 'hidden',
          // Shadow for depth
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        {/* Gradient border (45° blue → purple → violet) */}
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Dark inner background */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 1,
            left: 1,
            right: 1,
            bottom: 1,
            borderRadius: 23,
            backgroundColor: '#1E1E1E',
            opacity: innerOpacity,
          }}
        />

        {/* Gradient glow (appears on press) */}
        <Animated.View
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            opacity: glowOpacity,
            borderRadius: 34,
            // Blur simulation
            shadowColor: '#8B5CF6',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 20,
          }}
        >
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.5, borderRadius: 34 }]}
          />
        </Animated.View>

        {/* Button text */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <Text
            style={{
              color: isActive ? 'rgba(255, 255, 255, 0.5)' : '#ffffff',
              fontSize: 15,
              fontWeight: '500',
            }}
          >
            {text}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

// Emotion/Burden types with their gradient colors
const EMOTIONS = [
  { id: 'Resentment', colors: ['#f97316', '#dc2626'] },
  { id: 'Rage', colors: ['#dc2626', '#e11d48'] },
  { id: 'Exhaustion', colors: ['#64748b', '#334155'] },
  { id: 'Guilt', colors: ['#2563eb', '#4f46e5'] },
  { id: 'Wish for End', colors: ['#7c3aed', '#581c87'] },
  { id: 'Apathy', colors: ['#9ca3af', '#4b5563'] },
  { id: 'Shame', colors: ['#4338ca', '#1e3a8a'] },
  { id: 'Terror', colors: ['#059669', '#134e4a'] },
  { id: 'Isolation', colors: ['#0891b2', '#1e40af'] },
];

const TABS = ['MANUAL', 'ECHO', 'REGULATE', 'VOID'];

// ============================================
// ECHO CHAMBER COMPONENT
// ============================================
const NUM_BARS = 32;

const EchoChamber = ({ onExit }: { onExit: () => void }) => {
  const insets = useSafeAreaInsets();
  const [isRecording, setIsRecording] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'dissolving'>('idle');
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Swipe gesture to go back
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(50)
    .onEnd((event: { translationX: number }) => {
      if (event.translationX > 100) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onExit();
      }
    });
  
  // Audio recording ref
  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Animated bar values for smooth waveform
  const barAnimations = useRef(
    Array(NUM_BARS).fill(null).map(() => new Animated.Value(8))
  ).current;
  
  // Store current bar heights for reference
  const currentHeights = useRef(Array(NUM_BARS).fill(8));
  
  // Animations
  const micScale = useRef(new Animated.Value(1)).current;
  const micGlow = useRef(new Animated.Value(0)).current;
  const dissolveOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request microphone permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();

    return () => {
      // Cleanup on unmount
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
      }
    };
  }, []);

  // Pulse animation for idle state
  useEffect(() => {
    if (phase === 'idle') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
                easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            }),
          Animated.timing(pulseAnim, {
                toValue: 1,
            duration: 2000,
                easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [phase]);

  // Generate animated equalizer bars from metering value
  const updateBarsFromMetering = (metering: number) => {
    // metering is typically -160 to 0 dB, normalize to 0-1
    // More sensitive range: -50 to 0 for better responsiveness
    const normalizedLevel = Math.max(0, Math.min(1, (metering + 50) / 50));
    
    // Create animations for each bar
    const animations = barAnimations.map((animValue, index) => {
      // Create a wave pattern that peaks in the center
      const centerIndex = NUM_BARS / 2;
      const distanceFromCenter = Math.abs(index - centerIndex);
      const positionFactor = 1 - (distanceFromCenter / centerIndex) * 0.4;
      
      // Add phase offset for wave effect (bars animate with slight delay)
      const phaseOffset = Math.sin((Date.now() / 100) + index * 0.3) * 0.3 + 0.7;
      
      // Add randomness for organic feel
      const randomFactor = 0.6 + Math.random() * 0.8;
      
      // Calculate target height (8 to 100 range)
      const targetHeight = 8 + (normalizedLevel * 92 * positionFactor * randomFactor * phaseOffset);
      
      // Smooth transition from previous height
      const prevHeight = currentHeights.current[index];
      const smoothedHeight = prevHeight * 0.2 + targetHeight * 0.8;
      currentHeights.current[index] = smoothedHeight;
      
      return Animated.timing(animValue, {
        toValue: Math.max(8, Math.min(100, smoothedHeight)),
        duration: 50,
        useNativeDriver: false,
      });
    });
    
    Animated.parallel(animations).start();
  };
  
  // Reset bars to idle state
  const resetBars = (toValue: number = 8) => {
    const animations = barAnimations.map((animValue) => 
      Animated.timing(animValue, {
        toValue,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      })
    );
    currentHeights.current = Array(NUM_BARS).fill(toValue);
    Animated.parallel(animations).start();
  };

  const startRecording = async () => {
    try {
      // Create recording with metering ENABLED
      const { recording } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true, // CRITICAL: Enable audio metering!
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        },
        (status) => {
          // This callback receives metering updates
          if (status.isRecording && status.metering !== undefined) {
            updateBarsFromMetering(status.metering);
          }
        },
        50 // Update every 50ms for smoother visualization
      );
      
      recordingRef.current = recording;
      
      // Poll for metering as backup/primary method
      meteringInterval.current = setInterval(async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              updateBarsFromMetering(status.metering);
            }
          } catch (e) {
            // Recording may have stopped
          }
        }
      }, 50);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Fallback: animate bars with simulated audio levels
      let time = 0;
      meteringInterval.current = setInterval(() => {
        time += 0.1;
        // Simulate varying audio levels
        const simulatedMetering = -30 + Math.sin(time * 2) * 15 + Math.random() * 10;
        updateBarsFromMetering(simulatedMetering);
      }, 50);
    }
  };

  const stopRecording = async () => {
    try {
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
        meteringInterval.current = null;
      }
      
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        // Don't save the URI - the audio is "shattered"
        recordingRef.current = null;
      }
      
      // Animate bars fading out
      resetBars(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handlePressIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(true);
    setPhase('recording');
    
    // Start actual recording
    await startRecording();
    
    // Animate mic
    Animated.parallel([
      Animated.spring(micScale, {
        toValue: 1.15,
        useNativeDriver: true,
      }),
      Animated.timing(micGlow, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(false);
    setPhase('dissolving');
    
    // Stop recording (this will animate bars to 0)
    await stopRecording();
    
    // Animate mic back
    Animated.parallel([
      Animated.spring(micScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(micGlow, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

    // Show dissolve animation
    Animated.timing(dissolveOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Return to main after dissolve
    setTimeout(() => {
      Animated.timing(dissolveOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setPhase('idle');
        resetBars(8); // Reset bars to idle height
        onExit();
      });
    }, 2500);
  };

    return (
    <GestureDetector gesture={swipeGesture}>
      <View style={echoStyles.container}>
        {/* Cyan/Teal Background - ECHO theme */}
        <LinearGradient
          colors={SCREEN_THEMES.ECHO as [string, string, string]}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Dissolving Overlay */}
        <Animated.View 
          style={[
            echoStyles.dissolveOverlay,
            { opacity: dissolveOpacity }
          ]}
          pointerEvents={phase === 'dissolving' ? 'auto' : 'none'}
        >
          <LinearGradient
            colors={SCREEN_THEMES.ECHO as [string, string, string]}
            style={StyleSheet.absoluteFill}
          />
        
        {/* Floating particles */}
        <View style={echoStyles.particlesContainer}>
          {[...Array(12)].map((_, i) => (
              <View
              key={i}
                style={[
                echoStyles.particle,
                {
                  left: `${10 + (i % 4) * 25}%`,
                  top: `${15 + Math.floor(i / 4) * 30}%`,
                  width: 4 + (i % 3) * 2,
                  height: 4 + (i % 3) * 2,
                  opacity: 0.2 + (i % 5) * 0.1,
                  },
                ]}
              />
          ))}
        </View>
        
        {/* Glow circle */}
        <View style={echoStyles.dissolveGlow} />
        
        {/* Icon */}
        <View style={echoStyles.dissolveIconContainer}>
          <Ionicons name="sparkles" size={48} color="#22d3ee" />
        </View>
        
        <Text style={echoStyles.dissolveTitle}>Dissolving...</Text>
        <Text style={echoStyles.dissolveSubtitle}>Your words are dust now.{'\n'}Gone forever.</Text>
        
        {/* Subtle ring */}
        <View style={echoStyles.dissolveRing} />
      </Animated.View>

      {/* Waveform Visualization */}
      <View style={echoStyles.waveformContainer}>
        {barAnimations.map((animValue, index) => (
          <Animated.View
            key={index}
            style={[
              echoStyles.waveformBar,
              {
                height: animValue,
                opacity: animValue.interpolate({
                  inputRange: [8, 100],
                  outputRange: [0.3, 1],
                }),
                backgroundColor: isRecording ? '#ef4444' : '#22d3ee',
                transform: [{
                  scaleX: animValue.interpolate({
                    inputRange: [8, 100],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]}
          />
        ))}
      </View>

      {/* Microphone Button */}
      <View style={echoStyles.micContainer}>
        <Animated.View
          style={[
            echoStyles.micGlowRing,
            {
              transform: [{ scale: micScale }],
              shadowColor: isRecording ? '#ef4444' : '#22d3ee',
              shadowOpacity: isRecording ? 0.8 : 0.3,
              shadowRadius: isRecording ? 40 : 20,
            },
          ]}
        />
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            echoStyles.micButton,
            isRecording && echoStyles.micButtonRecording,
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons 
              name="mic" 
              size={44} 
              color={isRecording ? '#ef4444' : '#22d3ee'} 
            />
          </Animated.View>
              </Pressable>
        </View>

      {/* Instructions */}
      <View style={echoStyles.instructionsContainer}>
        <Text style={[
          echoStyles.instructionTitle,
          isRecording && echoStyles.instructionTitleRecording
        ]}>
          {isRecording ? 'SCREAM. CRY. WHISPER.' : 'HOLD TO SPEAK'}
        </Text>
        <Text style={echoStyles.instructionSubtitle}>
          Nothing is saved. When you let go, the audio{'\n'}data physically shatters.
        </Text>
      </View>

      {/* Decorative Elements */}
      <View style={echoStyles.decorativeRing1} />
      <View style={echoStyles.decorativeRing2} />
      
      {/* Swipe hint */}
      <Text style={echoStyles.swipeHint}>← Swipe right to return</Text>
      </View>
    </GestureDetector>
    );
  };

// ============================================
// BREATHING EXERCISE (REGULATE) COMPONENT
// "Bioluminescent Box Breathing" - Deep Ocean Noir Style
// ============================================
const EXERCISES: { [key: string]: any } = {
  box: {
    label: 'Box Breathing',
    desc: 'Focus & Grounding',
    instruction: 'Inhale 4s • Hold 4s • Exhale 4s • Hold 4s',
    details: 'Used by Navy SEALs to regain calm and focus in high-stress situations.',
    pattern: [4, 4, 4, 4], // 16s total cycle
    color: '#22d3ee', // cyan-400 for text
    bgColor: '#06b6d4', // Cyan-500 for aura
  },
  calm: {
    label: '4-7-8 Relax',
    desc: 'Sleep & Calm',
    instruction: 'Inhale 4s • Hold 7s • Exhale 8s',
    details: 'Acts as a natural tranquilizer for the nervous system to induce sleep.',
    pattern: [4, 7, 8, 0], // 19s total cycle
    color: '#818cf8', // indigo-400
    bgColor: '#6366f1', // indigo-500
  },
  sigh: {
    label: 'Physio Sigh',
    desc: 'Panic Relief',
    instruction: 'Double Inhale (Nose) • Long Exhale (Mouth)',
    details: 'The fastest way to offload carbon dioxide and reduce anxiety in real-time.',
    pattern: [2, 0, 6, 0], // 8s total cycle
    color: '#34d399', // emerald-400
    bgColor: '#10b981', // emerald-500
  },
};

const BreathingExercise = ({ onBack }: { onBack: () => void }) => {
  const insets = useSafeAreaInsets();
  const [exercise, setExercise] = useState<'box' | 'calm' | 'sigh'>('box');
  const [isActive, setIsActive] = useState(false);
  const [timer, setTimer] = useState(0);
  
  // Swipe gesture to go back
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(50)
    .onEnd((event: { translationX: number }) => {
      if (event.translationX > 100) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsActive(false);
        onBack();
      }
    });
  
  // Get theme colors based on current exercise
  const themeColors = SCREEN_THEMES.REGULATE[exercise] as [string, string, string];

  // ===== ANIMATION VALUES =====
  // Layer 1: The Aura (The Lungs) - DRAMATIC bioluminescent pulse
  // Scale: 1 -> 3 (bigger expansion for fog effect)
  // Opacity: 0.3 -> 1.0 (intense glow when inhaling)
  const auraScale = useRef(new Animated.Value(1)).current;
  const auraOpacity = useRef(new Animated.Value(0.3)).current;
  
  // Layer 2: The Anchor (The Glass) - scales 1 -> 1.5
  const anchorScale = useRef(new Animated.Value(1)).current;

  const currentExercise = EXERCISES[exercise];
  const pattern = currentExercise.pattern;
  const cycleDuration = (pattern[0] + pattern[1] + pattern[2] + pattern[3]) * 1000;

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // ===== THE BREATHING ANIMATION =====
  // Synced breathing cycle with DRAMATIC bioluminescent effect
  // Aura moves FASTER and FURTHER than Glass (parallax depth effect)
  useEffect(() => {
    if (!isActive) {
      // Reset to idle state (dim glow)
      Animated.parallel([
        Animated.timing(auraScale, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(auraOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(anchorScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
      return;
    }

    // The breath cycle animation - DRAMATIC glow effect
    const runBreathCycle = () => {
      const [inhale, hold1, exhale, hold2] = pattern;
      
      // ===== INHALE: Expand + Intense Glow =====
      // Aura: scale 1 -> 3, opacity 0.3 -> 1.0 (BRIGHT when inhaling!)
      // Anchor: scale 1 -> 1.5 (parallax)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      Animated.parallel([
        Animated.timing(auraScale, {
          toValue: 3, // Bigger expansion for dramatic fog
          duration: inhale * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(auraOpacity, {
          toValue: 1.0, // FULL brightness when inhaling
          duration: inhale * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anchorScale, {
          toValue: 1.5,
          duration: inhale * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // ===== EXHALE: Contract + Dim (after inhale + hold1) =====
      // Aura: scale 3 -> 1, opacity 1.0 -> 0.3 (dim when exhaling)
      // Anchor: scale 1.5 -> 1
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        Animated.parallel([
          Animated.timing(auraScale, {
            toValue: 1,
            duration: exhale * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(auraOpacity, {
            toValue: 0.3, // Dim back down
            duration: exhale * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anchorScale, {
            toValue: 1,
            duration: exhale * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }, (inhale + hold1) * 1000);
    };

    // Start immediately
    runBreathCycle();
    const cycleInterval = setInterval(runBreathCycle, cycleDuration);

    return () => clearInterval(cycleInterval);
  }, [isActive, exercise]);

  const handleStop = () => {
    setIsActive(false);
    setTimer(0);
  };

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={breathStyles.container}>
        {/* Dynamic background gradient based on exercise */}
        <LinearGradient
          colors={themeColors}
          style={StyleSheet.absoluteFill}
        />

        {/* Exercise Tabs - positioned at top */}
        <View style={[breathStyles.tabsContainer, { marginTop: insets.top + 35 }]}>
        {(['box', 'calm', 'sigh'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => {
              Haptics.selectionAsync();
              setExercise(key);
              setIsActive(false);
              setTimer(0);
            }}
            style={[
              breathStyles.exerciseTab,
              exercise === key && breathStyles.exerciseTabActive,
            ]}
          >
            <Text style={[
              breathStyles.exerciseTabText,
              exercise === key && breathStyles.exerciseTabTextActive,
            ]}>
              {key === 'box' ? 'FOCUS' : key === 'calm' ? 'SLEEP' : 'PANIC'}
            </Text>
                      </Pressable>
        ))}
                    </View>

      {/* ===== BREATHING CIRCLE AREA ===== */}
      <View style={breathStyles.circleArea}>
        <View style={breathStyles.circleWrapper}>
          {/* ===== LAYER 1: THE AURA (The Lungs) =====
              Multi-layer bioluminescent glow - DRAMATIC fog effect
              Scales 1 -> 3 with opacity 0.3 -> 1.0 */}
          <AuraGlow
            size={120}
            color={currentExercise.bgColor}
            scale={auraScale}
            opacity={auraOpacity}
          />

          {/* ===== LAYER 2: THE ANCHOR (The Glass) =====
              - backdrop-filter: blur(16px)
              - 1px border rgba(255,255,255,0.1)
              - White Wind icon at 70% opacity
              - Scales 1 -> 1.5 (parallax - slower than aura) */}
          <Animated.View
            style={[
              breathStyles.anchorOuter,
              {
                transform: [{ scale: anchorScale }],
              },
            ]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView intensity={50} tint="dark" style={breathStyles.anchorInner}>
                <WindIcon size={32} color="rgba(255,255,255,0.7)" />
              </BlurView>
            ) : (
              <View style={[breathStyles.anchorInner, breathStyles.anchorInnerAndroid]}>
                <WindIcon size={32} color="rgba(255,255,255,0.7)" />
              </View>
            )}
                </Animated.View>
        </View>
      </View>

      {/* Exercise Info */}
      <View style={breathStyles.infoSection}>
        <Text style={breathStyles.exerciseTitle}>{currentExercise.label}</Text>
        <Text style={[breathStyles.exerciseDesc, { color: currentExercise.color }]}>
          {currentExercise.desc.toUpperCase()}
        </Text>

        {/* Instruction Card */}
        <View style={breathStyles.instructionCard}>
          <Text style={breathStyles.instructionText}>{currentExercise.instruction}</Text>
          <Text style={breathStyles.instructionDetails}>{currentExercise.details}</Text>
        </View>

        {/* Action Button - Gradient Border */}
        <GradientBorderButton
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            isActive ? handleStop() : setIsActive(true);
          }}
          text={isActive ? 'Pause Pattern' : 'Start Breathing'}
          isActive={isActive}
        />
        
        {/* Swipe hint */}
        <Text style={breathStyles.swipeHint}>← Swipe right to return</Text>
      </View>
      </View>
    </GestureDetector>
  );
};

// ============================================
// VOID TIMER COMPONENT - "Gamified Enforced Stillness"
// ============================================
const TIME_OPTIONS = [
  { label: '1m', value: 60, xp: 10 },
  { label: '3m', value: 180, xp: 30 },
  { label: '5m', value: 300, xp: 50 },
  { label: '10m', value: 600, xp: 100 },
];

// Clock Icon using SVG paths (for setup screen)
const ClockIcon = ({ size = 40, color = '#818cf8' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 6v6l4 2" />
  </Svg>
);

// Checkmark Icon for completion
const CheckIcon = ({ size = 64, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 6L9 17l-5-5" />
  </Svg>
);

// Logout/Exit Icon
const ExitIcon = ({ size = 14, color = '#f87171' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="m16 17 5-5-5-5" />
    <Path d="M21 12H9" />
  </Svg>
);

const VoidTimer = ({ 
  onComplete, 
  onExit 
}: { 
  onComplete: (xp: number) => void; 
  onExit: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'setup' | 'active' | 'complete'>('setup');
  const [duration, setDuration] = useState(300);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isPaused, setIsPaused] = useState(false);

  // Animation values
  const voidPulse = useRef(new Animated.Value(1)).current;
  const voidGlow = useRef(new Animated.Value(0.2)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const warningOpacity = useRef(new Animated.Value(0)).current;
  const warningTranslate = useRef(new Animated.Value(20)).current;
  const completionScale = useRef(new Animated.Value(0)).current;
  const completionGlow = useRef(new Animated.Value(0)).current;
  const setupButtonScales = useRef(TIME_OPTIONS.map(() => new Animated.Value(1))).current;
  const ringRotation = useRef(new Animated.Value(0)).current;

  // Swipe gesture to go back
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(50)
    .onEnd((event: { translationX: number }) => {
      if (event.translationX > 100 && phase === 'setup') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onExit();
      }
    });

  // Format time display
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Start the void session
  const startVoid = (time: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDuration(time);
    setTimeLeft(time);
    setPhase('active');
    setIsPaused(false);
  };

  // Abort with penalty
  const handleAbort = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    onComplete(-10);
    onExit();
  };

  // Countdown timer effect
  useEffect(() => {
    if (phase !== 'active' || isPaused) return;

    if (timeLeft <= 0) {
      const reward = TIME_OPTIONS.find(t => t.value === duration)?.xp || 20;
      onComplete(reward);
      setPhase('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animate completion
      Animated.parallel([
        Animated.spring(completionScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(completionGlow, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isPaused, phase, duration, onComplete]);

  // Void pulsing animation (active phase)
  useEffect(() => {
    if (phase !== 'active') return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(voidPulse, {
            toValue: 1.15,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(voidGlow, {
            toValue: 0.5,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(voidPulse, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(voidGlow, {
            toValue: 0.2,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [phase]);

  // Rotating ring animation (setup phase)
  useEffect(() => {
    if (phase !== 'setup') return;

    const rotateLoop = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();
    return () => rotateLoop.stop();
  }, [phase]);

  // Touch detection for pausing
  const handleTouchStart = () => {
    if (phase !== 'active') return;
    setIsPaused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Dim content, show warning
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(warningOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(warningTranslate, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleTouchEnd = () => {
    if (phase !== 'active') return;
    setIsPaused(false);

    // Restore content, hide warning
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(warningOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(warningTranslate, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ============================================
  // SETUP PHASE - Configure the Void
  // ============================================
  if (phase === 'setup') {
    const spinInterpolation = ringRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <GestureDetector gesture={swipeGesture}>
        <View style={voidStyles.container}>
          <LinearGradient
            colors={['#050505', '#030308', '#000000']}
            style={StyleSheet.absoluteFill}
          />

          {/* Ambient floating particles */}
          <View style={voidStyles.particleField}>
            {[...Array(20)].map((_, i) => (
              <View
                key={i}
                style={[
                  voidStyles.particle,
                  {
                    left: `${5 + (i * 4.7) % 90}%`,
                    top: `${10 + (i * 7.3) % 80}%`,
                    width: 2 + (i % 3),
                    height: 2 + (i % 3),
                    opacity: 0.1 + (i % 5) * 0.05,
                  },
                ]}
              />
            ))}
          </View>

          {/* Cancel button */}
          <Pressable 
            onPress={() => {
              Haptics.selectionAsync();
              onExit();
            }} 
            style={[voidStyles.cancelButton, { top: insets.top + 20 }]}
          >
            <Ionicons name="chevron-back" size={16} color="#64748b" />
            <Text style={voidStyles.cancelText}>Cancel</Text>
          </Pressable>

          {/* Central Clock Icon with rotating ring */}
          <View style={voidStyles.clockContainer}>
            {/* Outer rotating ring */}
            <Animated.View
              style={[
                voidStyles.rotatingRing,
                { transform: [{ rotate: spinInterpolation }] },
              ]}
            >
              <View style={voidStyles.ringDot} />
              <View style={[voidStyles.ringDot, { transform: [{ rotate: '90deg' }], top: 0, right: 0, bottom: 'auto', left: 'auto' }]} />
              <View style={[voidStyles.ringDot, { transform: [{ rotate: '180deg' }], top: 'auto', bottom: 0, left: '50%' }]} />
              <View style={[voidStyles.ringDot, { transform: [{ rotate: '270deg' }], top: '50%', left: 0 }]} />
            </Animated.View>

            {/* Inner glow */}
            <View style={voidStyles.clockGlow} />
            
            {/* Glass circle */}
            <View style={voidStyles.clockCircle}>
              <ClockIcon size={44} color="#818cf8" />
            </View>
          </View>

          {/* Title & Description */}
          <View style={voidStyles.setupTextContainer}>
            <Text style={voidStyles.setupTitle}>Configure the Void</Text>
            <Text style={voidStyles.setupSubtitle}>
              Select your duration. Warning: Exiting the void early{'\n'}will destabilize your resonance (XP Penalty).
            </Text>
          </View>

          {/* Duration Grid */}
          <View style={voidStyles.durationGrid}>
            {TIME_OPTIONS.map((opt, index) => (
              <Animated.View
                key={opt.label}
                style={{ transform: [{ scale: setupButtonScales[index] }] }}
              >
                <Pressable
                  onPressIn={() => {
                    Animated.spring(setupButtonScales[index], {
                      toValue: 0.95,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(setupButtonScales[index], {
                      toValue: 1,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPress={() => startVoid(opt.value)}
                  style={voidStyles.durationButton}
                >
                  <LinearGradient
                    colors={['rgba(99, 102, 241, 0)', 'rgba(99, 102, 241, 0.05)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={voidStyles.durationLabel}>{opt.label}</Text>
                  <Text style={voidStyles.durationXP}>+{opt.xp} XP</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          {/* Swipe hint */}
          <Text style={voidStyles.swipeHint}>← Swipe right to return</Text>
        </View>
      </GestureDetector>
    );
  }

  // ============================================
  // COMPLETE PHASE - Restored
  // ============================================
  if (phase === 'complete') {
    return (
      <View style={voidStyles.container}>
        <LinearGradient
          colors={['#050505', '#030308', '#000000']}
          style={StyleSheet.absoluteFill}
        />

        {/* Radiant glow behind checkmark */}
        <Animated.View
          style={[
            voidStyles.completionGlow,
            {
              opacity: completionGlow,
              transform: [{ scale: completionScale }],
            },
          ]}
        />

        {/* Checkmark circle */}
        <Animated.View
          style={[
            voidStyles.completionCircle,
            {
              transform: [{ scale: completionScale }],
            },
          ]}
        >
          <CheckIcon size={64} color="#0a0a0a" />
        </Animated.View>

        {/* Restored text */}
        <Animated.View
          style={{
            opacity: completionGlow,
            transform: [{ scale: completionScale }],
          }}
        >
          <Text style={voidStyles.restoredTitle}>RESTORED.</Text>
          <Text style={voidStyles.restoredSubtitle}>
            The silence has strengthened you.
          </Text>
        </Animated.View>

        {/* Return button */}
        <Animated.View
          style={{
            opacity: completionGlow,
            transform: [{ scale: completionScale }],
          }}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onExit();
            }}
            style={voidStyles.returnButton}
          >
            <Text style={voidStyles.returnButtonText}>RETURN TO VAULT</Text>
          </Pressable>
        </Animated.View>

        {/* Particle celebration */}
        {[...Array(12)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              voidStyles.celebrationParticle,
              {
                left: `${20 + (i * 5) % 60}%`,
                top: `${30 + (i * 7) % 40}%`,
                opacity: completionGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3 + (i % 4) * 0.1],
                }),
              },
            ]}
          />
        ))}
      </View>
    );
  }

  // ============================================
  // ACTIVE PHASE - The Void (Pure Stillness)
  // ============================================
  return (
    <Pressable
      style={voidStyles.activeContainer}
      onPressIn={handleTouchStart}
      onPressOut={handleTouchEnd}
    >
      {/* Pure black background */}
      <View style={voidStyles.pureBlack} />

      {/* The Void Circle - Pulsing indigo */}
      <Animated.View
        style={[
          voidStyles.voidOuter,
          {
            opacity: contentOpacity,
            transform: [
              { scale: Animated.multiply(contentScale, voidPulse) },
            ],
          },
        ]}
      >
        {/* Deep indigo aura */}
        <Animated.View
          style={[
            voidStyles.voidAura,
            { opacity: voidGlow },
          ]}
        />

        {/* Border ring */}
        <View style={voidStyles.voidRing}>
          {/* Timer display */}
          <Text style={voidStyles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </Animated.View>

      {/* Warning Overlay (appears when touching) */}
      <Animated.View
        style={[
          voidStyles.warningContainer,
          {
            opacity: warningOpacity,
            transform: [{ translateY: warningTranslate }],
          },
        ]}
        pointerEvents={isPaused ? 'auto' : 'none'}
      >
        <Text style={voidStyles.warningTitle}>
          WARNING: RESONANCE INSTABILITY
        </Text>

        <Pressable
          onPress={handleAbort}
          style={voidStyles.abortButton}
        >
          <View style={voidStyles.abortButtonGlow} />
          <View style={voidStyles.abortButtonInner}>
            <ExitIcon size={14} color="#f87171" />
            <Text style={voidStyles.abortButtonText}>Abort & Exit (-10 XP)</Text>
          </View>
        </Pressable>

        <Text style={voidStyles.releaseHint}>
          Release to return to the void.
        </Text>
      </Animated.View>

      {/* Subtle ambient particles */}
      {[...Array(8)].map((_, i) => (
        <View
          key={i}
          style={[
            voidStyles.ambientDot,
            {
              left: `${10 + (i * 12)}%`,
              top: `${20 + (i * 8) % 60}%`,
              opacity: isPaused ? 0.02 : 0.05 + (i % 3) * 0.02,
            },
          ]}
        />
      ))}
    </Pressable>
  );
};

// ============================================
// VOID TIMER STYLES
// ============================================
const voidStyles = StyleSheet.create({
  // Common
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  activeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pureBlack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },

  // Particles
  particleField: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },

  // Cancel button
  cancelButton: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 14,
  },

  // Clock (Setup)
  clockContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  rotatingRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  ringDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(129, 140, 248, 0.4)',
    top: '50%',
    left: -2,
    marginTop: -2,
  },
  clockGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  clockCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Setup text
  setupTextContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  setupTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  setupSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // Duration grid
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  durationButton: {
    width: 145,
    paddingVertical: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  durationLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  durationXP: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Swipe hint
  swipeHint: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 11,
    letterSpacing: 1,
  },

  // Active phase - The Void
  voidOuter: {
    width: width * 0.7,
    height: width * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voidAura: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },
  voidRing: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.35,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '200',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: 'rgba(165, 180, 252, 0.4)',
    letterSpacing: 4,
  },

  // Warning overlay
  warningContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(248, 113, 113, 0.8)',
    letterSpacing: 3,
    marginBottom: 20,
  },
  abortButton: {
    position: 'relative',
    borderRadius: 28,
    overflow: 'hidden',
  },
  abortButtonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  abortButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 10,
  },
  abortButtonText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  releaseHint: {
    marginTop: 24,
    fontSize: 10,
    color: '#475569',
  },

  // Ambient dots (active)
  ambientDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6366f1',
  },

  // Complete phase
  completionGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 100,
  },
  completionCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
  },
  restoredTitle: {
    fontSize: 28,
    fontWeight: '200',
    color: 'white',
    letterSpacing: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  restoredSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 60,
  },
  returnButton: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 32,
    backgroundColor: '#ffffff',
  },
  returnButtonText: {
    color: '#0a0a0a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
  },
  celebrationParticle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
});

// ============================================
// VOID SPRITE COMPONENT
// ============================================
const VoidSprite = () => {
  const [isActive, setIsActive] = useState(false);
  
  return (
    <Pressable 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsActive(!isActive);
      }}
      style={styles.voidSpriteContainer}
    >
      <View style={[
        styles.voidSpriteFace,
        isActive && styles.voidSpriteFaceActive
      ]}>
        {isActive && <View style={styles.voidSpriteGlow} />}
        <View style={styles.voidSpriteEyes}>
          <View style={[styles.voidSpriteEye, isActive && styles.voidSpriteEyeActive]} />
          <View style={[styles.voidSpriteEye, isActive && styles.voidSpriteEyeActive]} />
        </View>
      </View>
      {isActive && (
        <Text style={styles.voidSpriteText}>Breathe with me</Text>
      )}
    </Pressable>
  );
};

// ============================================
// EMOTION CARD COMPONENT
// ============================================
const EmotionCard = ({ 
  emotion, 
  isSelected, 
  onPress 
}: { 
  emotion: typeof EMOTIONS[0]; 
  isSelected: boolean; 
  onPress: () => void;
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.emotionCard,
        isSelected && styles.emotionCardSelected,
        !isSelected && styles.emotionCardInactive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <LinearGradient
        colors={emotion.colors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          styles.cardGradient,
          { opacity: isSelected ? 0.25 : 0.08 },
        ]}
      />
      
      {isSelected && <View style={styles.selectedBorder} />}
      
      <View style={styles.iconContainer}>
        {isSelected ? (
          <LinearGradient
            colors={emotion.colors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircleGradient}
          >
            <Ionicons name="flame" size={28} color="white" />
          </LinearGradient>
        ) : (
          <View style={styles.iconCircleDark}>
            <LinearGradient
              colors={emotion.colors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.smallDot}
            />
                </View>
            )}
                </View>
      
      <View style={styles.cardTextContainer}>
        <Text style={[
          styles.emotionLabel,
          !isSelected && styles.emotionLabelInactive
        ]}>
          {emotion.id.toUpperCase()}
        </Text>
        {isSelected && (
          <Text style={styles.tapToBegin}>Tap to Begin</Text>
        )}
            </View>
    </Pressable>
  );
};

// ============================================
// MANUAL MODE COMPONENT
// ============================================
const ManualMode = ({ 
  selectedEmotion, 
  onEmotionPress 
}: { 
  selectedEmotion: string;
  onEmotionPress: (id: string) => void;
}) => {
  return (
    <View style={styles.mainContent}>
      {/* VoidSprite Mascot */}
      <View style={styles.mascotSection}>
        <VoidSprite />
      </View>

      {/* Flexible spacer */}
      <View style={styles.flexSpacer} />

      {/* Bottom Group */}
      <View style={styles.bottomGroup}>
        {/* Sparkle Icon */}
        <View style={styles.sparkleContainer}>
          <View style={styles.sparkleCircle}>
            <Ionicons name="sparkles" size={24} color="#22d3ee" />
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Select Your Burden</Text>
          <Text style={styles.subtitle}>WHAT WEIGHS ON YOUR SOUL?</Text>
        </View>

        {/* Emotion Cards */}
        <View style={styles.cardsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
            decelerationRate="fast"
            snapToInterval={172}
            snapToAlignment="center"
          >
            {EMOTIONS.map((emotion) => (
              <EmotionCard
                key={emotion.id}
                emotion={emotion}
                isSelected={selectedEmotion === emotion.id}
                onPress={() => onEmotionPress(emotion.id)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
      </View>
  );
};

// ============================================
// MAIN VAULT SCREEN
// ============================================
export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('MANUAL');
  const [selectedEmotion, setSelectedEmotion] = useState('Resentment');

  const handleTabPress = (tab: string) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const handleEmotionPress = (emotionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedEmotion(emotionId);
  };

  // Handle XP completion (could be stored/persisted later)
  const handleVoidComplete = (xp: number) => {
    // In a real app, this would update user's XP in state/database
    console.log(`Void completed with ${xp} XP`);
    // Could show a toast notification here
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'ECHO':
        return <EchoChamber onExit={() => setActiveTab('MANUAL')} />;
      case 'REGULATE':
        return <BreathingExercise onBack={() => setActiveTab('MANUAL')} />;
      case 'VOID':
        return (
          <VoidTimer 
            onComplete={handleVoidComplete}
            onExit={() => setActiveTab('MANUAL')}
          />
        );
      case 'MANUAL':
      default:
        return (
          <ManualMode 
            selectedEmotion={selectedEmotion}
            onEmotionPress={handleEmotionPress}
          />
        );
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={styles.container}>
        {/* Background Gradient - only for MANUAL mode (other screens have their own) */}
        {activeTab === 'MANUAL' && (
          <LinearGradient 
            colors={SCREEN_THEMES.MANUAL as [string, string, string]} 
            style={StyleSheet.absoluteFill} 
          />
        )}

        {/* Header - only show on MANUAL (ECHO, REGULATE, VOID have their own UI) */}
        {activeTab === 'MANUAL' && (
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <View style={styles.headerLeft}>
              <View style={styles.logoIcon}>
                <Ionicons name="flame" size={18} color="#22d3ee" />
              </View>
              <Text style={styles.headerTitle}>VAULT</Text>
            </View>
            <Pressable 
              style={styles.menuButton}
              onPress={() => Haptics.selectionAsync()}
            >
              <Ionicons name="menu" size={24} color="white" />
              </Pressable>
          </View>
        )}

        {/* Tab Navigation - only on MANUAL */}
        {activeTab === 'MANUAL' && (
        <View style={styles.tabContainer}>
          <View style={styles.tabPill}>
            {TABS.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => handleTabPress(tab)}
                style={[
                  styles.tab,
                  activeTab === tab && styles.tabActive,
                ]}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
      </View>
      )}

      {/* Content */}
      {renderContent()}
      </View>
    </GestureHandlerRootView>
  );
}

// ============================================
// ECHO CHAMBER STYLES
// ============================================
const echoStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  
  // Dissolve overlay
  dissolveOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 100,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute', 
    borderRadius: 10,
    backgroundColor: '#22d3ee',
  },
  dissolveGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
  },
  dissolveIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dissolveTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: 'white',
    letterSpacing: 6,
    marginTop: 20,
    textTransform: 'uppercase',
  },
  dissolveSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  dissolveRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.1)',
  },

  // Waveform
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    width: '100%',
    gap: 3,
    marginBottom: 50,
    paddingHorizontal: 10,
  },
  waveformBar: {
    width: 4,
    borderRadius: 4,
    minHeight: 8,
  },

  // Microphone
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  micGlowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  micButtonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.6)',
    shadowColor: '#ef4444',
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },

  // Instructions
  instructionsContainer: {
    alignItems: 'center',
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22d3ee',
    letterSpacing: 3,
    marginBottom: 12,
  },
  instructionTitleRecording: {
    color: '#ef4444',
  },
  instructionSubtitle: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Decorative elements
  decorativeRing1: {
    position: 'absolute',
    top: 80,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.05)',
  },
  decorativeRing2: {
    position: 'absolute',
    bottom: 150,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.03)',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 30,
    left: 0, 
    right: 0, 
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    letterSpacing: 1,
  },
});

// ============================================
// BREATHING EXERCISE STYLES
// ============================================
// ============================================
// BREATHING STYLES - "Bioluminescent Box Breathing"
// Deep Ocean Noir Visual Style
// ============================================
const breathStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  exerciseTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exerciseTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  exerciseTabText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  exerciseTabTextActive: {
    color: 'white',
  },
  circleArea: {
    flex: 0, // Don't expand - fixed height
    alignItems: 'center', 
    justifyContent: 'center',
    height: 300, // Slightly taller
    marginTop: 40, // Pushed down a bit
  },
  circleWrapper: {
    width: 220, // Slightly smaller
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // ===== LAYER 2: THE ANCHOR (The Glass) =====
  // backdrop-filter: blur(16px)
  // 1px border rgba(255,255,255,0.1)
  anchorOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1, // 1px border
    borderColor: 'rgba(255, 255, 255, 0.15)', // Subtle white ring
    overflow: 'hidden',
  },
  anchorInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 60,
  },
  anchorInnerAndroid: {
    // Android fallback - simulate backdrop blur
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 120, // Space for bottom tab bar
    marginTop: 30, // Pushed down a bit more
  },
  exerciseTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  exerciseDesc: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    marginBottom: 24,
  },
  instructionCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionDetails: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  actionButtonPause: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowOpacity: 0,
  },
  actionButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  actionButtonTextPause: {
    color: 'white',
  },
  swipeHint: {
    marginTop: 20,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    letterSpacing: 1,
  },
});

// ============================================
// MAIN STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabContainer: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  tabTextActive: {
    color: 'white',
  },

  // Main Content
  mainContent: {
    flex: 1,
    alignItems: 'center',
  },

  // Spacers
  flexSpacer: {
    flex: 0.3,
  },
  bottomGroup: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 130,
  },
  bottomSpacer: {
    height: 0,
  },

  // VoidSprite
  mascotSection: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 20,
  },
  voidSpriteContainer: {
    alignItems: 'center',
    gap: 12,
  },
  voidSpriteFace: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  voidSpriteFaceActive: {
    backgroundColor: '#1e1b4b',
    borderColor: 'rgba(99, 102, 241, 0.5)',
    shadowOpacity: 0.6,
    transform: [{ scale: 1.1 }],
  },
  voidSpriteGlow: {
    position: 'absolute', 
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: 'rgba(129, 140, 248, 0.3)',
  },
  voidSpriteEyes: {
    flexDirection: 'row',
    gap: 10,
  },
  voidSpriteEye: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'white',
  },
  voidSpriteEyeActive: {
    opacity: 0.6,
    transform: [{ scaleY: 0.75 }],
  },
  voidSpriteText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#a5b4fc',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Sparkle
  sparkleContainer: {
    marginBottom: 25,
  },
  sparkleCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },

  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  // Cards Section
  cardsSection: {
    width: '100%',
  },
  cardsContainer: {
    paddingHorizontal: width / 2 - 80,
    gap: 12,
    paddingVertical: 10,
  },
  
  // Emotion Card
  emotionCard: {
    width: 160,
    height: 200,
    borderRadius: 28,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emotionCardSelected: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    zIndex: 10,
  },
  emotionCardInactive: {
    opacity: 0.6,
  },
  cardGradient: {
    borderRadius: 24,
  },
  selectedBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  
  // Icon
  iconContainer: {
    alignItems: 'flex-start',
  },
  iconCircleGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconCircleDark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  
  // Card Text
  cardTextContainer: {
    gap: 4,
  },
  emotionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 1.2,
  },
  emotionLabelInactive: {
    color: '#cbd5e1',
  },
  tapToBegin: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
  },
});
