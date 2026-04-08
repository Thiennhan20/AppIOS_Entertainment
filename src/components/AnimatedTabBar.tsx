import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export function AnimatedTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const TAB_WIDTH = width / state.routes.length;
  
  // Slide animation for the active indicator bubble
  const translateX = useRef(new Animated.Value(state.index * TAB_WIDTH)).current;
  
  // Stretch animation to simulate "liquid" movement
  const stretch = useRef(new Animated.Value(1)).current;

  // Breathing glow animation for the idle active tab
  const breathing = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Wavering slide effect (stretching while moving)
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: state.index * TAB_WIDTH,
        useNativeDriver: true,
        bounciness: 12, // Bouncy/liquid feel
        speed: 15,
      }),
      Animated.sequence([
        Animated.timing(stretch, { toValue: 1.4, duration: 100, useNativeDriver: true }),
        Animated.spring(stretch, { toValue: 1, useNativeDriver: true, bounciness: 10 })
      ])
    ]).start();

    // 2. Breathing pulse: play 2 cycles then stop (saves battery vs infinite loop)
    breathing.setValue(1);
    Animated.sequence([
      Animated.timing(breathing, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
      Animated.timing(breathing, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(breathing, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
      Animated.timing(breathing, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();

  }, [state.index]);

  const activeRoute = state.routes[state.index];
  const activeDescriptors = descriptors[activeRoute.key];
  const activeTabBarStyle = activeDescriptors.options.tabBarStyle;

  if (activeTabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      
      {/* Sliding Wavy Blob Underneath */}
      <Animated.View style={[
        styles.activeBlobContainer, 
        { width: TAB_WIDTH, transform: [{ translateX }] }
      ]}>
         <Animated.View style={[
            styles.liquidBlob,
            { transform: [{ scaleX: stretch }, { scale: breathing }], shadowColor: themeColor }
         ]}>
            <LinearGradient
               colors={[themeColor, themeColor]}
               start={{x: 0, y: 0}} end={{x: 1, y: 1}}
               style={styles.blobGradient}
            />
         </Animated.View>
      </Animated.View>

      {/* Tab Icons */}
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Icon resolution
        let iconName: any = 'home';
        if (route.name === 'HomeStack') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'StreamingStack') iconName = isFocused ? 'videocam' : 'videocam-outline';
        else if (route.name === 'Game') iconName = isFocused ? 'game-controller' : 'game-controller-outline';
        else if (route.name === 'AI') iconName = isFocused ? 'sparkles' : 'sparkles-outline';
        else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

        return (
          <TouchableOpacity
            key={index}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            activeOpacity={1}
            style={styles.tabButton}
          >
            <Animated.View style={[{ alignItems: 'center' }, isFocused && { transform: [{ scale: breathing }] }]}>
              {/* Outer Glow container when active */}
              {isFocused && (
                 <View style={styles.iconGlowWrapper}>
                   <Ionicons name={iconName} size={24} color="#fff" />
                 </View>
              )}
              {!isFocused && <Ionicons name={iconName} size={24} color="#777" />}
              
              <Animated.Text style={[
                styles.tabLabel, 
                { color: isFocused ? '#fff' : '#777' },
                isFocused && { opacity: 1, marginTop: 4, transform: [{ scale: 1.05 }] }
              ]}>
                {label}
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0f0f13',
    width: '100%',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  activeBlobContainer: {
    position: 'absolute',
    height: '100%',
    top: 5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  liquidBlob: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'transparent',
    // Shadow simulates the "fire/glow"
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    marginTop: -18, 
  },
  blobGradient: {
    width: '100%',
    height: '100%',
  },
  iconGlowWrapper: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  }
});
