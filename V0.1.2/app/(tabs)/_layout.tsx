import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/Designsystem';

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
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'vanavond',
          tabBarIcon: ({ color }) => (
            <Ionicons name="restaurant-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'recepten',
          tabBarIcon: ({ color }) => (
            <Ionicons name="book-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="weekplanner"
        options={{
          title: 'week',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'lijst',
          tabBarIcon: ({ color }) => (
            <Ionicons name="bag-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
