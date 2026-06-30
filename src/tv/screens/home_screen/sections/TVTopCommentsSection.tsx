import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface TVTopCommentsSectionProps {
  topComments: any[];
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

function TVTopCommentCard({ item, index, onItemPress, onItemFocus, onItemBlur, themeColor }: { item: any, index: number, onItemPress: any, onItemFocus: any, onItemBlur: any, themeColor: string }) {
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
      <Ionicons name="trophy" size={80} color="rgba(229, 9, 20, 0.08)" style={cardStyles.topQuoteIcon} />
      
      <View style={cardStyles.movieContextBar}>
        {item.moviePoster && (
          <Image source={{ uri: item.moviePoster }} style={cardStyles.contextPoster} contentFit="cover" />
        )}
        <View style={{ flex: 1, paddingRight: 5 }}>
          <Text style={cardStyles.contextTitle} numberOfLines={1}>{item.movieTitle}</Text>
          <Text style={cardStyles.contextTime}>{getTimeSince(item.createdAt, t)}</Text>
        </View>
      </View>

      <Text style={cardStyles.topCommentContent} numberOfLines={3}>"{item.content}"</Text>

      <View style={cardStyles.topCommentFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Image source={{ uri: item.user?.avatar || 'https://i.pravatar.cc/150' }} style={cardStyles.topCommentAvatar} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={cardStyles.topCommentName} numberOfLines={1}>{item.user?.name || 'User'}</Text>
            <View style={cardStyles.topStatsRow}>
              <Ionicons name="heart" size={12} color="#E50914" />
              <Text style={cardStyles.topStatText}>{item.likes} {t('home.upvotes')}</Text>
              {item.replyCount ? (
                <>
                  <View style={cardStyles.dotSeparator} />
                  <Ionicons name="chatbubbles" size={12} color="#a32cc4" />
                  <Text style={cardStyles.topStatText}>{item.replyCount}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
        <View style={cardStyles.topRankBadge}>
          <Text style={cardStyles.topRankText}>#{index + 1}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function TVTopCommentsSection({
  topComments,
  onItemPress,
  onItemFocus,
  onItemBlur,
  themeColor
}: TVTopCommentsSectionProps) {
  const { t } = useTranslation();

  if (!topComments || topComments.length === 0) return null;

  return (
    <View style={cardStyles.sectionContainer}>
      <Text style={[cardStyles.sectionTitle, { color: '#E50914' }]}>{t('home.top_comments') || 'Top Comments'}</Text>
      <FlatList
        horizontal
        data={topComments}
        keyExtractor={(item) => `top-${item._id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cardStyles.listContent}
        style={{ overflow: 'visible' }}
        {...({ clipToPadding: false } as any)}
        removeClippedSubviews={false}
        renderItem={({ item, index }) => (
          <TVTopCommentCard
            item={item}
            index={index}
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
    width: 280,
    height: 180,
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
  topQuoteIcon: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
  movieContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contextPoster: {
    width: 24,
    height: 36,
    borderRadius: 4,
    marginRight: 10,
  },
  contextTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contextTime: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  topCommentContent: {
    color: '#ddd',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  topCommentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
  },
  topCommentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  topCommentName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  topStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  topStatText: {
    color: '#aaa',
    fontSize: 9,
    marginLeft: 3,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#555',
    marginHorizontal: 5,
  },
  topRankBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  topRankText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
