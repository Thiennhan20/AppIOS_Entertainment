import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { styles } from '../homeStyles';
import { getTimeSince } from '../utils';

type Props = {
  topComments: any[];
  recentComments: any[];
  navigation: any;
};

export function TopCommentsSection({ data, navigation }: { data: any[]; navigation: any }) {
  const { t } = useTranslation();
  return (
    <View style={{ paddingBottom: 15 }}>
      <Text style={[styles.sectionTitle, { color: '#E50914' }]}>{t('home.top_comments')}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={data}
        keyExtractor={(item) => `top-${item._id}`}
        renderItem={({ item, index }) => (
          <TouchableOpacity 
            style={styles.topCommentCard}
            activeOpacity={0.8}
            onPress={() => {
              navigation.navigate('DetailScreen', {
                item: {
                  id: item.movieId,
                  title: item.movieTitle,
                  poster_path: item.moviePoster ? item.moviePoster.replace('https://image.tmdb.org/t/p/w200', '') : null
                },
                isTV: item.type === 'tv' || item.type === 'tvshow'
              });
            }}
          >
            <Ionicons name="trophy" size={80} color="rgba(229, 9, 20, 0.08)" style={styles.topQuoteIcon} />
            <View style={styles.movieContextBar}>
              {item.moviePoster && <Image source={{ uri: item.moviePoster }} style={styles.contextPoster} />}
              <View style={{ flex: 1, paddingRight: 5 }}>
                <Text style={styles.contextTitle} numberOfLines={1}>{item.movieTitle}</Text>
                <Text style={styles.contextTime}>{getTimeSince(item.createdAt, t)}</Text>
              </View>
            </View>
            <Text style={styles.topCommentContent} numberOfLines={3}>"{item.content}"</Text>
            <View style={styles.topCommentFooter}>
              <Image source={{ uri: item.user?.avatar || 'https://i.pravatar.cc/150' }} style={styles.topCommentAvatar} />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={styles.topCommentName} numberOfLines={1}>{item.user?.name}</Text>
                <View style={styles.topStatsRow}>
                  <Ionicons name="heart" size={13} color="#E50914" />
                  <Text style={styles.topStatText}>{item.likes} {t('home.upvotes')}</Text>
                  {item.replyCount ? (
                    <>
                      <View style={styles.dotSeparator} />
                      <Ionicons name="chatbubbles" size={13} color="#a32cc4" />
                      <Text style={styles.topStatText}>{item.replyCount}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <View style={styles.topRankBadge}>
                <Text style={styles.topRankText}>#{index + 1}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={3}
      />
    </View>
  );
}

export function RecentCommentsSection({ data, navigation }: { data: any[]; navigation: any }) {
  const { t } = useTranslation();
  return (
    <View style={{ paddingBottom: 15 }}>
      <Text style={[styles.sectionTitle, { color: '#4da6ff' }]}>{t('home.fresh_comments')}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={data}
        keyExtractor={(item) => `recent-${item._id}`}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.recentCommentCard}
            activeOpacity={0.8}
            onPress={() => {
              navigation.navigate('DetailScreen', {
                item: {
                  id: item.movieId,
                  title: item.movieTitle,
                  poster_path: item.moviePoster ? item.moviePoster.replace('https://image.tmdb.org/t/p/w200', '') : null
                },
                isTV: item.type === 'tv' || item.type === 'tvshow'
              });
            }}
          >
            <View style={styles.recentHeader}>
              <View style={styles.recentAvatarContainer}>
                <Image source={{ uri: item.user?.avatar || 'https://i.pravatar.cc/150' }} style={styles.recentAvatar} />
                <View style={styles.recentOnlineDot} />
              </View>
              <View style={styles.recentMeta}>
                <Text style={styles.recentName} numberOfLines={1}>{item.user?.name}</Text>
                <Text style={styles.recentTime}>{getTimeSince(item.createdAt, t)}</Text>
              </View>
              <View style={styles.recentMovieSide}>
                 {item.moviePoster && <Image source={{ uri: item.moviePoster }} style={styles.recentSidePoster} />}
                 <Text style={styles.recentSideTitle} numberOfLines={1}>{item.movieTitle}</Text>
              </View>
            </View>
            <View style={styles.recentContentBubble}>
              <Text style={styles.recentContentText} numberOfLines={3}>{item.content}</Text>
            </View>
          </TouchableOpacity>
        )}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={3}
      />
    </View>
  );
}
