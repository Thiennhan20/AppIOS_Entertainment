import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { styles } from '../homeStyles';

export interface TVHeroThumbnailProps {
  item: any;
  isActive: boolean;
  onFocus: () => void;
  onBlur?: () => void;
  themeColor: string;
}

export const TVHeroThumbnail = React.forwardRef<any, TVHeroThumbnailProps>(
  ({ item, isActive, onFocus, onBlur, themeColor }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const posterPath = item.poster_path || (item.poster && item.poster.replace('https://image.tmdb.org/t/p/w400', ''));
    const imageUrl = posterPath ? `https://image.tmdb.org/t/p/w154${posterPath}` : null;

    return (
      <Pressable
        ref={ref}
        focusable={true}
        onFocus={() => {
          setIsFocused(true);
          onFocus();
        }}
        onBlur={() => {
          setIsFocused(false);
          if (onBlur) onBlur();
        }}
        style={[
          styles.heroThumbnail,
          isActive && { borderColor: themeColor, borderWidth: 3 },
          isFocused && styles.heroThumbnailFocused
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.heroThumbnailImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.heroThumbnailPlaceholder} />
        )}
      </Pressable>
    );
  }
);

export default TVHeroThumbnail;
