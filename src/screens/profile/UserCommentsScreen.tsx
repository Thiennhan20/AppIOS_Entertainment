import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { commentsApi } from '../../api/commentsApi';

export default function UserCommentsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'comments' | 'replies' | 'liked'>('comments');

  useFocusEffect(
    useCallback(() => {
      fetchComments(1, activeFilter);
    }, [activeFilter])
  );

  const fetchComments = async (pageNum: number, filter: string = activeFilter) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res: any = await commentsApi.getUserComments(pageNum, 15, filter);
      if (res.success) {
        if (pageNum === 1) {
          setData(res.data || []);
        } else {
          setData(prev => [...prev, ...(res.data || [])]);
        }
        setHasMore(res.page < res.totalPages);
        setPage(pageNum);
      }
    } catch (err) {
      console.warn('Error fetching user comments', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchComments(page + 1, activeFilter);
    }
  };

  const handleFilterChange = (newFilter: 'comments' | 'replies' | 'liked') => {
    if (activeFilter === newFilter) return;
    setActiveFilter(newFilter);
    setData([]);
    setPage(1);
    setHasMore(true);
  };

  const handleDelete = (commentId: string) => {
    Alert.alert(
      t('general.notice', { defaultValue: 'Notice' }),
      t('general.delete_confirm', { defaultValue: 'Are you sure you want to delete this comment?' }),
      [
        { text: t('general.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await commentsApi.deleteComment(commentId);
              setData(prev => prev.filter(c => c._id !== commentId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isTV = item.type === 'tvshow';
    const date = new Date(item.createdAt);
    const dateString = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getFullYear()}`;

    return (
      <View style={[
        styles.card,
        activeFilter === 'liked' ? styles.cardLiked : 
        (activeFilter === 'replies' || item.parentId) ? styles.cardReply : {}
      ]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity 
            style={styles.movieLink}
            onPress={() => navigation.navigate('DetailScreen', { item: { id: item.movieId }, isTV })}
          >
            <Text style={[styles.movieLinkText, activeFilter === 'liked' ? {color: '#ef4444'} : {}]}>
              {activeFilter === 'liked' 
                ? t('general.view_liked_comment', { defaultValue: `View liked ${item.parentId ? 'reply' : 'comment'} on ${isTV ? 'TV Show' : 'Movie'}` })
                : t('general.view_comment', { defaultValue: `View ${item.parentId ? 'reply' : 'comment'} on ${isTV ? 'TV Show' : 'Movie'}` })
              }
            </Text>
            <Ionicons name="chevron-forward" size={14} color={activeFilter === 'liked' ? '#ef4444' : '#3b82f6'} />
          </TouchableOpacity>
          <View style={styles.cardActions}>
            <Text style={styles.dateText}>{dateString}</Text>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={{ padding: 5, marginLeft: 10 }}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {item.parentId && (
          <View style={[styles.replyBadge, activeFilter === 'liked' ? {backgroundColor: 'rgba(239, 68, 68, 0.1)'} : {backgroundColor: 'rgba(99, 102, 241, 0.1)'}]}>
            <Text style={[styles.replyBadgeText, activeFilter === 'liked' ? {color: '#fca5a5'} : {color: '#a5b4fc'}]}>Reply</Text>
          </View>
        )}

        <Text style={styles.content}>{item.content}</Text>

        {item.likes > 0 && (
          <View style={styles.likesContainer}>
            <Text style={styles.likesText}>❤️ {item.likes} {item.likes === 1 ? 'like' : 'likes'}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.my_comments', { defaultValue: 'My Comments' })}</Text>
      </View>

      <View style={styles.filterContainer}>
        {[
          { id: 'comments', label: 'Comments' },
          { id: 'replies', label: 'Replies' },
          { id: 'liked', label: 'Liked' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.filterTab, activeFilter === tab.id && styles.filterTabActive]}
            onPress={() => handleFilterChange(tab.id as any)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab.id && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>{t('profile.no_comments_yet', { defaultValue: 'You haven\'t posted any comments yet' })}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardLiked: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  cardReply: {
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  movieLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movieLinkText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#999',
    fontSize: 12,
  },
  replyBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  replyBadgeText: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  likesContainer: {
    marginTop: 10,
    flexDirection: 'row',
  },
  likesText: {
    color: '#ef4444',
    fontSize: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterTabText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
});
