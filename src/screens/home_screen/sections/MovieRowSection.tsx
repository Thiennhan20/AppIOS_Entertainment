import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../homeStyles';

type Props = {
  section: any;
  renderMovieCard: (item: any, isTV: boolean, isHistory: boolean, isWatchlist: boolean, index: number) => React.ReactElement;
};

export default function MovieRowSection({ section, renderMovieCard }: Props) {
  return (
    <View style={{ paddingBottom: 15 }}>
      <Text style={styles.sectionTitle}>{section.label}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={section.data}
        keyExtractor={(item, idx) => `${item.id || item.contentId}-${idx}`}
        renderItem={({ item, index }) => renderMovieCard(item, section.isTV, section.isHistory, section.isWatchlist, index)}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews={true}
      />
    </View>
  );
}
