import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ScrollToTopButtonProps {
  visible: boolean;
  onPress: () => void;
  bottomOffset?: number;
}

export default function ScrollToTopButton({ visible, onPress, bottomOffset = 20 }: ScrollToTopButtonProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const isVisible = useRef(false);

  useEffect(() => {
    if (visible && !isVisible.current) {
      isVisible.current = true;
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 50,
      }).start();
    } else if (!visible && isVisible.current) {
      isVisible.current = false;
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          bottom: bottomOffset,
          transform: [
            { scale: animValue },
            { translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }
          ],
          opacity: animValue
        }
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <LinearGradient
          colors={['#ff8a66', '#ff4b4b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Ionicons name="chevron-up" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#ff4b4b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
