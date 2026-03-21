import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { themeColor } = useTheme();

  // Start fully visible (1) so it instantly covers everything!
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const color1 = useRef(new Animated.Value(0)).current;
  const color2 = useRef(new Animated.Value(0)).current;
  const color3 = useRef(new Animated.Value(0)).current;
  const bgRedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Instantly start scaling up the logo slowly and fade background to red (Native API)
    // Easing.poly(5) makes it start VERY slow, then accelerate super fast at the end
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 1500,
        easing: Easing.in(Easing.poly(5)),
        useNativeDriver: true,
      }),
      Animated.timing(bgRedOpacity, {
        toValue: 1,
        duration: 1500,
        easing: Easing.in(Easing.poly(5)),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Wave color fade staggering from left to right (JS API)
    Animated.stagger(200, [
      Animated.timing(color1, { toValue: 1, duration: 800, easing: Easing.in(Easing.poly(4)), useNativeDriver: false }),
      Animated.timing(color2, { toValue: 1, duration: 800, easing: Easing.in(Easing.poly(4)), useNativeDriver: false }),
      Animated.timing(color3, { toValue: 1, duration: 800, easing: Easing.in(Easing.poly(4)), useNativeDriver: false }),
    ]).start();

    // 2. After 1.5 seconds, fade out completely to reveal the app
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const createColors = (anim: Animated.Value) => {
    return {
      color: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [themeColor, '#000000']
      }),
      textShadowColor: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [themeColor, 'transparent'] // Let RN handle hex-to-rgba
      })
    };
  };

  const style1 = createColors(color1);
  const style2 = createColors(color2);
  const style3 = createColors(color3);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#0f0f13', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Red Background fading in perfectly matching Native GPU */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFillObject, 
          { backgroundColor: themeColor, opacity: bgRedOpacity }
        ]} 
      />
      
      {/* NTN Text with cinematic expansion and wave color fade */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        
        <View style={{ marginBottom: 6, position: 'relative' }}>
          {/* Base Red Icon */}
          <Ionicons name="videocam" size={42} color={themeColor} />
          
          {/* Fading Black Icon overlay (driven by color2 timeline [0->1]) */}
          <Animated.View style={{ position: 'absolute', opacity: color2 }}>
            <Ionicons name="videocam" size={42} color="#000000" />
          </Animated.View>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <Animated.Text style={[styles.logoText, style1]}>N</Animated.Text>
          <Animated.Text style={[styles.logoText, style2]}>T</Animated.Text>
          <Animated.Text style={[styles.logoText, style3]}>N</Animated.Text>
        </View>
      </Animated.View>
      
      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
        Cinematic Experience
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Overlay everything
    backgroundColor: '#000',
  },
  logoText: {
    fontSize: 52,
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    fontFamily: 'System', // Standard bold system font looks great
  },
  subtitle: {
    color: 'rgba(0,0,0,0.8)',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 15,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
