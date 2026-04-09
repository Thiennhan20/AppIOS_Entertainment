import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
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
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={{ width: 220, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginRight: 15, borderWidth: 1, borderColor: `${themeColor}44` }}
            onPress={() => {
              navigation.navigate('StreamingRoomScreen', {
                roomId: item.room_id,
                initialStreamUrl: '',
                initialTitle: item.title || t('streaming.watchParty'),
                isHost: false
              });
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
               <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14, flex: 1 }} numberOfLines={1}>{item.title}</Text>
               <View style={{ backgroundColor: themeColor, paddingHorizontal: 6, borderRadius: 4, justifyContent: 'center' }}>
                 <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>LIVE</Text>
               </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
               <Text style={{ color: '#aaa', fontSize: 12 }}><Ionicons name="person-circle" /> {item.host_name}</Text>
               <Text style={{ color: '#aaa', fontSize: 12 }}><Ionicons name="people" /> {item.members?.length || 1}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ color: '#666', marginLeft: 18, fontStyle: 'italic' }}>{t('home.no_rooms_open')}</Text>}
      />
    </View>
  );
}
