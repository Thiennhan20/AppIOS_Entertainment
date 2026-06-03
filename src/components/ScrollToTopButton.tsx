import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ScrollToTopButtonProps {
  visible: boolean;
  onPress: () => void;
}

export default function ScrollToTopButton({ visible, onPress }: ScrollToTopButtonProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const isVisible = useRef(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const offsetRef = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Track coordinates using listener to avoid using internal _value
  useEffect(() => {
    const xListener = pan.x.addListener((val) => {
      currentPos.current.x = val.value;
    });
    const yListener = pan.y.addListener((val) => {
      currentPos.current.y = val.value;
    });
    return () => {
      pan.x.removeListener(xListener);
      pan.y.removeListener(yListener);
    };
  }, [pan]);

  useEffect(() => {
    if (visible && !isVisible.current) {
      isVisible.current = true;
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: false,
        friction: 6,
        tension: 50,
      }).start();
    } else if (!visible && isVisible.current) {
      isVisible.current = false;
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Capture touch only if finger moved more than 5px (avoids blocking clicks)
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        offsetRef.current = {
          x: currentPos.current.x,
          y: currentPos.current.y,
        };
      },
      onPanResponderMove: (_, gestureState) => {
        const dims = Dimensions.get('window');
        const currentScreenWidth = dims.width;
        const currentScreenHeight = dims.height;

        const snapDistance = currentScreenWidth - 50 - 40; 
        const minX = -snapDistance;
        const maxX = 0;

        const nextX = offsetRef.current.x + gestureState.dx;
        const nextY = offsetRef.current.y + gestureState.dy;

        // Clamp values to keep the button fully on-screen
        const clampedX = Math.min(Math.max(nextX, minX), maxX);
        const clampedY = Math.min(Math.max(nextY, -(currentScreenHeight - 220)), 50);

        pan.x.setValue(clampedX);
        pan.y.setValue(clampedY);
      },
      onPanResponderRelease: () => {
        const dims = Dimensions.get('window');
        const currentScreenWidth = dims.width;
        const snapDistance = currentScreenWidth - 50 - 40; 
        const leftTarget = -snapDistance;
        const rightTarget = 0;

        const currentX = currentPos.current.x;
        const targetX = currentX < leftTarget / 2 ? leftTarget : rightTarget;

        Animated.spring(pan.x, {
          toValue: targetX,
          useNativeDriver: false,
          friction: 8,
          tension: 40,
          overshootClamping: true, // Prevents bouncing past the targets (off-screen)
        }).start();
      },
    })
  ).current;

  const snapDistance = screenWidth - 50 - 40; 
  const minX = -snapDistance;

  // Strict clamps on the transform translations using interpolation
  const clampedTranslateX = pan.x.interpolate({
    inputRange: [minX, 0],
    outputRange: [minX, 0],
    extrapolate: 'clamp',
  });

  const clampedTranslateY = pan.y.interpolate({
    inputRange: [-(screenHeight - 220), 50],
    outputRange: [-(screenHeight - 220), 50],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View 
      {...panResponder.panHandlers}
      style={[
        styles.container, 
        { 
          transform: [
            { scale: animValue },
            { translateX: clampedTranslateX },
            { 
              translateY: Animated.add(
                clampedTranslateY, 
                animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
              ) 
            }
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
    bottom: 88,
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
