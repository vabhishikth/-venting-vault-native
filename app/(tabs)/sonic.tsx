import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../../components/GlassCard';

// 3 Soundscapes to start with
const TRACKS = [
  { id: '1', title: 'Void Hum', type: 'Brown Noise', uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', title: 'Starlight', type: '432Hz Sine', uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', title: 'Nebula Rain', type: 'Water/Static', uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export default function SonicScreen() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop music if you leave the screen
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const playTrack = async (track: typeof TRACKS[0]) => {
    try {
      // If clicking the same track, toggle pause/play
      if (activeTrackId === track.id && isPlaying) {
        await sound?.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // If playing a new track, stop the old one
      if (sound) await sound.unloadAsync();

      // Load and Play the new one
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: true, isLooping: true }
      );
      
      setSound(newSound);
      setActiveTrackId(track.id);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing sound', error);
    }
  };

  const renderTrack = ({ item }: { item: typeof TRACKS[0] }) => {
    const isActive = activeTrackId === item.id;
    return (
      <Pressable onPress={() => playTrack(item)}>
        <GlassCard style={[styles.trackCard, ...(isActive ? [styles.activeCard] : [])]}>
          <View style={styles.iconContainer}>
            <Ionicons 
                name={isActive && isPlaying ? "pause" : "play"} 
                size={24} 
                color={isActive ? "#22d3ee" : "white"} 
            />
          </View>
          <View>
            <Text style={[styles.trackTitle, isActive && styles.activeText]}>{item.title}</Text>
            <Text style={styles.trackType}>{item.type}</Text>
          </View>
        </GlassCard>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
       <LinearGradient colors={['#050505', '#1e1b4b']} style={StyleSheet.absoluteFill} />
       <View style={styles.header}>
            <Text style={styles.headerTitle}>Sonic Grounding</Text>
            <Text style={styles.headerSub}>Frequencies to anchor your nervous system.</Text>
       </View>
       <FlatList 
          data={TRACKS}
          renderItem={renderTrack}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
       />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingTop: 80, paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  headerSub: { color: '#64748b', marginTop: 8, fontSize: 14 },
  list: { padding: 24, paddingBottom: 120, gap: 16 },
  trackCard: { flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 16 },
  activeCard: { borderColor: '#22d3ee', backgroundColor: 'rgba(34, 211, 238, 0.05)' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  trackTitle: { color: 'white', fontWeight: '700', fontSize: 16 },
  activeText: { color: '#22d3ee' },
  trackType: { color: '#64748b', fontSize: 12, marginTop: 4 },
});
