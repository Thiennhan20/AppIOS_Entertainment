import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../../context/ThemeContext';
import { styles } from '../homeStyles';
import { FlatList } from 'react-native';

type Props = {
  section: any;
  navigation: any;
};

export default function Top10Section({ section, navigation }: Props) {
  const { themeColor } = useTheme();

  return (
    <View style={{ paddingBottom: 15, marginTop: 10 }}>
      <Text style={[styles.sectionTitle, { fontSize: 20, marginBottom: 15 }]}>{section.label}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        data={section.data}
        keyExtractor={(item, idx) => `top10-${item.id}-${idx}`}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews={false}
        renderItem={({ item, index }) => {
          const num = index + 1;
          const isWide = num >= 10;

          return (
            <TouchableOpacity
              style={{ marginRight: 12, width: isWide ? 160 : 140, height: 165 }}
              onPress={() => navigation.navigate('DetailScreen', { item, isTV: section.isTV })}
              activeOpacity={0.8}
            >
              {/* Poster — rendered first = behind */}
              <View style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                transform: [
                  { perspective: 500 },
                  { rotateY: '-10deg' },
                  { rotateZ: '-2deg' },
                ],
                shadowColor: '#000',
                shadowOffset: { width: -3, height: 6 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 1,
              }}>
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }}
                  style={{ width: 100, height: 150, borderRadius: 10 }}
                  contentFit="cover" transition={200} cachePolicy="memory-disk"
                />
              </View>

              {/* Number — rendered second = on top */}
              <Text style={{
                position: 'absolute',
                left: -5,
                bottom: -8,
                fontSize: 90,
                fontWeight: '900',
                color: themeColor,
                textShadowColor: 'rgba(0,0,0,0.8)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 4,
                zIndex: 99,
                elevation: 99,
              }}>
                {num}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}


