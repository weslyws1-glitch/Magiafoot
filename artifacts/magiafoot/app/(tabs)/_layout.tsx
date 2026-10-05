import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
        />
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="matches">
        <NativeTabs.Trigger.Icon sf={{ default: 'sportscourt', selected: 'sportscourt.fill' }} />
        <NativeTabs.Trigger.Label>Jogos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tournaments">
        <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} />
        <NativeTabs.Trigger.Label>Campeonatos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="teams">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} />
        <NativeTabs.Trigger.Label>Times</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84, paddingBottom: 34, paddingTop: 7 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Jogos',
          tabBarIcon: ({ color }) => isIOS ? <SymbolView name="sportscourt" tintColor={color} size={23} /> : <Feather name="calendar" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          title: 'Torneios',
          tabBarIcon: ({ color }) => isIOS ? <SymbolView name="trophy" tintColor={color} size={23} /> : <Feather name="award" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Times',
          tabBarIcon: ({ color }) => isIOS ? <SymbolView name="person.3" tintColor={color} size={23} /> : <Feather name="users" size={21} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
