import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassCard } from '../../components/GlassCard';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'sentinel';
  timestamp: Date;
};

export default function SentinelScreen() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "I am the Sentinel. The Pod is quiet, but I am here. What is weighing on you?",
      sender: 'sentinel',
      timestamp: new Date(),
    }
  ]);
  
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    Keyboard.dismiss();

    // 2. Simulate AI Response (Placeholder)
    setTimeout(() => {
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: "I hear you. That sounds incredibly heavy to carry alone. I am logging this burden in the Vault for you.",
            sender: 'sentinel',
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMsg]);
    }, 1500);
  };

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.rowRight : styles.rowLeft]}>
        {!isUser && (
            <View style={styles.botIcon}>
                <Ionicons name="shield-checkmark" size={16} color="#000" />
            </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleSentinel]}>
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
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sentinel Channel</Text>
        <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Secure & Encrypted</Text>
        </View>
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={90}
      >
        <GlassCard style={styles.inputContainer}>
            <TextInput
                style={styles.input}
                placeholder="Write into the void..."
                placeholderTextColor="#64748b"
                value={inputText}
                onChangeText={setInputText}
                multiline
            />
            <Pressable onPress={sendMessage} style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }]}>
                <Ionicons name="arrow-up" size={20} color="black" />
            </Pressable>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingTop: 60, paddingBottom: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: 'rgba(34, 211, 238, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22d3ee', marginRight: 6 },
  statusText: { color: '#22d3ee', fontSize: 10, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 120 },
  messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  botIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#22d3ee', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
  bubble: { maxWidth: '80%', padding: 16, borderRadius: 20 },
  bubbleUser: { backgroundColor: '#334155', borderBottomRightRadius: 4 },
  bubbleSentinel: { backgroundColor: 'rgba(34, 211, 238, 0.1)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.2)' },
  messageText: { fontSize: 15, lineHeight: 22 },
  textUser: { color: 'white' },
  textSentinel: { color: '#e2e8f0' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 20, marginTop: 10, marginBottom: 100, borderRadius: 30 },
  input: { flex: 1, color: 'white', maxHeight: 100, paddingHorizontal: 10, fontSize: 16 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});
