/**
 * 🎨 TAB LAYOUT — Editorial monoline tab bar
 *
 * Vervang: V0.1.2/app/(tabs)/_layout.tsx
 *
 * Veranderingen vs origineel:
 * - Tabbar achtergrond = paper (geen wit)
 * - Mono uppercase labels (kleiner, gespacieerd)
 * - Hairline border-top
 * - Active = ink + terracotta underline (via lege padding-trick op hoogte)
 * - Iconen in monoline outline-stijl
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { colors, fonts } from '../../constants/Designsystem';

function ActiveBar() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 4,
        width: 14,
        height: 1.5,
        backgroundColor: colors.primary,
      }}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.textDark,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          borderTopColor: colors.borderColor,
          borderTopWidth: 0.5,
          backgroundColor: colors.background,
          height: 72,
          paddingTop: 10,
          paddingBottom: 18,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: 8.5,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.borderColor,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontFamily: fonts.display,
          fontWeight: '400',
          fontSize: 17,
          color: colors.textDark,
        },
        headerShadowVisible: false,
        headerTintColor: colors.textDark,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'vanavond',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View>
              {focused && <ActiveBar />}
              <Ionicons name="restaurant-outline" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'recepten',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View>
              {focused && <ActiveBar />}
              <Ionicons name="book-outline" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="weekplanner"
        options={{
          title: 'week',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View>
              {focused && <ActiveBar />}
              <Ionicons name="calendar-outline" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'lijst',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View>
              {focused && <ActiveBar />}
              <Ionicons name="bag-outline" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
