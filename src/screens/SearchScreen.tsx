import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tmdbApi } from '../api/tmdb';
import FilterModal, { FilterState } from '../components/FilterModal';
import LongPressMoviePopup from '../components/LongPressMoviePopup';

export default function SearchScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [longPressedMovie, setLongPressedMovie] = useState<any>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({ genreId: 0, year: 0, country: '', type: 'all' });

  // Debounce input logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  // Execute search when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery.trim() && activeFilters.genreId === 0 && activeFilters.year === 0 && activeFilters.country === '') {
      setResults([]);
      return;
    }

    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        let mData: any[] = [];
        let tData: any[] = [];
        
        if (debouncedQuery.trim()) {
          const promises = [];
          if (activeFilters.type === 'all' || activeFilters.type === 'movie') promises.push(tmdbApi.searchMovies(debouncedQuery));
          else promises.push(Promise.resolve({ results: [] }));
          
          if (activeFilters.type === 'all' || activeFilters.type === 'tv') promises.push(tmdbApi.searchTV(debouncedQuery));
          else promises.push(Promise.resolve({ results: [] }));

          const [movies, tv] = await Promise.all(promises);
          mData = (movies as any)?.results?.map((i: any) => ({ ...i, media_type: 'movie' })) || [];
          tData = (tv as any)?.results?.map((i: any) => ({ ...i, media_type: 'tv' })) || [];
        } else {
          // No query, use discover API based on filters
          const promises = [];
          if (activeFilters.type === 'all' || activeFilters.type === 'movie') promises.push(tmdbApi.discoverMovies(1, activeFilters));
          else promises.push(Promise.resolve({ results: [] }));
          
          if (activeFilters.type === 'all' || activeFilters.type === 'tv') promises.push(tmdbApi.discoverTV(1, activeFilters));
          else promises.push(Promise.resolve({ results: [] }));

          const [movies, tv] = await Promise.all(promises);
          mData = (movies as any)?.results?.map((i: any) => ({ ...i, media_type: 'movie' })) || [];
          tData = (tv as any)?.results?.map((i: any) => ({ ...i, media_type: 'tv' })) || [];
        }

        let mixed = [...mData, ...tData].filter(i => i.poster_path);

        // Local filtering if both text and filters exists
        if (debouncedQuery.trim()) {
          if (activeFilters.genreId > 0) mixed = mixed.filter(i => i.genre_ids?.includes(activeFilters.genreId));
          if (activeFilters.year > 0) {
            mixed = mixed.filter(i => {
              const yearStr = i.release_date || i.first_air_date || '';
              return yearStr.startsWith(activeFilters.year.toString());
            });
          }
          if (activeFilters.country) {
            mixed = mixed.filter(i => i.origin_country?.includes(activeFilters.country));
          }
        }
        
        setResults(mixed);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [debouncedQuery, activeFilters]);

  const renderItem = ({ item }: { item: any }) => {
    const isTV = item.media_type === 'tv';
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('DetailScreen', { item, isTV })}
        onLongPress={() => {
          Vibration.vibrate(40);
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
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search.search_movies_series')}
            placeholderTextColor="#777"
            autoFocus={false}
            clearButtonMode="while-editing"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterIconButton}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons name="options-outline" size={26} color={(activeFilters.genreId > 0 || activeFilters.year > 0 || activeFilters.country !== '' || activeFilters.type !== 'all') ? '#E50914' : 'white'} />
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
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          initialNumToRender={24}
          maxToRenderPerBatch={24}
          windowSize={5}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
        />
      ) : (debouncedQuery.length > 0 || activeFilters.genreId > 0 || activeFilters.year > 0 || activeFilters.country !== '') ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sad-outline" size={60} color="#444" />
          <Text style={styles.emptyText}>{t('search.no_movies_found')}</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={60} color="#444" />
          <Text style={styles.emptyText}>{t('search.enter_name_to_search')}</Text>
        </View>
      )}

      <LongPressMoviePopup 
        movie={longPressedMovie} 
        onClose={() => setLongPressedMovie(null)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#222230',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
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
    resizeMode: 'cover',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
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
  filterIconButton: {
    paddingLeft: 12,
  }
});
