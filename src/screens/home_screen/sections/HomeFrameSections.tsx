import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dimensions, FlatList, Text, TouchableOpacity, View, Modal, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import YoutubePlayer from 'react-native-youtube-iframe';
import WatchlistButton from '../../../components/WatchlistButton';
import { tmdbApi } from '../../../api/tmdb';
import { styles } from '../homeStyles';

const { width } = Dimensions.get('window');
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

const getTitle = (item: any) => item?.title || item?.name || 'Unknown';
const getOriginalTitle = (item: any) => item?.original_title || item?.original_name || '';
const getYear = (item: any) => {
  const date = item?.release_date || item?.first_air_date;
  return date ? String(date).slice(0, 4) : '';
};
const isTVItem = (item: any, fallback = false) => item?.media_type === 'tv' || fallback || (!!item?.name && !item?.title);
const getPosterUri = (item: any, size = 'w400') => item?.poster_path ? `${IMAGE_BASE}/${size}${item.poster_path}` : null;
const getBackdropUri = (item: any, size = 'w780') => {
  if (item?.backdrop_path) return `${IMAGE_BASE}/${size}${item.backdrop_path}`;
  return getPosterUri(item, size);
};
const getProfileUri = (item: any) => {
  if (item?.profile_path) return `${IMAGE_BASE}/w342${item.profile_path}`;
  return item?.image || null;
};

type SectionProps = {
  section: any;
  navigation: any;
  onLongPressMovie?: (item: any, isTV: boolean) => void;
  isActive?: boolean;
};

function SectionHeader({ label, accent }: { label: string; accent?: string }) {
  return (
    <View style={styles.frameSectionHeader}>
      <View style={[styles.frameAccent, { backgroundColor: accent || '#E50914' }]} />
      <Text style={styles.frameSectionTitle} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function FrameRowSection({ section, navigation, onLongPressMovie }: SectionProps) {
  return (
    <View style={styles.frameSection}>
      <SectionHeader label={section.label} accent={section.accent} />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.frameRow}
        data={section.data}
        keyExtractor={(item, idx) => `${section.id}-${item.id}-${idx}`}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        renderItem={({ item }) => {
          const isTV = isTVItem(item, section.isTV);
          const posterUri = getPosterUri(item);
          const year = getYear(item);

          return (
            <TouchableOpacity
              style={styles.frameCard}
              onPress={() => navigation.navigate('DetailScreen', { item, isTV })}
              onLongPress={() => onLongPressMovie?.(item, isTV)}
              delayLongPress={400}
              activeOpacity={0.84}
            >
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.framePoster} contentFit="cover" transition={180} cachePolicy="memory-disk" />
              ) : (
                <View style={[styles.framePoster, styles.placeholderCard]}>
                  <Ionicons name="film-outline" size={28} color="#777" />
                </View>
              )}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.framePosterOverlay} />
              <View style={styles.frameMeta}>
                <Text style={styles.frameTitle} numberOfLines={1}>{getTitle(item)}</Text>
                <Text style={styles.frameSubtitle} numberOfLines={1}>
                  {year ? `${year} - ` : ''}{isTV ? section.tvLabel : section.movieLabel}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

export function RankedPosterSection({ section, navigation, onLongPressMovie }: SectionProps) {
  const CARD_WIDTH = 310;
  const CARD_MARGIN = 16;
  const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN;

  return (
    <View style={styles.frameSection}>
      <SectionHeader label={section.label} accent={section.accent} />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rankedRow}
        data={section.data}
        keyExtractor={(item, idx) => `${section.id}-${item.id}-${idx}`}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        snapToAlignment="start"
        renderItem={({ item, index }) => {
          const isTV = isTVItem(item, section.isTV);
          const posterUri = getPosterUri(item, 'w500');
          const isEven = index % 2 === 0;

          return (
            <TouchableOpacity
              style={styles.rankedCard}
              onPress={() => navigation.navigate('DetailScreen', { item, isTV })}
              onLongPress={() => onLongPressMovie?.(item, isTV)}
              delayLongPress={400}
              activeOpacity={0.86}
            >
              {/* Clip container: absorbs the 3D rotation overflow so visual spacing stays even */}
              <View style={styles.rankedPosterClip}>
                <View style={[
                  styles.rankedPosterShadowContainer,
                  {
                    transform: [
                      { perspective: 800 },
                      { rotateY: isEven ? '8deg' : '-8deg' },
                      { translateX: isEven ? 0 : -12 }
                    ]
                  }
                ]}>
                  <View style={styles.rankedPosterWrap}>
                    {posterUri ? (
                      <Image source={{ uri: posterUri }} style={styles.rankedPoster} contentFit="cover" transition={180} cachePolicy="memory-disk" />
                    ) : (
                      <View style={[styles.rankedPoster, styles.placeholderCard]}>
                        <Ionicons name="film-outline" size={30} color="#777" />
                      </View>
                    )}
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.framePosterOverlay} />
                  </View>
                </View>
              </View>
              <View style={styles.rankedInfo}>
                <Text style={styles.rankedNumber}>{index + 1}</Text>
                <View style={styles.rankedDivider} />
                <View style={styles.rankedTextWrap}>
                  <Text style={styles.rankedTitle} numberOfLines={1}>{getTitle(item)}</Text>
                  <Text style={styles.rankedSubtitle} numberOfLines={1}>{getOriginalTitle(item) || getYear(item)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

export function FeaturedActorsSection({ section }: { section: any }) {
  return (
    <View style={styles.frameSection}>
      <SectionHeader label={section.label} accent={section.accent} />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.frameRow}
        data={section.data}
        keyExtractor={(item, idx) => `${section.id}-${item.id}-${idx}`}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        renderItem={({ item }) => {
          const profileUri = getProfileUri(item);
          const knownFor = item?.known_for
            ?.map((known: any) => known?.title || known?.name)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ');

          return (
            <View style={styles.actorCard}>
              {profileUri ? (
                <Image source={{ uri: profileUri }} style={styles.actorImage} contentFit="cover" transition={180} cachePolicy="memory-disk" />
              ) : (
                <View style={[styles.actorImage, styles.placeholderCard]}>
                  <Ionicons name="person-outline" size={30} color="#777" />
                </View>
              )}
              <Text style={styles.actorName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.actorKnownFor} numberOfLines={2}>{knownFor || section.actorLabel}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

export function EntertainmentSection({ section, navigation }: { section: any; navigation: any }) {
  const { t } = useTranslation();
  const cardWidth = (width - 54) / 2;
  const cards = [
    {
      id: 'movies',
      label: t('home.entertainment_movies'),
      icon: 'film-outline',
      accent: '#8B5CF6',
      item: section.data?.movie,
      onPress: () => navigation.navigate('ListScreen', { type: 'movie' }),
    },
    {
      id: 'tv',
      label: t('home.entertainment_tv'),
      icon: 'tv-outline',
      accent: '#F59E0B',
      item: section.data?.tv,
      onPress: () => navigation.navigate('ListScreen', { type: 'tv' }),
    },
    {
      id: 'ai',
      label: t('home.entertainment_ai'),
      icon: 'sparkles',
      accent: '#22D3EE',
      onPress: () => navigation.navigate('AI'),
    },
    {
      id: 'game',
      label: t('home.entertainment_game'),
      icon: 'game-controller-outline',
      accent: '#F97316',
      onPress: () => navigation.navigate('Game'),
    },
  ];

  return (
    <View style={styles.entertainmentSection}>
      <SectionHeader label={section.label} accent={section.accent} />
      <View style={styles.entertainmentGrid}>
        {cards.map((card, index) => {
          const imageUri = getBackdropUri(card.item);

          return (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.entertainmentCard,
                { width: cardWidth, marginLeft: index % 2 === 0 ? 0 : 12, marginBottom: 12 },
              ]}
              onPress={card.onPress}
              activeOpacity={0.84}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.entertainmentBg} contentFit="cover" cachePolicy="memory-disk" />
              ) : null}
              <LinearGradient
                colors={[`${card.accent}33`, 'rgba(8,8,12,0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.entertainmentOverlay}
              />
              <Ionicons name={card.icon as any} size={24} color="white" />
              <Text style={styles.entertainmentLabel} numberOfLines={1}>{card.label}</Text>
              {(card.id === 'ai' || card.id === 'game') && (
                <Text style={styles.entertainmentSoon} numberOfLines={1}>{t('home.coming_soon')}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function HomeCTASection({ section }: { section: any }) {
  return (
    <View style={styles.ctaSection}>
      <LinearGradient
        colors={['rgba(139,92,246,0.28)', 'rgba(239,68,68,0.22)', 'rgba(15,15,19,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaPanel}
      >
        <View style={styles.ctaIconRow}>
          {['sparkles', 'star-outline', 'heart-outline', 'eye-outline'].map((icon, index) => (
            <View key={icon} style={[styles.ctaIconBubble, { marginLeft: index === 0 ? 0 : 12 }]}>
              <Ionicons name={icon as any} size={20} color="white" />
            </View>
          ))}
        </View>
        <Text style={styles.ctaTitle}>{section.label}</Text>
        <Text style={styles.ctaSubtitle}>{section.subtitle}</Text>
      </LinearGradient>
    </View>
  );
}

export function AnimeHeroSection({ section, navigation, onLongPressMovie, isActive = false }: SectionProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerLoading, setIsTrailerLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const items = section.data || [];
  const selectedItem = items[selectedIndex] || null;

  // Auto-play cycling every 8 seconds, ONLY when active/visible
  useEffect(() => {
    if (!isActive || !items.length) return;
    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isActive, items.length]);

  // Center active thumbnail automatically when selectedIndex changes
  useEffect(() => {
    if (!items.length) return;
    flatListRef.current?.scrollToIndex({
      index: selectedIndex,
      animated: true,
      viewPosition: 0.5, // Centers the item smoothly in the carousel viewport
    });
  }, [selectedIndex, items.length]);

  // Reset trailer key when selection changes
  useEffect(() => {
    if (!selectedItem) return;
    setTrailerKey(null);
  }, [selectedIndex]);

  const handleTrailerClick = async () => {
    if (!selectedItem) return;
    setIsTrailerLoading(true);
    setShowTrailer(true);
    try {
      const isTV = isTVItem(selectedItem, section.isTV);
      const videos = isTV
        ? await tmdbApi.getTVVideos(selectedItem.id)
        : await tmdbApi.getMovieVideos(selectedItem.id);
      const vidList = (videos as any)?.results || [];
      const ytTrailer = vidList.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      if (ytTrailer) {
        setTrailerKey(ytTrailer.key);
      } else {
        setTrailerKey(null);
      }
    } catch (e) {
      setTrailerKey(null);
    } finally {
      setIsTrailerLoading(false);
    }
  };

  if (!selectedItem) return null;

  const isTV = isTVItem(selectedItem, section.isTV);
  const backdropUri = getBackdropUri(selectedItem, 'w780');

  return (
    <View style={styles.animeSection}>
      {/* Section Title Header */}
      <SectionHeader label={section.label} accent={section.accent || '#6366F1'} />

      {/* Main Hero Container */}
      <View style={styles.animeHeroContainer}>
        {/* Backdrop Image */}
        {backdropUri ? (
          <Image
            source={{ uri: backdropUri }}
            style={styles.animeHeroBackdrop}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
          />
        ) : null}

        {/* 3D-like multi-layered gradient blend */}
        <LinearGradient
          colors={['transparent', 'rgba(15,15,19,0.3)', 'rgba(15,15,19,0.98)']}
          style={styles.animeHeroGradient}
        />

        {/* Hero Content block */}
        <View style={styles.animeHeroContent}>
          {/* Genre & Category Capsule */}
          <View style={[styles.animeTag, { backgroundColor: section.accent || '#6366F1', shadowColor: section.accent || '#6366F1' }]}>
            <Text style={styles.animeTagText}>
              🌟 {isTV ? t('home.entertainment_tv') : t('home.entertainment_movies')}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.animeHeroTitle} numberOfLines={1}>
            {getTitle(selectedItem)}
          </Text>

          {/* Original Title */}
          <Text style={styles.animeHeroOriginal} numberOfLines={1}>
            {getOriginalTitle(selectedItem)}
          </Text>

          {/* Metadata Badges */}
          <View style={styles.animeMetaRow}>
            {selectedItem.vote_average ? (
              <View style={styles.animeImdbBadge}>
                <Text style={styles.animeImdbText}>
                  IMDb {selectedItem.vote_average.toFixed(1)}
                </Text>
              </View>
            ) : null}
            <View style={styles.animeAgeBadge}>
              <Text style={styles.animeAgeText}>T16</Text>
            </View>
            {getYear(selectedItem) ? (
              <Text style={styles.animeYearText}>{getYear(selectedItem)}</Text>
            ) : null}
          </View>

          {/* Overview Truncated */}
          <Text style={styles.animeHeroOverview} numberOfLines={3}>
            {selectedItem.overview || t('home.updatingOverview')}
          </Text>

          {/* Action Row */}
          <View style={styles.animeActionsRow}>
            {/* Play Button */}
            <TouchableOpacity
              style={styles.animePlayBtn}
              onPress={() => navigation.navigate('DetailScreen', { item: selectedItem, isTV })}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={22} color="black" />
            </TouchableOpacity>

            {/* Watchlist Toggle */}
            <WatchlistButton movie={selectedItem} styleType="iconOnly" />

            {/* Trailer Button */}
            <TouchableOpacity
              style={styles.animeTrailerBtn}
              onPress={handleTrailerClick}
              activeOpacity={0.8}
            >
              <Text style={styles.animeTrailerText}>TRAILER</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Selector Carousel (Thumbnails) */}
        <FlatList
          ref={flatListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.animeCarouselRow}
          style={styles.animeCarouselAbsolute}
          data={items}
          keyExtractor={(item, idx) => `anime-thumb-${item.id}-${idx}`}
          initialNumToRender={8}
          getItemLayout={(data, index) => ({
            length: 76,
            offset: 76 * index + 18,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 50));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              });
            });
          }}
          renderItem={({ item, index }) => {
            const isActive = index === selectedIndex;
            const posterUri = getPosterUri(item, 'w200');

            return (
              <TouchableOpacity
                style={[styles.animeThumbnail, isActive && styles.animeThumbnailActive, { opacity: isActive ? 1 : 0.55 }]}
                onPress={() => setSelectedIndex(index)}
                activeOpacity={0.9}
              >
                {posterUri ? (
                  <Image
                    source={{ uri: posterUri }}
                    style={styles.animeThumbnailImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.animeThumbnailImage, styles.placeholderCard]}>
                    <Ionicons name="film-outline" size={16} color="#555" />
                  </View>
                )}
                {isActive && (
                  <View 
                    style={styles.animeThumbnailActiveOverlay}
                    pointerEvents="none"
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Trailer Modal Player */}
      <Modal
        visible={showTrailer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTrailer(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.animeTrailerOverlay}
          activeOpacity={1}
          onPress={() => setShowTrailer(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.animeTrailerBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.animeTrailerHeader}>
              <Text style={styles.animeTrailerTitle} numberOfLines={1}>
                {getTitle(selectedItem)} - Trailer
              </Text>
              <TouchableOpacity onPress={() => setShowTrailer(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
              {isTrailerLoading ? (
                <ActivityIndicator size="large" color={section.accent || '#6366F1'} />
              ) : trailerKey ? (
                <YoutubePlayer
                  height={width * 0.9 * (9 / 16)}
                  width={width * 0.9}
                  play={true}
                  videoId={trailerKey}
                  webViewProps={{
                    mediaPlaybackRequiresUserAction: false,
                    allowsInlineMediaPlayback: true,
                    scrollEnabled: false,
                  }}
                />
              ) : (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Ionicons name="alert-circle-outline" size={36} color="#ff4d4d" />
                  <Text style={{ color: '#aaa', marginTop: 8, fontSize: 13 }}>
                    {t('player.no_trailer') || 'No trailer found.'}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export function Romance3DSection({ section, navigation, onLongPressMovie, isActive = false }: SectionProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const items = section.data || [];
  const itemsWithPosters = React.useMemo(() => items.filter((item: any) => !!item.poster_path), [items]);

  // Width calculations
  const containerWidth = width - 32;
  const cardWidth = 120;
  const cardHeight = 180;
  const cardGap = 20;
  const itemWidth = cardWidth + cardGap;
  const horizontalInset = (containerWidth - cardWidth) / 2;

  // Auto-play cycling every 5 seconds (web spec), ONLY when active/visible
  useEffect(() => {
    if (!isActive || !itemsWithPosters.length) return;
    const interval = setInterval(() => {
      setSelectedIndex((prev) => {
        const next = (prev + 1) % itemsWithPosters.length;
        flatListRef.current?.scrollToOffset({
          offset: next * itemWidth,
          animated: true,
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isActive, itemsWithPosters.length, itemWidth]);

  // Track current active index on manual scroll
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / itemWidth);
        if (index >= 0 && index < itemsWithPosters.length && index !== selectedIndex) {
          setSelectedIndex(index);
        }
      },
    }
  );

  if (!itemsWithPosters.length) return null;

  const activeItem = itemsWithPosters[selectedIndex] || itemsWithPosters[0];
  const isTV = isTVItem(activeItem, section.isTV);
  const year = getYear(activeItem);

  return (
    <View style={styles.animeSection}>
      {/* Dynamic Romance Header */}
      <View style={styles.frameSectionHeader}>
        <View style={[styles.frameAccent, { backgroundColor: '#FB7185' }]} />
        <Text style={styles.frameSectionTitle} numberOfLines={1}>
          {section.label}
        </Text>
      </View>

      {/* 3D Ring Container */}
      <View style={[
        styles.animeHeroContainer, 
        { 
          height: 380, 
          backgroundColor: 'transparent',
          borderWidth: 0,
        }
      ]}>
        {/* Background Styling: 3D Ring Container Box */}
        <LinearGradient
          colors={['rgba(30,10,25,0.76)', 'rgba(45,15,35,0.9)', 'rgba(25,5,20,0.96)']}
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(244, 114, 182, 0.1)',
            }
          ]}
        />

        {/* Ambient Radial Pink Glow */}
        <View style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          right: '10%',
          bottom: '20%',
          opacity: 0.18,
          backgroundColor: '#f472b6',
          borderRadius: 100,
          transform: [{ scaleY: 0.4 }],
        }} pointerEvents="none" />

        {/* 3D Animated FlatList */}
        <Animated.FlatList
          ref={flatListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={itemsWithPosters}
          keyExtractor={(item) => `romance-3d-${item.id}`}
          snapToInterval={itemWidth}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: horizontalInset,
            alignItems: 'center',
            paddingTop: 10,
            paddingBottom: 70, // Leaves room for the bottom floating metadata pill
          }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(data, index) => ({
            length: itemWidth,
            offset: itemWidth * index,
            index,
          })}
          renderItem={({ item, index }) => {
            const inputRange = [
              (index - 1) * itemWidth,
              index * itemWidth,
              (index + 1) * itemWidth,
            ];

            const rotateY = scrollX.interpolate({
              inputRange,
              outputRange: ['36deg', '0deg', '-36deg'],
              extrapolate: 'clamp',
            });

            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.84, 1.14, 0.84],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.55, 1, 0.55],
              extrapolate: 'clamp',
            });

            const translateX = scrollX.interpolate({
              inputRange,
              outputRange: [18, 0, -18],
              extrapolate: 'clamp',
            });

            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [10, 0, 10],
              extrapolate: 'clamp',
            });

            const posterUri = getPosterUri(item, 'w500');

            return (
              <Animated.View style={{
                width: cardWidth,
                height: cardHeight,
                marginRight: cardGap,
                opacity,
                transform: [
                  { perspective: 1000 },
                  { scale },
                  { rotateY },
                  { translateX },
                  { translateY },
                ],
              }}>
                <TouchableOpacity
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: '#181820',
                    borderWidth: 1.5,
                    borderColor: index === selectedIndex ? 'rgba(244, 114, 182, 0.6)' : 'rgba(255,255,255,0.08)',
                    shadowColor: '#FB7185',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: index === selectedIndex ? 0.35 : 0,
                    shadowRadius: 10,
                    elevation: index === selectedIndex ? 8 : 0,
                  }}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (index === selectedIndex) {
                      navigation.navigate('DetailScreen', { item, isTV });
                    } else {
                      flatListRef.current?.scrollToOffset({
                        offset: index * itemWidth,
                        animated: true,
                      });
                    }
                  }}
                  onLongPress={() => onLongPressMovie?.(item, isTV)}
                  delayLongPress={400}
                >
                  {posterUri ? (
                    <Image
                      source={{ uri: posterUri }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, styles.placeholderCard]}>
                      <Ionicons name="film-outline" size={28} color="#777" />
                    </View>
                  )}
                  {/* Subtle poster highlight */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />

        {/* Floating Details Action Pill (Web Style) */}
        <View style={{
          position: 'absolute',
          bottom: 18,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 20,
        }} pointerEvents="box-none">
          <TouchableOpacity
            style={{
              maxWidth: '85%',
              paddingHorizontal: 22,
              paddingVertical: 10,
              borderRadius: 30,
              backgroundColor: 'rgba(0, 0, 0, 0.72)',
              borderWidth: 1,
              borderColor: 'rgba(244, 114, 182, 0.35)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#FB7185',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.28,
              shadowRadius: 10,
              elevation: 6,
            }}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('DetailScreen', { item: activeItem, isTV })}
          >
            <Text style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '800',
              textAlign: 'center',
            }} numberOfLines={1}>
              {getTitle(activeItem)}
            </Text>
            <Text style={{
              color: '#FDA4AF',
              fontSize: 11,
              fontWeight: '600',
              marginTop: 2,
              textAlign: 'center',
            }}>
              {year ? `${year} • ` : ''}{isTV ? t('home.tv_show_label') : t('home.movie_label')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

