import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Modal, Pressable, Dimensions, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { tmdbApi } from '../../../api/tmdb';
import { authApi } from '../../../api/authApi';
import { commentsApi } from '../../../api/commentsApi';
import { useTheme } from '../../../context/ThemeContext';

import TVMovieRow from '../../components/TVMovieRow';
import TVHeroSection from './sections/TVHeroSection';
import TVContinueWatchingSection from './sections/TVContinueWatchingSection';
import TVTopCommentsSection from './sections/TVTopCommentsSection';
import TVRecentCommentsSection from './sections/TVRecentCommentsSection';
import TVRankedPostersSection from './sections/TVRankedPostersSection';
import TVFeaturedActorsSection from './sections/TVFeaturedActorsSection';
import TVEntertainmentSection from './sections/TVEntertainmentSection';
import TVHomeCTASection from './sections/TVHomeCTASection';
import TVComingSoonSection from './sections/TVComingSoonSection';
import { styles } from './homeStyles';

interface TVHomeScreenProps {
  navigation: any;
  onTabChange?: (tab: string) => void;
}

export default function TVHomeScreen({ navigation, onTabChange }: TVHomeScreenProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();

  const [loading, setLoading] = useState(true);
  const [lazyLoaded, setLazyLoaded] = useState(false);
  const [recentlyWatched, setRecentlyWatched] = useState<any[]>([]);
  const [koreanItems, setKoreanItems] = useState<any[]>([]);
  const [usukItems, setUsukItems] = useState<any[]>([]);
  const [chinaItems, setChinaItems] = useState<any[]>([]);
  const [anime, setAnime] = useState<any[]>([]);
  const [actionMovies, setActionMovies] = useState<any[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<any[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  // Aligned sections from mobile

  const [topComments, setTopComments] = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [topMoviesToday, setTopMoviesToday] = useState<any[]>([]);
  const [topTVToday, setTopTVToday] = useState<any[]>([]);
  const [featuredActors, setFeaturedActors] = useState<any[]>([]);

  const [featuredItems, setFeaturedItems] = useState<any[]>([]);
  const [focusedMovie, setFocusedMovie] = useState<any>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [focusedButton, setFocusedButton] = useState<string | null>(null);

  // Trailer states
  const [showTrailerPopup, setShowTrailerPopup] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerLoading, setIsTrailerLoading] = useState(false);
  const [focusedCloseBtn, setFocusedCloseBtn] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const isScreenFocused = useIsFocused();
  const [focusedSection, setFocusedSection] = useState<'hero' | 'continue_watching' | 'rows' | null>(null);
  const [focusedThumbnailIndex, setFocusedThumbnailIndex] = useState<number | null>(null);

  const thumbnailRefs = useRef<any[]>([]);
  const focusTimeoutRef = useRef<any>(null);
  const focusedMovieRef = useRef<any>(null);
  const focusedThumbnailIndexRef = useRef<number | null>(null);

  const updateFocusedSection = (section: 'hero' | 'continue_watching' | 'rows') => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    setFocusedSection(section);
  };

  const handleBlurSection = () => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      setFocusedSection(null);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  // Sync refs for hero carousel timer (avoid unnecessary timer re-creates)
  focusedMovieRef.current = focusedMovie;
  focusedThumbnailIndexRef.current = focusedThumbnailIndex;

  useEffect(() => {
    if (!isScreenFocused) return;
    if (showTrailerPopup) return;
    if (focusedSection !== null && focusedSection !== 'hero') return;
    if (featuredItems.length <= 1) return;

    const timer = setInterval(() => {
      const currentMovie = focusedMovieRef.current;
      const currentIndex = featuredItems.findIndex(item => item.id === currentMovie?.id);
      if (currentIndex === -1) return;

      const nextIndex = (currentIndex + 1) % featuredItems.length;
      const nextItem = featuredItems[nextIndex];

      setFocusedMovie(nextItem);

      if (focusedThumbnailIndexRef.current !== null) {
        thumbnailRefs.current[nextIndex]?.focus();
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [isScreenFocused, showTrailerPopup, focusedSection, featuredItems]);

  const fetchUserData = async () => {
    try {
      const histResp = await authApi.getRecentlyWatched();
      const items = (histResp as any)?.items || [];
      
      const mapped = items.map((item: any) => {
        const id = item.contentId || item.id;
        const isTV = item.isTVShow;
        return {
          ...item,
          id,
          title: item.title || item.name,
          poster_path: item.poster ? item.poster.replace('https://image.tmdb.org/t/p/w400', '') : null,
          backdrop_path: null,
          isTV
        };
      });
      
      setRecentlyWatched(mapped);
    } catch (e) {
      // ignore
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
        fetchUserData();
      });
    }, [])
  );

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [movieData, tvData, homeData, regionalData, fallbackData] = await Promise.all([
          tmdbApi.getTrendingMovies().catch(() => ({ results: [] })),
          tmdbApi.getTrendingTV().catch(() => ({ results: [] })),
          tmdbApi.getHomeBundle().catch(() => ({ sections: {} })),
          Promise.all([
            tmdbApi.getKoreanContent().catch(() => []),
            tmdbApi.getUSUKContent().catch(() => []),
            tmdbApi.getChinaContent().catch(() => []),
          ]),
          Promise.all([
            tmdbApi.getUpcomingContent().catch(() => []),
            tmdbApi.getAnimeContent().catch(() => []),
            tmdbApi.getActionContent().catch(() => []),
            tmdbApi.getHorrorContent().catch(() => []),
            tmdbApi.getRomanceContent().catch(() => []),
          ]),
        ]);

        const homeSections = (homeData as any)?.sections || {};
        const [fbKorean, fbUsuk, fbChina] = regionalData as any[];
        const [fbUpcoming, fbAnime, fbAction, fbHorror, fbRomance] = fallbackData as any[];
        
        const movies = homeSections.trendingMovies?.length ? homeSections.trendingMovies : (movieData as any)?.results || [];
        const tv = homeSections.trendingTV?.length ? homeSections.trendingTV : (tvData as any)?.results || [];
        
        setKoreanItems(homeSections.korean?.length ? homeSections.korean : fbKorean);
        setUsukItems(homeSections.usuk?.length ? homeSections.usuk : fbUsuk);
        setChinaItems(homeSections.china?.length ? homeSections.china : fbChina);
        setAnime(homeSections.anime?.length ? homeSections.anime : fbAnime);
        setActionMovies(homeSections.action?.length ? homeSections.action : fbAction);
        setHorrorMovies(homeSections.horror?.length ? homeSections.horror : fbHorror);
        setRomanceMovies(homeSections.romance?.length ? homeSections.romance : fbRomance);
        setUpcoming(homeSections.comingSoon?.length ? homeSections.comingSoon : fbUpcoming);
        
        const moviesToday = homeSections.topMovies?.length ? homeSections.topMovies.slice(0, 5) : movies.slice(0, 5);
        const tvToday = homeSections.topTVShows?.length ? homeSections.topTVShows.slice(0, 5) : tv.slice(0, 5);
        setTopMoviesToday(moviesToday);
        setTopTVToday(tvToday);

        const actorData = homeSections.actors?.length
          ? homeSections.actors
          : await tmdbApi.getFeaturedActorsFromContent([...movies.slice(0, 3), ...tv.slice(0, 2)]).catch(() => []);
        setFeaturedActors(actorData);

        // Circular Featured thumbnails (circular carousel)
        const featMovies = movies.slice(0, 3).map((item: any) => ({ ...item, isTV: false }));
        const featTV = tv.slice(0, 2).map((item: any) => ({ ...item, isTV: true }));
        const combinedFeatured = [...featMovies, ...featTV];
        setFeaturedItems(combinedFeatured);

        if (combinedFeatured.length > 0) {
          setFocusedMovie(combinedFeatured[0]);
        }

      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }

      // Enrich comments in background (non-blocking, after UI is shown)
      try {
        const enrichComments = async (items: any[]) => {
          const cache = new Map();
          const enrich = async (item: any) => {
            const key = `${item.type}-${item.movieId}`;
            if (!cache.has(key)) {
              const p = item.type === 'tv' || item.type === 'tvshow'
                ? tmdbApi.getTVDetail(item.movieId)
                : tmdbApi.getMovieDetail(item.movieId);
              cache.set(key, p.catch(() => null));
            }
            const detail = await cache.get(key);
            return {
              ...item,
              movieTitle: detail?.title || detail?.name || t('general.unknown') || 'Unknown',
              moviePoster: detail?.poster_path ? `https://image.tmdb.org/t/p/w200${detail.poster_path}` : null,
            };
          };
          return Promise.all((items || []).map(enrich));
        };

        const [topComm, recentComm] = await Promise.all([
          commentsApi.getTopComments(10).catch(() => []),
          commentsApi.getRecentComments(10).catch(() => []),
        ]);
        const enrichedTop = await enrichComments(topComm || []);
        const enrichedRecent = await enrichComments(recentComm || []);
        setTopComments(enrichedTop);
        setRecentComments(enrichedRecent);
      } catch (_) {}
    };

    fetchHomeData();
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      setLazyLoaded(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleTrailerPress = async () => {
    if (!focusedMovie) return;
    setIsTrailerLoading(true);
    setShowTrailerPopup(true);
    try {
      const videos = focusedMovie.isTV
        ? await tmdbApi.getTVVideos(focusedMovie.id.toString())
        : await tmdbApi.getMovieVideos(focusedMovie.id.toString());
      const vidList = (videos as any)?.results || [];
      const ytTrailer = vidList.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
                        vidList.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube') ||
                        vidList.find((v: any) => v.type === 'Clip' && v.site === 'YouTube') ||
                        vidList.find((v: any) => v.site === 'YouTube');
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

  const handleDetailPress = () => {
    if (!focusedMovie) return;
    navigation.navigate('TVDetail', {
      item: focusedMovie,
      isTV: focusedMovie.isTV
    });
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    if (yOffset > 50 && !lazyLoaded) {
      setLazyLoaded(true);
    }
  };



  const handleCommentMoviePress = (navItem: any, isTVItem: boolean) => {
    navigation.navigate('TVDetail', {
      item: navItem,
      isTV: isTVItem
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>{t('general.loading') || 'Loading...'}</Text>
      </View>
    );
  }

  const backdropPath = focusedMovie?.backdrop_path || focusedMovie?.poster_path;
  const backdropUri = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : null;

  const { width: screenWidth } = Dimensions.get('window');
  const trailerWidth = Math.min(screenWidth * 0.9, 960);
  const trailerHeight = trailerWidth * (9 / 16);

  return (
    <View style={styles.container}>
      {/* Background Backdrop Banner */}
      <View style={styles.backdropWrapper}>
        {backdropUri ? (
          <Image
            source={{ uri: backdropUri }}
            style={styles.backdropImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.backdropPlaceholder} />
        )}
        <View style={styles.backdropOverlay} />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* 1. Top Featured Hero Section */}
        <TVHeroSection
          focusedMovie={focusedMovie}
          featuredItems={featuredItems}
          themeColor={themeColor}
          focusedButton={focusedButton}
          setFocusedButton={setFocusedButton}
          hoveredButton={hoveredButton}
          setHoveredButton={setHoveredButton}
          focusedThumbnailIndex={focusedThumbnailIndex}
          setFocusedThumbnailIndex={setFocusedThumbnailIndex}
          setFocusedMovie={setFocusedMovie}
          updateFocusedSection={updateFocusedSection}
          handleBlurSection={handleBlurSection}
          handleTrailerPress={handleTrailerPress}
          handleDetailPress={handleDetailPress}
          thumbnailRefs={thumbnailRefs}
        />

        {/* 2. Continue Watching Section */}
        <TVContinueWatchingSection
          recentlyWatched={recentlyWatched}
          onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: item.isTV })}
          onItemFocus={() => updateFocusedSection('continue_watching')}
          onItemBlur={handleBlurSection}
          themeColor={themeColor}
        />

        {/* Vertical List of Movie Rows */}
        <View style={styles.rowsContainer}>
          {lazyLoaded && (
            <>
              {/* 4. Korean Movies & Shows */}
              {koreanItems.length > 0 && (
                <TVMovieRow
                  title={t('home.korean_title') || 'Korean Movies & Shows'}
                  data={koreanItems}
                  onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: item.name !== undefined })}
                  onItemFocus={() => updateFocusedSection('rows')}
                  onItemBlur={handleBlurSection}
                />
              )}

              {/* 5. Western Hits */}
              {usukItems.length > 0 && (
                <TVMovieRow
                  title={t('home.usuk_title') || 'Western Hits'}
                  data={usukItems}
                  onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: item.name !== undefined })}
                  onItemFocus={() => updateFocusedSection('rows')}
                  onItemBlur={handleBlurSection}
                />
              )}

              {/* 6. Chinese Content */}
              {chinaItems.length > 0 && (
                <TVMovieRow
                  title={t('home.china_title') || 'Chinese Content'}
                  data={chinaItems}
                  onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: item.name !== undefined })}
                  onItemFocus={() => updateFocusedSection('rows')}
                  onItemBlur={handleBlurSection}
                />
              )}
              {/* 7. Top Comments */}
              <TVTopCommentsSection
                topComments={topComments}
                onItemPress={handleCommentMoviePress}
                onItemFocus={() => updateFocusedSection('rows')}
                onItemBlur={handleBlurSection}
                themeColor={themeColor}
              />

              {/* 8. Recent Comments */}
              <TVRecentCommentsSection
                recentComments={recentComments}
                onItemPress={handleCommentMoviePress}
                onItemFocus={() => updateFocusedSection('rows')}
                onItemBlur={handleBlurSection}
                themeColor={themeColor}
              />

              {/* 9. Top Movies Today */}
              <TVRankedPostersSection
                title={t('home.top_movies_today') || 'Top 5 Movies Today'}
                data={topMoviesToday}
                isTV={false}
                onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: false })}
                onItemFocus={() => updateFocusedSection('rows')}
                onItemBlur={handleBlurSection}
                themeColor={themeColor}
              />

              {/* 10. Coming Soon */}
              <TVComingSoonSection
                upcoming={upcoming}
                onItemPress={(item: any) => navigation.navigate('TVDetail', { item, isTV: false })}
                onItemFocus={() => updateFocusedSection('rows')}
                onItemBlur={handleBlurSection}
                themeColor={themeColor}
              />

              {/* 11. Top TV Shows Today */}
              <TVRankedPostersSection
                title={t('home.top_tv_today') || 'Top 5 TV Shows Today'}
                data={topTVToday}
                isTV={true}
                onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: true })}
                onItemFocus={() => updateFocusedSection('rows')}
                onItemBlur={handleBlurSection}
                themeColor={themeColor}
              />

              {/* 12. Anime Hub */}
              {anime.length > 0 && (
                <TVMovieRow
                  title={t('home.anime_title') || 'Anime Hub'}
                  data={anime}
                  onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: true })}
                  onItemFocus={() => updateFocusedSection('rows')}
                  onItemBlur={handleBlurSection}
                />
              )}

              {/* 13. Action Thrillers */}
              {actionMovies.length > 0 && (
                <TVMovieRow
                  title={t('home.action_title') || 'Action Thrillers'}
                  data={actionMovies}
                  onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: item.name !== undefined })}
                  onItemFocus={() => updateFocusedSection('rows')}
                  onItemBlur={handleBlurSection}
                />
              )}

              {/* 14. Horror */}
              {horrorMovies.length > 0 && (
                <TVMovieRow
                  title={t('home.horror_title') || 'Horror'}
                  data={horrorMovies}
                  onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: item.name !== undefined })}
                  onItemFocus={() => updateFocusedSection('rows')}
                  onItemBlur={handleBlurSection}
                />
              )}

              {/* 15. Romance */}
              {romanceMovies.length > 0 && (
                <TVMovieRow
                  title={t('home.romance_title') || 'Romance'}
                  data={romanceMovies}
                  onItemPress={(item) => navigation.navigate('TVDetail', { item, isTV: item.name !== undefined })}
                  onItemFocus={() => updateFocusedSection('rows')}
                  onItemBlur={handleBlurSection}
                />
              )}

              {/* 16. Spotlight Actors */}
              <TVFeaturedActorsSection
                actors={featuredActors}
                themeColor={themeColor}
              />


              {/* 18. Entertainment Zone / Danh Mục Phim */}
              <TVEntertainmentSection
                onTabChange={onTabChange}
                themeColor={themeColor}
              />

              {/* 19. CTA Section */}
              <TVHomeCTASection
                onLoginPress={() => navigation.navigate('TVLogin')}
                themeColor={themeColor}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Trailer Modal Player */}
      <Modal
        visible={showTrailerPopup}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowTrailerPopup(false);
          setTrailerKey(null);
        }}
      >
        <View style={styles.trailerOverlay}>
          <View style={[styles.trailerBox, { width: trailerWidth }]}>
            <View style={styles.trailerHeader}>
              <Text style={styles.trailerTitle} numberOfLines={1}>
                {(focusedMovie?.title || focusedMovie?.name || '')} - Trailer
              </Text>
              <Pressable
                focusable={true}
                onFocus={() => setFocusedCloseBtn(true)}
                onBlur={() => setFocusedCloseBtn(false)}
                onPress={() => {
                  setShowTrailerPopup(false);
                  setTrailerKey(null);
                }}
                style={() => [
                  styles.trailerCloseBtn,
                  focusedCloseBtn && styles.trailerCloseBtnFocused
                ]}
                {...{ hasTVPreferredFocus: true } as any}
              >
                <Ionicons name="close" size={24} color={focusedCloseBtn ? "#000000" : "#ffffff"} />
              </Pressable>
            </View>

            <View style={[styles.trailerVideoContainer, { width: trailerWidth, height: trailerHeight }]}>
              {isTrailerLoading ? (
                <ActivityIndicator size="large" color={themeColor} />
              ) : trailerKey ? (
                <YoutubePlayer
                  height={trailerHeight}
                  width={trailerWidth}
                  play={true}
                  videoId={trailerKey}
                  webViewProps={{
                    mediaPlaybackRequiresUserAction: false,
                    allowsInlineMediaPlayback: true,
                    scrollEnabled: false,
                    androidLayerType: 'hardware',
                  }}
                />
              ) : (
                <View style={styles.noTrailerContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#ff4d4d" />
                  <Text style={styles.noTrailerText}>
                    {t('player.no_trailer') || 'Không tìm thấy trailer.'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
