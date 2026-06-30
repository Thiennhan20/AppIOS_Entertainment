import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../homeStyles';
import TVContinueWatchingCard from './TVContinueWatchingCard';

interface TVContinueWatchingSectionProps {
  recentlyWatched: any[];
  onItemPress: (item: any) => void;
  onItemFocus: () => void;
  onItemBlur: () => void;
  themeColor: string;
}

export default function TVContinueWatchingSection({
  recentlyWatched,
  onItemPress,
  onItemFocus,
  onItemBlur,
  themeColor
}: TVContinueWatchingSectionProps) {
  const { t } = useTranslation();

  if (recentlyWatched.length === 0) return null;

  return (
    <View style={styles.cwRowContainer}>
      <Text style={styles.cwRowTitle}>{t('home.continue_watching') || 'Continue Watching'}</Text>
      <FlatList
        horizontal
        data={recentlyWatched}
        keyExtractor={(item, index) => `cw-${item.id || index}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cwListContent}
        style={{ overflow: 'visible' }}
        {...({ clipToPadding: false } as any)}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <TVContinueWatchingCard
            item={item}
            onItemPress={onItemPress}
            onItemFocus={onItemFocus}
            onItemBlur={onItemBlur}
            themeColor={themeColor}
          />
        )}
      />
    </View>
  );
}
