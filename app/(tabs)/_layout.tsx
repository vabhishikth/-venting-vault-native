import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#22d3ee',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          position: 'absolute',
          bottom: 30,
          left: 0,
          right: 0,
          height: 80,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 12,
        },
      }}
    >
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="flame-outline" focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />
      <Tabs.Screen
        name="pod"
        options={{
          title: 'Pod',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="finger-print-outline" focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />
      <Tabs.Screen
        name="sentinel"
        options={{
          title: 'Sentinel',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="people-outline" focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />
      <Tabs.Screen
        name="sonic"
        options={{
          title: 'Sonic',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="musical-notes-outline" focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />
      
      {/* Hide unexpected routes */}
      <Tabs.Screen name="index" options={{ href: null }} /> 
    </Tabs>
  );
}

// --- TAB ICON COMPONENT ---
const TabIcon = ({ name, focused }: { name: any, focused: boolean }) => (
  <View style={styles.iconWrapper}>
    <View style={[styles.iconCircle, focused && styles.iconCircleActive]}>
      <Ionicons 
        name={name} 
        size={22} 
        color={focused ? "#22d3ee" : "#64748b"} 
      />
    </View>
    {/* Glow Dot */}
    {focused && <View style={styles.glowDot} />}
  </View>
);

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(15, 15, 25, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    // Floating shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 15,
  },
  iconCircleActive: {
    backgroundColor: 'rgba(15, 20, 30, 0.95)',
    borderColor: 'rgba(34, 211, 238, 0.3)',
    shadowColor: '#22d3ee',
    shadowOpacity: 0.3,
  },
  glowDot: {
    position: 'absolute',
    bottom: -8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
});
