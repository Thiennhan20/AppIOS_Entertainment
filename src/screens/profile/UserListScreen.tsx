import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Vibration } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/authApi';
import LongPressMoviePopup from '../../components/LongPressMoviePopup';

export default function UserListScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { type } = route.params || { type: 'watchlist' }; // 'watchlist' or 'history'
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [longPressedMovie, setLongPressedMovie] = useState<any>(null);

  const title = type === 'watchlist' ? 'Watchlist' : 'Watch History';

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [type])
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      if (type === 'watchlist') {
        const resp: any = await authApi.getWatchlist();
        setData(resp.watchlist || []);
      } else {
        const resp: any = await authApi.getRecentlyWatched();
        setData(resp.items || []);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isTV = type === 'history' ? item.isTVShow : (item.type === 'tv');
    const imageUrl = type === 'history' 
      ? item.poster?.replace('w400', 'w200')
      : `https://image.tmdb.org/t/p/w200${item.poster_path}`;
      
    const itemTitle = item.title || item.name;
    const movieId = type === 'history' ? item.contentId : item.id;

    const handleBlockedPress = () => {
      const mappedItem = {
        ...item,
        id: type === 'history' ? item.contentId : item.id,
        poster_path: type === 'history' ? item.poster?.replace('https://image.tmdb.org/t/p/w400', '') : item.poster_path,
        title: itemTitle,
      };
      
      navigation.navigate('DetailScreen', { item: mappedItem, isTV });
    };

    const handleLongPress = () => {
      if (type === 'watchlist') {

        setLongPressedMovie({ ...item, isTV });
      }
    };

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8} 
        onPress={type === 'watchlist' ? () => navigation.navigate('DetailScreen', { item, isTV }) : handleBlockedPress}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        <Image 
          source={{ uri: imageUrl || 'https://via.placeholder.com/400x600?text=NTN' }} 
          style={styles.poster} 
        />
        <Text style={styles.cardTitle} numberOfLines={1}>{itemTitle}</Text>
        {type === 'history' && item.currentTime > 0 && (
          <View style={styles.progressContainer}>
             <View style={[styles.progressBar, { width: `${Math.min((item.currentTime / Math.max(item.duration, 1)) * 100, 100)}%` }]} />
          </View>
        )}
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
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={type === 'watchlist' ? 'bookmark-outline' : 'time-outline'} size={60} color="#333" />
          <Text style={styles.emptyText}>No movies here yet</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => `${item.id || item.contentId}-${index}`}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          initialNumToRender={24}
          maxToRenderPerBatch={24}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

      <LongPressMoviePopup 
        movie={longPressedMovie} 
        onClose={() => setLongPressedMovie(null)} 
        onWatchlistUpdated={fetchData}
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
    color: '#555',
    fontSize: 16,
    marginTop: 15,
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
  progressContainer: {
    height: 3,
    backgroundColor: '#333',
    width: '100%',
    marginTop: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
