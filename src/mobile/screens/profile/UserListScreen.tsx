import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Vibration } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../../api/authApi';
import LongPressMoviePopup from '../../components/LongPressMoviePopup';
import CustomAlert from '../../components/CustomAlert';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import useScrollToTop from '../../../hooks/useScrollToTop';

export default function UserListScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { type } = route.params || { type: 'watchlist' }; // 'watchlist' or 'history'
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [longPressedMovie, setLongPressedMovie] = useState<any>(null);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<FlatList>(null);
  const { handleScroll, showScrollTop } = useScrollToTop();

  const title = type === 'watchlist' 
    ? `${t('profile.watchlist')} (${data.length})` 
    : `${t('profile.watch_history')} (${data.length})`;

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
        // Fetch page 1 and page 2 in parallel (loads 40 items like the web)
        const [p1, p2]: any[] = await Promise.all([
          authApi.getRecentlyWatchedPaged(1, 20),
          authApi.getRecentlyWatchedPaged(2, 20).catch(() => ({ items: [], hasMore: false })),
        ]);
        const combined = [...(p1.items || []), ...(p2.items || [])];
        setData(combined);
        setHasMore(p2.hasMore !== undefined ? p2.hasMore : p1.hasMore);
        setPage(2);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || type !== 'history') return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const resp: any = await authApi.getRecentlyWatchedPaged(nextPage, 20);
      setData(prev => [...prev, ...(resp.items || [])]);
      setHasMore(resp.hasMore);
      setPage(nextPage);
    } catch (err) {
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDeleteHistory = (item: any) => {
    setItemToDelete(item);
    setDeleteAlertVisible(true);
  };

  const confirmDeleteHistory = async () => {
    if (!itemToDelete) return;
    try {
      await authApi.deleteRecentlyWatchedItem(
        itemToDelete.contentId,
        itemToDelete.isTVShow,
        itemToDelete.season,
        itemToDelete.episode
      );
      fetchData();
    } catch (err) {
      Alert.alert(t('general.error'), t('auth.error_occurred'));
    } finally {
      setDeleteAlertVisible(false);
      setItemToDelete(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isTV = type === 'history' ? item.isTVShow : (item.type === 'tv');
    const imageUrl = type === 'history' 
      ? item.poster?.replace('w400', 'w200')
      : `https://image.tmdb.org/t/p/w200${item.poster_path}`;
      
    const itemTitle = item.title || item.name;

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

    if (type === 'history') {
      return (
        <View style={styles.card}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={handleBlockedPress}
            style={{ width: '100%' }}
          >
            <View style={{ position: 'relative', width: '100%' }}>
              <Image 
                source={{ uri: imageUrl || 'https://via.placeholder.com/400x600?text=NTN' }} 
                style={styles.poster} 
                contentFit="cover"
              />
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{itemTitle}</Text>
            {item.currentTime > 0 && (
              <View style={styles.progressContainer}>
                 <View style={[styles.progressBar, { width: `${Math.min((item.currentTime / Math.max(item.duration, 1)) * 100, 100)}%` }]} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#E50914',
              borderColor: '#ffffff',
              borderWidth: 1.5,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 3,
              elevation: 5,
            }}
            onPress={() => handleDeleteHistory(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8} 
        onPress={() => navigation.navigate('DetailScreen', { item, isTV })}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        <Image 
          source={{ uri: imageUrl || 'https://via.placeholder.com/400x600?text=NTN' }} 
          style={styles.poster} 
          contentFit="cover"
        />
        <Text style={styles.cardTitle} numberOfLines={1}>{itemTitle}</Text>
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
          <Text style={styles.emptyText}>{type === 'watchlist' ? t('profile.no_movies_here') : t('profile.no_movies_yet')}</Text>
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          data={data}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyExtractor={(item, index) => `${item.id || item.contentId}-${index}`}
          numColumns={3}
          contentContainerStyle={[
            styles.listContent,
            type === 'history' && { paddingTop: 10, paddingHorizontal: 12 }
          ]}
          style={type === 'history' ? { overflow: 'visible' } : undefined}
          renderItem={renderItem}
          initialNumToRender={24}
          maxToRenderPerBatch={24}
          windowSize={5}
          removeClippedSubviews={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => loadingMore ? (
            <ActivityIndicator size="small" color="#E50914" style={{ marginVertical: 15 }} />
          ) : null}
        />
      )}

      {/* Long Press Detail Popup */}
      <LongPressMoviePopup 
        movie={longPressedMovie} 
        onClose={() => setLongPressedMovie(null)} 
        onWatchlistUpdated={fetchData}
      />

      <CustomAlert
        visible={deleteAlertVisible}
        title={t('profile.confirm_delete_history_title')}
        message={t('profile.confirm_delete_history_desc')}
        iconName="trash-outline"
        isError={true}
        confirmText={t('general.delete')}
        cancelText={t('general.cancel')}
        onClose={() => {
          setDeleteAlertVisible(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteHistory}
      />

      <ScrollToTopButton
        onPress={() => scrollRef.current?.scrollToOffset({ animated: true, offset: 0 })}
        visible={showScrollTop}
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
