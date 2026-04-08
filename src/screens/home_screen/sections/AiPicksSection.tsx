import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { styles } from '../homeStyles';

type Props = {
  section: any;
  renderMovieCard: (item: any, isTV: boolean, isHistory: boolean, isWatchlist: boolean, index: number) => React.ReactElement;
};

export default function AiPicksSection({ section, renderMovieCard }: Props) {
  return (
    <View style={{ paddingBottom: 15 }}>
      <Text style={[styles.sectionTitle, { color: '#00E5FF' }]}>{section.label}</Text>
      <View style={{ backgroundColor: 'rgba(0, 229, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.2)', paddingVertical: 15, marginHorizontal: 10, borderRadius: 15 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          data={section.data}
          keyExtractor={(item, idx) => `ai-${item.id}-${idx}`}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={3}
          removeClippedSubviews={true}
          renderItem={({ item, index }) => renderMovieCard(item, section.isTV, false, false, index)}
        />
      </View>
    </View>
  );
}
