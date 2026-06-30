import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

interface TVEntertainmentSectionProps {
  onTabChange?: (tab: string) => void;
  themeColor: string;
}

function TVEntertainmentCard({
  title,
  icon,
  gradient,
  onPress,
  themeColor
}: {
  title: string;
  icon: string;
  gradient: [string, string];
  onPress: () => void;
  themeColor: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pressableRef = useRef<any>(null);

  return (
    <Pressable
      ref={pressableRef}
      focusable={true}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={onPress}
      onPointerEnter={() => {
        setIsHovered(true);
        if (pressableRef.current?.focus) pressableRef.current.focus();
      }}
      onPointerLeave={() => setIsHovered(false)}
      style={[
        cardStyles.card,
        (isFocused || isHovered) && [cardStyles.cardFocused, { borderColor: themeColor, shadowColor: themeColor }]
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Ionicons name={icon as any} size={36} color="#ffffff" style={cardStyles.icon} />
      <Text style={cardStyles.title}>{title}</Text>
    </Pressable>
  );
}

export default function TVEntertainmentSection({
  onTabChange,
  themeColor
}: TVEntertainmentSectionProps) {
  const { t } = useTranslation();

  const handleCardPress = (id: string) => {
    if (id === 'movies') {
      if (onTabChange) onTabChange('movies');
    } else if (id === 'tv') {
      if (onTabChange) onTabChange('tv_shows');
    } else if (id === 'game') {
      Alert.alert(
        t('general.notice') || 'Thông báo',
        t('general.home') === 'Home' 
          ? 'Game feature is being optimized for TV. Please experience Game on the mobile app!' 
          : 'Chức năng Game đang được tối ưu hóa cho TV. Vui lòng trải nghiệm Game trên ứng dụng điện thoại!'
      );
    }
  };

  const sections = [
    { id: 'movies', title: t('home.entertainment_movies') || 'Movies Hub', icon: 'film-outline', gradient: ['#FF5E62', '#FF9966'] as [string, string] },
    { id: 'tv', title: t('home.entertainment_tv') || 'TV Shows Hub', icon: 'tv-outline', gradient: ['#11998e', '#38ef7d'] as [string, string] },
  ];

  return (
    <View style={cardStyles.sectionContainer}>
      <Text style={cardStyles.sectionTitle}>{t('general.home') === 'Home' ? 'Movie Categories' : 'Danh Mục Phim'}</Text>
      <View style={cardStyles.grid}>
        {sections.map((item) => (
          <TVEntertainmentCard
            key={item.id}
            title={item.title}
            icon={item.icon}
            gradient={item.gradient}
            onPress={() => handleCardPress(item.id)}
            themeColor={themeColor}
          />
        ))}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  sectionContainer: {
    marginVertical: 20,
    paddingHorizontal: 40,
  },
  sectionTitle: {
    color: '#e5e5e5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    height: 110,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
    elevation: 3,
  },
  cardFocused: {
    transform: [{ scale: 1.08 }],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    zIndex: 99,
  },
  icon: {
    alignSelf: 'flex-start',
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
  },
});
