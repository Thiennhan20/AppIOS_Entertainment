import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../homeStyles';

type Props = {
  section: any;
  navigation: any;
};

export default function ComingSoonSection({ section, navigation }: Props) {
  return (
    <View style={{ paddingBottom: 15 }}>
      <Text style={styles.sectionTitle}>{section.label}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={section.data}
        keyExtractor={(item, idx) => `coming-${item.id}-${idx}`}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={true}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ marginRight: 15, width: 220, position: 'relative' }} onPress={() => navigation.navigate('DetailScreen', { item, isTV: false })}>
             <Image source={{ uri: `https://image.tmdb.org/t/p/w400${item.backdrop_path || item.poster_path}` }} style={{ width: 220, height: 120, borderRadius: 10 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
             <View style={{ position: 'absolute', bottom: 0, width: '100%', padding: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: 'white', fontWeight: 'bold', flex: 1, marginRight: 10 }} numberOfLines={1}>{item.title}</Text>
                <Ionicons name="notifications" color="white" size={16} />
             </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
