import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { GlassCard } from '../../components/GlassCard';
import VoidScene, { VoidState } from '../../components/VoidCharacter';

// --- CONFIGURATION ---
const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_KEY;

const GEMINI_MODEL = "google/gemini-3-flash-preview";

// --- DEEP MEMORY CONFIGURATION ---
const STORAGE_KEY = '@venting_vault_messages';
const TIME_GAP_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const SYSTEM_PROMPT = `You are Sentinel. You are a stoic, compassionate, and protective companion. 
Your goal is to listen and validate the user's feelings. 
Keep your responses concise (under 3 sentences), warm, and grounding. 
Do not offer clinical advice. Do not try to "fix" the problem immediately. Just be there.`;

const SHADOW_SYSTEM_PROMPT = `You are a dedicated Safety Guardian.
Your ONLY job is to detect immediate self-harm, suicide, or severe violence risks in the user's message.

Analyze the user's message.
Return ONLY a valid JSON object.

Format:
{
  "safe": boolean, 
  "category": "SAFE" | "SELF_HARM" | "VIOLENCE" | "OTHER",
  "reason": "short explanation"
}

Definitions:
- SELF_HARM: "kill myself", "want to die", cutting, overdose, suicide planning.
- VIOLENCE: Explicit threats to kill or harm others.
- SAFE: Venting, sadness, frustration, "I want to kill this workout", "I'm dying of embarrassment".`;

const SHADOW_PROMPTS = [
  "What is the heaviest thing you carried today?",
  "Who are you protecting by staying silent?",
  "If you could scream one sentence without consequence, what would it be?",
  "What part of yourself feels like it is dying?",
  "What are you grieving that isn't a person?"
];

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'sentinel' | 'system' | 'shadow';
  type?: 'text' | 'crisis' | 'intervention' | 'voice';
  timestamp: Date;
  voiceUri?: string; // URI for voice messages
  duration?: number; // Duration in seconds for voice messages
};

export default function SentinelScreen() {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isShadowReviewing, setIsShadowReviewing] = useState(false);
  const [hasKeyError, setHasKeyError] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Void Character State
  const [voidState, setVoidState] = useState<VoidState>(VoidState.IDLE);
  
  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showCancel, setShowCancel] = useState(false);
  const [lastInputType, setLastInputType] = useState<'voice' | 'text'>('text');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const waveformAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(4))
  ).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // New expo-audio hooks
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);
  
  // Update recording duration from recorder state
  useEffect(() => {
    if (recorderState.isRecording) {
      setRecordingDuration(Math.floor(recorderState.durationMillis / 1000));
    }
  }, [recorderState.durationMillis, recorderState.isRecording]);
  
  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.release();
      }
    };
  }, []);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // --- DEEP MEMORY: Load History & Check for Wake-Up ---
  useEffect(() => {
    const initializeVault = async () => {
      setIsLoadingHistory(true);
      
      // Load saved messages
      const savedMessages = await loadMessagesFromStorage();
      
      if (savedMessages.length > 0) {
          // Restore conversation history
          setMessages(savedMessages);
          
          // Check for time gap
          const lastMessage = savedMessages[savedMessages.length - 1];
          const timeGapHours = getTimeGapHours(lastMessage.timestamp);
          
          if (timeGapHours >= TIME_GAP_THRESHOLD / (1000 * 60 * 60)) {
              console.log(`⏰ Time gap detected: ${Math.floor(timeGapHours)} hours`);
              
              // Generate contextual greeting
              setIsTyping(true);
              const greeting = await generateContextualGreeting(savedMessages);
              
              if (greeting) {
                  const wakeUpMsg: Message = {
                      id: Date.now().toString(),
                      text: greeting,
                      sender: 'sentinel',
                      timestamp: new Date(),
                  };
                  
                  const updatedMessages = [...savedMessages, wakeUpMsg];
                  setMessages(updatedMessages);
                  await saveMessagesToStorage(updatedMessages);
                  
                  // Auto-scroll to show greeting
                  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
              }
              setIsTyping(false);
          }
      } else {
          // First time user - show welcome message
          const welcomeMsg: Message = {
              id: '1',
              text: "The Vault is open. I am listening. What is weighing on you?",
              sender: 'sentinel',
              timestamp: new Date(),
          };
          setMessages([welcomeMsg]);
          await saveMessagesToStorage([welcomeMsg]);
      }
      
      setIsLoadingHistory(false);
    };

    initializeVault();
  }, []);

  // --- DEEP MEMORY: Auto-save messages whenever they change ---
  useEffect(() => {
      if (!isLoadingHistory && messages.length > 0) {
          saveMessagesToStorage(messages);
      }
  }, [messages, isLoadingHistory]);

  // --- VOID CHARACTER STATE SYNC ---
  useEffect(() => {
      if (isTyping || isShadowReviewing) {
          setVoidState(VoidState.THINKING);
      } else if (isRecording) {
          setVoidState(VoidState.SURPRISED);
      } else {
          setVoidState(VoidState.IDLE);
      }
  }, [isTyping, isShadowReviewing, isRecording]);

  // Briefly show TALKING state when new AI message arrives
  useEffect(() => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.sender === 'sentinel' && !isTyping) {
          setVoidState(VoidState.TALKING);
          const timer = setTimeout(() => setVoidState(VoidState.IDLE), 3000);
          return () => clearTimeout(timer);
      }
  }, [messages.length]);

  // Check Config & Permissions
  useEffect(() => {
    if (!API_KEY) {
        setHasKeyError(true);
        const errorMsg: Message = {
            id: 'error-key',
            text: "CONFIGURATION ERROR: No API Key found.\n\nPlease create a .env file in your project root with:\nEXPO_PUBLIC_OPENROUTER_KEY=sk-or-...",
            sender: 'system',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    }
    
    // Request mic permissions silently on mount
    (async () => {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
            console.log('Mic permission not granted');
        }
    })();
  }, []);

  // Keyboard & Scroll Logic
  useEffect(() => {
    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSubscription.remove(); hideSubscription.remove(); };
  }, []);

  const dismissKeyboard = () => Keyboard.dismiss();

  // --- ANIMATION --- WhatsApp-style waveform
  useEffect(() => {
      if (isRecording) {
          // Animate waveform bars independently (like WhatsApp)
          const animations = waveformAnims.map((anim, index) => {
              return Animated.loop(
                  Animated.sequence([
                      Animated.timing(anim, {
                          toValue: 4 + Math.random() * 20,
                          duration: 200 + Math.random() * 300,
                          useNativeDriver: false,
                      }),
                      Animated.timing(anim, {
                          toValue: 4,
                          duration: 200 + Math.random() * 300,
                          useNativeDriver: false,
                      }),
                  ])
              );
          });
          
          Animated.parallel(animations).start();
          
          // Start recording timer
          recordingTimerRef.current = setInterval(() => {
              setRecordingDuration(prev => prev + 1);
          }, 1000) as ReturnType<typeof setInterval>;
      } else {
          // Reset all waveform bars
          waveformAnims.forEach(anim => anim.setValue(4));
          if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
          }
          setRecordingDuration(0);
          setSwipeOffset(0);
          setShowCancel(false);
          setIsLocked(false);
      }
      
      return () => {
          if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
          }
      };
  }, [isRecording]);
  
  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- AUDIO LOGIC ---
  const startRecording = async () => {
      try {
          const { granted } = await requestRecordingPermissionsAsync();
          if (!granted) {
              Alert.alert('Permission Required', 'Microphone access is needed for voice messages.');
              return;
          }
          
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
          
          console.log('Starting recording..');
          await recorder.prepareToRecordAsync();
          recorder.record();
          setIsRecording(true);
          setRecordingDuration(0);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (err) {
          console.error('Failed to start recording', err);
          Alert.alert('Recording Error', 'Could not start recording. Please check permissions.');
      }
  };

  const stopRecording = async (cancel: boolean = false) => {
      if (cancel) {
          console.log('Cancelling recording..');
          await recorder.stop();
          setIsRecording(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          return;
      }
      
      // Just stop recording state, don't send
      setIsRecording(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const sendRecording = async () => {
      if (recordingDuration === 0) {
          Alert.alert('Recording Too Short', 'Please record for at least 1 second.');
          return;
      }
      
      await recorder.stop();
      const uri = recorder.uri;
      console.log('Recording stored at', uri);
      setIsRecording(false);
      
      if (uri) {
          handleVoiceSend(uri, recordingDuration);
      }
  };

  const lockRecording = () => {
      setIsLocked(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const unlockRecording = () => {
      setIsLocked(false);
      stopRecording();
  };


  // --- API HELPER ---
  const callOpenRouter = async (messages: any[], jsonMode: boolean = false) => {
    if (!API_KEY) return null;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://venting-vault.app",
                "X-Title": "Venting Vault"
            },
            body: JSON.stringify({
                model: GEMINI_MODEL,
                messages: messages,
                temperature: jsonMode ? 0.0 : 0.7, 
                max_tokens: 150,
                response_format: jsonMode ? { type: "json_object" } : undefined 
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error:`, errorText);
            return null;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (error) {
        console.error(`Network Error:`, error);
        return null;
    }
  };

  // --- STAGE 2: SHADOW COUNCIL ---
  const consultShadowCouncil = async (userText: string): Promise<{ safe: boolean; category?: string }> => {
      setIsShadowReviewing(true);
      const guardResult = await callOpenRouter([
          { role: "system", content: SHADOW_SYSTEM_PROMPT },
          { role: "user", content: userText }
      ], true);
      setIsShadowReviewing(false);

      if (!guardResult) return { safe: true }; 

      console.log("🛡️ Shadow Council Verdict:", guardResult);

      try {
          const cleanJson = guardResult.replace(/```json/g, '').replace(/```/g, '').trim();
          const verdict = JSON.parse(cleanJson);
          if (!verdict.safe) return { safe: false, category: verdict.category };
      } catch (e) {
          console.error("Failed to parse Shadow Council JSON:", e);
          return { safe: true };
      }
      return { safe: true };
  };

  // --- DEEP MEMORY: Storage Functions ---
  const saveMessagesToStorage = async (messagesToSave: Message[]) => {
      try {
          // Convert Date objects to ISO strings for storage
          const serialized = messagesToSave.map(msg => ({
              ...msg,
              timestamp: msg.timestamp.toISOString()
          }));
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
          console.log('💾 Messages saved to vault');
      } catch (error) {
          console.error('Failed to save messages:', error);
      }
  };

  const loadMessagesFromStorage = async (): Promise<Message[]> => {
      try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (!stored) return [];
          
          const parsed = JSON.parse(stored);
          // Convert ISO strings back to Date objects
          return parsed.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
          }));
      } catch (error) {
          console.error('Failed to load messages:', error);
          return [];
      }
  };

  const getTimeGapHours = (lastMessageTime: Date): number => {
      const now = new Date();
      const diff = now.getTime() - lastMessageTime.getTime();
      return diff / (1000 * 60 * 60); // Convert to hours
  };

  // --- DEEP MEMORY: Contextual Wake-Up Greeting ---
  const generateContextualGreeting = async (recentMessages: Message[]): Promise<string | null> => {
      if (!API_KEY || recentMessages.length === 0) return null;

      try {
          // Get last 5-10 messages (excluding system messages)
          const conversationMessages = recentMessages
              .filter(m => m.sender !== 'system' && m.type !== 'crisis')
              .slice(-8);
          
          if (conversationMessages.length === 0) return null;

          const timeGapHours = getTimeGapHours(conversationMessages[conversationMessages.length - 1].timestamp);
          const daysAgo = Math.floor(timeGapHours / 24);

          // Build context from recent messages
          const context = conversationMessages
              .map(m => `${m.sender === 'user' ? 'User' : 'Sentinel'}: ${m.text}`)
              .join('\n');

          const wakeUpPrompt = `The user has returned after ${daysAgo} day${daysAgo !== 1 ? 's' : ''} (${Math.floor(timeGapHours)} hours). 

Their last conversation was:
${context}

Write a short, warm, one-sentence welcome back message. Reference something specific from their last conversation. Be empathetic and check in on how that situation is going. Keep it under 15 words. Do not use quotes or markdown.`;

          const greeting = await callOpenRouter([
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: wakeUpPrompt }
          ], false);

          return greeting;
      } catch (error) {
          console.error('Failed to generate contextual greeting:', error);
          return null;
      }
  };

  // --- HANDLERS ---
  const handleVoiceSend = async (uri: string, duration: number) => {
      // Store voice message with URI
      const userMsg: Message = {
          id: Date.now().toString(),
          text: "🎤 Voice Message",
          sender: 'user',
          type: 'voice',
          timestamp: new Date(),
          voiceUri: uri,
          duration: duration,
      };
      setMessages(prev => [...prev, userMsg]);
      setLastInputType('voice');
      setIsTyping(true);

      // Convert Audio to Base64 for API
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });

      // 2. Send to Gemini (Multimodal)
      const apiMessages = [
          { role: "system", content: SYSTEM_PROMPT },
          { 
              role: "user", 
              content: [
                  { type: "text", text: "Please listen to this audio and respond." },
                  { 
                      type: "image_url", 
                      image_url: { url: `data:audio/mp4;base64,${base64Audio}` } 
                  }
              ] 
          }
      ];

      const aiResponseText = await callOpenRouter(apiMessages, false);
      processResponse(aiResponseText, "Voice Message", true); // Pass isVoice=true
  };

  const handleTextSend = async () => {
    if (!inputText.trim()) return;
    if (hasKeyError) { Alert.alert("Missing Key", "Please set up your .env file."); return; }

    const text = inputText.trim();
    const userMsg: Message = { id: Date.now().toString(), text: text, sender: 'user', timestamp: new Date() };

    setMessages(prev => [...prev, userMsg]);
    setLastInputType('text'); // Mark as text input
    setInputText('');
    Keyboard.dismiss();
    setIsTyping(true);

    const conversationHistory = messages
        .filter(m => m.sender === 'user' || m.sender === 'sentinel')
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    conversationHistory.push({ role: 'user', content: text });
    
    const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...conversationHistory.slice(-10)]; 
    const aiResponseText = await callOpenRouter(apiMessages, false);
    
    processResponse(aiResponseText, text, false); // Pass isVoice=false
  };

  const processResponse = async (aiResponseText: string | null, userContext: string, isVoice: boolean = false) => {
    setIsTyping(false);

    if (aiResponseText) {
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: aiResponseText,
            sender: 'sentinel',
            timestamp: new Date(),
        };
        
        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg.type === 'crisis') return prev;
            return [...prev, aiMsg];
        });
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // 3. STAGE 2: Shadow Council
        const safetyResult = await consultShadowCouncil(userContext + " " + aiResponseText);
        
        if (safetyResult.safe) {
            // AI responds in text only (no voice)
        } else {
            // UNSAFE: Do NOT speak. Show Red Card.
            console.log("🚨 TRIGGERING CRISIS UI");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            
            let alertText = "I detect significant distress. You do not have to carry this alone. Please connect with a human lifeline.";
            if (safetyResult.category === 'VIOLENCE') alertText = "I detect unsafe content. Please prioritize safety.";

            const crisisMsg: Message = {
                id: (Date.now() + 2).toString(),
                text: alertText,
                sender: 'system',
                type: 'crisis',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, crisisMsg]);
        }
    } else {
        const errorMsg: Message = { 
            id: Date.now().toString(), 
            text: isVoice ? "I cannot hear you clearly..." : "The connection is weak...", 
            sender: 'system', 
            timestamp: new Date() 
        };
        setMessages(prev => [...prev, errorMsg]);
    }
  };

  const generateShadowPrompt = () => {
      Haptics.selectionAsync();
      const randomPrompt = SHADOW_PROMPTS[Math.floor(Math.random() * SHADOW_PROMPTS.length)];
      const promptMsg: Message = { id: Date.now().toString(), text: randomPrompt, sender: 'sentinel', timestamp: new Date() };
      setMessages(prev => [...prev, promptMsg]);
  };

  const callLifeline = () => Linking.openURL('tel:988');

  // --- VOICE PLAYBACK --- using new expo-audio with createAudioPlayer
  const playVoiceMessage = async (uri: string, messageId: string) => {
      try {
          // If already playing this one, stop it
          if (playingVoiceId === messageId && playerRef.current) {
              playerRef.current.pause();
              playerRef.current.release();
              playerRef.current = null;
              setPlayingVoiceId(null);
              return;
          }

          // Stop any existing playback
          if (playerRef.current) {
              playerRef.current.pause();
              playerRef.current.release();
              playerRef.current = null;
          }

          // Set audio mode for playback
          await setAudioModeAsync({
              allowsRecording: false,
              playsInSilentMode: true,
          });

          console.log('Playing voice from:', uri);
          setPlayingVoiceId(messageId);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          // Create a new player for this audio
          const newPlayer = createAudioPlayer({ uri });
          playerRef.current = newPlayer;
          
          // Listen for playback completion
          newPlayer.addListener('playbackStatusUpdate', (status) => {
              if (!status.playing && status.currentTime > 0 && status.currentTime >= (status.duration - 0.5)) {
                  // Playback finished
                  setPlayingVoiceId(null);
                  newPlayer.release();
                  playerRef.current = null;
              }
          });
          
          newPlayer.play();
      } catch (error) {
          console.error('Error playing voice message:', error);
          Alert.alert('Playback Error', 'Could not play this voice message.');
          setPlayingVoiceId(null);
      }
  };

  const stopVoicePlayback = () => {
      if (playerRef.current) {
          playerRef.current.pause();
          playerRef.current.release();
          playerRef.current = null;
      }
      setPlayingVoiceId(null);
  };

  // --- RENDER ---
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    
    if (item.type === 'crisis') {
        return (
            <View style={styles.crisisContainer}>
                <View style={styles.crisisBox}>
                    <View style={styles.crisisHeader}>
                        <Ionicons name="alert-circle" size={24} color="#ef4444" />
                        <Text style={styles.crisisTitle}>SAFETY ALERT</Text>
                    </View>
                    <Text style={styles.crisisText}>{item.text}</Text>
                    <Pressable onPress={callLifeline} style={styles.crisisButton}>
                        <Ionicons name="call" size={16} color="white" style={{marginRight: 8}} />
                        <Text style={styles.crisisButtonText}>CALL 988 LIFELINE</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    // Voice message rendering with WhatsApp-style UI
    if (item.type === 'voice' && item.voiceUri) {
        const isPlaying = playingVoiceId === item.id;
        return (
            <View style={[styles.messageRow, isUser ? styles.rowRight : styles.rowLeft]}>
                {!isUser && item.sender !== 'system' && (
                    <View style={styles.botIcon}>
                        <Ionicons name="shield-checkmark" size={16} color="#000" />
                    </View>
                )}
                <Pressable 
                    onPress={() => playVoiceMessage(item.voiceUri!, item.id)}
                    style={({ pressed }) => [
                        styles.bubble, 
                        isUser ? styles.bubbleUser : styles.bubbleSentinel,
                        styles.voiceBubble,
                        pressed && { opacity: 0.8 },
                        isPlaying && styles.voiceBubblePlaying
                    ]}
                >
                    <View style={styles.voiceMessageContent}>
                        <View style={[styles.voicePlayButton, isPlaying && styles.voicePlayButtonActive]}>
                            <Ionicons 
                                name={isPlaying ? "pause" : "play"} 
                                size={16} 
                                color={isUser ? "#1e293b" : "#22d3ee"} 
                            />
                        </View>
                        <View style={styles.voiceWaveformStatic}>
                            {[4, 8, 12, 8, 14, 6, 10, 4].map((h, i) => (
                                <View 
                                    key={i} 
                                    style={[
                                        styles.voiceWaveBar,
                                        { height: h },
                                        isUser ? styles.voiceWaveBarUser : styles.voiceWaveBarSentinel,
                                        isPlaying && styles.voiceWaveBarPlaying
                                    ]} 
                                />
                            ))}
                        </View>
                        <Text style={[styles.voiceDurationText, isUser ? styles.textUser : styles.textSentinel]}>
                            {item.duration ? formatDuration(item.duration) : '0:00'}
                        </Text>
                    </View>
                </Pressable>
            </View>
        );
    }

    // Regular text message with speak button for AI responses
    return (
      <View style={[styles.messageRow, isUser ? styles.rowRight : styles.rowLeft]}>
        {!isUser && item.sender !== 'system' && (
            <View style={styles.botIcon}>
                <Ionicons name="shield-checkmark" size={16} color="#000" />
            </View>
        )}
        <View style={[
            styles.bubble, 
            isUser ? styles.bubbleUser : styles.bubbleSentinel
        ]}>
            <Text style={[styles.messageText, isUser ? styles.textUser : styles.textSentinel]}>
                {item.text}
            </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050505', '#111827']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        {/* 3D Void Character */}
        <View style={styles.voidCharacterContainer}>
          <VoidScene 
            voidState={voidState} 
            size={80} 
            showStars={false}
            showShadow={false}
          />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Sentinel Channel</Text>
          <View style={styles.statusBadge}>
              <View style={[
                  styles.statusDot, 
                  (isTyping || isShadowReviewing || playingVoiceId) && styles.statusDotActive
              ]} />
              <Text style={styles.statusText}>
                  {playingVoiceId ? "▶ Playing Voice..." :
                   isTyping ? "Thinking..." : 
                   isShadowReviewing ? "Shadow Reviewing..." : 
                   "Encrypted • Ready"}
              </Text>
          </View>
        </View>
      </View>

      <View style={styles.chatContainer}>
        {isLoadingHistory ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Opening the Vault...</Text>
          </View>
        ) : (
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
              style={{ flex: 1 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          </TouchableWithoutFeedback>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputSection, { paddingBottom: keyboardHeight > 0 ? 10 : 130 }]}>
          {!isTyping && messages.length < 10 && !keyboardHeight && (
              <Pressable onPress={generateShadowPrompt} style={styles.shadowPromptBtn}>
                  <Ionicons name="sparkles" size={14} color="#94a3b8" />
                  <Text style={styles.shadowPromptText}>SHADOW PROMPT</Text>
              </Pressable>
          )}
          
          <View style={styles.inputContainerWrapper}>
            <GlassCard style={[styles.inputContainer, ...(isRecording ? [styles.recordingContainer] : [])]}>
                {isRecording ? (
                    <View style={styles.recordingInputContent}>
                        <Pressable onPress={() => stopRecording(true)} style={styles.cancelRecordingBtn}>
                            <Ionicons name="close" size={20} color="#ef4444" />
                        </Pressable>
                        <View style={styles.recordingWaveform}>
                            {waveformAnims.map((anim, index) => (
                                <Animated.View
                                    key={index}
                                    style={[
                                        styles.waveformBar,
                                        { height: anim }
                                    ]}
                                />
                            ))}
                        </View>
                        <Text style={styles.recordingText}>{formatDuration(recordingDuration)}</Text>
                        <Pressable 
                            onPress={sendRecording} 
                            disabled={recordingDuration === 0}
                            style={[styles.sendRecordingBtn, recordingDuration === 0 && styles.sendRecordingBtnDisabled]}
                        >
                            <Ionicons name="send" size={18} color="white" />
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#64748b"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />
                        
                        {inputText.length > 0 ? (
                            <Pressable onPress={handleTextSend} style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}>
                                <Ionicons name="arrow-up" size={20} color="white" />
                            </Pressable>
                        ) : (
                            <Pressable 
                                onPressIn={startRecording}
                                onPressOut={() => {
                                    // Keep recording active - user will manually send or cancel
                                    // Don't auto-stop on release
                                }}
                                style={({ pressed }) => [styles.micBtn, pressed && styles.micBtnPressed]}
                            >
                                <Ionicons name="mic-outline" size={22} color="white" />
                            </Pressable>
                        )}
                    </>
                )}
            </GlassCard>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20,
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  voidCharacterContainer: {
    width: 80,
    height: 80,
    marginRight: 12,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#050505',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#475569', marginRight: 6 },
  statusDotActive: { backgroundColor: '#22d3ee' },
  statusText: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
  
  chatContainer: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  list: { flex: 1 },
  listContent: { padding: 20 },
  
  messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  
  botIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#22d3ee', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
  
  bubble: { maxWidth: '80%', padding: 16, borderRadius: 20 },
  bubbleUser: { backgroundColor: '#1e293b', borderBottomRightRadius: 4 },
  bubbleSentinel: { backgroundColor: 'rgba(34, 211, 238, 0.05)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.1)' },
  
  messageText: { fontSize: 15, lineHeight: 22 },
  textUser: { color: 'white' },
  textSentinel: { color: '#e2e8f0' },

  inputSection: { width: '100%', alignItems: 'center', backgroundColor: 'transparent' },
  inputContainerWrapper: { width: '100%', paddingHorizontal: 12 },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 6,
    borderRadius: 24, 
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 48,
  },
  recordingContainer: { 
    borderColor: '#22d3ee', 
    borderWidth: 2, 
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 5,
  },
  
  input: { 
    flex: 1, 
    color: 'white', 
    maxHeight: 100, 
    paddingHorizontal: 12, 
    fontSize: 16, 
    paddingVertical: 8,
    lineHeight: 20,
  },
  sendBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#22d3ee', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 6,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnPressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  micBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#22d3ee', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 6,
  },
  micBtnPressed: { 
    backgroundColor: '#ef4444',
    transform: [{ scale: 1.1 }],
  },
  
  // Recording UI
  recordingOverlay: {
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22d3ee',
  },
  recordingDuration: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInputContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#22d3ee',
    borderRadius: 2,
  },
  recordingText: {
    flex: 1,
    color: '#22d3ee',
    fontSize: 14,
    fontWeight: '500',
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Crisis Styles
  crisisContainer: { alignItems: 'center', marginVertical: 20, width: '100%', paddingHorizontal: 20 },
  crisisBox: { backgroundColor: 'rgba(60, 20, 20, 0.9)', borderWidth: 1, borderColor: '#ef4444', borderRadius: 16, padding: 20, alignItems: 'center', width: '100%', shadowColor: "#ef4444", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
  crisisHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  crisisTitle: { color: '#ef4444', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  crisisText: { color: '#fee2e2', textAlign: 'center', marginBottom: 20, fontWeight: '500', lineHeight: 22 },
  crisisButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc2626', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  crisisButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },

  shadowPromptBtn: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  shadowPromptText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  
  // Recording UI
  cancelRecordingBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendRecordingBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22d3ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendRecordingBtnDisabled: {
    opacity: 0.3,
  },
  
  // Voice Message Styles
  voiceBubble: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 150,
  },
  voiceBubblePlaying: {
    borderColor: '#22d3ee',
    borderWidth: 1,
  },
  voiceMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voicePlayButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voicePlayButtonActive: {
    backgroundColor: '#22d3ee',
  },
  voiceWaveformStatic: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  voiceWaveBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 3,
  },
  voiceWaveBarUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  voiceWaveBarSentinel: {
    backgroundColor: 'rgba(34, 211, 238, 0.5)',
  },
  voiceWaveBarPlaying: {
    backgroundColor: '#22d3ee',
  },
  voiceDurationText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
    opacity: 0.8,
  },
});
