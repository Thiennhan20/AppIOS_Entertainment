import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/ThemeContext';
import { styles } from '../homeStyles';

type Props = {
  section: any;
  navigation: any;
};

const getAvatarBg = (id: string) => {
  const colors = [
    '#ec4899', // rose-500
    '#8b5cf6', // violet-500
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#6366f1', // indigo-500
    '#d946ef', // fuchsia-500
  ];
  if (!id) return colors[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function WatchPartiesSection({ section, navigation }: Props) {
  const { themeColor } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ paddingBottom: 15 }}>
      <Text style={styles.sectionTitle}>{section.label}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={section.data}
        keyExtractor={(item) => `room-${item.room_id}`}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={true}
        renderItem={({ item }) => {
          const memberCount = typeof item.member_count === 'number' ? item.member_count : (item.members?.length || 0);
          const maxUsers = item.max_users || 6;
          const isFull = memberCount >= maxUsers;
          const statusLabel = isFull ? t('streaming.full') : (item.status === 'playing' ? t('streaming.playing') : t('streaming.waiting'));

          return (
            <TouchableOpacity
              style={{ width: 260, backgroundColor: 'rgba(255,255,255,0.055)', borderRadius: 14, padding: 14, marginRight: 15, borderWidth: 1, borderColor: `${themeColor}44` }}
              onPress={() => {
                navigation.navigate('StreamingRoomScreen', {
                  roomId: item.room_id,
                  initialStreamUrl: '',
                  initialTitle: item.title || t('streaming.watchParty'),
                  isHost: false
                });
              }}
              activeOpacity={0.84}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {item.host_avatar ? (
                  <Image source={{ uri: item.host_avatar }} style={{ width: 42, height: 42, borderRadius: 21, marginRight: 10 }} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={{ width: 42, height: 42, borderRadius: 21, marginRight: 10, backgroundColor: getAvatarBg(item.host_id), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                      {item.host_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
                    {item.title || t('streaming.untitledRoom')}
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                    {t('streaming.host')}: {item.host_name || 'Host'}
                  </Text>
                </View>
                <View style={{ backgroundColor: isFull ? 'rgba(239,68,68,0.25)' : `${themeColor}33`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ color: isFull ? '#FCA5A5' : '#fff', fontSize: 10, fontWeight: '900' }}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="people" size={16} color="#aaa" />
                  <Text style={{ color: '#aaa', fontSize: 12, marginLeft: 5 }}>{memberCount}/{maxUsers}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={{ color: '#666', marginLeft: 18, fontStyle: 'italic' }}>{t('home.no_rooms_open')}</Text>}
      />
    </View>
  );
}
