import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

type CinematicEntryTransitionProps = {
  onFinish: () => void;
};

export default function CinematicEntryTransition({ onFinish }: CinematicEntryTransitionProps) {
  const { themeColor } = useTheme();
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.96)).current;
  const lineScale = useRef(new Animated.Value(0)).current;
  const barsProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(markScale, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(lineScale, {
          toValue: 1,
          duration: 430,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(310),
      Animated.parallel([
        Animated.timing(barsProgress, {
          toValue: 1,
          duration: 360,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, [barsProgress, lineScale, markOpacity, markScale, onFinish, overlayOpacity]);

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity: overlayOpacity }]}>
      <LinearGradient colors={['#030305', '#0B0608', '#020203']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.aura, { backgroundColor: themeColor }]} />
      <Animated.View
        style={[
          styles.topBar,
          {
            transform: [
              {
                translateY: barsProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -40],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bottomBar,
          {
            transform: [
              {
                translateY: barsProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 40],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View style={[styles.mark, { opacity: markOpacity, transform: [{ scale: markScale }] }]}>
        <Text style={[styles.logo, { color: themeColor }]}>NTN</Text>
        <Animated.View style={[styles.line, { backgroundColor: themeColor, transform: [{ scaleX: lineScale }] }]} />
        <Text style={styles.caption}>ENTERTAINMENT</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#020203',
    justifyContent: 'center',
    zIndex: 10000,
  },
  aura: {
    borderRadius: 180,
    height: 270,
    opacity: 0.1,
    position: 'absolute',
    width: 270,
  },
  topBar: {
    backgroundColor: '#000000',
    height: 42,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bottomBar: {
    backgroundColor: '#000000',
    bottom: 0,
    height: 42,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  mark: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 49,
    fontWeight: '900',
    letterSpacing: 6,
  },
  line: {
    borderRadius: 2,
    height: 2,
    marginBottom: 14,
    marginTop: 13,
    width: 116,
  },
  caption: {
    color: '#D6D8DF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 5,
  },
});
