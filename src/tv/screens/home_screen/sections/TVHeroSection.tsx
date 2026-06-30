import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { styles } from '../homeStyles';
import TVHeroThumbnail from './TVHeroThumbnail';

interface TVHeroSectionProps {
  focusedMovie: any;
  featuredItems: any[];
  themeColor: string;
  focusedButton: string | null;
  setFocusedButton: (btn: string | null) => void;
  hoveredButton: string | null;
  setHoveredButton: (btn: string | null) => void;
  focusedThumbnailIndex: number | null;
  setFocusedThumbnailIndex: (idx: number | null) => void;
  setFocusedMovie: (movie: any) => void;
  updateFocusedSection: (section: 'hero' | 'continue_watching' | 'rows') => void;
  handleBlurSection: () => void;
  handleTrailerPress: () => void;
  handleDetailPress: () => void;
  thumbnailRefs: React.MutableRefObject<any[]>;
}

export default function TVHeroSection({
  focusedMovie,
  featuredItems,
  themeColor,
  focusedButton,
  setFocusedButton,
  hoveredButton,
  setHoveredButton,
  focusedThumbnailIndex,
  setFocusedThumbnailIndex,
  setFocusedMovie,
  updateFocusedSection,
  handleBlurSection,
  handleTrailerPress,
  handleDetailPress,
  thumbnailRefs
}: TVHeroSectionProps) {
  const { t } = useTranslation();

  const rating = focusedMovie?.vote_average ? focusedMovie.vote_average.toFixed(1) : '8.5';
  const releaseYear = focusedMovie?.release_date ? focusedMovie.release_date.split('-')[0] : 
                      focusedMovie?.first_air_date ? focusedMovie.first_air_date.split('-')[0] : '2026';

  return (
    <View style={styles.heroSection}>
      <View style={styles.heroLeftContent}>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {focusedMovie?.title || focusedMovie?.name || 'Untitled'}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.ratingBadge, { backgroundColor: themeColor }]}>
            <Ionicons name="star" size={13} color="#ffffff" />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
          <Text style={styles.metaText}>{releaseYear}</Text>
          <Text style={styles.metaText}>
            {focusedMovie?.isTV ? t('home.tv_show_label') || 'TV Show' : t('home.movie_label') || 'Movie'}
          </Text>
          {focusedMovie?.original_language && (
            <Text style={styles.metaText}>{focusedMovie.original_language.toUpperCase()}</Text>
          )}
        </View>

        <Text style={styles.heroDescription} numberOfLines={4}>
          {focusedMovie?.overview || focusedMovie?.description || t('detail.no_overview') || 'No description available.'}
        </Text>

        <View style={styles.heroActions}>
          <Pressable
            onPress={handleTrailerPress}
            onFocus={() => {
              setFocusedButton('trailer');
              updateFocusedSection('hero');
            }}
            onBlur={() => {
              setFocusedButton(null);
              handleBlurSection();
            }}
            onPointerEnter={() => setHoveredButton('trailer')}
            onPointerLeave={() => setHoveredButton(null)}
            focusable={true}
            style={() => {
              const showFocused = focusedButton === 'trailer' || hoveredButton === 'trailer';
              return [
                styles.heroButton,
                { backgroundColor: showFocused ? '#ffffff' : '#E50914' },
                showFocused && styles.heroButtonFocused
              ];
            }}
          >
            {() => {
              const showFocused = focusedButton === 'trailer' || hoveredButton === 'trailer';
              return (
                <>
                  <Ionicons name="film-outline" size={20} color={showFocused ? '#000000' : '#ffffff'} />
                  <Text style={[styles.heroButtonText, { color: showFocused ? '#000000' : '#ffffff' }]}>
                    Trailer
                  </Text>
                </>
              );
            }}
          </Pressable>

          <Pressable
            onPress={handleDetailPress}
            onFocus={() => {
              setFocusedButton('detail');
              updateFocusedSection('hero');
            }}
            onBlur={() => {
              setFocusedButton(null);
              handleBlurSection();
            }}
            onPointerEnter={() => setHoveredButton('detail')}
            onPointerLeave={() => setHoveredButton(null)}
            focusable={true}
            style={() => {
              const showFocused = focusedButton === 'detail' || hoveredButton === 'detail';
              return [
                styles.heroButton,
                { backgroundColor: showFocused ? '#ffffff' : 'rgba(255,255,255,0.35)' },
                showFocused && styles.heroButtonFocused
              ];
            }}
          >
            {() => {
              const showFocused = focusedButton === 'detail' || hoveredButton === 'detail';
              return (
                <>
                  <Ionicons name="information-circle-outline" size={20} color={showFocused ? '#000000' : '#ffffff'} />
                  <Text style={[styles.heroButtonText, { color: showFocused ? '#000000' : '#ffffff' }]}>
                    {t('general.details') || 'Details'}
                  </Text>
                </>
              );
            }}
          </Pressable>
        </View>
      </View>

      {/* Featured items circular thumbnails */}
      {featuredItems.length > 0 && (
        <View style={styles.heroThumbnailsContainer}>
          {featuredItems.map((item, index) => {
            const isCurrent = focusedMovie?.id === item.id;
            return (
              <TVHeroThumbnail
                ref={(el) => { thumbnailRefs.current[index] = el; }}
                key={`feat-${item.id}-${index}`}
                item={item}
                isActive={isCurrent}
                onFocus={() => {
                  setFocusedMovie(item);
                  updateFocusedSection('hero');
                  setFocusedThumbnailIndex(index);
                }}
                onBlur={() => {
                  setFocusedThumbnailIndex(null);
                  handleBlurSection();
                }}
                themeColor={themeColor}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
