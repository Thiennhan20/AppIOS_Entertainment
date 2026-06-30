import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import CustomAlert from '../../components/CustomAlert';
import { FriendUser, FriendsData, friendsApi } from '../../../api/friendsApi';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import useScrollToTop from '../../../hooks/useScrollToTop';

type TabKey = 'friends' | 'received' | 'sent';

const EMPTY_DATA: FriendsData = {
  friends: [],
  friendRequests: [],
  sentFriendRequests: [],
};

export default function FriendsScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>(route.params?.initialTab || 'friends');
  const [data, setData] = useState<FriendsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<FriendUser | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { handleScroll, showScrollTop } = useScrollToTop();

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const loadFriends = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      setData(await friendsApi.getFriends());
    } catch {
      showToast(t('friends.error_loading'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast, t]);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends])
  );

  const runAction = async (userId: string, action: () => Promise<any>, message: string) => {
    setActionId(userId);
    try {
      await action();
      showToast(message, 'success');
      await loadFriends(true);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('friends.action_error'), 'error');
    } finally {
      setActionId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    await runAction(target._id, () => friendsApi.removeFriend(target._id), t('friends.unfriend_success'));
  };

  const tabItems = [
    { key: 'friends' as TabKey, label: t('friends.tab_friends'), count: data.friends.length },
    { key: 'received' as TabKey, label: t('friends.tab_received'), count: data.friendRequests.length },
    { key: 'sent' as TabKey, label: t('friends.tab_sent'), count: data.sentFriendRequests.length },
  ];

  const users = activeTab === 'friends'
    ? data.friends
    : activeTab === 'received'
      ? data.friendRequests
      : data.sentFriendRequests;

  const renderUser = (friend: FriendUser) => (
    <View key={friend._id} style={styles.userCard}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => navigation.navigate('PublicProfileScreen', { userId: friend._id })}
        style={styles.userInfo}
      >
        {friend.avatar ? (
          <Image contentFit="cover" source={{ uri: friend.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: `${themeColor}30` }]}>
            <Text style={[styles.avatarText, { color: themeColor }]}>
              {friend.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View style={styles.userText}>
          <Text numberOfLines={1} style={styles.userName}>{friend.name}</Text>
          <Text style={styles.profileLink}>{t('friends.view_profile')}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        {actionId === friend._id ? (
          <ActivityIndicator color={themeColor} size="small" />
        ) : activeTab === 'received' ? (
          <>
            <TouchableOpacity
              onPress={() => runAction(friend._id, () => friendsApi.acceptRequest(friend._id), t('friends.accept_success'))}
              style={[styles.iconButton, styles.acceptButton]}
            >
              <Ionicons color="#22C55E" name="checkmark" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => runAction(friend._id, () => friendsApi.rejectRequest(friend._id), t('friends.decline_success'))}
              style={[styles.iconButton, styles.rejectButton]}
            >
              <Ionicons color="#EF4444" name="close" size={20} />
            </TouchableOpacity>
          </>
        ) : activeTab === 'sent' ? (
          <TouchableOpacity
            onPress={() => runAction(friend._id, () => friendsApi.cancelRequest(friend._id), t('friends.cancel_success'))}
            style={styles.iconButton}
          >
            <Ionicons color="#A8ADB7" name="close" size={20} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setRemoveTarget(friend)} style={styles.iconButton}>
            <Ionicons color="#EF646E" name="person-remove-outline" size={20} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons color="#FFF" name="arrow-back" size={24} />
        </TouchableOpacity>
        <Ionicons color={themeColor} name="people-outline" size={23} />
        <Text style={styles.headerTitle}>{t('friends.title')}</Text>
      </View>

      <View style={styles.tabs}>
        {tabItems.map((tab) => (
          <TouchableOpacity
            activeOpacity={0.8}
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: themeColor }]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
            {tab.key === 'received' && tab.count > 0 ? <View style={styles.requestDot} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.state}>
          <ActivityIndicator color={themeColor} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={users.length ? styles.list : styles.emptyState}
          onScroll={handleScroll}
          ref={scrollRef}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadFriends(true)} tintColor={themeColor} />
          }
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {users.length ? users.map(renderUser) : (
            <>
              <Ionicons color="#444B58" name={activeTab === 'friends' ? 'people-outline' : 'person-add-outline'} size={48} />
              <Text style={styles.emptyText}>
                {activeTab === 'friends'
                  ? t('friends.empty_friends')
                  : activeTab === 'received'
                    ? t('friends.empty_received')
                    : t('friends.empty_sent')}
              </Text>
            </>
          )}
        </ScrollView>
      )}

      <ScrollToTopButton
        onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })}
        visible={showScrollTop}
      />

      <CustomAlert
        cancelText={t('general.cancel')}
        confirmText={t('friends.unfriend')}
        iconName="person-remove-outline"
        message={t('friends.confirm_remove_desc')}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title={t('friends.confirm_remove_title')}
        visible={!!removeTarget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0F1015', flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: { alignItems: 'center', height: 38, justifyContent: 'center', marginRight: 10, width: 38 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '700', marginLeft: 9 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 18 },
  tab: {
    alignItems: 'center',
    backgroundColor: '#1B1E26',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 45,
    paddingHorizontal: 5,
  },
  tabText: { color: '#9299A7', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: '#FFF' },
  requestDot: { backgroundColor: '#EF4444', borderRadius: 4, height: 8, marginLeft: 5, width: 8 },
  list: { paddingBottom: 32, paddingHorizontal: 16 },
  userCard: {
    alignItems: 'center',
    backgroundColor: '#161922',
    borderColor: '#242936',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 76,
    padding: 12,
  },
  userInfo: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  avatar: { borderRadius: 25, height: 50, width: 50 },
  avatarFallback: { alignItems: 'center', borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  avatarText: { fontSize: 20, fontWeight: '700' },
  userText: { flex: 1, marginLeft: 12 },
  userName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  profileLink: { color: '#87909E', fontSize: 12, marginTop: 4 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'flex-end', marginLeft: 8 },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#242935',
    borderRadius: 10,
    height: 39,
    justifyContent: 'center',
    width: 39,
  },
  acceptButton: { backgroundColor: 'rgba(34,197,94,0.12)' },
  rejectButton: { backgroundColor: 'rgba(239,68,68,0.12)' },
  state: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', paddingBottom: 50 },
  emptyText: { color: '#7D8492', fontSize: 14, marginTop: 14, textAlign: 'center' },
});
