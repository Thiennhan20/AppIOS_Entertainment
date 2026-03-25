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
  const [isTyping, setIsTyping] = useState(false);
  const [longPressedMovie, setLongPressedMovie] = useState<any>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({ genreId: 0, year: 0, country: '', type: 'all' });

  const handleTextChange = (text: string) => {
    setQuery(text);
    if (text.trim().length > 0) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  };

  // Debounce input logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400); // 400ms for faster feel
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
        setIsTyping(false);
      }
    };

    fetchSearchResults();
  }, [debouncedQuery, activeFilters]);

  const renderItem = ({ item }: { item: any }) => {
    const isTV = item.media_type === 'tv';
    const typeLabel = isTV ? 'TV Series' : 'Movie';
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);

    if (query.trim().length > 0) {
      // Autocomplete list style
      return (
        <TouchableOpacity 
          style={styles.autocompleteCard}
          onPress={() => navigation.navigate('DetailScreen', { item, isTV })}
          onLongPress={() => {

            setLongPressedMovie({ ...item, isTV });
          }}
          delayLongPress={400}
          activeOpacity={0.8}
        >
          <Image source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }} style={styles.autoPoster} />
          <View style={styles.autoDetails}>
            <Text style={styles.autoTitle} numberOfLines={2}>{item.title || item.name}</Text>
            <View style={styles.autoMetaRow}>
              <View style={[styles.typeBadge, { backgroundColor: isTV ? '#4CAF50' : '#E50914' }]}>
                <Text style={styles.typeText}>{typeLabel}</Text>
              </View>
              {year ? <Text style={styles.autoYear}>{year}</Text> : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Grid Style for discover mode
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
            onChangeText={handleTextChange}
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

      {isTyping || loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>{t('general.loading', { defaultValue: 'Loading...' })}</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          key={query.trim().length > 0 ? 'list' : 'grid'}
          data={results}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={query.trim().length > 0 ? 1 : 3}
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
  },
  loadingText: {
    color: '#aaa',
    marginTop: 10,
    fontSize: 14,
  },
  autocompleteCard: {
    flexDirection: 'row',
    backgroundColor: '#1c1c24',
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 8,
  },
  autoPoster: {
    width: 60,
    height: 90,
    borderRadius: 4,
    resizeMode: 'cover',
  },
  autoDetails: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  autoTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  autoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 10,
  },
  typeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  autoYear: {
    color: '#aaa',
    fontSize: 13,
  }
});
