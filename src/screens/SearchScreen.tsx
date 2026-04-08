import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Vibration } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tmdbApi } from '../api/tmdb';
import LongPressMoviePopup from '../components/LongPressMoviePopup';
import { useAuth } from '../context/AuthContext';
import { useSearchHistory } from '../hooks/useSearchHistory';
import ScrollToTopButton from '../components/ScrollToTopButton';

export default function SearchScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [longPressedMovie, setLongPressedMovie] = useState<any>(null);

  const scrollRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 300 && !showScrollTop) setShowScrollTop(true);
    if (offsetY <= 300 && showScrollTop) setShowScrollTop(false);
  };

  // Search history
  const { user, registerSearchHistoryFlush } = useAuth();
  const { displayHistory, addSearch: addToSearchHistory, removeSearch, clearAll: clearSearchHistory, flushSync } = useSearchHistory(!!user);

  // Register flush callback so AuthContext can flush before logout
  useEffect(() => {
    if (registerSearchHistoryFlush) {
      registerSearchHistoryFlush(flushSync);
    }
  }, [registerSearchHistoryFlush, flushSync]);

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
    if (!debouncedQuery.trim()) {
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
          promises.push(tmdbApi.searchMovies(debouncedQuery));
          promises.push(tmdbApi.searchTV(debouncedQuery));

          const [movies, tv] = await Promise.all(promises);
          mData = (movies as any)?.results?.map((i: any) => ({ ...i, media_type: 'movie' })) || [];
          tData = (tv as any)?.results?.map((i: any) => ({ ...i, media_type: 'tv' })) || [];
        }

        let mixed = [...mData, ...tData].filter(i => i.poster_path);
        
        setResults(mixed);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
        setIsTyping(false);
      }
    };

    fetchSearchResults();
  }, [debouncedQuery]);

  const renderItem = ({ item }: { item: any }) => {
    const isTV = item.media_type === 'tv';
    const typeLabel = isTV ? 'TV Series' : 'Movie';
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);

    if (query.trim().length > 0) {
      // Autocomplete list style
      return (
        <TouchableOpacity 
          style={styles.autocompleteCard}
          onPress={() => {
            if (query.trim()) addToSearchHistory(query.trim());
            navigation.navigate('DetailScreen', { item, isTV });
          }}
          onLongPress={() => {

            setLongPressedMovie({ ...item, isTV });
          }}
          delayLongPress={400}
          activeOpacity={0.8}
        >
          <Image source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }} style={styles.autoPoster} contentFit="cover" />
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
        onPress={() => {
          if (query.trim()) addToSearchHistory(query.trim());
          navigation.navigate('DetailScreen', { item, isTV });
        }}
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
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.trim()) {
                addToSearchHistory(query.trim());
                navigation.navigate('SearchResultScreen', { query: query.trim() });
              }
            }}
          />
        </View>
      </View>

      {/* Search History — shown when no query and no loading */}
      {!isTyping && !loading && query.trim().length === 0 && displayHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <View style={styles.historyHeaderLeft}>
              <Ionicons name="time-outline" size={16} color="#888" />
              <Text style={styles.historyHeaderText}>{t('search.recent_searches', { defaultValue: 'Recent Searches' })}</Text>
            </View>
            <TouchableOpacity onPress={clearSearchHistory}>
              <Text style={styles.historyClearText}>{t('search.clear_all', { defaultValue: 'Clear All' })}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={displayHistory}
            keyExtractor={(item) => item.query}
            style={styles.historyList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.historyItem}
                onPress={() => {
                  setQuery(item.query);
                  navigation.navigate('SearchResultScreen', { query: item.query });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={18} color="#666" style={styles.historyItemIcon} />
                <Text style={styles.historyItemText} numberOfLines={1}>{item.query}</Text>
                <TouchableOpacity
                  onPress={() => removeSearch(item.query)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.historyItemDelete}
                >
                  <Ionicons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {isTyping || loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>{t('general.loading', { defaultValue: 'Loading...' })}</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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
      ) : (debouncedQuery.length > 0) ? (
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
  },
  // ─── Search History Styles ──────────────────────────────────
  historyContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyHeaderText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyClearText: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '600',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a35',
  },
  historyItemIcon: {
    marginRight: 12,
  },
  historyItemText: {
    flex: 1,
    color: '#ddd',
    fontSize: 15,
  },
  historyItemDelete: {
    padding: 4,
    marginLeft: 8,
  },
});
