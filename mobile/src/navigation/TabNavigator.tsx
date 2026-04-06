import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import FleetMapScreen from '../screens/FleetMapScreen';
import OceanDataScreen from '../screens/OceanDataScreen';
import PlanTripScreen from '../screens/PlanTripScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'fish-outline',
  'Fleet Map': 'map-outline',
  'Ocean Data': 'water-outline',
  'Plan Trip': 'calendar-outline',
  Profile: 'person-outline',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          const iconName = ICON_MAP[route.name] ?? 'ellipse-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Fleet Map" component={FleetMapScreen} />
      <Tab.Screen name="Ocean Data" component={OceanDataScreen} />
      <Tab.Screen name="Plan Trip" component={PlanTripScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
