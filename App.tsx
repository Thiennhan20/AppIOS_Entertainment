import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/DetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import ListScreen from './src/screens/ListScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import GameScreen from './src/screens/GameScreen';
import AIScreen from './src/screens/AIScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="ListScreen" component={ListScreen} />
      <Stack.Screen name="DetailScreen" component={DetailScreen} />
      <Stack.Screen name="PlayerScreen" component={PlayerScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f13',
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#E50914',
        tabBarInactiveTintColor: '#555',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'HomeStack') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Game') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'AI') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeStack" component={HomeStack} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="Game" component={GameScreen} options={{ tabBarLabel: 'Giải trí' }} />
      <Tab.Screen name="AI" component={AIScreen} options={{ tabBarLabel: 'VIBE AI' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={DarkTheme}>
        <MainTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
