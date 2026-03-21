import React, { createContext, useContext, useState, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'info';

interface ToastContextData {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextData>({
  showToast: () => {},
  hideToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  const showToast = (message: string, type: ToastType = 'info') => {
    // Ngăn chặn hiển thị trùng lặp toast nếu đang hiện đúng cái text đó
    if (toast && toast.message === message) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const newId = Date.now();
    setToast({ message, type, id: newId });

    // Hiệu ứng Toast trượt xuống
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Tự biến mất sau 5 giây
    timerRef.current = setTimeout(() => {
      hideToast(newId);
    }, 5000);
  };

  const hideToast = (idToCheck?: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Chỉ reset data khi đang ẩn cái toast đúng ID ban đầu
      setToast(prev => (idToCheck && prev?.id !== idToCheck ? prev : null));
    });
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'warning';
      default: return 'information-circle';
    }
  };

  const getColor = (type: ToastType) => {
    switch (type) {
      case 'success': return '#10b981'; // Green
      case 'error': return '#ef4444'; // Red
      default: return '#3b82f6'; // Blue
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: Math.max(insets.top + 10, 30),
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View style={[styles.toastContent, { borderLeftColor: getColor(toast.type) }]}>
            <Ionicons name={getIcon(toast.type)} size={24} color={getColor(toast.type)} style={styles.icon} />
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
            <TouchableOpacity onPress={() => hideToast()} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937', // Dark Gray
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    borderLeftWidth: 4,
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
