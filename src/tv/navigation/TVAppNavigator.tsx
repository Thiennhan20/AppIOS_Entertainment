import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';

// Import TV Screens
import TVLoginScreen from '../screens/TVLoginScreen';
import TVHomeScreen from '../screens/home_screen/TVHomeScreen';
import TVSearchScreen from '../screens/TVSearchScreen';
import TVTVShowsScreen from '../screens/TVTVShowsScreen';
import TVMoviesScreen from '../screens/TVMoviesScreen';
import TVProfileScreen from '../screens/TVProfileScreen';
import TVDetailScreen from '../screens/TVDetailScreen';
import TVPlayerScreen from '../screens/TVPlayerScreen';

import TVSideMenu from '../components/TVSideMenu';

const Stack = createNativeStackNavigator();

function TVMainScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set(['home']));

  useEffect(() => {
    setMountedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const handleLogout = () => {
    logout();
  };

  return (
    <View style={styles.mainContainer}>
      {/*Collapsible left side menu */}
      <TVSideMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      
      {/* Right Content Space - Keep visited tabs mounted to avoid refetching */}
      <View style={styles.contentContainer}>
        {mountedTabs.has('home') && (
          <View style={[styles.tabPane, activeTab !== 'home' && styles.hiddenTab]}>
            <TVHomeScreen navigation={navigation} onTabChange={setActiveTab} />
          </View>
        )}
        {mountedTabs.has('search') && (
          <View style={[styles.tabPane, activeTab !== 'search' && styles.hiddenTab]}>
            <TVSearchScreen navigation={navigation} />
          </View>
        )}
        {mountedTabs.has('tv_shows') && (
          <View style={[styles.tabPane, activeTab !== 'tv_shows' && styles.hiddenTab]}>
            <TVTVShowsScreen navigation={navigation} />
          </View>
        )}
        {mountedTabs.has('movies') && (
          <View style={[styles.tabPane, activeTab !== 'movies' && styles.hiddenTab]}>
            <TVMoviesScreen navigation={navigation} />
          </View>
        )}
        {mountedTabs.has('profile') && (
          <View style={[styles.tabPane, activeTab !== 'profile' && styles.hiddenTab]}>
            <TVProfileScreen navigation={navigation} onLogout={handleLogout} />
          </View>
        )}
      </View>
    </View>
  );
}

export default function TVAppNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#050609' },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="TVMain" component={TVMainScreen} />
          <Stack.Screen name="TVDetail" component={TVDetailScreen} />
          <Stack.Screen 
            name="TVPlayer" 
            component={TVPlayerScreen} 
            options={{
              animation: 'none' // Instant load for video view
            }}
          />

        </>
      ) : (
        <Stack.Screen name="TVLogin" component={TVLoginScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#050609',
  },
  contentContainer: {
    flex: 1,
  },
  tabPane: {
    ...StyleSheet.absoluteFillObject,
  },
  hiddenTab: {
    display: 'none' as const,
  },
});
