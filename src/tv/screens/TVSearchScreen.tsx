import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tmdbApi } from '../../api/tmdb';
import { useTheme } from '../../context/ThemeContext';

interface TVSearchScreenProps {
  navigation: any;
}

export default function TVSearchScreen({ navigation }: TVSearchScreenProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [focusedResultIndex, setFocusedResultIndex] = useState<number | null>(null);

  const textInputRef = useRef<TextInput>(null);

  // Debounce query (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // Perform search
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const [movies, tv] = await Promise.all([
          tmdbApi.searchMovies(debouncedQuery).catch(() => ({ results: [] })),
          tmdbApi.searchTV(debouncedQuery).catch(() => ({ results: [] }))
        ]);

        const mData = (movies as any)?.results?.map((i: any) => ({ ...i, media_type: 'movie' })) || [];
        const tData = (tv as any)?.results?.map((i: any) => ({ ...i, media_type: 'tv' })) || [];

        const mixed = [...mData, ...tData].filter(i => i.poster_path);
        setResults(mixed);
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={[styles.inputWrapper, isInputFocused && { borderColor: themeColor, backgroundColor: '#1a1d2b' }]}>
          <Ionicons name="search" size={20} color={isInputFocused ? themeColor : '#888888'} style={styles.searchIcon} />
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.search_movies_series') || 'Search movies and series...'}
            placeholderTextColor="#666666"
            returnKeyType="search"
            focusable={true} // Explicitly focusable for TV remote D-pad click to trigger keyboard
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onKeyPress={({ nativeEvent }: any) => {
              if (nativeEvent.key === 'ArrowLeft' || nativeEvent.key === 'ArrowDown') {
                textInputRef.current?.blur();
              }
            }}
          />
        </View>
      </View>

      {/* Main Body */}
      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.statusText}>{t('general.loading') || 'Searching...'}</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={5} // Wide layout for TV screens
          contentContainerStyle={styles.gridContent}
          style={{ overflow: 'visible' }}
          {...({ clipToPadding: false } as any)}
          removeClippedSubviews={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item, index }) => {
            const isTV = item.media_type === 'tv';
            return (
              <Pressable
                onPress={() => navigation.navigate('TVDetail', { item, isTV })}
                focusable={true}
                onFocus={() => setFocusedResultIndex(index)}
                onBlur={() => setFocusedResultIndex(null)}
                style={() => {
                  const showFocused = focusedResultIndex === index;
                  return [
                    styles.card,
                    showFocused && [styles.cardFocused, { borderColor: themeColor }]
                  ];
                }}
              >
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w300${item.poster_path}` }}
                  style={styles.poster}
                  contentFit="cover"
                />
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title || item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : debouncedQuery.length > 0 ? (
        <View style={styles.loaderBox}>
          <Ionicons name="sad-outline" size={50} color="#444" />
          <Text style={styles.statusText}>{t('search.no_movies_found') || 'No movies found.'}</Text>
        </View>
      ) : (
        <View style={styles.loaderBox}>
          <Ionicons name="film-outline" size={50} color="#444" />
          <Text style={styles.statusText}>
            {t('search.enter_name_to_search') || 'Type on the search bar above using your remote.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050609',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  header: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11131c',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#222533',
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 15,
  },
  gridContent: {
    paddingBottom: 60,
    paddingTop: 25, // Expanded padding top for scaling
    gap: 20,
  },
  card: {
    flex: 1,
    marginHorizontal: 8,
    marginVertical: 15, // Changed from marginBottom to marginVertical for scaling space
    maxWidth: '18%', // Accounts for 5 columns spacing
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: 'transparent',
    overflow: 'visible', // Changed from hidden to visible
    backgroundColor: '#11131c',
  },
  cardFocused: {
    transform: [{ scale: 1.08 }],
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    padding: 8,
    textAlign: 'center',
  },
});
