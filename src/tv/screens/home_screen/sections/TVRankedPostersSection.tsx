import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

interface TVRankedPostersSectionProps {
  title: string;
  data: any[];
  isTV: boolean;
  onItemPress: (item: any, isTV: boolean) => void;
  onItemFocus: () => void;
  onItemBlur: () => void;
  themeColor: string;
}

function TVRankedCard({ item, index, isTV, onItemPress, onItemFocus, onItemBlur, themeColor }: { item: any, index: number, isTV: boolean, onItemPress: any, onItemFocus: any, onItemBlur: any, themeColor: string }) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pressableRef = useRef<any>(null);

  const posterPath = item.poster_path || (item.poster && item.poster.replace('https://image.tmdb.org/t/p/w400', ''));
  const imageUrl = posterPath ? `https://image.tmdb.org/t/p/w300${posterPath}` : null;
  const displayTitle = item.title || item.name || 'Untitled';

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
      onPress={() => onItemPress(item, isTV)}
      onPointerEnter={() => {
        setIsHovered(true);
        if (pressableRef.current?.focus) pressableRef.current.focus();
        if (onItemFocus) onItemFocus();
      }}
      onPointerLeave={() => setIsHovered(false)}
      style={[
        cardStyles.container,
        (isFocused || isHovered) && cardStyles.containerFocused
      ]}
    >
      {/* Giant stylized number ranking */}
      <Text style={[cardStyles.rankNumber, { textShadowColor: themeColor }]}>
        {index + 1}
      </Text>
      
      <View
        style={[
          cardStyles.card,
          (isFocused || isHovered) && [cardStyles.cardFocused, { borderColor: themeColor, shadowColor: themeColor }]
        ]}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={cardStyles.poster} contentFit="cover" transition={200} />
        ) : (
          <View style={cardStyles.placeholder}>
            <Text style={cardStyles.placeholderText} numberOfLines={3}>{displayTitle}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function TVRankedPostersSection({
  title,
  data,
  isTV,
  onItemPress,
  onItemFocus,
  onItemBlur,
  themeColor
}: TVRankedPostersSectionProps) {
  if (!data || data.length === 0) return null;

  // Limit to top 5 items like on mobile
  const rankedData = data.slice(0, 5);

  return (
    <View style={cardStyles.sectionContainer}>
      <Text style={cardStyles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={rankedData}
        keyExtractor={(item, index) => `${item.id || index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cardStyles.listContent}
        style={{ overflow: 'visible' }}
        {...({ clipToPadding: false } as any)}
        removeClippedSubviews={false}
        renderItem={({ item, index }) => (
          <TVRankedCard
            item={item}
            index={index}
            isTV={isTV}
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
    paddingBottom: 40,
    paddingTop: 40,
    gap: 30,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    width: 315,
    height: 410,
    overflow: 'visible',
  },
  containerFocused: {
    transform: [{ scale: 1.08 }],
  },
  rankNumber: {
    fontSize: 90,
    fontWeight: '900',
    color: '#ffffff',
    position: 'absolute',
    left: 0,
    bottom: -5,
    zIndex: 10,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  card: {
    width: 260,
    height: 390,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: '#161823',
    elevation: 3,
    overflow: 'hidden',
    marginLeft: 55,
    zIndex: 20,
  },
  cardFocused: {
    borderWidth: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    zIndex: 99,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
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
});
