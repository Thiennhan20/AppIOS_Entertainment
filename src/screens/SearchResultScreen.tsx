import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tmdbApi } from '../api/tmdb';
import FilterModal, { FilterState } from '../components/FilterModal';
import LongPressMoviePopup from '../components/LongPressMoviePopup';
import ScrollToTopButton from '../components/ScrollToTopButton';

export default function SearchResultScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { query } = route.params;
  const { t } = useTranslation();

  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({ genreId: 0, year: 0, country: '', type: 'all' });

  const [longPressedMovie, setLongPressedMovie] = useState<any>(null);

  const scrollRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 300 && !showScrollTop) setShowScrollTop(true);
    if (offsetY <= 300 && showScrollTop) setShowScrollTop(false);
  };

  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    fetchData(1, activeFilters);
  }, [query, activeFilters]);

  const fetchData = async (pageNum: number, filters: FilterState) => {
    if (!hasMore && pageNum > 1) return;
    
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      // Create localized query params to pass down
      const fetchParams: any = { query, page: pageNum };
      if (filters.year > 0) fetchParams.primary_release_year = filters.year; // Note: TV uses first_air_date_year, but search API might support year broadly
      if (filters.year > 0) fetchParams.first_air_date_year = filters.year;

      const promises = [];
      if (filters.type === 'all' || filters.type === 'movie') promises.push(tmdbApi.searchMovies(query, pageNum));
      else promises.push(Promise.resolve({ results: [] }));
      
      if (filters.type === 'all' || filters.type === 'tv') promises.push(tmdbApi.searchTV(query, pageNum));
      else promises.push(Promise.resolve({ results: [] }));

      const [movies, tv] = await Promise.all(promises);
      
      const mData = (movies as any)?.results?.map((i: any) => ({ ...i, media_type: 'movie' })) || [];
      const tData = (tv as any)?.results?.map((i: any) => ({ ...i, media_type: 'tv' })) || [];

      let newItems = [...mData, ...tData].filter((i: any) => i.poster_path);

      // Local filtering for genres and country since search API doesn't support them directly
      if (filters.genreId > 0) {
        newItems = newItems.filter(i => i.genre_ids?.includes(filters.genreId));
      }
      if (filters.country) {
        newItems = newItems.filter(i => i.origin_country?.includes(filters.country));
      }

      if (mData.length === 0 && tData.length === 0) {
        setHasMore(false);
      }

      if (pageNum === 1) {
        setData(newItems);
      } else {
        setData(prev => {
          // Remove duplicates
          const currentIds = new Set(prev.map(i => i.id));
          const uniqueItems = newItems.filter(i => !currentIds.has(i.id));
          return [...prev, ...uniqueItems];
        });
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      setPage(prev => {
        const nextPage = prev + 1;
        fetchData(nextPage, activeFilters);
        return nextPage;
      });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isTV = item.media_type === 'tv';
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('DetailScreen', { item, isTV })}
        onLongPress={() => {
          setLongPressedMovie({ ...item, isTV });
        }}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }} 
          style={styles.poster} 
        />
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('search.results_for', { defaultValue: 'Results for' })} "{query}"
        </Text>
        <TouchableOpacity 
          style={styles.filterIconButton}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons name="options-outline" size={24} color={(activeFilters.genreId > 0 || activeFilters.year > 0 || activeFilters.country !== '' || activeFilters.type !== 'all') ? '#E50914' : 'white'} />
        </TouchableOpacity>
      </View>

      <FilterModal 
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={activeFilters}
        onApply={(f) => {
          setActiveFilters(f);
          setFilterVisible(false);
        }}
        showTypeFilter={true}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : data.length === 0 ? (
         <View style={styles.emptyContainer}>
          <Ionicons name="sad-outline" size={60} color="#444" />
          <Text style={styles.emptyText}>{t('search.no_movies_found')}</Text>
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          data={data}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={3}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
             loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#E50914" />
              </View>
            ) : <View style={{ height: 20 }} />
          }
        />
      )}

      <LongPressMoviePopup 
        movie={longPressedMovie} 
        onClose={() => setLongPressedMovie(null)} 
      />

      <ScrollToTopButton 
        visible={showScrollTop} 
        onPress={() => scrollRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  backButton: {
    marginRight: 15,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 15,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 20,
    maxWidth: '31%',
  },
  poster: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  filterIconButton: {
    paddingLeft: 12,
  }
});
