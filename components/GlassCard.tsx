import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export const GlassCard = ({ children, style }: GlassCardProps) => {
  return (
    <View style={[styles.container, style]}>
      {/* This Gradient creates the "Glass" look: 
          It fades from 8% white at the top to 1% white at the bottom */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.01)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* This View creates the thin white border line */}
      <View style={styles.borderLayer} />
      
      {/* This is where your Buttons and Text go */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    // These create the shadow behind the card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  borderLayer: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)', // Thin semi-transparent border
    borderRadius: 24,
  },
});