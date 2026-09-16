import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import FlashcardScreen from '../screens/FlashcardScreen';
import TestScreen from '../screens/TestScreen';
import GraphScreen from '../screens/GraphScreen';
import ReaderScreen from '../screens/ReaderScreen';
import WordlistScreen from '../screens/WordlistScreen';
import WordDetailScreen from '../screens/WordDetailScreen';
import EditWordScreen from '../screens/EditWordScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

const TAB_ICONS = { Ana: '🏠', Kartlar: '📇', Test: '📝', Ağ: '🕸️', Oku: '📖', Liste: '📚' };

function icon(routeName) {
  return ({ color }) => <Text style={{ fontSize: 18, color }}>{TAB_ICONS[routeName]}</Text>;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: icon(route.name),
      })}
    >
      <Tab.Screen name="Ana" component={HomeScreen} />
      <Tab.Screen name="Kartlar" component={FlashcardScreen} />
      <Tab.Screen name="Test" component={TestScreen} />
      <Tab.Screen name="Ağ" component={GraphScreen} />
      <Tab.Screen name="Oku" component={ReaderScreen} />
      <Tab.Screen name="Liste" component={WordlistScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="WordDetail" component={WordDetailScreen} options={{ title: 'Kelime' }} />
        <Stack.Screen name="EditWord" component={EditWordScreen} options={{ title: 'Kartı Düzenle' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
