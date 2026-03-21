import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Easing, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function StreamingScreen() {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.poly(3)),
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // Infinite breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

  }, []);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0]
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NTN Streaming</Text>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY }] }]}>
        
        {/* Animated Icon Container */}
        <Animated.View style={[styles.glowRing, { borderColor: themeColor, transform: [{ scale: pulseAnim }] }]} />
        <View style={[styles.iconBox, { backgroundColor: `${themeColor}22` }]}>
          <Ionicons name="videocam" size={70} color={themeColor} />
        </View>

        <Text style={styles.title}>Watch Party</Text>
        <Text style={styles.subtitle}>
          Inviting friends to watch a movie has never been easier. A private screening room, seamless group chat right on the screen.
        </Text>

        <View style={styles.featureBox}>
          <View style={styles.featureRow}>
            <Ionicons name="people" size={20} color={themeColor} />
            <Text style={styles.featureText}>Invite friends via a link</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="sync" size={20} color={themeColor} />
            <Text style={styles.featureText}>Absolute real-time sync</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="chatbubbles" size={20} color={themeColor} />
            <Text style={styles.featureText}>Interact via smooth chat</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.notifyBtn, { backgroundColor: themeColor }]} activeOpacity={0.8}>
          <Ionicons name="notifications" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.notifyText}>Get notified on release</Text>
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: -40,
  },
  glowRing: {
    position: 'absolute',
    top: 60,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    opacity: 0.3,
  },
  iconBox: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 60,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  featureBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#ddd',
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  notifyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
