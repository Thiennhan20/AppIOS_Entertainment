import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tmdbApi } from '../api/tmdb';

export default function SearchScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce input logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
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
        const [movies, tv] = await Promise.all([
          tmdbApi.searchMovies(debouncedQuery),
          tmdbApi.searchTV(debouncedQuery)
        ]);

        const mData = (movies as any)?.results?.map((i: any) => ({ ...i, media_type: 'movie' })) || [];
        const tData = (tv as any)?.results?.map((i: any) => ({ ...i, media_type: 'tv' })) || [];
        
        setResults([...mData, ...tData].filter(i => i.poster_path)); // Must have poster
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [debouncedQuery]);

  const renderItem = ({ item }: { item: any }) => {
    const isTV = item.media_type === 'tv';
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('DetailScreen', { item, isTV })}
      >
        <Image 
          source={{ uri: `https://image.tmdb.org/t/p/w400${item.poster_path}` }} 
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
            placeholder="Tìm kiếm phim, series..."
            placeholderTextColor="#777"
            autoFocus
            clearButtonMode="while-editing"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      ) : debouncedQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sad-outline" size={60} color="#444" />
          <Text style={styles.emptyText}>Không tìm thấy phim phù hợp</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={60} color="#444" />
          <Text style={styles.emptyText}>Nhập tên phim bạn muốn tìm</Text>
        </View>
      )}
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
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  card: {
    flex: 1,
    margin: 5,
    maxWidth: '47%',
  },
  poster: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  cardTitle: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
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
  }
});
