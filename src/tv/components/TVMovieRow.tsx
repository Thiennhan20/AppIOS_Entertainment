import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';

interface TVMovieRowProps {
  title: string;
  data: any[];
  onItemPress: (item: any) => void;
  onItemFocus?: (item: any) => void;
  onItemBlur?: () => void;
}

const TVMovieCard = React.memo(function TVMovieCard({ item, onItemPress, onItemFocus, onItemBlur, themeColor }: { item: any, onItemPress: any, onItemFocus: any, onItemBlur: any, themeColor: string }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const pressableRef = React.useRef<any>(null);

  const posterPath = item.poster_path || (item.poster && item.poster.replace('https://image.tmdb.org/t/p/w400', ''));
  const originalPoster = posterPath ? `https://image.tmdb.org/t/p/w300${posterPath}` : null;
  const displayTitle = item.title || item.name || 'Untitled';

  return (
    <Pressable
      ref={pressableRef}
      onFocus={() => {
        setIsFocused(true);
        if (onItemFocus) onItemFocus(item);
      }}
      onBlur={() => {
        setIsFocused(false);
        if (onItemBlur) onItemBlur();
      }}
      onPress={() => onItemPress(item)}
      onPointerEnter={() => {
        setIsHovered(true);
        if (pressableRef.current && pressableRef.current.focus) {
          pressableRef.current.focus();
        }
        if (onItemFocus) onItemFocus(item);
      }}
      onPointerLeave={() => {
        setIsHovered(false);
      }}
      focusable={true}
      style={[
        styles.cardContainer,
        (isFocused || isHovered) && [styles.cardContainerFocused, { borderColor: themeColor, shadowColor: themeColor }]
      ]}
    >
      {() => {
        const showActive = isFocused || isHovered;
        return (
          <View style={styles.cardInner}>
            {originalPoster ? (
              <Image
                source={{ uri: originalPoster }}
                style={styles.posterImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderText} numberOfLines={3}>
                  {displayTitle}
                </Text>
              </View>
            )}
            {showActive && (
              <View style={styles.titleOverlay}>
                <Text style={styles.overlayText} numberOfLines={1}>
                  {displayTitle}
                </Text>
              </View>
            )}
          </View>
        );
      }}
    </Pressable>
  );
});

export default function TVMovieRow({ title, data, onItemPress, onItemFocus, onItemBlur }: TVMovieRowProps) {
  const { themeColor } = useTheme();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.rowTitle}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item, index) => `${item.id || item.contentId || index}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        style={{ overflow: 'visible' }}
        {...({ clipToPadding: false } as any)}
        removeClippedSubviews={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        renderItem={({ item }) => (
          <TVMovieCard 
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

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  rowTitle: {
    color: '#e5e5e5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 40,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 40,
    paddingBottom: 25, // Expanded padding bottom for scaling
    paddingTop: 25, // Expanded padding top for scaling
    gap: 20,
  },
  cardContainer: {
    width: 140,
    height: 210,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'visible', // Essential for shadow showing
    backgroundColor: '#161823',
    elevation: 3,
  },
  cardContainerFocused: {
    transform: [{ scale: 1.15 }],
    borderWidth: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    zIndex: 99,
  },
  cardInner: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#232635',
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});
