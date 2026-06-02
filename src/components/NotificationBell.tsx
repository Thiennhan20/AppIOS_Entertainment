import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  AppNotification,
  getNotificationSocketUrl,
  NotificationMetadata,
  notificationApi,
  NotificationTarget,
  NotificationType,
} from '../api/notificationApi';
import { versionApi } from '../api/versionApi';

interface Props {
  navigation: any;
}

function mergeNotifications(current: AppNotification[], incoming: AppNotification[]) {
  const items = new Map<string, AppNotification>();
  current.forEach((notification) => items.set(notification._id, notification));
  incoming.forEach((notification) => {
    const existing = items.get(notification._id);
    items.set(notification._id, existing ? { ...existing, ...notification } : notification);
  });

  return Array.from(items.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
}

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'comment_liked':
      return { name: 'heart', color: '#EF4444' } as const;
    case 'comment_replied':
      return { name: 'chatbubble', color: '#3B82F6' } as const;
    case 'friend_request':
      return { name: 'person-add', color: '#38BDF8' } as const;
    case 'friend_accept':
      return { name: 'people', color: '#22C55E' } as const;
    default:
      return { name: 'information-circle', color: '#A855F7' } as const;
  }
}

export default function NotificationBell({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [versionNotifications, setVersionNotifications] = useState<AppNotification[]>([]);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState(false);
  const notificationIds = useRef(new Set<string>());
  const versionUnreadCount = versionNotifications.filter((notification) => !notification.read).length;
  const unreadCount = serverUnreadCount + versionUnreadCount;
  const hasNotifications = notifications.length > 0 || versionNotifications.length > 0;

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (visible && loading) {
      pulseAnim.setValue(0.3);
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.75,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 850,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(0.3);
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [visible, loading, pulseAnim]);

  const sections = [
    ...(versionNotifications.length ? [{ title: t('notifications.updates'), data: versionNotifications }] : []),
    ...(notifications.length
      ? [{ title: t('notifications.activity'), data: notifications }]
      : (loading && user
          ? [{
              title: t('notifications.activity'),
              data: [
                { _id: 'skeleton-1', type: 'skeleton' as any, read: true, createdAt: new Date().toISOString() },
                { _id: 'skeleton-2', type: 'skeleton' as any, read: true, createdAt: new Date().toISOString() },
                { _id: 'skeleton-3', type: 'skeleton' as any, read: true, createdAt: new Date().toISOString() },
              ] as AppNotification[]
            }]
          : []
        )
    ),
  ];

  const rememberNotifications = (items: AppNotification[]) => {
    items.forEach((notification) => notificationIds.current.add(notification._id));
  };

  const loadLatestVersion = useCallback(async () => {
    const [latestVersion, readHash, savedAcknowledgedHash] = await Promise.all([
      versionApi.getLatest(),
      AsyncStorage.getItem('notification_version_read_hash'),
      AsyncStorage.getItem('notified_hash'),
    ]);
    let acknowledgedHash = savedAcknowledgedHash;

    if (!latestVersion) {
      setVersionNotifications([]);
      return;
    }

    if (!acknowledgedHash) {
      acknowledgedHash = latestVersion.hash;
      await AsyncStorage.setItem('notified_hash', acknowledgedHash);
    }

    setVersionNotifications([{
      _id: `git-${latestVersion.hash}`,
      type: 'version_updated',
      read: latestVersion.hash === readHash || latestVersion.hash === acknowledgedHash,
      metadata: {
        versionHash: latestVersion.hash,
        versionMessage: latestVersion.message,
      },
      createdAt: latestVersion.createdAt,
    }]);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    if (!user) {
      setServerUnreadCount(0);
      return;
    }

    try {
      setServerUnreadCount(await notificationApi.getUnreadCount());
    } catch {
      // The list can still be loaded when the user opens the panel.
    }
  }, [user]);

  const loadNotifications = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(false);
    try {
      // Parallelize social notifications and version checking to prevent blocking!
      const [_, response] = await Promise.all([
        loadLatestVersion().catch(() => {}),
        user ? notificationApi.getNotifications() : Promise.resolve(null),
      ]);

      if (response) {
        rememberNotifications(response.data);
        setNotifications(response.data);
        setServerUnreadCount(response.unreadCount);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLatestVersion, user]);

  useEffect(() => {
    loadUnreadCount();
    loadLatestVersion().catch(() => {});
    
    // Set up 60-second count & version poll, identical to web
    let intervalId: NodeJS.Timeout | null = null;
    if (user) {
      intervalId = setInterval(() => {
        loadUnreadCount();
        loadLatestVersion().catch(() => {});
      }, 60000);
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadUnreadCount();
        loadLatestVersion().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
      if (intervalId) clearInterval(intervalId);
    };
  }, [loadUnreadCount, loadLatestVersion, user]);

  useEffect(() => {
    if (visible) loadNotifications();
  }, [loadNotifications, visible]);

  const markVersionAsRead = async (notification: AppNotification) => {
    const hash = notification.metadata?.versionHash;
    if (!hash || notification.read) return;

    await AsyncStorage.setItem('notification_version_read_hash', hash);
    setVersionNotifications((current) => current.map((item) => (
      item._id === notification._id ? { ...item, read: true } : item
    )));
  };

  const markAsRead = async (notification: AppNotification) => {
    if (notification.type === 'version_updated') {
      await markVersionAsRead(notification);
      return;
    }

    if (notification.read) return;

    setNotifications((current) => current.map((item) => (
      item._id === notification._id ? { ...item, read: true } : item
    )));
    setServerUnreadCount((current) => Math.max(0, current - 1));

    try {
      await notificationApi.markAsRead(notification._id);
    } catch {
      loadUnreadCount();
    }
  };

  const openCommentTarget = (target: NotificationMetadata | NotificationTarget) => {
    if (!target.movieId || !target.contentType) return false;

    const isTV = target.contentType === 'tvshow';
    setVisible(false);
    navigation.navigate('DetailScreen', {
      item: { id: target.movieId, isTV },
      isTV,
      notificationCommentId: target.commentId || target.parentCommentId,
    });
    return true;
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    await markAsRead(notification);

    if (notification.type === 'friend_request') {
      setVisible(false);
      navigation.navigate('FriendsScreen', { initialTab: 'received' });
      return;
    }

    if (notification.type === 'friend_accept') {
      setVisible(false);
      if (notification.actor?._id) {
        navigation.navigate('PublicProfileScreen', { userId: notification.actor._id });
      } else {
        navigation.navigate('FriendsScreen');
      }
      return;
    }

    if (notification.type !== 'comment_liked' && notification.type !== 'comment_replied') {
      setVisible(false);
      return;
    }

    try {
      const target = await notificationApi.getTarget(notification._id);
      if (openCommentTarget(target)) return;
    } catch {
      // Use notification metadata if the target endpoint is unavailable.
    }

    openCommentTarget(notification.metadata || {});
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount || markingAll) return;

    setMarkingAll(true);
    try {
      if (user) {
        await notificationApi.markAllAsRead();
        setServerUnreadCount(0);
        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      }

      const latestVersionHash = versionNotifications[0]?.metadata?.versionHash;
      if (latestVersionHash) {
        await AsyncStorage.setItem('notification_version_read_hash', latestVersionHash);
        setVersionNotifications((current) => current.map((item) => ({ ...item, read: true })));
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return t('notifications.just_now');

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('notifications.minutes_ago', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.hours_ago', { count: hours });

    const days = Math.floor(hours / 24);
    if (days < 7) return t('notifications.days_ago', { count: days });

    return new Date(timestamp).toLocaleDateString(i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US');
  };

  const titleFor = (notification: AppNotification) => {
    const actor = notification.actor?.name || t('notifications.someone');
    switch (notification.type) {
      case 'comment_liked':
        return t('notifications.comment_liked', { user: actor });
      case 'comment_replied':
        return t('notifications.comment_replied', { user: actor });
      case 'friend_request':
        return t('notifications.friend_request', { user: actor });
      case 'friend_accept':
        return t('notifications.friend_accept', { user: actor });
      default:
        return t('notifications.version_updated');
    }
  };

  const previewFor = (notification: AppNotification) => {
    switch (notification.type) {
      case 'friend_request':
        return t('notifications.friend_request_preview');
      case 'friend_accept':
        return t('notifications.friend_accept_preview');
      case 'version_updated':
        return notification.metadata?.versionMessage || t('notifications.version_preview');
      default:
        return notification.metadata?.commentPreview || t('notifications.comment_preview');
    }
  };

  const renderSkeletonItem = (index: string | number) => (
    <Animated.View key={`skeleton-${index}`} style={[styles.item, { opacity: pulseAnim }]}>
      <View style={styles.avatarWrap}>
        <View style={[styles.avatarFallback, { backgroundColor: '#2B303B' }]} />
      </View>
      <View style={styles.itemContent}>
        <View style={[styles.itemHeader, { height: 13, backgroundColor: '#2B303B', borderRadius: 4, width: '45%', marginBottom: 7 }]} />
        <View style={{ height: 11, backgroundColor: '#232832', borderRadius: 4, width: '85%', marginBottom: 7 }} />
        <View style={{ height: 10, backgroundColor: '#1C202A', borderRadius: 3, width: '25%' }} />
      </View>
    </Animated.View>
  );

  const renderNotification = ({ item }: { item: AppNotification }) => {
    if (item.type === ('skeleton' as any)) {
      return renderSkeletonItem(item._id);
    }

    const icon = notificationIcon(item.type);
    const actorName = item.actor?.name || t('notifications.someone');
    const isVersion = item.type === 'version_updated';

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handleNotificationPress(item)}
        style={[styles.item, !item.read && { borderLeftColor: themeColor, backgroundColor: `${themeColor}12` }]}
      >
        <View style={styles.avatarWrap}>
          {isVersion ? (
            <View style={styles.versionAvatar}>
              <Ionicons color="#A855F7" name="refresh" size={20} />
            </View>
          ) : item.actor?.avatar ? (
            <Image contentFit="cover" source={{ uri: item.actor.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{actorName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {!isVersion ? (
            <View style={styles.iconBubble}>
              <Ionicons color={icon.color} name={icon.name} size={11} />
            </View>
          ) : null}
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text numberOfLines={2} style={styles.itemTitle}>{titleFor(item)}</Text>
            {!item.read ? <View style={[styles.unreadDot, { backgroundColor: themeColor }]} /> : null}
          </View>
          <Text numberOfLines={2} style={styles.itemPreview}>{previewFor(item)}</Text>
          <Text style={styles.itemTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={t('notifications.label')}
        activeOpacity={0.75}
        onPress={() => setVisible(true)}
        style={styles.bellButton}
      >
        <Ionicons color="#D5D5D9" name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={20} />
        {unreadCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {visible && (
        <Modal
          animationType="fade"
          onRequestClose={() => setVisible(false)}
          statusBarTranslucent
          transparent
          visible={visible}
        >
        <Pressable onPress={() => setVisible(false)} style={[styles.overlay, { paddingTop: insets.top + 60 }]}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.panelTitle}>{t('notifications.label')}</Text>
                <Text style={styles.panelSubtitle}>
                  {t('notifications.unread_count', { count: unreadCount })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  disabled={loading || refreshing}
                  onPress={() => loadNotifications(true)}
                  style={[styles.markAllButton, { marginRight: 8 }]}
                >
                  <Text style={[styles.markAllText, { color: themeColor }]}>
                    {t('notifications.refresh')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!unreadCount || markingAll}
                  onPress={handleMarkAllRead}
                  style={styles.markAllButton}
                >
                  {markingAll ? (
                    <ActivityIndicator color={themeColor} size="small" />
                  ) : (
                    <Text style={[styles.markAllText, { color: unreadCount ? themeColor : '#60646D' }]}>
                      {t('notifications.mark_all_read')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {loading && !hasNotifications ? (
              <View style={{ flex: 1 }}>
                {renderSkeletonItem(1)}
                {renderSkeletonItem(2)}
                {renderSkeletonItem(3)}
                <View style={[styles.state, { minHeight: 90, paddingVertical: 10 }]}>
                  <ActivityIndicator color={themeColor} size="small" />
                  <Text style={[styles.stateText, { marginTop: 6, fontSize: 12 }]}>{t('notifications.loading')}</Text>
                </View>
              </View>
            ) : error && !hasNotifications ? (
              <View style={styles.state}>
                <Ionicons color="#EF4444" name="cloud-offline-outline" size={34} />
                <Text style={styles.stateText}>{t('notifications.failed_load')}</Text>
                <TouchableOpacity onPress={() => loadNotifications()} style={[styles.retry, { borderColor: themeColor }]}>
                  <Text style={[styles.retryText, { color: themeColor }]}>{t('notifications.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : !hasNotifications ? (
              <View style={styles.state}>
                <Ionicons color="#555B67" name="notifications-off-outline" size={36} />
                <Text style={styles.stateText}>{t('notifications.empty')}</Text>
              </View>
            ) : (
              <SectionList
                sections={sections}
                keyExtractor={(item) => item._id}
                refreshControl={
                  <RefreshControl
                    colors={[themeColor]}
                    onRefresh={() => loadNotifications(true)}
                    refreshing={refreshing}
                    tintColor={themeColor}
                  />
                }
                renderItem={renderNotification}
                renderSectionHeader={({ section }) => (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                  </View>
                )}
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Pressable>
        </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 9,
    borderWidth: 0.5,
    height: 36,
    justifyContent: 'center',
    marginLeft: 10,
    width: 36,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: '#E50914',
    borderColor: '#0F0F13',
    borderRadius: 9,
    borderWidth: 1.5,
    height: 17,
    justifyContent: 'center',
    minWidth: 17,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -5,
    top: -5,
  },
  countText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.68)',
    flex: 1,
    paddingHorizontal: 14,
  },
  panel: {
    alignSelf: 'flex-end',
    backgroundColor: '#161922',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '72%',
    overflow: 'hidden',
    width: '100%',
  },
  panelHeader: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  panelTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  panelSubtitle: {
    color: '#89909F',
    fontSize: 12,
    marginTop: 3,
  },
  markAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 88,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 190,
    paddingHorizontal: 24,
  },
  stateText: {
    color: '#9197A3',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  retry: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  item: {
    backgroundColor: '#161922',
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    borderLeftColor: 'transparent',
    borderLeftWidth: 3,
    flexDirection: 'row',
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  avatarWrap: {
    height: 42,
    marginRight: 12,
    position: 'relative',
    width: 42,
  },
  avatar: {
    borderRadius: 21,
    height: 42,
    width: 42,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#2B303B',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  versionAvatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.16)',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: '#0F1015',
    borderColor: '#353B47',
    borderRadius: 10,
    borderWidth: 1,
    bottom: -3,
    height: 19,
    justifyContent: 'center',
    position: 'absolute',
    right: -3,
    width: 19,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  itemTitle: {
    color: '#F7F8FA',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  unreadDot: {
    borderRadius: 4,
    height: 8,
    marginLeft: 8,
    marginTop: 5,
    width: 8,
  },
  itemPreview: {
    color: '#A0A7B3',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  itemTime: {
    color: '#6E7481',
    fontSize: 11,
    marginTop: 5,
  },
  sectionHeader: {
    backgroundColor: '#10131B',
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  sectionHeaderText: {
    color: '#777F8F',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
