import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../../context/ThemeContext';
import { styles } from '../homeStyles';

type Props = {
  section: any;
};

export default function TopCastSection({ section }: Props) {
  const { themeColor } = useTheme();

  return (
    <View style={{ paddingBottom: 15, marginTop: 10 }}>
      <Text style={styles.sectionTitle}>{section.label}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={section.data}
        keyExtractor={(item) => `cast-${item.id}`}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ alignItems: 'center', marginRight: 20 }} activeOpacity={0.8}>
             <Image source={{ uri: item.image }} style={{ width: 75, height: 75, borderRadius: 37.5, borderWidth: 2, borderColor: themeColor, marginBottom: 8 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
             <Text style={{ color: '#ccc', fontSize: 12, fontWeight: 'bold', width: 80, textAlign: 'center' }} numberOfLines={2}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
