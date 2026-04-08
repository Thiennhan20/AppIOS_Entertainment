import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useTheme } from '../../../context/ThemeContext';
import { styles } from '../homeStyles';
import { FlatList } from 'react-native';

type Props = {
  section: any;
  navigation: any;
};

export default function Top10Section({ section, navigation }: Props) {
  const { themeColor, themeGradient } = useTheme();

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
        removeClippedSubviews={true}
        renderItem={({ item, index }) => {
          const isDoubleDigit = (index + 1) >= 10;
          return (
            <TouchableOpacity
              style={{ marginRight: 20, position: 'relative', width: isDoubleDigit ? 185 : 150, height: 160, display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' }}
              onPress={() => navigation.navigate('DetailScreen', { item, isTV: section.isTV })}
              activeOpacity={0.8}
            >
              <View style={{ position: 'absolute', bottom: -25, left: -5, width: isDoubleDigit ? 185 : 90, height: 160, zIndex: 20, elevation: 20 }}>
                {/* Number Outline (Shadow Layer) */}
                {isDoubleDigit ? (
                  <>
                    <Text style={{ position: 'absolute', left: -10, bottom: 0, fontSize: 130, fontWeight: '900', color: '#16161e', textShadowColor: '#111', textShadowOffset: {width: 3, height: 0}, textShadowRadius: 3 }}>
                      {(index + 1).toString()[0]}
                    </Text>
                    <Text style={{ position: 'absolute', left: 80, bottom: 0, fontSize: 130, fontWeight: '900', color: '#16161e', textShadowColor: '#111', textShadowOffset: {width: 3, height: 0}, textShadowRadius: 3 }}>
                      {(index + 1).toString()[1]}
                    </Text>
                  </>
                ) : (
                  <Text style={{ position: 'absolute', bottom: 0, left: 0, fontSize: 130, fontWeight: '900', color: '#16161e', textShadowColor: '#111', textShadowOffset: {width: 3, height: 0}, textShadowRadius: 3, letterSpacing: -8 }}>
                    {index + 1}
                  </Text>
                )}
                
                {/* Gradient Number inside MaskedView */}
                <MaskedView
                  style={{ position: 'absolute', height: '100%', width: '100%', zIndex: 11 }}
                  maskElement={
                    isDoubleDigit ? (
                      <View style={{ flex: 1, position: 'relative' }}>
                        <Text style={{ position: 'absolute', left: -10, bottom: 0, fontSize: 130, fontWeight: '900', color: 'black' }}>
                          {(index + 1).toString()[0]}
                        </Text>
                        <Text style={{ position: 'absolute', left: 80, bottom: 0, fontSize: 130, fontWeight: '900', color: 'black' }}>
                          {(index + 1).toString()[1]}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ position: 'absolute', left: 0, bottom: 0, fontSize: 130, fontWeight: '900', color: 'black', letterSpacing: -8, backgroundColor: 'transparent' }}>
                        {index + 1}
                      </Text>
                    )
                  }
                >
                  <LinearGradient
                    colors={(themeGradient as [string, string]) || [themeColor, '#ffffff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                  />
                </MaskedView>
              </View>

              {/* 3D Leaning Poster */}
              <View style={{
                zIndex: 5,
                elevation: 5,
                position: 'absolute',
                left: isDoubleDigit ? 30 : undefined,
                right: isDoubleDigit ? undefined : 0,
                bottom: -5,
                transform: [
                  { perspective: 800 },
                  { rotateX: '45deg' },
                  { rotateY: '-15deg' },
                  { rotateZ: '-5deg' },
                  { translateY: 15 },
                  { scale: 1.15 }
                ],
                shadowColor: '#000',
                shadowOffset: { width: -5, height: 10 },
                shadowOpacity: 0.6,
                shadowRadius: 10,
              }}>
                <Image 
                  source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }} 
                  style={{ width: 105, height: 150, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} 
                  contentFit="cover" transition={200} cachePolicy="memory-disk" 
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
