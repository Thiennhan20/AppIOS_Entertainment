import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { friendsApi, FriendUser, PublicRecentlyWatchedItem } from '../../../api/friendsApi';
import CustomAlert from '../../components/CustomAlert';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import useScrollToTop from '../../../hooks/useScrollToTop';

type FriendStatus = 'none' | 'friends' | 'request_sent' | 'request_received';

export default function PublicProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const { themeColor, themeGradient } = useTheme();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<FriendUser | null>(null);
  const [recentlyWatched, setRecentlyWatched] = useState<PublicRecentlyWatchedItem[]>([]);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { handleScroll, showScrollTop } = useScrollToTop();
  const isSelf = String(currentUser?._id || currentUser?.id || '') === String(userId);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, friendsData] = await Promise.all([
        friendsApi.getPublicProfile(userId),
        friendsApi.getFriends(),
      ]);
      setProfile(profileData.user);
      setRecentlyWatched(profileData.recentlyWatched);
      if (friendsData.friends.some((friend) => friend._id === userId)) {
        setFriendStatus('friends');
      } else if (friendsData.sentFriendRequests.some((friend) => friend._id === userId)) {
        setFriendStatus('request_sent');
      } else if (friendsData.friendRequests.some((friend) => friend._id === userId)) {
        setFriendStatus('request_received');
      } else {
        setFriendStatus('none');
      }
    } catch {
      setProfile(null);
      showToast(t('friends.profile_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t, userId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const createdAt = useMemo(() => {
    if (!profile?.createdAt) return t('general.unknown');
    return new Date(profile.createdAt).toLocaleDateString(
      i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
  }, [i18n.language, profile?.createdAt, t]);

  const act = async (action: () => Promise<any>, successMessage: string) => {
    setActing(true);
    try {
      await action();
      showToast(successMessage, 'success');
      await loadProfile();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('friends.action_error'), 'error');
    } finally {
      setActing(false);
    }
  };

  const handleFriendAction = () => {
    if (friendStatus === 'none') {
      act(() => friendsApi.sendRequest(userId), t('friends.request_success'));
    } else if (friendStatus === 'request_sent') {
      act(() => friendsApi.cancelRequest(userId), t('friends.cancel_success'));
    } else if (friendStatus === 'request_received') {
      act(() => friendsApi.acceptRequest(userId), t('friends.accept_success'));
    } else {
      setConfirmRemove(true);
    }
  };

  const openMovie = (item: PublicRecentlyWatchedItem) => {
    navigation.navigate('DetailScreen', {
      isTV: item.isTVShow,
      item: {
        id: item.contentId,
        title: item.title,
        poster_path: item.poster?.replace('https://image.tmdb.org/t/p/w400', ''),
      },
    });
  };

  const friendButton = () => {
    const config = friendStatus === 'none'
      ? { icon: 'person-add-outline' as const, label: t('friends.add_friend'), background: themeColor }
      : friendStatus === 'request_sent'
        ? { icon: 'close-outline' as const, label: t('friends.cancel_request'), background: '#303640' }
        : friendStatus === 'request_received'
          ? { icon: 'checkmark-outline' as const, label: t('friends.accept_request'), background: '#16A34A' }
          : { icon: 'person-remove-outline' as const, label: t('friends.unfriend'), background: '#B91C1C' };

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        disabled={acting}
        onPress={handleFriendAction}
        style={[styles.friendButton, { backgroundColor: config.background }]}
      >
        {acting ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Ionicons color="#FFF" name={config.icon} size={19} />
            <Text style={styles.friendButtonText}>{config.label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={themeColor} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#11151D', '#0F1015']} style={StyleSheet.absoluteFillObject} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        ref={scrollRef}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color="#FFF" name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('friends.public_profile')}</Text>
        </View>

        {!profile ? (
          <View style={styles.notFound}>
            <Ionicons color="#545C69" name="person-circle-outline" size={64} />
            <Text style={styles.notFoundTitle}>{t('friends.profile_not_found')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <LinearGradient
                colors={themeGradient as [string, string]}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={styles.glowBar}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => profile.avatar ? setAvatarPreviewVisible(true) : null}
              >
                {profile.avatar ? (
                  <Image contentFit="cover" source={{ uri: profile.avatar }} style={[styles.profileAvatar, { borderColor: themeColor }]} />
                ) : (
                  <LinearGradient
                    colors={themeGradient as [string, string]}
                    style={styles.profileAvatarFallback}
                  >
                    <Text style={styles.profileInitial}>{profile.name?.charAt(0).toUpperCase() || 'U'}</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
              <Text style={styles.name}>{profile.name}</Text>
              <View style={styles.memberRow}>
                <Ionicons color="#858D9B" name="calendar-outline" size={16} />
                <Text style={styles.memberText}>{t('friends.member_since', { date: createdAt })}</Text>
              </View>
              {!isSelf ? friendButton() : null}
            </View>

            <View style={styles.historyHeader}>
              <Ionicons color={themeColor} name="play-circle-outline" size={22} />
              <Text style={styles.historyTitle}>
                {isSelf ? t('profile.recently_watched') : t('friends.friend_watched_movies')}
              </Text>
            </View>

            {!isSelf && friendStatus !== 'friends' ? (
              <View style={styles.privateCard}>
                <Ionicons color="#6F7785" name="lock-closed-outline" size={28} />
                <Text style={styles.privateTitle}>{t('friends.history_private_title')}</Text>
                <Text style={styles.privateText}>{t('friends.history_private')}</Text>
              </View>
            ) : recentlyWatched.length === 0 ? (
              <View style={styles.privateCard}>
                <Ionicons color="#6F7785" name="film-outline" size={28} />
                <Text style={styles.privateText}>{t('friends.empty_history')}</Text>
              </View>
            ) : (
              <View style={styles.movies}>
                {recentlyWatched.map((item) => (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    key={`${item.isTVShow ? 'tv' : 'movie'}-${item.contentId}`}
                    onPress={() => openMovie(item)}
                    style={styles.movieCard}
                  >
                    {item.poster ? (
                      <Image contentFit="cover" source={{ uri: item.poster }} style={styles.poster} />
                    ) : (
                      <View style={[styles.poster, styles.posterEmpty]}>
                        <Ionicons color="#545C69" name="film-outline" size={25} />
                      </View>
                    )}
                    <Text numberOfLines={2} style={styles.movieTitle}>{item.title}</Text>
                    <Text style={[styles.badge, { color: themeColor }]}>
                      {item.isTVShow ? t('friends.tv_show') : t('friends.movie')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ScrollToTopButton
        onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })}
        visible={showScrollTop}
      />

      {/* Avatar Preview Modal */}
      <Modal
        visible={avatarPreviewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAvatarPreviewVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setAvatarPreviewVisible(false)}>
          <View style={styles.previewModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.previewModalContainer}>
                {profile?.avatar && (
                  <Image 
                    source={{ uri: profile.avatar }} 
                    style={[styles.previewAvatarImage, { borderColor: themeColor }]} 
                    contentFit="contain"
                  />
                )}
                <TouchableOpacity 
                  style={[styles.previewCloseBtn, { backgroundColor: themeColor }]}
                  onPress={() => setAvatarPreviewVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CustomAlert
        cancelText={t('general.cancel')}
        confirmText={t('friends.unfriend')}
        iconName="person-remove-outline"
        message={t('friends.confirm_remove_desc')}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          act(() => friendsApi.removeFriend(userId), t('friends.unfriend_success'));
        }}
        title={t('friends.confirm_remove_title')}
        visible={confirmRemove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0F1015', flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40, paddingHorizontal: 16 },
  header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 18, paddingTop: 12 },
  backButton: { alignItems: 'center', height: 38, justifyContent: 'center', marginRight: 8, width: 38 },
  headerTitle: { color: '#FFF', fontSize: 21, fontWeight: '700' },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#161922',
    borderColor: '#272C38',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 22,
  },
  glowBar: { height: 3, left: 0, position: 'absolute', right: 0, top: 0 },
  profileAvatar: { borderRadius: 48, borderWidth: 2, height: 96, marginBottom: 14, width: 96 },
  profileAvatarFallback: { alignItems: 'center', borderRadius: 48, height: 96, justifyContent: 'center', marginBottom: 14, width: 96 },
  profileInitial: { color: '#FFF', fontSize: 34, fontWeight: '800' },
  name: { color: '#FFF', fontSize: 23, fontWeight: '700' },
  memberRow: { alignItems: 'center', flexDirection: 'row', marginTop: 9 },
  memberText: { color: '#A2A9B5', fontSize: 13, marginLeft: 7 },
  friendButton: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  friendButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },
  historyHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 15, marginTop: 28 },
  historyTitle: { color: '#FFF', fontSize: 19, fontWeight: '700', marginLeft: 8 },
  privateCard: {
    alignItems: 'center',
    backgroundColor: '#161922',
    borderColor: '#242A35',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  privateTitle: { color: '#E6E8EC', fontSize: 15, fontWeight: '700', marginTop: 12 },
  privateText: { color: '#858D9B', fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  movies: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  movieCard: { marginBottom: 14, width: '31%' },
  poster: { aspectRatio: 2 / 3, borderRadius: 9, width: '100%' },
  posterEmpty: { alignItems: 'center', backgroundColor: '#1A1E27', justifyContent: 'center' },
  movieTitle: { color: '#F0F1F3', fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 7 },
  badge: { fontSize: 10, fontWeight: '700', marginTop: 3, textTransform: 'uppercase' },
  notFound: { alignItems: 'center', paddingVertical: 90 },
  notFoundTitle: { color: '#B9C0CA', fontSize: 16, fontWeight: '600', marginTop: 12 },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previewAvatarImage: {
    width: 300,
    height: 300,
    borderRadius: 24,
    borderWidth: 3,
  },
  previewCloseBtn: {
    position: 'absolute',
    top: -64,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
