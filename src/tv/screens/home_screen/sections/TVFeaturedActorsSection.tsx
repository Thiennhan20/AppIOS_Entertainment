import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

interface TVFeaturedActorsSectionProps {
  actors: any[];
  themeColor: string;
}

function TVActorCard({ item, themeColor }: { item: any, themeColor: string }) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pressableRef = useRef<any>(null);

  const imageUrl = item.profile_path ? `https://image.tmdb.org/t/p/w200${item.profile_path}` : 'https://via.placeholder.com/200x200?text=Actor';

  return (
    <Pressable
      ref={pressableRef}
      focusable={true}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
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
      <Image source={{ uri: imageUrl }} style={cardStyles.avatar} contentFit="cover" />
      <Text style={cardStyles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={cardStyles.character} numberOfLines={1}>{item.character || t('home.acting_label') || 'Actor'}</Text>
    </Pressable>
  );
}

export default function TVFeaturedActorsSection({
  actors,
  themeColor
}: TVFeaturedActorsSectionProps) {
  const { t } = useTranslation();

  if (!actors || actors.length === 0) return null;

  return (
    <View style={cardStyles.sectionContainer}>
      <Text style={cardStyles.sectionTitle}>{t('home.actors_title') || 'Featured Actors'}</Text>
      <FlatList
        horizontal
        data={actors}
        keyExtractor={(item, index) => `actor-${item.id || index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cardStyles.listContent}
        style={{ overflow: 'visible' }}
        {...({ clipToPadding: false } as any)}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <TVActorCard
            item={item}
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
    width: 120,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  cardFocused: {
    transform: [{ scale: 1.15 }],
    backgroundColor: '#161823',
    elevation: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: '#232635',
  },
  name: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  character: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});
