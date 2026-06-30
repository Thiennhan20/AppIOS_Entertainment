import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';

interface TVHomeCTASectionProps {
  onLoginPress: () => void;
  themeColor: string;
}

export default function TVHomeCTASection({
  onLoginPress,
  themeColor
}: TVHomeCTASectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pressableRef = useRef<any>(null);

  // If user is already logged in, show a nice thank you / profile card
  if (user) {
    return (
      <View style={cardStyles.container}>
        <View style={[cardStyles.banner, { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#11131c' }]}>
          <Ionicons name="shield-checkmark" size={40} color={themeColor} style={cardStyles.icon} />
          <View style={cardStyles.textContainer}>
            <Text style={cardStyles.title}>
              {t('general.home') === 'Home' ? 'Welcome back, ' : 'Chào mừng trở lại, '}
              <Text style={{ color: themeColor, fontWeight: '900' }}>{user.name || 'Member'}</Text>!
            </Text>
            <Text style={cardStyles.subtitle}>
              {t('general.home') === 'Home' 
                ? 'Your account has active Premium member status. Enjoy thousands of movies & series!' 
                : 'Tài khoản của bạn đã kích hoạt thành viên Premium. Thưởng thức hàng ngàn bộ phim ngay!'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyles.container}>
      <Pressable
        ref={pressableRef}
        focusable={true}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPress={onLoginPress}
        onPointerEnter={() => {
          setIsHovered(true);
          if (pressableRef.current?.focus) pressableRef.current.focus();
        }}
        onPointerLeave={() => setIsHovered(false)}
        style={[
          cardStyles.banner,
          { borderColor: 'rgba(255,255,255,0.05)' },
          (isFocused || isHovered) && [cardStyles.bannerFocused, { borderColor: themeColor, shadowColor: themeColor }]
        ]}
      >
        <Ionicons name="lock-closed-outline" size={40} color={themeColor} style={cardStyles.icon} />
        <View style={cardStyles.textContainer}>
          <Text style={cardStyles.title}>{t('home.home_cta_title') || 'Unlock the Best Experience'}</Text>
          <Text style={cardStyles.subtitle}>{t('home.home_cta_subtitle_tv') || 'Log in now to save your watch history.'}</Text>
        </View>
        <View style={[cardStyles.btn, { backgroundColor: themeColor }]}>
          <Text style={cardStyles.btnText}>{t('auth.log_in') || 'Login'}</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </View>
      </Pressable>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161823',
    borderRadius: 16,
    padding: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 3,
  },
  bannerFocused: {
    transform: [{ scale: 1.05 }],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    zIndex: 99,
  },
  icon: {
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#aaaaaa',
    fontSize: 13,
    marginTop: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginLeft: 20,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
