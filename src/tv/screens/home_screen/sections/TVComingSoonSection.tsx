import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface TVComingSoonSectionProps {
  upcoming: any[];
  onItemPress: (item: any) => void;
  onItemFocus: () => void;
  onItemBlur: () => void;
  themeColor: string;
}

function TVComingSoonCard({ item, onItemPress, onItemFocus, onItemBlur, themeColor }: { item: any, onItemPress: any, onItemFocus: any, onItemBlur: any, themeColor: string }) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pressableRef = useRef<any>(null);

  const displayTitle = item.title || item.name || 'Untitled';
  const backdropPath = item.backdrop_path || item.poster_path;
  const backdropUrl = backdropPath ? `https://image.tmdb.org/t/p/w500${backdropPath}` : null;

  return (
    <Pressable
      ref={pressableRef}
      focusable={true}
      onFocus={() => {
        setIsFocused(true);
        if (onItemFocus) onItemFocus();
      }}
      onBlur={() => {
        setIsFocused(false);
        if (onItemBlur) onItemBlur();
      }}
      onPress={() => onItemPress(item)}
      onPointerEnter={() => {
        setIsHovered(true);
        if (pressableRef.current?.focus) pressableRef.current.focus();
        if (onItemFocus) onItemFocus();
      }}
      onPointerLeave={() => setIsHovered(false)}
      style={[
        cardStyles.card,
        (isFocused || isHovered) && [cardStyles.cardFocused, { borderColor: themeColor, shadowColor: themeColor }]
      ]}
    >
      <View style={cardStyles.cardInner}>
        {backdropUrl ? (
          <Image source={{ uri: backdropUrl }} style={cardStyles.backdropImage} contentFit="cover" transition={200} />
        ) : (
          <View style={cardStyles.placeholderCard}>
            <Text style={cardStyles.placeholderText} numberOfLines={2}>{displayTitle}</Text>
          </View>
        )}
        <View style={cardStyles.infoContainer}>
          <Text style={cardStyles.titleText} numberOfLines={1}>{displayTitle}</Text>
          <Ionicons name="notifications" color="white" size={14} />
        </View>
      </View>
    </Pressable>
  );
}

export default function TVComingSoonSection({
  upcoming,
  onItemPress,
  onItemFocus,
  onItemBlur,
  themeColor
}: TVComingSoonSectionProps) {
  const { t } = useTranslation();

  if (!upcoming || upcoming.length === 0) return null;

  return (
    <View style={cardStyles.sectionContainer}>
      <Text style={cardStyles.sectionTitle}>{t('home.coming_soon_section') || 'Coming Soon'}</Text>
      <FlatList
        horizontal
        data={upcoming}
        keyExtractor={(item, index) => `coming-${item.id || index}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cardStyles.listContent}
        style={{ overflow: 'visible' }}
        {...({ clipToPadding: false } as any)}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <TVComingSoonCard
            item={item}
            onItemPress={onItemPress}
            onItemFocus={onItemFocus}
            onItemBlur={onItemBlur}
            themeColor={themeColor}
          />
        )}
      />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  sectionContainer: {
    marginVertical: 15,
  },
  sectionTitle: {
    color: '#e5e5e5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 40,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 40,
    paddingBottom: 30, // Expanded padding bottom for scaling
    paddingTop: 20, // Expanded padding top for scaling
    gap: 20,
  },
  card: {
    width: 220,
    height: 124,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'visible',
    backgroundColor: '#161823',
    elevation: 3,
  },
  cardFocused: {
    transform: [{ scale: 1.15 }],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    zIndex: 99,
  },
  cardInner: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#232635',
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
});
