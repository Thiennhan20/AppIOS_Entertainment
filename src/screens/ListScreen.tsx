import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tmdbApi } from '../api/tmdb';

export default function ListScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { type } = route.params || { type: 'movie' };
  
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const isTV = type === 'tv';
  const title = isTV ? 'TV Shows' : 'Movies';

  useEffect(() => {
    fetchData(1);
  }, [type]);

  const fetchData = async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const resp: any = isTV 
        ? await tmdbApi.discoverTV(pageNum)
        : await tmdbApi.discoverMovies(pageNum);
      
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
        fetchData(nextPage);
        return nextPage;
      });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={2}
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
    margin: 6,
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  }
});
