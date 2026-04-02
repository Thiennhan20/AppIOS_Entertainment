import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, AppState, UIManager, Platform, LogBox } from 'react-native';

LogBox.ignoreLogs([
  'setLayoutAnimationEnabledExperimental',
  'i18next is made possible'
]);

const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('setLayoutAnimationEnabledExperimental')) return;
  originalWarn(...args);
};

const originalInfo = console.info || console.log;
console.info = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('i18next is made possible')) return;
  originalInfo(...args);
};

const originalLog = console.log;
console.log = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('i18next is made possible')) return;
  originalLog(...args);
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import './src/i18n';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';

import CustomSplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/detail/DetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import SearchResultScreen from './src/screens/SearchResultScreen';
import ListScreen from './src/screens/ListScreen';
import PlayerScreen from './src/screens/video_player/PlayerScreen';
import GameScreen from './src/screens/GameScreen';
import AIScreen from './src/screens/AIScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import StreamingScreen from './src/screens/StreamingScreen';
import SettingsScreen from './src/screens/profile/SettingsScreen';
import HelpScreen from './src/screens/profile/HelpScreen';
import UserListScreen from './src/screens/profile/UserListScreen';

import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

import { AnimatedTabBar } from './src/components/AnimatedTabBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="SearchResultScreen" component={SearchResultScreen} />
      <Stack.Screen name="ListScreen" component={ListScreen} />
      <Stack.Screen name="DetailScreen" component={DetailScreen} />
      <Stack.Screen name="PlayerScreen" component={PlayerScreen} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade', // Login/Register smooth transition
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="HelpScreen" component={HelpScreen} />
      <Stack.Screen name="UserListScreen" component={UserListScreen} />
      <Stack.Screen name="ListScreen" component={ListScreen} />
      <Stack.Screen name="DetailScreen" component={DetailScreen} />
      <Stack.Screen name="PlayerScreen" component={PlayerScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={props => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="HomeStack" component={HomeStack} options={{ tabBarLabel: t('general.home') }} />
      <Tab.Screen name="Streaming" component={StreamingScreen} options={{ tabBarLabel: 'Streaming' }} />
      <Tab.Screen name="Game" component={GameScreen} options={{ tabBarLabel: t('general.entertainment') }} />
      <Tab.Screen name="AI" component={AIScreen} options={{ tabBarLabel: t('general.ai_hub') }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: t('general.profile') }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const { themeColor } = useTheme();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const backgroundTime = React.useRef<number | null>(null);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundTime.current) {
          const timeDiff = Date.now() - backgroundTime.current;
          if (timeDiff > 30 * 60 * 1000) { // > 30 mins (30 * 60s * 1000ms)
            setShowSplash(true);
          }
        }
        backgroundTime.current = null;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <AppNavigator />
            {showSplash && <CustomSplashScreen onFinish={() => setShowSplash(false)} />}
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
