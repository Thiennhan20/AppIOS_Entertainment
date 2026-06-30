import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tmdbApi } from '../../api/tmdb';
import { useTheme } from '../../context/ThemeContext';

const COLUMNS = 5;
const CARD_WIDTH = 140;
const CARD_HEIGHT = 210;
const CARD_MARGIN = 10;

interface TVMoviesScreenProps {
  navigation: any;
}

function TVMovieCard({ item, onItemPress, themeColor }: { item: any, onItemPress: any, themeColor: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const pressableRef = useRef<any>(null);

  const posterPath = item.poster_path;
  const originalPoster = posterPath ? `https://image.tmdb.org/t/p/w300${posterPath}` : null;
  const displayTitle = item.title || item.name || 'Untitled';

  return (
    <Pressable
      ref={pressableRef}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={() => onItemPress(item)}
      onPointerEnter={() => {
        setIsHovered(true);
        if (pressableRef.current && pressableRef.current.focus) {
          pressableRef.current.focus();
        }
      }}
      onPointerLeave={() => setIsHovered(false)}
      focusable={true}
      style={[
        styles.cardContainer,
        (isFocused || isHovered) && [styles.cardContainerFocused, { borderColor: themeColor, shadowColor: themeColor }]
      ]}
    >
      {() => {
        const showActive = isFocused || isHovered;
        return (
          <View style={styles.cardInner}>
            {originalPoster ? (
              <Image
                source={{ uri: originalPoster }}
                style={styles.posterImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderText} numberOfLines={3}>
                  {displayTitle}
                </Text>
              </View>
            )}
            {showActive && (
              <View style={styles.titleOverlay}>
                <Text style={styles.overlayText} numberOfLines={1}>
                  {displayTitle}
                </Text>
              </View>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

export default function TVMoviesScreen({ navigation }: TVMoviesScreenProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const title = t('tv.movies') || 'Movies';
  const subtitle = t('tv.movies_subtitle') || 'Discover popular and trending feature films.';

  const fetchMovies = async (pageNum: number, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const resp: any = await tmdbApi.discoverMovies(pageNum);
      const newItems = resp?.results || [];
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => isInitial ? newItems : [...prev, ...newItems]);
        setPage(pageNum);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMovies(1, true);
  }, []);

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchMovies(page + 1);
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      ) : items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={COLUMNS}
          ListHeaderComponent={() => (
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          style={{ overflow: 'visible' }}
          {...({ clipToPadding: false } as any)}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListFooterComponent={() => loadingMore ? (
            <ActivityIndicator size="small" color={themeColor} style={{ marginVertical: 20 }} />
          ) : null}
          renderItem={({ item }) => (
            <TVMovieCard
              item={item}
              onItemPress={(movieItem: any) => navigation.navigate('TVDetail', { item: movieItem, isTV: false })}
              themeColor={themeColor}
            />
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.loaderBox}>
            <Ionicons name="film-outline" size={50} color="#444" style={{ marginBottom: 15 }} />
            <Text style={styles.noRoomsText}>{t('tv.no_movies') || 'No movies found.'}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050609',
  },
  headerContainer: {
    paddingHorizontal: 40,
    paddingTop: 40,
    marginBottom: 5,
  },
  emptyContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#888888',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 20,
  },
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 40,
    paddingBottom: 60,
    paddingTop: 10,
    gap: 20,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    marginVertical: 15, // Changed from marginBottom to marginVertical for scaling space
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'visible',
    backgroundColor: '#161823',
    elevation: 3,
  },
  cardContainerFocused: {
    transform: [{ scale: 1.15 }],
    borderWidth: 3,
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
  posterImage: {
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
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  noRoomsText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
