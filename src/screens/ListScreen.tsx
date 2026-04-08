import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Vibration } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tmdbApi } from '../api/tmdb';
import FilterModal, { FilterState } from '../components/FilterModal';
import LongPressMoviePopup from '../components/LongPressMoviePopup';
import ScrollToTopButton from '../components/ScrollToTopButton';

export default function ListScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { type } = route.params || { type: 'movie' };
  
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  const isTV = type === 'tv';
  const title = isTV ? 'TV Shows' : 'Movies';

  useEffect(() => {
    setData([]);
    setPage(1);
    fetchData(1, activeFilters);
  }, [type, activeFilters]);

  const fetchData = async (pageNum: number, filters: { genreId: number, year: number, country: string }) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const resp: any = isTV 
        ? await tmdbApi.discoverTV(pageNum, filters)
        : await tmdbApi.discoverMovies(pageNum, filters);
      
      const newItems = resp?.results?.map((i: any) => ({ ...i, media_type: isTV ? 'tv' : 'movie' })) || [];
      const validItems = newItems.filter((i: any) => i.poster_path);

      if (pageNum === 1) {
        setData(validItems);
      } else {
        setData(prev => [...prev, ...validItems]);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore) {
      setPage(prev => {
        const nextPage = prev + 1;
        fetchData(nextPage, activeFilters);
        return nextPage;
      });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
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
          contentFit="cover"
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
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity 
          style={styles.filterIconButton}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons name="options-outline" size={24} color={(activeFilters.genreId > 0 || activeFilters.year > 0 || activeFilters.country !== '') ? '#E50914' : 'white'} />
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
        showTypeFilter={false}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          data={data}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={3}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
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
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 4,
  }
});
