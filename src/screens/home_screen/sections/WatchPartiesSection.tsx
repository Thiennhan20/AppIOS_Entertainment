import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { styles } from '../homeStyles';

type Props = {
  section: any;
  navigation: any;
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
          const memberCount = item.member_count || item.members?.length || 1;
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
                  <View style={{ width: 42, height: 42, borderRadius: 21, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={20} color="#fff" />
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
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Ionicons name="enter-outline" size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, marginLeft: 5, fontWeight: '800' }}>{t('streaming.join')}</Text>
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
