import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

interface TVRecentCommentsSectionProps {
  recentComments: any[];
  onItemPress: (item: any, isTV: boolean) => void;
  onItemFocus: () => void;
  onItemBlur: () => void;
  themeColor: string;
}

const getTimeSince = (dateString: string, t: any) => {
  if (!dateString) return t('home.just_now') || 'just now';
  const diff = Math.max(0, Date.now() - new Date(dateString).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('home.just_now') || 'just now';
  if (minutes < 60) return `${minutes} ${t('home.mins_ago') || 'mins ago'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t('home.hours_ago') || 'hours ago'}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t('home.days_ago') || 'days ago'}`;
};

function TVRecentCommentCard({ item, onItemPress, onItemFocus, onItemBlur, themeColor }: { item: any, onItemPress: any, onItemFocus: any, onItemBlur: any, themeColor: string }) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pressableRef = useRef<any>(null);

  const navItem = {
    id: item.movieId,
    title: item.movieTitle,
    poster_path: item.moviePoster ? item.moviePoster.replace('https://image.tmdb.org/t/p/w200', '') : null
  };
  const isTV = item.type === 'tv' || item.type === 'tvshow';

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
      onPress={() => onItemPress(navItem, isTV)}
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
      <View style={cardStyles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={cardStyles.avatarContainer}>
            <Image source={{ uri: item.user?.avatar || 'https://i.pravatar.cc/150' }} style={cardStyles.avatar} />
            <View style={cardStyles.onlineDot} />
          </View>
          <View style={cardStyles.meta}>
            <Text style={cardStyles.name} numberOfLines={1}>{item.user?.name || 'User'}</Text>
            <Text style={cardStyles.time}>{getTimeSince(item.createdAt, t)}</Text>
          </View>
        </View>
        <View style={cardStyles.movieSide}>
          {item.moviePoster && <Image source={{ uri: item.moviePoster }} style={cardStyles.sidePoster} />}
          <Text style={cardStyles.sideTitle} numberOfLines={1}>{item.movieTitle}</Text>
        </View>
      </View>
      <View style={cardStyles.contentBubble}>
        <Text style={cardStyles.contentText} numberOfLines={3}>{item.content}</Text>
      </View>
    </Pressable>
  );
}

export default function TVRecentCommentsSection({
  recentComments,
  onItemPress,
  onItemFocus,
  onItemBlur,
  themeColor
}: TVRecentCommentsSectionProps) {
  const { t } = useTranslation();

  if (!recentComments || recentComments.length === 0) return null;

  return (
    <View style={cardStyles.sectionContainer}>
      <Text style={[cardStyles.sectionTitle, { color: '#4da6ff' }]}>{t('home.fresh_comments') || 'Fresh Comments'}</Text>
      <FlatList
        horizontal
        data={recentComments}
        keyExtractor={(item) => `recent-${item._id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cardStyles.listContent}
        style={{ overflow: 'visible' }}
        {...({ clipToPadding: false } as any)}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <TVRecentCommentCard
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
    width: 285,
    height: 150,
    backgroundColor: '#161823',
    borderRadius: 14,
    padding: 14,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'space-between',
    elevation: 3,
    overflow: 'hidden',
  },
  cardFocused: {
    transform: [{ scale: 1.15 }],
    borderWidth: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    zIndex: 99,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#161823',
  },
  meta: {
    marginLeft: 8,
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  time: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  movieSide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 110,
  },
  sidePoster: {
    width: 14,
    height: 20,
    borderRadius: 2,
    marginRight: 6,
  },
  sideTitle: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  contentBubble: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 8,
    flex: 1,
    marginTop: 8,
    justifyContent: 'center',
  },
  contentText: {
    color: '#bbb',
    fontSize: 11,
    lineHeight: 16,
  },
});
