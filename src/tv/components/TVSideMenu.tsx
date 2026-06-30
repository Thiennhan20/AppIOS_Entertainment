import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface TVSideMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export default function TVSideMenu({ activeTab, onTabChange, onLogout }: TVSideMenuProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const { user } = useAuth();
  
  const [isMenuFocused, setIsMenuFocused] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const translateAnim = useRef(new Animated.Value(-165)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);

  const menuItems = [
    { id: 'search', icon: 'search-outline', label: t('home.search_movies') || 'Search' },
    { id: 'home', icon: 'home-outline', label: t('general.home') || 'Home' },
    { id: 'tv_shows', icon: 'tv-outline', label: t('tv.tv_series') || 'TV Series' },
    { id: 'movies', icon: 'film-outline', label: t('tv.movies') || 'Movies' },
    { id: 'profile', icon: 'person-outline', label: t('general.profile') || 'Profile' },
  ];

  const handleFocus = () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
    setIsMenuFocused(true);
  };

  const handleBlur = () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    blurTimeout.current = setTimeout(() => {
      setIsMenuFocused(false);
    }, 50);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateAnim, {
        toValue: isMenuFocused ? 0 : -165,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isMenuFocused ? 1 : 0,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isMenuFocused]);

  useEffect(() => {
    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* 1. Sliding Panel (Background + Labels) - Animates translateX natively on GPU */}
      <Animated.View
        style={[
          styles.slidingPanel,
          {
            transform: [{ translateX: translateAnim }]
          }
        ]}
      >
        {/* Brand Text Wrapper */}
        <View style={styles.brandTextWrapper}>
          <Text style={styles.brandText}>
            NTN<Text style={{ color: themeColor }}>TV</Text>
          </Text>
        </View>

        {/* Menu Labels */}
        <View style={styles.labelsList}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const showFocused = focusedItem === item.id || hoveredItem === item.id;
            return (
              <View key={item.id} style={styles.labelItemWrapper}>
                <Animated.Text
                  style={[
                    styles.menuLabel,
                    { opacity: opacityAnim },
                    showFocused && styles.labelFocused,
                    isActive && !showFocused && { color: themeColor }
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Animated.Text>
              </View>
            );
          })}
        </View>

        {/* Footer Logout Label */}
        <View style={styles.footer}>
          {user && (
            <View style={styles.footerLabelWrapper}>
              <Animated.Text
                style={[
                  styles.menuLabel,
                  { opacity: opacityAnim },
                  focusedItem === 'logout' || hoveredItem === 'logout' ? styles.labelFocused : null,
                  { color: focusedItem === 'logout' || hoveredItem === 'logout' ? '#ffffff' : '#888888' }
                ]}
                numberOfLines={1}
              >
                {t('profile.logout') || 'Log Out'}
              </Animated.Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* 2. Static Overlay (Icons + Interactive Targets) - Sits on top of sliding panel at left: 0 */}
      <View style={styles.staticOverlay}>
        {/* Brand Logo Wrapper */}
        <View style={styles.brandLogoWrapper}>
          <Image
            source={require('../../../assets/favicon.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>

        {/* Interactive Menu pressables */}
        <View style={styles.menuList}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <Pressable
                key={item.id}
                onFocus={() => {
                  handleFocus();
                  setFocusedItem(item.id);
                }}
                onBlur={() => {
                  handleBlur();
                  setFocusedItem(null);
                }}
                onPress={() => onTabChange(item.id)}
                onPointerEnter={() => {
                  handleFocus();
                  setHoveredItem(item.id);
                }}
                onPointerLeave={() => {
                  handleBlur();
                  setHoveredItem(null);
                }}
                focusable={true}
                style={() => {
                  const showFocused = focusedItem === item.id || hoveredItem === item.id;
                  return [
                    styles.menuItem,
                    showFocused && styles.menuItemFocused,
                    isActive && !showFocused && [styles.menuItemActive, { borderLeftColor: themeColor }],
                    showFocused && { borderLeftColor: themeColor }
                  ];
                }}
              >
                {() => {
                  const showFocused = focusedItem === item.id || hoveredItem === item.id;
                  return (
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={showFocused ? '#ffffff' : isActive ? themeColor : '#888888'}
                    />
                  );
                }}
              </Pressable>
            );
          })}
        </View>

        {/* Interactive Logout pressable */}
        <View style={styles.footer}>
          {user && (
            <Pressable
              onFocus={() => {
                handleFocus();
                setFocusedItem('logout');
              }}
              onBlur={() => {
                handleBlur();
                setFocusedItem(null);
              }}
              onPress={onLogout}
              onPointerEnter={() => {
                handleFocus();
                setHoveredItem('logout');
              }}
              onPointerLeave={() => {
                handleBlur();
                setHoveredItem(null);
              }}
              focusable={true}
              style={() => {
                const showFocused = focusedItem === 'logout' || hoveredItem === 'logout';
                return [
                  styles.menuItem,
                  showFocused && styles.menuItemFocused,
                  showFocused && { borderLeftColor: '#E50914' }
                ];
              }}
            >
              {() => {
                const showFocused = focusedItem === 'logout' || hoveredItem === 'logout';
                return (
                  <Ionicons
                    name="log-out-outline"
                    size={24}
                    color={showFocused ? '#ffffff' : '#888888'}
                  />
                );
              }}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 75,
    height: '100%',
    backgroundColor: '#0c0d12',
    borderRightWidth: 1,
    borderRightColor: '#1a1c24',
    zIndex: 100,
  },
  slidingPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 240,
    backgroundColor: '#0c0d12',
    borderRightWidth: 1,
    borderRightColor: '#1a1c24',
    paddingVertical: 30,
    justifyContent: 'space-between',
    zIndex: 90,
  },
  staticOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 75,
    paddingVertical: 30,
    justifyContent: 'space-between',
    zIndex: 95,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    height: 50,
  },
  brandLogoWrapper: {
    height: 50,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  brandTextWrapper: {
    height: 50,
    paddingLeft: 75,
    justifyContent: 'center',
  },
  logoImage: {
    width: 22,
    height: 22,
  },
  brandText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  menuList: {
    flex: 1,
    marginTop: 40,
    gap: 15,
  },
  labelsList: {
    flex: 1,
    marginTop: 40,
    gap: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    backgroundColor: 'transparent',
    height: 52,
  },
  labelItemWrapper: {
    height: 52,
    paddingLeft: 75,
    justifyContent: 'center',
  },
  footerLabelWrapper: {
    height: 52,
    paddingLeft: 75,
    justifyContent: 'center',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  menuLabel: {
    color: '#888888',
    fontSize: 15,
    fontWeight: '600',
  },
  labelFocused: {
    color: '#ffffff',
  },
  footer: {
    height: 52,
    justifyContent: 'center',
  },
});
