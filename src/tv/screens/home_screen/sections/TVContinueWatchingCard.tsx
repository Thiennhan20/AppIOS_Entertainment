import React, { useState, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { styles } from '../homeStyles';

export interface TVContinueWatchingCardProps {
  item: any;
  onItemPress: (item: any) => void;
  onItemFocus?: (item: any) => void;
  onItemBlur?: () => void;
  themeColor: string;
}

export default function TVContinueWatchingCard({
  item,
  onItemPress,
  onItemFocus,
  onItemBlur,
  themeColor
}: TVContinueWatchingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const pressableRef = useRef<any>(null);

  const displayTitle = item.title || item.name || 'Untitled';
  
  // Use backdrop if available, otherwise fallback to poster
  const backdropUrl = item.backdrop_path 
    ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` 
    : (item.poster || null);

  const progressPercent = item.currentTime > 0 && item.duration > 0 
    ? Math.min((item.currentTime / item.duration) * 100, 100) 
    : 0;

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
        styles.cwCardContainer,
        (isFocused || isHovered) && [styles.cwCardContainerFocused, { borderColor: themeColor, shadowColor: themeColor }]
      ]}
    >
      {() => {
        const showActive = isFocused || isHovered;
        return (
          <View style={styles.cwCardInner}>
            {backdropUrl ? (
              <Image
                source={{ uri: backdropUrl }}
                style={styles.cwBackdropImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.cwPlaceholderCard}>
                <Text style={styles.cwPlaceholderText} numberOfLines={2}>
                  {displayTitle}
                </Text>
              </View>
            )}
            
            <View style={styles.cwInfoContainer}>
              <Text style={styles.cwTitleText} numberOfLines={1}>
                {displayTitle}
              </Text>
              {item.isTV && (item.season !== undefined || item.episode !== undefined) && (
                <Text style={styles.cwEpisodeText}>
                  {`S${item.season || 1} : E${item.episode || 1}`}
                </Text>
              )}
            </View>

            {progressPercent > 0 && (
              <View style={styles.cwProgressContainer}>
                <View style={[styles.cwProgressBar, { width: `${progressPercent}%`, backgroundColor: themeColor }]} />
              </View>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}
